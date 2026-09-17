/* =====================================================================
   ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA CONECTAR TU PROYECTO DE FIREBASE.
   Firebase Console → ⚙ Configuración del proyecto → Tus apps → SDK setup.
   El apiKey no es secreto: es normal que quede visible en el navegador.
   ===================================================================== */
export const firebaseConfig = {
  apiKey: "AIzaSyCYJ_2saV0Iycmyr1pGtZgZ4iqaNqZKG3M",
  authDomain: "mostrador-s.firebaseapp.com",
  projectId: "mostrador-s",
  storageBucket: "mostrador-s.firebasestorage.app",
  messagingSenderId: "295989278227",
  appId: "1:295989278227:web:72e9f42ddffc954d0eb1e6",
  measurementId: "G-0WHM61YHZ2"
};

// App Check (opcional pero recomendado): Firebase Console → App Check →
// reCAPTCHA v3 → registra tu sitio → pega aquí la "site key" pública.
// Déjalo en null mientras pruebas en local; sin esto la app sigue
// funcionando igual, solo queda sin esta capa extra de protección.
export const recaptchaSiteKey = null; // ej: "6Lc...tu_site_key"
