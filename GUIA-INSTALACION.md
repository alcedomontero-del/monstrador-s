# Guía de instalación — Mostrador SaaS (100% gratis, solo Firebase)

Stack: HTML/CSS/JS plano + Firebase Auth + Firestore + Storage + Firebase Hosting.
**Sin Node.js como servidor, sin Cloud Functions, sin plan de pago (Blaze), sin Cloudinary.**

---

## Decisiones tomadas (para que quede documentado)

- **Certificado digital / firma DGII:** fuera de alcance por ahora. Necesitaba Cloud Functions (servidor) para nunca exponer el archivo al navegador; sin backend propio no hay forma segura de hacerlo. Se retoma si más adelante deciden pagar Blaze.
- **Multiusuario (dueño/cajero/contador):** el dueño crea una invitación en Firestore; cuando la persona invitada inicia sesión con ese correo, se auto-agrega como miembro. Sin Cloud Function no se puede ocultar si un correo ya tenía cuenta, pero tampoco se expone: el dueño nunca sabe si existía o no.
- **Fotos de producto:** Firebase Storage en vez de Cloudinary. Mismo proyecto, gratis, protegido por reglas — no hace falta una segunda cuenta ni exponer un preset de subida abierto.
- **Hosting:** Firebase Hosting (todo en un solo lugar).

---

## 0. Necesitas

- Cuenta Google (para Firebase).
- Node.js **solo para instalar el CLI de Firebase** (es una herramienta de línea de comandos, no un servidor tuyo). Si prefieres no instalar Node en tu máquina, puedes hacer el paso 2 a mano desde la consola web (se indica la alternativa abajo).
- Git.

---

## Estructura del proyecto

```
public/
  index.html          → solo estructura (HTML), sin lógica
  css/style.css        → todos los estilos
  js/config.js          → ÚNICO archivo a editar con tu firebaseConfig
  js/firebase.js         → inicializa Auth/Firestore/Storage
  js/state.js             → estado compartido en memoria
  js/utils.js              → formato de dinero, hora, helpers de DOM
  js/auth.js                → login / registro / logout
  js/negocio.js               → onboarding, invitaciones, suscripciones a Firestore
  js/tabs.js                    → enrutador de las 5 pestañas
  js/venta.js, caja.js, fiado.js, inventario.js, equipo.js → una vista + su lógica cada uno
  js/main.js                     → cablea los botones y arranca la app
firestore.rules
storage.rules
firebase.json
firestore.indexes.json
```

Cada módulo hace una sola cosa; `main.js` es el único que los conecta a todos. Para importar Firebase en el navegador sin bundler, `index.html` carga los SDK "compat" como `<script>` normales y luego `js/main.js` como `<script type="module">` — eso es lo que permite usar `import`/`export` sin Node como build step.

---

## 1. Crear el proyecto de Firebase

1. `console.firebase.google.com` → **Crear proyecto** → nombre `mostrador-erp` (puedes desactivar Analytics).
2. **Plan del proyecto: deja Spark (gratis).** No hace falta Blaze para nada de esto.
3. Activa:
   - **Build → Authentication → Comenzar → Correo/Contraseña** → Habilitar.
   - **Build → Firestore Database → Crear** → *Modo producción* → región `us-central1` (o la más cercana).
   - **Build → Storage → Comenzar** → *Modo producción* → misma región.
4. **⚙ Configuración del proyecto → Tus apps → `</>` Web** → registra la app → copia el objeto `firebaseConfig`.
5. Pega ese objeto en **`public/js/config.js`** — es el único archivo que hay que tocar para conectar tu proyecto.

> El `firebaseConfig` no es secreto — es normal que quede visible en el HTML. Lo que protege los datos son `firestore.rules` y `storage.rules`, ya incluidas en el proyecto.

---

## 2. Desplegar las reglas de seguridad

### Opción A — con el CLI (recomendada, más rápida)

```bash
npm install -g firebase-tools
firebase login
cd ruta/del/proyecto        # donde está firebase.json
firebase use --add          # elige tu proyecto
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### Opción B — sin instalar nada, a mano

1. Firebase Console → **Firestore Database → Reglas** → pega el contenido de `firestore.rules` → **Publicar**.
2. **Storage → Reglas** → pega el contenido de `storage.rules` → **Publicar**.
3. El índice de `firestore.indexes.json` se crea solo la primera vez que la app haga esa consulta: la consola del navegador mostrará un error con un link "crea el índice aquí" — ábrelo y confirma. (O créalo antes: Firestore → Índices → Compuesto → colección `invitations`, ámbito *Grupo de colecciones*, campos `emailLower` Asc + `estado` Asc.)

---

## 3. Subir a GitHub

```bash
cd ruta/del/proyecto
git init
git branch -M main
echo -e ".firebase/\n*.log" > .gitignore
git add .
git commit -m "Mostrador SaaS: Firebase Auth + Firestore + Storage"
```

Crea un repo en `github.com/new` (puede ser privado), luego:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

---

## 4. Desplegar en Firebase Hosting

```bash
firebase deploy --only hosting
```

Te da una URL tipo `tu-proyecto.web.app`. Cada vez que cambies el HTML, repite este comando (o conecta GitHub Actions desde la consola de Firebase para que se despliegue solo con cada `git push`, opcional).

### 4.1 Autorizar el dominio (login)

Firebase ya autoriza automáticamente `tu-proyecto.web.app` y `tu-proyecto.firebaseapp.com`. Si luego usas un dominio propio: **Authentication → Settings → Dominios autorizados → Agregar**.

---

## 5. Probar

1. Abre la URL de Hosting.
2. Crea una cuenta (correo + contraseña) → crea tu negocio → ya puedes vender.
3. Para probar multiusuario: en **Equipo**, invita otro correo como "cajero" → abre la app en incógnito → crea cuenta con ese correo → entra directo al mismo negocio con ese rol.
4. Abre la misma cuenta en otro dispositivo/navegador: verás el mismo inventario y caja en tiempo real.

---

## 6. Seguridad — qué ya está y qué falta

**Ya implementado en el código (no hay que programar nada más para esto):**

- **Verificación de correo obligatoria para aceptar invitaciones.** Al registrarse se envía un correo de verificación; mientras no se confirme, la persona ve un banner y no puede unirse a un negocio por invitación (reforzado también en `firestore.rules`, no solo en el navegador). Esto cierra el hueco de que alguien registre una cuenta con el correo de otra persona para robarle una invitación.
- **App Check (opcional, actívalo así):**
  1. Firebase Console → **App Check → reCAPTCHA v3** → registra tu dominio (`tu-proyecto.web.app`) → copia la **site key**.
  2. Pégala en `public/js/config.js`, en `recaptchaSiteKey`.
  3. Cuando confirmes que la app sigue funcionando, en App Check → pestaña **APIs** activa **"Enforce"** para Firestore y Storage — ahí es cuando realmente empieza a bloquear tráfico que no venga de tu app.
  - Mientras `recaptchaSiteKey` esté en `null`, la app funciona igual, solo sin esta capa.

**Pendiente (decisión de negocio, no técnica todavía):**

1. **Backups de Firestore**: exportación manual periódica desde la consola (Firestore → Copias de seguridad) — el respaldo automático programado sí requiere Blaze; el manual es gratis.
2. **Ley 172-13 (RD)** — política de privacidad, revisada con un abogado antes de vender el servicio.
3. **Fraude interno**: un cajero con conocimientos técnicos podría manipular una venta desde las herramientas del navegador, porque los montos se calculan del lado del cliente. Cerrarlo del todo requiere validación en servidor (Cloud Functions), fuera de alcance mientras se mantenga todo gratis — mitigación parcial: revisar el reporte de caja al cierre contra el conteo físico (ya lo hace la pantalla de Caja).

---

## 7. Límites del plan gratis (Spark) a tener en cuenta

| Servicio | Límite gratis/día | Suficiente para |
|---|---|---|
| Firestore | 50,000 lecturas, 20,000 escrituras, 1 GB almacenado | Varios negocios chicos vendiendo a diario |
| Storage | 1 GB descarga/día, 5 GB almacenado | Cientos de fotos de producto |
| Authentication | Ilimitado | — |
| Hosting | 10 GB transferencia/mes | Tráfico normal de una app de uso interno |

Si un negocio individual se acerca a estos límites es buena señal (está vendiendo mucho); ahí conviene evaluar Blaze — solo se cobra el excedente, no todo el uso.

---

## 8. Si algo falla

| Síntoma | Causa típica |
|---|---|
| `Missing or insufficient permissions` | Reglas no desplegadas, o el usuario no es miembro del negocio todavía |
| La invitación no se activa | El invitado debe iniciar sesión (no solo tener cuenta) para que se resuelva; revisa que el correo esté exactamente igual (minúsculas) |
| `The query requires an index` al invitar/entrar | Abre el link del error y crea el índice (paso 2, Opción B, punto 3) |
| `auth/unauthorized-domain` | Dominio no autorizado en Authentication → Settings |
| Foto de producto no sube | Revisa que el archivo sea imagen y pese menos de 3 MB (límite en `storage.rules`) |
