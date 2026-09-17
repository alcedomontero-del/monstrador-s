import { auth } from './firebase.js';
import { state } from './state.js';
import { showMsg } from './utils.js';

function traducirError(e) {
  const m = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión.',
    'auth/invalid-email': 'Correo inválido.',
    'auth/weak-password': 'Contraseña muy corta.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe cuenta con ese correo.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  };
  return m[e.code] || e.message;
}

export function doRegister() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (!email || pass.length < 6) return showMsg('auth-msg', 'Escribe un correo válido y una contraseña de al menos 6 caracteres.', false);
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => cred.user.sendEmailVerification())
    .catch(e => showMsg('auth-msg', traducirError(e), false));
}

// Mientras el correo no esté verificado, no puede aceptar invitaciones ni
// se le puede considerar dueño verificado de ese correo (ver firestore.rules).
export async function reenviarVerificacion() {
  const user = auth.currentUser; if (!user) return;
  try {
    await user.sendEmailVerification();
    showMsg('verify-msg', 'Reenviado. Revisa tu bandeja (y spam).', true);
  } catch (e) { showMsg('verify-msg', e.message, false); }
}

export function doLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  auth.signInWithEmailAndPassword(email, pass).catch(e => showMsg('auth-msg', traducirError(e), false));
}

export function doLogout() {
  Object.values(state.unsub).forEach(u => u && u());
  state.businessId = null; state.negocio = null; state.miRol = null;
  auth.signOut();
}
