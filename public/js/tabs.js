import { state } from './state.js';
import { vistaVenta } from './venta.js';
import { vistaCaja } from './caja.js';
import { vistaFiado } from './fiado.js';
import { vistaInventario } from './inventario.js';
import { vistaEquipo } from './equipo.js';

export function irA(tab) {
  state.tabActual = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderTab();
}

export function renderTab() {
  const el = document.getElementById('main-content');
  if (state.tabActual === 'venta') el.innerHTML = vistaVenta();
  if (state.tabActual === 'caja') el.innerHTML = vistaCaja();
  if (state.tabActual === 'fiado') el.innerHTML = vistaFiado();
  if (state.tabActual === 'inventario') el.innerHTML = vistaInventario();
  if (state.tabActual === 'equipo') el.innerHTML = vistaEquipo();
}
