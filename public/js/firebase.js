import { firebaseConfig, recaptchaSiteKey } from './config.js';

// El SDK "compat" (cargado como <script> en index.html) expone el global `firebase`.
firebase.initializeApp(firebaseConfig);

if (recaptchaSiteKey) {
  firebase.appCheck().activate(recaptchaSiteKey, true); // true = autorenovar el token
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const FieldValue = firebase.firestore.FieldValue;

db.enablePersistence({ synchronizeTabs: true }).catch(() => {
  // varias pestañas abiertas o navegador sin soporte: sigue funcionando sin caché offline
});
