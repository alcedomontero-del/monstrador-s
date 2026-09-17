import { db } from './firebase.js';
import { state } from './state.js';
import { money, hora, escapeHtml } from './utils.js';
import { renderTab } from './tabs.js';

export function vistaVenta() {
  const { productos, carrito, cajaEstado } = state;
  const grid = productos.map(p => `
    <button class="prod-btn" ${p.stock <= 0 ? 'disabled' : ''} data-action="agregar-carrito" data-id="${p.id}">
      ${p.foto ? `<img src="${p.foto}" alt="">` : ''}
      <span class="pn">${escapeHtml(p.nombre)}</span>
      <span class="pp">${money(p.precio)}</span>
      <span class="ps">${p.stock > 0 ? p.stock + ' en stock' : 'agotado'}</span>
    </button>`).join('');

  const filas = carrito.map(it => `
    <div class="cart-row">
      <div class="cart-name">${escapeHtml(it.nombre)}</div>
      <div class="cart-qty">
        <button class="qty-btn" data-action="cambiar-cantidad" data-id="${it.id}" data-delta="-1">–</button>
        <span>${it.cantidad}</span>
        <button class="qty-btn" data-action="cambiar-cantidad" data-id="${it.id}" data-delta="1">+</button>
      </div>
      <div class="cart-sub">${money(it.precio * it.cantidad)}</div>
    </div>`).join('');

  const total = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);

  return `
    ${productos.length === 0 ? '<div class="empty">Todavía no tienes productos. Agrégalos desde la pestaña Inventario.</div>' : `<div class="prod-grid">${grid}</div>`}
    ${carrito.length > 0 ? `
      <div class="card" style="margin-top:16px;">
        <h2>En el carrito</h2>
        ${filas}
        <div class="total-row"><span>Total</span><span class="num">${money(total)}</span></div>
        ${!cajaEstado.abierta ? `<div class="msg err">Abre la caja primero (pestaña Caja) para poder cobrar.</div>` : `
        <div class="btn-row">
          <div style="flex:1;"><button class="btn btn-cash" data-action="cobrar" data-modo="efectivo">Cobrar efectivo</button></div>
          <div style="flex:1;"><button class="btn btn-debt" data-action="cobrar" data-modo="fiado">Fiar</button></div>
        </div>`}
      </div>` : ''}
  `;
}

export function agregarCarrito(id) {
  const p = state.productos.find(x => x.id === id); if (!p || p.stock <= 0) return;
  const existente = state.carrito.find(x => x.id === id);
  const enCarrito = existente ? existente.cantidad : 0;
  if (enCarrito >= p.stock) return;
  if (existente) existente.cantidad++;
  else state.carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });
  renderTab();
}

export function cambiarCantidad(id, delta) {
  const it = state.carrito.find(x => x.id === id); if (!it) return;
  const p = state.productos.find(x => x.id === id);
  it.cantidad += delta;
  if (p && it.cantidad > p.stock) it.cantidad = p.stock;
  if (it.cantidad <= 0) state.carrito = state.carrito.filter(x => x.id !== id);
  renderTab();
}

export async function cobrar(modo) {
  const total = state.carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
  if (total <= 0 || !state.cajaEstado.abierta) return;

  let clienteNombre = null;
  if (modo === 'fiado') {
    const nombre = prompt('¿A nombre de quién queda el fiado?');
    if (!nombre) return;
    clienteNombre = nombre.trim();
  }

  const bId = state.businessId;
  const itemsVendidos = state.carrito.map(it => ({ ...it }));
  const batch = db.batch();
  itemsVendidos.forEach(it => {
    const p = state.productos.find(x => x.id === it.id); if (!p) return;
    batch.update(db.doc(`businesses/${bId}/products/${it.id}`), { stock: Math.max(0, p.stock - it.cantidad) });
  });

  if (modo === 'fiado') {
    const cliente = state.clientes.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
    const clienteRef = cliente ? db.doc(`businesses/${bId}/customers/${cliente.id}`) : db.collection(`businesses/${bId}/customers`).doc();
    batch.set(clienteRef, { nombre: clienteNombre, saldo: (cliente ? cliente.saldo : 0) + total }, { merge: true });
  }

  batch.set(db.collection(`businesses/${bId}/movimientos`).doc(), {
    tipo: modo === 'efectivo' ? 'venta_efectivo' : 'venta_fiado',
    monto: total, detalle: clienteNombre ? `Fiado — ${clienteNombre}` : 'Venta',
    ts: Date.now(),
  });

  try {
    await batch.commit();
    mostrarTicket(itemsVendidos, total, modo, clienteNombre);
    state.carrito = [];
  } catch (e) { alert('No se pudo registrar la venta: ' + e.message); }
}

function mostrarTicket(items, total, modo, cliente) {
  const filas = items.map(i => `<div class="trow"><span>${i.cantidad}× ${escapeHtml(i.nombre)}</span><span>${money(i.precio * i.cantidad)}</span></div>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="ticket">
      <h3>${escapeHtml(state.negocio.nombre)}</h3>
      <div class="tsub">${modo === 'efectivo' ? 'Pagado en efectivo' : 'Fiado a ' + escapeHtml(cliente)} · ${hora()}</div>
      ${filas}
      <div class="ttotal"><span>Total</span><span>${money(total)}</span></div>
      <button class="btn btn-lamp" data-action="cerrar-ticket">Nueva venta</button>
    </div>`;
  overlay.querySelector('[data-action="cerrar-ticket"]').addEventListener('click', () => { overlay.remove(); renderTab(); });
  document.body.appendChild(overlay);
}
