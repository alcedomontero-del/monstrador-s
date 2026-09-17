import { auth, db, FieldValue } from './firebase.js';
import { state } from './state.js';
import { escapeHtml, showMsg } from './utils.js';

export function vistaEquipo() {
  const filas = state.miembros.map(m => `
    <div class="list-row">
      <div class="list-main"><div class="ln">${escapeHtml(m.email || m.uid)}</div><div class="ls">${m.role}</div></div>
      ${m.role !== 'dueno' ? `<button class="btn btn-ghost btn-sm" data-action="quitar-miembro" data-uid="${m.uid}">Quitar</button>` : ''}
    </div>`).join('');

  return `
    <div class="card">
      <h2>Invitar a alguien</h2>
      <p class="sub">La persona debe crear su cuenta (o iniciar sesión) en esta misma app con el correo que pongas aquí; se une sola en cuanto entre.</p>
      <div id="team-msg"></div>
      <div class="field"><label>Correo</label><input id="team-email" type="email"></div>
      <div class="field"><label>Rol</label><select id="team-role"><option value="cajero">Cajero</option><option value="contador">Contador</option></select></div>
      <button class="btn btn-lamp" data-action="invitar-empleado">Invitar</button>
    </div>
    <div class="card">
      <h2>Equipo actual</h2>
      ${filas || '<div class="empty">Solo estás tú por ahora.</div>'}
    </div>
  `;
}

export async function invitarEmpleado() {
  const email = document.getElementById('team-email').value.trim().toLowerCase();
  const role = document.getElementById('team-role').value;
  if (!email) { showMsg('team-msg', 'Escribe un correo.', false); return; }
  try {
    await db.collection(`businesses/${state.businessId}/invitations`).add({
      emailLower: email, role, estado: 'pendiente',
      invitedBy: auth.currentUser.uid, invitedAt: FieldValue.serverTimestamp(),
    });
    showMsg('team-msg', 'Invitación creada. Se activa sola cuando esa persona entre con ese correo.', true);
    document.getElementById('team-email').value = '';
  } catch (e) { showMsg('team-msg', e.message, false); }
}

export async function quitarMiembro(uid) {
  if (!confirm('¿Quitar a esta persona del equipo?')) return;
  await db.doc(`businesses/${state.businessId}/members/${uid}`).delete();
}
