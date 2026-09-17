import { db } from './firebase.js';
import { state } from './state.js';
import { money, escapeHtml } from './utils.js';

export function vistaFiado() {
  const { clientes } = state;
  const total = clientes.reduce((s, c) => s + c.saldo, 0);
  const filas = clientes.slice().sort((a, b) => b.saldo - a.saldo).map(c => `
    <div class="list-row" data-action="abrir-cliente" data-id="${c.id}">
      <div class="list-main"><div class="ln">${escapeHtml(c.nombre)}</div><div class="ls">${c.saldo > 0 ? 'debe' : 'al día'}</div></div>
      <div class="list-val ${c.saldo > 0 ? 'val-debt' : ''}">${money(c.saldo)}</div>
    </div>`).join('') || '<div class="empty">Todavía no tienes clientes fiados. Se crean solos cuando fías una venta.</div>';

  return `
    <div class="card">
      <h2>Total fiado pendiente</h2>
      <div class="total-row" style="margin:0;padding-top:0;border-top:none;"><span></span><span class="num" style="color:${total > 0 ? 'var(--debt)' : 'var(--paper)'}">${money(total)}</span></div>
    </div>
    <button class="btn btn-ghost" data-action="nuevo-cliente">Agregar cliente</button>
    <div class="card" style="margin-top:14px;">${filas}</div>
  `;
}

export async function nuevoCliente() {
  const nombre = prompt('Nombre del cliente:'); if (!nombre) return;
  await db.collection(`businesses/${state.businessId}/customers`).add({ nombre: nombre.trim(), saldo: 0 });
}

export async function abrirCliente(id) {
  const c = state.clientes.find(x => x.id === id); if (!c) return;
  if (c.saldo <= 0) { alert(`${c.nombre} está al día — no debe nada.`); return; }
  const abono = parseFloat(prompt(`${c.nombre} debe ${money(c.saldo)}.\n\n¿Cuánto está abonando ahora?`));
  if (!abono || abono <= 0) return;
  const monto = Math.min(abono, c.saldo);
  const bId = state.businessId;
  const batch = db.batch();
  batch.update(db.doc(`businesses/${bId}/customers/${id}`), { saldo: c.saldo - monto });
  if (state.cajaEstado.abierta) {
    batch.set(db.collection(`businesses/${bId}/movimientos`).doc(), { tipo: 'abono', monto, detalle: `Abono — ${c.nombre}`, ts: Date.now() });
  }
  await batch.commit();
}
