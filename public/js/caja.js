import { db } from './firebase.js';
import { state } from './state.js';
import { money, hora, escapeHtml } from './utils.js';

function etiquetaMov(t) {
  return { venta_efectivo: 'Venta', venta_fiado: 'Venta a fiado', entrada: 'Entrada', salida: 'Salida', abono: 'Abono de fiado' }[t] || t;
}

export function vistaCaja() {
  const { cajaEstado, movimientos } = state;
  if (!cajaEstado.abierta) {
    return `
      <div class="card">
        <h2>Caja cerrada</h2>
        <p class="sub">Cuenta el efectivo que tienes ahora en la caja antes de empezar a vender.</p>
        <div class="field"><label>Efectivo inicial</label><input id="caja-inicial" type="number" inputmode="decimal" placeholder="0.00"></div>
        <button class="btn btn-lamp" data-action="abrir-caja">Abrir caja</button>
      </div>`;
  }
  const mv = movimientos;
  const ventasEfectivo = mv.filter(m => m.tipo === 'venta_efectivo' || m.tipo === 'abono').reduce((s, m) => s + m.monto, 0);
  const entradas = mv.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.monto, 0);
  const salidas = mv.filter(m => m.tipo === 'salida').reduce((s, m) => s + m.monto, 0);
  const esperado = cajaEstado.montoInicial + ventasEfectivo + entradas - salidas;
  const ventasFiado = mv.filter(m => m.tipo === 'venta_fiado').reduce((s, m) => s + m.monto, 0);

  const filasMov = mv.slice(0, 12).map(m => {
    const entra = ['venta_efectivo', 'entrada', 'abono'].includes(m.tipo);
    return `<div class="mov-row"><span class="mtag">${hora(m.ts)} · ${escapeHtml(m.detalle || etiquetaMov(m.tipo))}</span>
      <span class="${entra ? 'mov-in' : 'mov-out'}">${entra ? '+' : '–'}${money(m.monto)}</span></div>`;
  }).join('') || '<div class="empty">Todavía no hay movimientos hoy.</div>';

  return `
    <div class="card">
      <h2>Caja abierta</h2>
      <p class="sub">Desde las ${cajaEstado.abiertaEn ? hora(cajaEstado.abiertaEn) : '—'}</p>
      <div class="total-row"><span>Efectivo esperado</span><span class="num">${money(esperado)}</span></div>
      ${ventasFiado > 0 ? `<div class="mov-row"><span class="mtag">Vendido a fiado hoy (no es efectivo)</span><span style="color:var(--debt)">${money(ventasFiado)}</span></div>` : ''}
      <div class="btn-row" style="margin-top:14px;">
        <div style="flex:1;"><button class="btn btn-ghost btn-sm" style="width:100%;" data-action="mov-manual" data-tipo="entrada">Entrada de efectivo</button></div>
        <div style="flex:1;"><button class="btn btn-ghost btn-sm" style="width:100%;" data-action="mov-manual" data-tipo="salida">Salida de efectivo</button></div>
      </div>
    </div>
    <div class="card">
      <h2>Movimientos de hoy</h2>
      ${filasMov}
    </div>
    <button class="btn btn-debt" data-action="cerrar-caja" data-esperado="${esperado}">Cerrar caja</button>
  `;
}

export async function abrirCaja() {
  const monto = parseFloat(document.getElementById('caja-inicial').value) || 0;
  await db.doc(`businesses/${state.businessId}/caja/actual`).set({ abierta: true, montoInicial: monto, abiertaEn: Date.now() });
}

export async function movimientoManual(tipo) {
  const motivo = prompt(tipo === 'entrada' ? '¿De dónde entra este efectivo?' : '¿Para qué sale este efectivo?');
  if (motivo === null) return;
  const monto = parseFloat(prompt('¿Cuánto?')); if (!monto || monto <= 0) return;
  await db.collection(`businesses/${state.businessId}/movimientos`).add({ tipo, monto, detalle: motivo || etiquetaMov(tipo), ts: Date.now() });
}

export async function cerrarCaja(esperado) {
  const contado = parseFloat(prompt(`Cuenta el efectivo físico en la caja.\n\nSe esperaba ${money(esperado)}. ¿Cuánto contaste?`));
  if (isNaN(contado)) return;
  const dif = contado - esperado;
  alert(dif === 0 ? 'Caja exacta. Buen cierre.' : dif > 0 ? `Sobran ${money(dif)} en caja.` : `Faltan ${money(Math.abs(dif))} en caja.`);
  // Limpia los movimientos del día (bitácora de la sesión cerrada) y resetea la caja.
  const bId = state.businessId;
  const snap = await db.collection(`businesses/${bId}/movimientos`).get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  batch.set(db.doc(`businesses/${bId}/caja/actual`), { abierta: false, montoInicial: 0, abiertaEn: null });
  await batch.commit();
}
