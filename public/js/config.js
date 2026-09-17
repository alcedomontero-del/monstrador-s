/* =====================================================================
   ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA CONECTAR TU PROYECTO DE FIREBASE.
   Firebase Console → ⚙ Configuración del proyecto → Tus apps → SDK setup.
   El apiKey no es secreto: es normal que quede visible en el navegador.
   ===================================================================== */
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

// App Check (opcional pero recomendado): Firebase Console → App Check →
// reCAPTCHA v3 → registra tu sitio → pega aquí la "site key" pública.
// Déjalo en null mientras pruebas en local; sin esto la app sigue
// funcionando igual, solo queda sin esta capa extra de protección.
export const recaptchaSiteKey = null; // ej: "6Lc...tu_site_key"
