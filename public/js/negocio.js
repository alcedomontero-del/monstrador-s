import { auth, db, FieldValue } from './firebase.js';
import { state } from './state.js';
import { show, hide, showMsg } from './utils.js';
import { renderTab, irA } from './tabs.js';

function actualizarBannerVerificacion() {
  const verificado = !!auth.currentUser?.emailVerified;
  document.getElementById('verify-banner').classList.toggle('hidden', verificado);
}

/* ---------- Invitaciones — se resuelven al iniciar sesión, sin backend propio.
   El dueño crea la invitación (businesses/{id}/invitations); cuando la persona
   invitada entra con ese correo, se auto-agrega como miembro. ---------- */
export async function resolverInvitacionesPendientes(user) {
  const email = (user.email || '').toLowerCase();
  if (!email || !user.emailVerified) return;
  let snap;
  try {
    snap = await db.collectionGroup('invitations').where('emailLower', '==', email).where('estado', '==', 'pendiente').get();
  } catch (e) { return; } // requiere el índice del collectionGroup; ver guía de instalación

  for (const inviteDoc of snap.docs) {
    const bizRef = inviteDoc.ref.parent.parent;
    const data = inviteDoc.data();
    try {
      await db.runTransaction(async (tx) => {
        const freshInvite = await tx.get(inviteDoc.ref);
        if (!freshInvite.exists || freshInvite.data().estado !== 'pendiente') return;
        tx.set(bizRef.collection('members').doc(user.uid), {
          role: data.role, email, addedAt: FieldValue.serverTimestamp(), inviteId: inviteDoc.id,
        });
        tx.update(inviteDoc.ref, { estado: 'aceptada', aceptadaPorUid: user.uid, aceptadaAt: FieldValue.serverTimestamp() });
        tx.set(db.collection('users').doc(user.uid), { businessId: bizRef.id, email }, { merge: true });
      });
    } catch (e) { /* invitación ya tomada o expirada: se ignora */ }
  }
}

export async function cargarPerfil(user) {
  try { await user.reload(); } catch (e) { /* sin red: seguimos con el estado que ya teníamos */ }
  const userDoc = await db.collection('users').doc(user.uid).get();
  const bId = userDoc.exists ? userDoc.data().businessId : null;
  if (!bId) { show('onboarding'); return; }

  const memberDoc = await db.doc(`businesses/${bId}/members/${user.uid}`).get();
  if (!memberDoc.exists) { show('onboarding'); return; } // negocio borrado o vínculo desactualizado

  state.businessId = bId;
  state.miRol = memberDoc.data().role;
  const bizDoc = await db.doc(`businesses/${state.businessId}`).get();
  state.negocio = bizDoc.data();

  document.getElementById('hdr-nombre').textContent = state.negocio.nombre;
  document.getElementById('tab-equipo-btn').classList.toggle('hidden', state.miRol !== 'dueno');
  actualizarBannerVerificacion();
  const bannerVisto = localStorage.getItem('banner_visto_' + state.businessId) === '1';
  if (bannerVisto) hide('banner'); else show('banner');

  suscribirDatos();
  show('main');
  irA(state.tabActual);
}

export async function crearNegocio() {
  const nombre = document.getElementById('ob-nombre').value.trim();
  if (!nombre) { document.getElementById('ob-nombre').focus(); return; }
  const tipo = (document.querySelector('.tipo-opt.sel') || {}).dataset?.tipo || 'otro';
  const user = auth.currentUser;
  try {
    // Paso 1: crear el negocio solo. La regla de creación de "businesses"
    // solo depende de este mismo documento (ownerUid == uid), sin leer nada
    // más, así que puede ir sola sin problema.
    const bizRef = db.collection('businesses').doc();
    await bizRef.set({ nombre, tipo, ownerUid: user.uid, createdAt: FieldValue.serverTimestamp() });

    // Paso 2: ahora que el negocio YA existe en el servidor (no solo en una
    // transacción pendiente), la regla de members/{uid} puede leerlo con
    // get() para confirmar que este usuario es su dueño.
    const batch = db.batch();
    batch.set(bizRef.collection('members').doc(user.uid), { role: 'dueno', email: user.email, addedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection('users').doc(user.uid), { businessId: bizRef.id, email: user.email }, { merge: true });
    await batch.commit();

    // Paso 3: recién aquí el usuario YA es miembro en el servidor, así que
    // puede crear productos (esa regla exige isMember, que depende de que
    // el documento de members del paso 2 ya esté escrito de verdad).
    const batchProductos = db.batch();
    [['Agua 20oz', 35, 24], ['Pan de agua', 20, 15], ['Cigarrillos suelto', 15, 40], ['Refresco lata', 60, 18]]
      .forEach(([n, p, s]) => batchProductos.set(bizRef.collection('products').doc(), { nombre: n, precio: p, stock: s }));
    await batchProductos.commit();

    await cargarPerfil(user);
  } catch (e) { showMsg('ob-msg', e.message, false); }
}

export function cerrarBanner() {
  localStorage.setItem('banner_visto_' + state.businessId, '1');
  hide('banner');
}

/* ---------- Suscripciones en tiempo real (reemplazan guardar()/cargarEstado() de la demo) ---------- */
function suscribirDatos() {
  const bId = state.businessId;
  state.unsub.productos = db.collection(`businesses/${bId}/products`).onSnapshot(snap => {
    state.productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.tabActual === 'venta' || state.tabActual === 'inventario') renderTab();
  });
  state.unsub.clientes = db.collection(`businesses/${bId}/customers`).onSnapshot(snap => {
    state.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.tabActual === 'fiado') renderTab();
  });
  state.unsub.caja = db.doc(`businesses/${bId}/caja/actual`).onSnapshot(snap => {
    state.cajaEstado = snap.exists ? snap.data() : { abierta: false, montoInicial: 0, abiertaEn: null };
    document.getElementById('hdr-caja').textContent = state.cajaEstado.abierta ? 'abierta' : 'cerrada';
    if (state.tabActual === 'caja' || state.tabActual === 'venta') renderTab();
  });
  state.unsub.movs = db.collection(`businesses/${bId}/movimientos`).orderBy('ts', 'desc').limit(50).onSnapshot(snap => {
    state.movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.tabActual === 'caja') renderTab();
  });
  if (state.miRol === 'dueno') {
    state.unsub.miembros = db.collection(`businesses/${bId}/members`).onSnapshot(snap => {
      state.miembros = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      if (state.tabActual === 'equipo') renderTab();
    });
  }
}
