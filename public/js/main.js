import { auth } from './firebase.js';
import { state } from './state.js';
import { hide, show } from './utils.js';
import { doLogin, doRegister, doLogout, reenviarVerificacion } from './auth.js';
import { cargarPerfil, crearNegocio, cerrarBanner, resolverInvitacionesPendientes } from './negocio.js';
import { irA } from './tabs.js';
import { agregarCarrito, cambiarCantidad, cobrar } from './venta.js';
import { abrirCaja, movimientoManual, cerrarCaja } from './caja.js';
import { nuevoCliente, abrirCliente } from './fiado.js';
import { guardarProducto, editarProducto } from './inventario.js';
import { invitarEmpleado, quitarMiembro } from './equipo.js';

/* ---------- Botones estáticos del HTML ---------- */
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('btn-register').addEventListener('click', doRegister);
document.getElementById('btn-crear-negocio').addEventListener('click', crearNegocio);
document.getElementById('btn-cerrar-banner').addEventListener('click', cerrarBanner);
document.getElementById('btn-reenviar-verif').addEventListener('click', reenviarVerificacion);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => irA(btn.dataset.tab));
});

document.getElementById('ob-tipos').addEventListener('click', (e) => {
  const b = e.target.closest('.tipo-opt'); if (!b) return;
  document.querySelectorAll('.tipo-opt').forEach(x => x.classList.remove('sel'));
  b.classList.add('sel');
});

/* ---------- Delegación de eventos para el contenido dinámico de las pestañas ----------
   Cada vista (venta.js, caja.js, fiado.js, inventario.js, equipo.js) marca sus
   botones con data-action en vez de onclick="", y aquí se resuelve la acción. */
document.getElementById('main-content').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const { action, id, delta, modo, tipo, esperado, uid } = el.dataset;
  const acciones = {
    'agregar-carrito': () => agregarCarrito(id),
    'cambiar-cantidad': () => cambiarCantidad(id, parseInt(delta)),
    'cobrar': () => cobrar(modo),
    'abrir-caja': () => abrirCaja(),
    'mov-manual': () => movimientoManual(tipo),
    'cerrar-caja': () => cerrarCaja(parseFloat(esperado)),
    'nuevo-cliente': () => nuevoCliente(),
    'abrir-cliente': () => abrirCliente(id),
    'editar-producto': () => editarProducto(id),
    'guardar-producto': () => guardarProducto(),
    'invitar-empleado': () => invitarEmpleado(),
    'quitar-miembro': () => quitarMiembro(uid),
  };
  (acciones[action] || (() => {}))();
});

/* ---------- Arranque ---------- */
auth.onAuthStateChanged(async (user) => {
  hide('loading'); hide('auth'); hide('onboarding'); hide('main');
  if (!user) { show('auth'); return; }
  document.getElementById('hdr-who').textContent = user.email;
  await resolverInvitacionesPendientes(user);
  await cargarPerfil(user);
});
