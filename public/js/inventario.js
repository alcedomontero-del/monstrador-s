import { db, storage } from './firebase.js';
import { state } from './state.js';
import { money, escapeHtml } from './utils.js';
import { irA } from './tabs.js';

export function vistaInventario() {
  const filas = state.productos.map(p => `
    <div class="list-row" data-action="editar-producto" data-id="${p.id}">
      <div class="list-main"><div class="ln">${escapeHtml(p.nombre)}</div><div class="ls">${money(p.precio)} · ${p.stock} en stock</div></div>
      <div class="list-val ${p.stock <= 3 ? 'val-debt' : ''}">${p.stock}</div>
    </div>`).join('') || '<div class="empty">Todavía no tienes productos.</div>';

  return `
    <button class="btn btn-ghost" id="btn-nuevo-prod">Agregar producto</button>
    <div id="nuevo-prod-form"></div>
    <div class="card" style="margin-top:14px;">${filas}</div>
  `;
}

// El botón de arriba abre un mini-formulario en línea en vez de un prompt,
// porque agregar producto es la acción que más se repite al empezar.
document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-nuevo-prod') {
    const box = document.getElementById('nuevo-prod-form');
    if (!box || box.innerHTML) return;
    box.innerHTML = `
      <div class="card" style="margin-top:12px;">
        <div class="field"><label>Nombre</label><input id="np-nombre"></div>
        <div class="btn-row">
          <div style="flex:1;"><div class="field" style="margin-bottom:0;"><label>Precio</label><input id="np-precio" type="number" inputmode="decimal"></div></div>
          <div style="flex:1;"><div class="field" style="margin-bottom:0;"><label>Stock inicial</label><input id="np-stock" type="number" inputmode="numeric"></div></div>
        </div>
        <div class="field"><label>Foto (opcional)</label><input id="np-foto" type="file" accept="image/*"></div>
        <button class="btn btn-lamp" style="margin-top:12px;" id="np-guardar" data-action="guardar-producto">Guardar producto</button>
      </div>`;
  }
});

export async function guardarProducto() {
  const nombre = document.getElementById('np-nombre').value.trim();
  const precio = parseFloat(document.getElementById('np-precio').value);
  const stock = parseInt(document.getElementById('np-stock').value);
  const file = document.getElementById('np-foto').files[0];
  if (!nombre || isNaN(precio) || isNaN(stock)) return;
  const btn = document.getElementById('np-guardar'); btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    const bId = state.businessId;
    const ref = db.collection(`businesses/${bId}/products`).doc();
    await ref.set({ nombre, precio, stock });
    if (file) {
      const path = `businesses/${bId}/media/${ref.id}_${Date.now()}`;
      const snap = await storage.ref(path).put(file);
      const url = await snap.ref.getDownloadURL();
      await ref.update({ foto: url });
    }
    irA('inventario');
  } catch (e) { alert('No se pudo guardar: ' + e.message); btn.disabled = false; btn.textContent = 'Guardar producto'; }
}

export async function editarProducto(id) {
  const p = state.productos.find(x => x.id === id); if (!p) return;
  const nuevoStock = prompt(`${p.nombre} — stock actual: ${p.stock}.\n\nEscribe el nuevo stock:`, p.stock);
  if (nuevoStock === null) return;
  const n = parseInt(nuevoStock); if (isNaN(n) || n < 0) return;
  await db.doc(`businesses/${state.businessId}/products/${id}`).update({ stock: n });
}
