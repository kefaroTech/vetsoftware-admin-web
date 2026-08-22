# Alta de superadministradores por invitación — especificación de diseño

> **Repo:** `VetSoftwareFront` (consola de plataforma).
> **Estado:** especificación aprobada para implementar. **Nada de esto está construido.**
> **Alcance:** 3 vistas públicas nuevas + 1 layout extraído + 3 rutas. Cero cambios de dominio.
> **Quien implementa:** `front-feature`. Este documento no toca `src/`.
> **Fecha de verificación del árbol:** 2026-08-22, sobre el árbol de trabajo tal cual está.
> Si algún `fichero:línea` no cuadra, **manda el código**.

## 0 · Qué se leyó y qué NO se ejecutó

**Leído** (fuente verbatim): `src/features/auth/views/LoginView.vue` (441 líneas, completo),
`src/router/index.ts`, `src/router/routes/auth.routes.ts`, `src/router/guards/auth.guard.ts`,
`src/App.vue`, `index.html`, los 11 componentes de `src/components/`, `src/composables/validators.ts`,
`src/composables/useToast.ts`, `src/composables/useConfirmDialog.ts`, `src/stores/loader.store.ts`,
`src/stores/confirmDialog.store.ts`, `src/services/http/http.client.ts` (helpers),
`src/constants/icons.ts`, `src/constants/routes.ts`, las familias relevantes de
`src/assets/styles/primitives.css` y `src/assets/styles/tokens.css`, `scripts/css-budget.config.json`,
`docs/ux/reglas-de-interfaz.md` y `docs/ux/patron-de-mensajes.md`. Referencia del otro repo,
solo lectura: `VetSoftwarePublicFront/src/features/auth/views/RestablecerContrasenaView.vue`.

**Medido de verdad:** los ratios de contraste de §10, calculados con la fórmula literal de
WCAG 2.2 (luminancia relativa sRGB) sobre los hexadecimales que hoy están escritos en
`LoginView.vue`. Script desechable en el scratchpad, no versionado.

**NO ejecutado, y por tanto no se da por pasado:** servidor de desarrollo, Playwright,
`npm run quality`, `ds:audit`, Vitest, `stylelint`, `scripts/css-budget.mjs`. No hay ninguna
herramienta de accesibilidad automatizada en este repo (`axe-core`, `eslint-plugin-vuejs-accessibility`,
pa11y, Lighthouse: cero dependencias, cero pasos de CI), así que **nada de lo que aquí se especifica
lo va a comprobar una máquina si no se escriben las pruebas de §12.**

---

## 1 · Inventario: qué hay en ESTA consola y con qué se sustituye lo que no hay

`AuthField` y `AuthInput` **no existen aquí**. Son del tenant (`VetSoftwarePublicFront/src/components/public/`)
y dependen de la paleta `--pub-*` y de `v-icon` de Vuetify, que en esta consola solo sobrevive como
`<v-app>` en `App.vue:9`. **No se importan, no se copian, no se recrean.**

### 1.1 Lo que SÍ existe y hay que usar

| Necesidad | Pieza de esta consola | Fichero | Notas de uso |
|---|---|---|---|
| Campo de texto con etiqueta, error y ayuda | **`AppInput`** | `src/components/ui/AppInput.vue:73-101` | Props: `modelValue`, `label`, `required`, `error`, `hint`, `placeholder`, `type`, `id`, `disabled`, `readonly`, `autocomplete`, `inputmode`. Emite `update:modelValue` y `blur`. Ya pone `aria-invalid` (`:88`) y aplica el patrón de dos capas de tono (`:66-70`). **Sustituye a `AuthField` + `AuthInput` de golpe: hace las dos cosas.** |
| Área de texto (el «motivo») | **`AppTextarea`** | `src/components/ui/AppTextarea.vue` | Mismas props menos `type`/`inputmode`, más `rows`. |
| Botón | **clase `.ds-btn`**, no hay componente | `primitives.css:30`, variantes `:72-145` | `.ds-btn--primary` (degradado, CTA), `.ds-btn--ghost` (secundario con contorno), `.ds-btn--danger-solid` (destructivo), `.ds-btn--plain` (terciario de texto). Foco: `.ds-btn:focus-visible` ya pone `var(--ring)` (`:147`). Deshabilitado: `:152`. **No se crea un `AppButton`, y no se recrea el `.primary-btn` local de `LoginView.vue:357-390`: ese se retira en §2.4.** |
| Banner de estado en el flujo | **`.ds-banner` + tono** | `primitives.css:190-237` | `--error`, `--warning`, `--success`, `--info`. Los cuatro tonos ya están medidos contra §1.4.11 (A11Y-09). `--sm` para tamaño compacto, `--flush` **obligatorio** dentro de un contenedor flex con `gap` (`:186-189`). |
| Resumen de errores del formulario | **`ErrorSummary`** | `src/components/feedback/ErrorSummary.vue` | Con el helper `toSummaryItems(errors, ids, order)` (`:16-27`). Expone `focus()` (`:69`) para llamarlo tras un `validate()` fallido. Los anclas mueven **el foco**, no solo el hash (`:62-67`). **Hoy tiene 0 consumidores en la consola: estas tres vistas son sus primeros.** |
| Confirmación bloqueante | **`useConfirmDialog().confirm()`** | `src/composables/useConfirmDialog.ts:14-26`, `src/stores/confirmDialog.store.ts:46-61`, `src/components/feedback/AppConfirmDialog.vue` | Acepta `{ message, consequence, confirmLabel }`. Devuelve `Promise<boolean>`. Ya montado globalmente en `App.vue:26`. No descartable a propósito (`:closable="false"`). |
| Diálogo genérico | `ModalShell` / `AppModal` | `src/components/ui/ModalShell.vue`, `AppModal.vue` | **Aquí no se usan directamente**: la única necesidad de modal la cubre `useConfirmDialog`. Nota factual contra el mito: `ModalShell` **sí tiene trampa de foco** (`:188`, `@keydown.capture="modalFocus.onTrapTab"`) y devolución de foco (`:157`). |
| Estado vacío / de cierre con salida | **`AppEmptyState`** | `src/components/feedback/AppEmptyState.vue` | Props `title`, `description`, `icon`; slot por defecto para el botón de salida. Se usa en el estado **cerrado** de `/solicitar-acceso` y en los `invalid`. |
| Cargando | **`PawLoader`** | `src/components/feedback/PawLoader.vue` | Único loader admitido (**R06**, `docs/ux/reglas-de-interfaz.md`). Ya lleva `role="status"` + `.ds-sr-only` (`:24-27`, `:77`). **Prohibido** copiar el `.rp-spin` de `RestablecerContrasenaView.vue:168-176` del tenant: es una rotación CSS suelta y viola R06. |
| Velo global de carga | `PageLoader` + `loader.store` | `src/components/feedback/PageLoader.vue`, `src/stores/loader.store.ts:15-16` | Lo disparan **los interceptores de axios en toda petición** salvo `skipGlobalLoader: true` (`http.client.ts:187-188`). Retardo 200 ms, visible mínimo 300 ms. Ver §4.2 y §5.2: en estas vistas se usa a propósito en unos casos y se desactiva en otros. |
| Avisos efímeros | `useToast()` → `errorFrom(titulo, error)` | `src/composables/useToast.ts:42-50` | Conserva el `X-Trace-Id`. **Nunca** `error(titulo, getProblemDetailMessage(e))` a mano. |
| Validadores | `src/composables/validators.ts` | `:40`, `:49`, `:58`, `:70`, `:79` | `required`, `length`, `maxLength`, `selection`, `pattern`. Redacción obligatoria: sujeto con artículo, regla real, punto final, segunda persona (`:9-23`). |
| Iconos | `ICONS` | `src/constants/icons.ts:69-131` | Usar `ICONS.MAIL`, `ICONS.USER`, `ICONS.LOCK`, `ICONS.KEY`, `ICONS.CHECK`/`SUCCESS`, `ICONS.ERROR`, `ICONS.WARNING`, `ICONS.SHIELD`, `ICONS.ARROW_RIGHT`, `ICONS.EYE`/`EYE_OFF`. **No añadir iconos nuevos a Lucide sin necesidad**; los que hacen falta ya están. |
| Solo para lector de pantalla | `.ds-sr-only` | `primitives.css:1591-1601` | |

### 1.2 Lo que NO existe y hay que crear (y solo esto)

| Pieza nueva | Dónde | Por qué no se resuelve con lo que hay |
|---|---|---|
| **`PublicLayout.vue`** | `src/components/layout/PublicLayout.vue` | Hoy el shell público está **incrustado** en `LoginView.vue:45-141` + 297 líneas de `<style scoped>`. Cuatro vistas no pueden compartirlo sin extraerlo. Ver §2. |
| **`CodeInput.vue`** | `src/components/ui/CodeInput.vue` | `AppInput` no puede: el código de 6 dígitos necesita saneado a dígitos en `input`, `inputmode="numeric"`, `autocomplete="one-time-code"` y tipografía monoespaciada espaciada. Ver §7. **Es un envoltorio delgado, no un componente nuevo de campo:** reutiliza `.ds-field` + los tonos y el marcado de etiqueta/error de `AppInput`. |
| **`PasswordChecklist.vue`** | `src/components/ui/PasswordChecklist.vue` | Ver §8.3. Opcional; si se recorta el alcance, es lo primero que cae. |
| **`platform-access.api.ts`** + tipos | `src/features/platform-access/api/` | Cuatro llamadas nuevas. Ver §3.3. |
| 3 vistas | `src/features/platform-access/views/` | §4, §5, §6. |

### 1.3 Lo que NO se debe crear

- **`AppButton`.** El sistema no lo tiene y `.ds-btn` cubre las cuatro variantes que hacen falta.
- **Un `ds-*` nuevo en `primitives.css`.** Ese fichero es gemelo TR-02 y propiedad de `front-parity`.
  Todo lo visual nuevo de esta especificación cabe en el `<style scoped>` de `PublicLayout`, **una sola copia**.
- **Un medidor de fortaleza con librería** (`zxcvbn` y equivalentes). Ver §8.3.
- **Seis casillas para el código.** Ver §7.1.

---

## 2 · `PublicLayout` — extracción del shell de `LoginView`

### 2.1 Qué se extrae, literalmente

De `LoginView.vue`, al nuevo `src/components/layout/PublicLayout.vue`:

| Del template | Líneas de origen | Destino |
|---|---|---|
| `<div class="login-shell ds-stack">` | `:45` | raíz `<div class="pub-shell ds-stack">` |
| Los dos `.blob` decorativos | `:46-47` | tal cual, con su `aria-hidden="true"` |
| `<header class="topbar">` con marca + enlace | `:49-57` | `<header>` con marca fija + **slot `#topRight`** |
| `<main class="login-main">` | `:59` | `<main id="pub-main" class="pub-main">` |
| `<div class="login-card">` | `:60` | envoltorio condicional según prop `card` |
| Eyebrow / título / subtítulo | `:61-63` | **props** `eyebrow`, `title`, `subtitle` (ver §2.2) |
| El contenido del formulario | `:73-129` | `<slot />` |
| `<footer class="footer">` | `:133-140` | tal cual |

Del `<style scoped>` (`:144-441`): **todo**, renombrando `.login-shell`→`.pub-shell`,
`.login-main`→`.pub-main`, `.login-card`→`.pub-card`, y dejando en `LoginView` solo lo que
pertenece a los campos y no al shell.

### 2.2 API del componente

```ts
withDefaults(defineProps<{
  /** Rótulo de acento sobre el título. Opcional: los estados con icono no lo llevan. */
  eyebrow?: string
  /** Encabezado de la tarjeta. Se pinta como <h1>. Vacío ⇒ no se pinta (lo pone el slot). */
  title?: string
  /** Párrafo bajo el título. */
  subtitle?: string
  /** Icono circular sobre el título, para los estados terminales (éxito / error). */
  statusIcon?: Component
  /** Tono del icono de estado. */
  statusTone?: 'success' | 'danger' | 'accent'
  /** Envolver el slot en la tarjeta blanca. `false` solo si algún día hace falta ancho completo. */
  card?: boolean
  /** Ancho máximo de la tarjeta en px. Login usa el valor por defecto. */
  maxWidth?: number
  /** Título del documento (WCAG 2.2 §2.4.2). Se escribe en `document.title` al montar. */
  documentTitle?: string
}>(), { card: true, maxWidth: 440, statusTone: 'accent' })
```

Slots: **por defecto** (cuerpo de la tarjeta) y **`#topRight`** (el enlace contextual de la barra
superior). Sin slot `#footer`: el pie es idéntico en las cuatro pantallas y no se parametriza.

**Por qué `eyebrow`/`title`/`subtitle` son props y no slots.** Un `<style scoped>` no alcanza al
contenido inyectado por slot (se compila con el `data-v` del padre). Si el trío fuera slot, las
cuatro vistas tendrían que redeclarar `.eyebrow`, `.title` y `.subtitle` en su propio scoped: cuatro
cuerpos idénticos. Eso lo rechazan **las dos puertas del repo** —
`stylelint-plugins/no-duplicate-primitive.mjs` (regla `vetsoftware/no-duplicate-primitive`) y
`scripts/css-budget.config.json` con `"maxDuplicateGroups": 0` y `"maxStyleMinusScript": 0`. Con
props, el CSS vive en un solo sitio y las vistas nuevas aportan **casi cero líneas de estilo**, que
es exactamente lo que el presupuesto (hoy en su ajuste más estricto, según el comentario del propio
`css-budget.config.json`) necesita para no subir.

**Por qué `statusIcon` es prop y no un `<div>` en cada vista.** Mismo motivo: el círculo de 68 px
con tono de éxito/error aparece en 5 estados distintos repartidos por las tres vistas. Una copia.
El patrón se calca del `.rp-icon` del tenant (`RestablecerContrasenaView.vue:178-197`) pero con
tokens de esta consola: `--success-bg`/`--success-border`/`--success-fg` y `--danger-bg`/`--danger-border`/`--danger-fg`,
que ya están medidos.

### 2.3 Marcado obligatorio del layout

```html
<div class="pub-shell ds-stack">
  <a class="pub-skip ds-sr-only" href="#pub-main">Saltar al contenido</a>   <!-- WCAG 2.2 §2.4.1 -->
  <div class="blob blob-tr" aria-hidden="true" />
  <div class="blob blob-bl" aria-hidden="true" />

  <header class="topbar">
    <div class="brand"> … marca … </div>
    <div class="topbar-link"><slot name="topRight" /></div>
  </header>

  <main id="pub-main" class="pub-main" tabindex="-1">
    <div v-if="card" class="pub-card" :style="{ maxWidth: `${maxWidth}px` }">
      <div v-if="statusIcon" class="pub-status" :class="`pub-status--${statusTone}`">
        <component :is="statusIcon" :size="38" :stroke-width="1.6" />
      </div>
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
      <h1 v-if="title" class="title">{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      <slot />
    </div>
    <slot v-else />
  </main>

  <footer class="footer"> … © 2026 VetSoftware · Privacidad · Términos · Soporte … </footer>
</div>
```

Tres cosas que **no** son opcionales:

1. **El skip link** (`.pub-skip`) resuelve **WCAG 2.2 §2.4.1 Bypass Blocks (A)**, que hoy la consola
   incumple en toda la aplicación (cero ocurrencias en `src/`). En las públicas el bloque a saltar es
   corto, pero el layout es el sitio donde el patrón entra al sistema. `.ds-sr-only` lo oculta y una
   regla `.pub-skip:focus-visible` lo devuelve a la vista (posición fija arriba a la izquierda,
   fondo `--warm-50`, anillo `var(--ring)`). **Ojo con `.ds-sr-only`:** `clip-path: inset(50%)`
   (`primitives.css:1598`) sigue recortando aunque el elemento reciba el foco; la regla de foco
   tiene que anular `position`, `width`, `height`, `clip-path` y `margin`. Si no, el enlace existe
   y es invisible, que es peor que no tenerlo.
2. **`<h1>` único por pantalla.** Hoy `LoginView.vue:62` ya lo hace bien. Los estados terminales
   (éxito, cerrado, inválido) **cambian el texto del `<h1>`, no lo eliminan**: una pantalla sin `<h1>`
   rompe §1.3.1 y deja al lector de pantalla sin punto de referencia tras el cambio de estado.
3. **`document.title`.** `index.html:13` dice `<title>VetSoftware</title>` para las 38 rutas y
   `grep -rn "document.title" src/` da **cero** en los dos repos (documentado en
   `docs/ux/reglas-de-interfaz.md` R08, issue **public-web #133**). El layout lo escribe en `onMounted`
   y en un `watch` sobre `documentTitle`. Las tres vistas nuevas lo pasan por estado. Es la forma
   barata de que estas rutas nazcan cumpliendo **§2.4.2 Page Titled (A)** aunque el resto de la
   consola siga sin cumplirlo.

### 2.4 Cómo se aplica a `LoginView` sin romperlo

Es un refactor **pixel-exacto**. Regla dura: la extracción **no cambia ni un color ni un valor**.
Los hexadecimales literales de `LoginView.vue:148-441` (`#f3e8ff`, `#f5f1fa`, `#ede8f4`, `#1a1325`,
`#6b5b80`, `#7e22ce`, `#3d2e57`, `#ece5f4`, `#a89bbd`, `#581c87`, `#a855f7`, `#581c87`) se mueven
**verbatim** a `PublicLayout`. Tokenizarlos es un cambio visual con riesgo de regresión y es trabajo
de `front-parity`, en otra tanda, con las líneas base de `front-e2e-visual` delante. Aquí se gana lo
que hay que ganar: **de cuatro copias futuras a una sola**.

`LoginView.vue` queda así:

```html
<PublicLayout
  eyebrow="Panel administrativo"
  title="Inicia sesión"
  subtitle="Accede al panel para administrar VetSoftware."
  document-title="Iniciar sesión · VetSoftware"
>
  <template #topRight>
    ¿Eres nuevo?
    <RouterLink :to="{ name: ROUTE_NAMES.ACCESS_REQUEST }">Solicita acceso</RouterLink>
  </template>
  <!-- el banner de sesión, el formulario y sus dos campos, tal cual están hoy -->
</PublicLayout>
```

Cambios colaterales en `LoginView` que **sí** hay que hacer, porque son defectos ya presentes:

- `LoginView.vue:56` — `<a href="#">Solicita acceso</a>` es un enlace muerto. Pasa a
  `<RouterLink>` a la ruta nueva. **Este es el único punto de entrada de todo el flujo**: sin él,
  `/solicitar-acceso` es una URL que nadie descubre.
- `LoginView.vue:136-138` — `Privacidad`, `Términos` y `Soporte` son también `href="#"`. Se mueven
  al layout tal cual (siguen muertos), **pero** un `<a>` sin destino real es un control anunciado
  como enlace que no hace nada (§4.1.2, y NN/g H1 *visibilidad del estado*). Si no hay destino,
  el arreglo correcto es `<span>`, no `<a href="#">`. **Decisión pendiente del humano**, ver §11.
- El `.primary-btn` local (`:357-390`, 34 líneas) se sustituye por
  `class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"`. Es el mismo degradado
  (`--gradient-primary`, `primitives.css:79-83`) y la misma sombra (`.ds-btn--elevated`, `:112`), y
  quita 34 líneas del presupuesto de CSS **en el mismo commit que añade el layout**, que es lo que
  compensa `maxStyleMinusScript: 0`. El `transform: translateY(-1px)` del hover local y su
  `@media (prefers-reduced-motion: reduce)` (`:436-440`) desaparecen con él: `.ds-btn` no eleva en hover.

### 2.5 Presupuesto de CSS: la cuenta

| Movimiento | Δ líneas de `<style>` |
|---|---|
| `LoginView.vue` cede el shell a `PublicLayout` | −270 aprox. |
| `PublicLayout.vue` lo recibe | +270 aprox. |
| `.primary-btn` local retirado (`:357-390` + `:436-440`) | **−39** |
| `.pub-status` (3 tonos) + `.pub-skip:focus-visible` nuevos | **+28** aprox. |
| Las 3 vistas nuevas | **≈ +10 en total** (solo la rejilla de acciones del estado `form` de aprobación) |

Neto esperado: **negativo o plano**. Si sale positivo, el trinquete de `css-budget.config.json`
falla el build y **la respuesta correcta no es subir el techo**, es mover más estilo del shell al
layout o retirar otro cuerpo duplicado.

---

## 3 · Rutas, guarda y contrato de API

### 3.1 `src/constants/routes.ts`

```ts
ACCESS_REQUEST: 'access-request',        // /solicitar-acceso
ACCESS_APPROVAL: 'access-approval',      // /aprobar-acceso
ACCESS_INVITATION: 'access-invitation',  // /aceptar-invitacion
```

### 3.2 `src/router/routes/platform-access.routes.ts` (fichero nuevo, registrado en `router/index.ts`)

Las tres llevan `meta: { public: true }` — es lo que `authGuard` mira (`auth.guard.ts:10`) y sin ello
un visitante sin token acaba redirigido a `/login` con `?redirect=`, que en estas tres rutas es
justo lo contrario de lo que se quiere.

`permissionGuard` corre después de `authGuard` (`router/index.ts:79-80`): **verificar que no exige
permisos cuando `meta.public === true`**. Si los exige, es un bloqueante de esta tanda.

Rutas en **español**, coherentes con el enunciado y con el tenant. La ruta ya existente
`/login` se queda en inglés; la incoherencia es previa y no se resuelve aquí.

### 3.3 Contrato que se le pide al backend

| Paso | Método | Recurso | Respuesta que el front necesita |
|---|---|---|---|
| ¿Está abierto el formulario? | `GET` | `/system-users/access-requests/availability` | `200` abierto · **`404` cerrado**. Sin cuerpo distintivo. |
| Enviar solicitud | `POST` | `/system-users/access-requests` | `201` genérico · `404` si se cerró entre la carga y el envío · `400` con `ProblemDetail.errors[]` por campo |
| Cargar solicitud a aprobar | `GET` | `/system-users/access-requests/pending?token=…` | `200` con `{ requesterName, requesterEmail, reason, requestedAt }` · `404`/`410` si el token no sirve |
| Resolver | `POST` | `/system-users/access-requests/resolve` | cuerpo `{ token, code, decision: 'APPROVE' \| 'REJECT' }` · `200` · `422` código incorrecto con `remainingAttempts` · `429` bloqueado |
| Validar invitación | `GET` | `/system-users/invitations/validate?token=…` | `200` con `{ email }` · `404`/`410` si no sirve |
| Aceptar invitación | `POST` | `/system-users/invitations/accept` | cuerpo `{ token, password }` · `204` · `410` si caducó entre medias |

Cuatro exigencias de diseño sobre ese contrato, **no negociables desde el front**:

1. **El 404 de disponibilidad no puede llevar un `ProblemDetail.detail` que explique el motivo.**
   El front pinta texto propio (§4.4) y no muestra nunca el mensaje del servidor en ese estado.
   Si el backend responde `"Ya existe un superadministrador"`, cualquiera lo lee en la pestaña de red.
2. **El `POST` de solicitud responde igual esté el email ya registrado o no.** Si distingue, el
   formulario se convierte en un oráculo de enumeración de cuentas de plataforma.
3. **El token de aprobación es el secreto de esa pantalla.** ≥128 bits, de un solo uso, caducidad
   corta. La pantalla muestra el nombre, el correo y el motivo del solicitante **a quien tenga el
   enlace**: si el token es adivinable, eso es una fuga de datos personales. Ver §11.
4. **`404`, `410` y «token ya usado» se pintan con el MISMO texto** en el front (§5.5, §6.5).
   Distinguirlos le dice a quien prueba enlaces cuáles existieron.

---

## 4 · `/solicitar-acceso` — solicitud de acceso

**Quién y para qué.** Alguien que va a administrar la plataforma —no un veterinario con el animal
delante— pide una cuenta. Se rellena una vez en la vida, desde un escritorio, sin prisa. Eso permite
un formulario largo y explicaciones; lo que **no** permite es perder lo escrito.

**Máquina de estados:** `checking → (form | closed)`; `form → sending → sent`; `sending → form` (error
recuperable) o `→ closed` (404 en el envío).

`document.title` por estado:
`Solicitar acceso · VetSoftware` / `Solicitud enviada · VetSoftware` / `Solicitudes no disponibles · VetSoftware`.

### 4.1 Estado `checking`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                             ¿Ya tienes cuenta?      │
│                                              Iniciar sesión          │
│                                                                      │
│            ┌──────────────────────────────────────────┐              │
│            │                                          │              │
│            │              ( PawLoader )               │              │
│            │                                          │              │
│            │        Comprobando disponibilidad…       │              │
│            │                                          │              │
│            └──────────────────────────────────────────┘              │
│                                                                      │
│ © 2026 VetSoftware              Privacidad · Términos · Soporte      │
└──────────────────────────────────────────────────────────────────────┘
```

- `PawLoader` centrado, `:size="72"`, `label="Comprobando disponibilidad"`.
- Llamada `GET` con **`skipGlobalLoader: true`**: el velo global oscurece toda la pantalla
  (`PageLoader.vue:17-27`) y aquí el destino de la carga es la tarjeta, no la página. El velo sobre
  una tarjeta vacía es ruido.
- **Sin `<h1>` durante `checking`**: el título todavía no se sabe (depende de si está abierto o
  cerrado) y poner uno provisional obliga a cambiarlo, lo que en un lector de pantalla se oye dos
  veces. La tarjeta lleva `aria-busy="true"` y `PawLoader` ya anuncia con `role="status"`.
- **Umbral:** si la respuesta llega en menos de ~200 ms no debe verse parpadeo. `PawLoader` se pinta
  con el mismo retardo que el velo global (200 ms) mediante un `setTimeout` local, o se acepta el
  parpadeo. **Recomendado: retardo de 200 ms** (NN/g, *Response Times: The 3 Important Limits*: por
  debajo de 1 s no hace falta indicador, y por debajo de 0,1 s el indicador molesta más que ayuda).

### 4.2 Estado `form`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                             ¿Ya tienes cuenta?      │
│                                              Iniciar sesión          │
│                                                                      │
│        ┌────────────────────────────────────────────────┐            │
│        │ SOLICITUD DE ACCESO                            │  eyebrow   │
│        │ Solicita una cuenta de plataforma              │  <h1>      │
│        │ Tu solicitud la revisa una persona. Si se      │  subtitle  │
│        │ aprueba, te llegará un correo para crear tu    │            │
│        │ contraseña.                                    │            │
│        │                                                │            │
│        │ ┌────────────────────────────────────────────┐ │ ← ErrorSummary
│        │ │ ⚠ Hay 2 problemas en este formulario       │ │   (solo tras
│        │ │   · El nombre es obligatorio.              │ │   un envío
│        │ │   · El correo no tiene el formato correcto.│ │   fallido)
│        │ └────────────────────────────────────────────┘ │            │
│        │                                                │            │
│        │ Nombre completo *                              │            │
│        │ ┌────────────────────────────────────────────┐ │            │
│        │ │ Ada Lovelace                               │ │            │
│        │ └────────────────────────────────────────────┘ │            │
│        │                                                │            │
│        │ Correo electrónico *                           │            │
│        │ ┌────────────────────────────────────────────┐ │            │
│        │ │ nombre@empresa.com                         │ │            │
│        │ └────────────────────────────────────────────┘ │            │
│        │ Aquí te enviaremos la respuesta.               │  ds-hint   │
│        │                                                │            │
│        │ Motivo de la solicitud *                       │            │
│        │ ┌────────────────────────────────────────────┐ │            │
│        │ │                                            │ │            │
│        │ │                                            │ │            │
│        │ │                                            │ │            │
│        │ └────────────────────────────────────────────┘ │            │
│        │ Explica para qué necesitas administrar la      │  ds-hint   │
│        │ plataforma. 0/500                              │            │
│        │                                                │            │
│        │ ┌────────────────────────────────────────────┐ │            │
│        │ │            Enviar solicitud  →             │ │  ds-btn--primary
│        │ └────────────────────────────────────────────┘ │            │
│        └────────────────────────────────────────────────┘            │
│                                                                      │
│ © 2026 VetSoftware              Privacidad · Términos · Soporte      │
└──────────────────────────────────────────────────────────────────────┘
```

Estado `sending`: el botón pasa a `Enviando…` y `:disabled="true"`; los tres campos a `:disabled`;
el velo global **sí** aparece (petición normal, sin `skipGlobalLoader`) y bloquea el doble envío.

### 4.3 Estado `sent`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                             ¿Ya tienes cuenta?      │
│                                              Iniciar sesión          │
│                                                                      │
│        ┌────────────────────────────────────────────────┐            │
│        │                    ( ✓ )                       │  statusIcon
│        │                                                │  success   │
│        │ Solicitud enviada                              │  <h1>      │
│        │                                                │            │
│        │ Enviamos tu solicitud a revisión. Si se        │  subtitle  │
│        │ aprueba, recibirás un correo en                │            │
│        │ ada@empresa.com con el enlace para crear tu    │            │
│        │ contraseña. El enlace caduca una hora después  │            │
│        │ de que lo enviemos.                            │            │
│        │                                                │            │
│        │ ┌────────────────────────────────────────────┐ │            │
│        │ │ ℹ Revisa también la carpeta de correo no   │ │ ds-banner  │
│        │ │   deseado. No hace falta que dejes esta    │ │ --info     │
│        │ │   página abierta.                          │ │            │
│        │ └────────────────────────────────────────────┘ │            │
│        │                                                │            │
│        │           [ Ir a iniciar sesión ]              │ ds-btn--ghost
│        └────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

El correo se repite **literal, tal y como lo escribió el usuario**: es la única forma de que
detecte una errata sin volver atrás (NN/g, *Ten Usability Heuristics* H1, visibilidad del estado).

### 4.4 Estado `closed` — el que se olvida

Este estado se alcanza por dos caminos: el `GET` de disponibilidad devuelve 404, **o** el `POST`
devuelve 404 porque alguien completó el alta mientras el formulario estaba abierto. **El mismo
estado y el mismo texto en los dos casos.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                             ¿Ya tienes cuenta?      │
│                                              Iniciar sesión          │
│                                                                      │
│        ┌────────────────────────────────────────────────┐            │
│        │                    (  ! )                      │  statusIcon
│        │                                                │  neutral   │
│        │ Las solicitudes de acceso están cerradas       │  <h1>      │
│        │                                                │            │
│        │ Esta consola no está aceptando solicitudes de  │  subtitle  │
│        │ acceso ahora mismo.                            │            │
│        │                                                │            │
│        │ Si necesitas una cuenta de plataforma, pídesela│            │
│        │ a quien ya administra VetSoftware en tu         │            │
│        │ organización.                                  │            │
│        │                                                │            │
│        │           [ Ir a iniciar sesión ]              │ ds-btn--ghost
│        └────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**Reglas de redacción de este estado, que es donde se filtra información:**

- **Nunca** «ya existe un superadministrador», «el alta inicial ya se completó», «esta plataforma ya
  está configurada», ni una fecha. Todo eso confirma el estado interno del sistema a un desconocido.
- **Nunca** el `ProblemDetail.detail` del 404. En este estado el front **ignora el cuerpo de la
  respuesta** y pinta su propio texto.
- **Nunca** «vuelve a intentarlo más tarde»: es falso, no se va a reabrir solo, y manda al usuario
  a golpear la puerta.
- El tono es **neutro, no de error**. No ha fallado nada: el usuario no puede hacer eso, punto.
  Por eso `statusTone="accent"` (círculo amatista) y no `danger`, y por eso **no** hay banner rojo.
- La salida es real y es la única que existe: iniciar sesión, por si ya tenía cuenta.
- El toast de error **no** se dispara en este camino. Un 404 aquí es una respuesta esperada, no un
  fallo (`docs/ux/patron-de-mensajes.md` §1, pregunta 1: el sistema **sí** hizo lo que se le pidió).

### 4.5 Textos exactos

| Elemento | Texto |
|---|---|
| Enlace barra superior | `¿Ya tienes cuenta?` + `Iniciar sesión` |
| Eyebrow | `SOLICITUD DE ACCESO` |
| `<h1>` (form) | `Solicita una cuenta de plataforma` |
| Subtítulo (form) | `Tu solicitud la revisa una persona. Si se aprueba, te llegará un correo para crear tu contraseña.` |
| Etiqueta 1 | `Nombre completo` (obligatorio) |
| Marcador 1 | `Ada Lovelace` |
| Etiqueta 2 | `Correo electrónico` (obligatorio) |
| Marcador 2 | `nombre@empresa.com` |
| Ayuda 2 | `Aquí te enviaremos la respuesta.` |
| Etiqueta 3 | `Motivo de la solicitud` (obligatorio) |
| Ayuda 3 | `Explica para qué necesitas administrar la plataforma.` + contador `{n}/500` |
| Botón | `Enviar solicitud` · cargando: `Enviando…` |
| Título del resumen | lo genera `ErrorSummary` (`:46-52`): `Hay 1 problema en este formulario` / `Hay N problemas en este formulario` |
| `<h1>` (sent) | `Solicitud enviada` |
| Subtítulo (sent) | `Enviamos tu solicitud a revisión. Si se aprueba, recibirás un correo en {email} con el enlace para crear tu contraseña. El enlace caduca una hora después de que lo enviemos.` |
| Banner (sent) | `Revisa también la carpeta de correo no deseado. No hace falta que dejes esta página abierta.` |
| Botón (sent / closed) | `Ir a iniciar sesión` |
| `<h1>` (closed) | `Las solicitudes de acceso están cerradas` |
| Subtítulo (closed) | `Esta consola no está aceptando solicitudes de acceso ahora mismo.` |
| Párrafo 2 (closed) | `Si necesitas una cuenta de plataforma, pídesela a quien ya administra VetSoftware en tu organización.` |
| Error de red al enviar | banner `.ds-banner--error` sobre el formulario: `No pudimos enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.` + toast por `errorFrom('No se pudo enviar la solicitud', e)` |

### 4.6 Validación de cliente

Se sigue **al pie de la letra** la convención documentada del tenant y respetada por esta consola:
validador puro → `computed errors` → mapa `touched` → **el error solo se pinta tras `@blur`** →
`defineExpose({ validate })` → resumen del padre. **Nunca validación prematura mientras se teclea.**

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `nombre` | obligatorio | `El nombre es obligatorio.` |
| `nombre` | 3–120 caracteres (`@Size` del DTO) | `El nombre debe tener al menos 3 caracteres.` / `El nombre no puede pasar de 120 caracteres.` |
| `email` | obligatorio | `El correo electrónico es obligatorio.` |
| `email` | formato | `El correo electrónico no tiene el formato correcto. Ejemplo: nombre@empresa.com` |
| `email` | ≤ 150 caracteres | `El correo electrónico no puede pasar de 150 caracteres.` |
| `motivo` | obligatorio | `El motivo es obligatorio.` |
| `motivo` | 20–500 caracteres | `El motivo debe tener al menos 20 caracteres.` / `El motivo no puede pasar de 500 caracteres.` |

Los tres primeros salen tal cual de `validators.ts`: `length(v, 'El nombre', 3, 120)`,
`pattern(v, 'El correo electrónico', RE_EMAIL, 'nombre@empresa.com')`,
`length(v, 'El motivo', 20, 500)`. **No se escribe ni un literal nuevo de error genérico.**

`RE_EMAIL`: la expresión debe ser **permisiva**, no «correcta». Rechazar un correo válido raro es un
fallo peor que aceptar uno inválido, que el servidor rechazará igual.
Recomendada: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.

**Máximos, no `maxlength` duro en el motivo.** `AppTextarea` no expone `maxlength` y **está bien
así**: truncar en silencio a los 500 hace que el usuario pierda lo que escribió sin enterarse. El
contador `{n}/500` avisa, el validador bloquea el envío y el texto sigue ahí. En `nombre` y `email`,
`maxlength` sí es aceptable porque nadie escribe 120 caracteres de nombre sin darse cuenta —
pero si se pone, el validador tiene que seguir existiendo (el servidor manda).

**Al fallar `validate()`:** se marcan los tres `touched`, se pinta el `ErrorSummary` con
`toSummaryItems(errors, ids, ['nombre','email','motivo'])` **en orden del DOM** (`ErrorSummary.vue:9-15`),
y se llama a su `focus()`. El foco al resumen, no al primer campo: el usuario necesita saber cuántos
problemas hay antes de ir a uno (GOV.UK, *Error summary*).

**Errores por campo devueltos por el servidor** (`400` con `ProblemDetail.errors[]`): se mapean con
`getProblemDetailFieldErrors(e)` (`http.client.ts:334`) sobre los mismos `errors`, de modo que el
error del servidor se pinta **junto al campo**, no solo en un toast. Es la única forma de cumplir
§3.3.1 cuando la validación real vive en el backend.

---

## 5 · `/aprobar-acceso` — decisión del aprobador

**Quién y para qué.** Alguien que recibió un correo, hace clic, y tiene que decidir. Puede estar en
el móvil. La decisión es **irreversible en los dos sentidos**: aprobar crea una cuenta de plataforma;
rechazar quema la solicitud.

**Máquina de estados:** `loading | form | invalid | approved | rejected`.
El token llega por query param: `/aprobar-acceso?token=…`.

`document.title`: `Aprobar acceso · VetSoftware` / `Enlace no válido · VetSoftware` /
`Acceso aprobado · VetSoftware` / `Solicitud rechazada · VetSoftware`.

### 5.1 Estado `loading`

Idéntico en forma al `checking` de §4.1: `PawLoader` centrado, `skipGlobalLoader: true`,
`aria-busy="true"`, sin `<h1>`. Texto: `Comprobando el enlace…`

Si falta el `token` en la query, **no se llama al servidor**: se pasa directo a `invalid`
(mismo atajo que `RestablecerContrasenaView.vue:38-42`).

### 5.2 Estado `form`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                                                     │
│                                                                      │
│      ┌──────────────────────────────────────────────────┐            │
│      │ APROBACIÓN DE ACCESO                             │  eyebrow   │
│      │ Revisa esta solicitud                            │  <h1>      │
│      │ Alguien pidió una cuenta de administración de    │  subtitle  │
│      │ plataforma. Tu decisión es definitiva.           │            │
│      │                                                  │            │
│      │ ┌──────────────────────────────────────────────┐ │            │
│      │ │ Nombre     Ada Lovelace                      │ │  <dl> con  │
│      │ │ Correo     ada@empresa.com                   │ │  ds-label  │
│      │ │ Solicitada 21 ago 2026, 14:32                │ │  + valor   │
│      │ │ Motivo     Voy a administrar los catálogos   │ │            │
│      │ │            clínicos y las membresías de las  │ │            │
│      │ │            clínicas de la zona norte.        │ │            │
│      │ └──────────────────────────────────────────────┘ │            │
│      │                                                  │            │
│      │ ┌──────────────────────────────────────────────┐ │ ds-banner  │
│      │ │ ⚠ Aprobar crea una cuenta con control total  │ │ --warning  │
│      │ │   de la plataforma. No se puede deshacer.    │ │            │
│      │ └──────────────────────────────────────────────┘ │            │
│      │                                                  │            │
│      │ Código de verificación *                         │            │
│      │ ┌──────────────────────────────────────────────┐ │            │
│      │ │  1 2 3 4 5 6                                 │ │  CodeInput │
│      │ └──────────────────────────────────────────────┘ │            │
│      │ Los 6 dígitos que te enviamos por correo.        │  ds-hint   │
│      │                                                  │            │
│      │ ┌───────────────────┐  ┌───────────────────────┐ │            │
│      │ │     Rechazar      │  │   Aprobar acceso      │ │            │
│      │ └───────────────────┘  └───────────────────────┘ │            │
│      │   ds-btn--danger         ds-btn--primary         │            │
│      └──────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

Tres decisiones de esta pantalla:

1. **El código se pide UNA vez y sirve para las dos acciones.** No hay un código para aprobar y otro
   para rechazar. El campo va **antes** de los botones, en el orden en que se usa.
2. **`Aprobar acceso` es primario y va a la derecha; `Rechazar` es secundario y va a la izquierda.**
   Rechazar no es «cancelar»: es una acción real con consecuencia, así que lleva
   `.ds-btn--danger` (destructivo suave, `primitives.css:124`), no `.ds-btn--ghost`. La disposición
   sigue la del footer de `ModalShell` (secundario–primario, `ModalShell.vue:256-262`), que es la
   convención de la casa. En móvil se apilan a ancho completo con `Aprobar acceso` **arriba**
   (la acción más probable primero, ley de Fitts).
3. **No hay auto-envío al teclear el sexto dígito.** Es tentador y aquí es un error: dispararía una
   acción irreversible sin que el usuario haya declarado cuál de las dos quiere. Con dos acciones
   posibles ni siquiera se sabría qué enviar. **WCAG 2.2 §3.3.4 Error Prevention (AA)**.

Ambos botones abren una confirmación (§5.3) y **solo entonces** se llama al servidor. En ese momento
sí se deja actuar al velo global (petición normal): es una mutación y bloquear la pantalla es correcto.

**Estado del botón mientras el código no tenga 6 dígitos:** los dos botones se quedan
**habilitados**. Deshabilitar el botón de envío hasta que el formulario sea válido es el
antipatrón que GOV.UK y NN/g rechazan (*Errors in forms*, guía 4): el usuario no sabe por qué no
puede pulsar y no hay nada que le explique qué falta. Se pulsa, se valida, se dice qué falta.

### 5.3 Confirmaciones — las dos, y con textos distintos

Se usa `useConfirmDialog().confirm({ … })` (`useConfirmDialog.ts:22`). Devuelve `Promise<boolean>`;
si es `false`, no se llama a nada.

**Aprobar:**

```ts
{
  message: '¿Aprobar el acceso de Ada Lovelace?',
  consequence: 'Se creará una cuenta con control total de la plataforma y se le enviará una '
             + 'invitación a ada@empresa.com. Esta acción no se puede deshacer.',
  confirmLabel: 'Aprobar acceso',
}
```

**Rechazar:**

```ts
{
  message: '¿Rechazar la solicitud de Ada Lovelace?',
  consequence: 'La solicitud se descarta y el enlace deja de servir. Si te equivocas, esa persona '
             + 'tendrá que solicitar el acceso otra vez.',
  confirmLabel: 'Rechazar solicitud',
}
```

Los dos `confirmLabel` **nombran la acción**; `Confirmar`, que es el valor por defecto
(`confirmDialog.store.ts:38`), no describe el resultado del botón — **§3.3.4** y patrón
*Alert Dialog* del APG, tal y como lo documenta el propio comentario del store (`:8-18`).

**Limitación conocida y aceptada:** `AppConfirmDialog.vue:20-21,45` fija `accent="danger"` y
`.ds-btn--danger-solid` para cualquier confirmación. En «Aprobar» el botón saldrá rojo, lo cual es
semánticamente discutible (aprobar no es destruir) aunque defendible (es irreversible). **No se
modifica el componente en esta tanda.** El arreglo correcto —añadir `tone?: 'danger' | 'accent'` a
`ConfirmOptions` con `'danger'` por defecto— es un cambio de 3 ficheros que **no toca ninguno de los
17 sitios que ya lo llaman**. Queda propuesto en §11.

### 5.4 Código incorrecto — se queda en `form`

Un código erróneo **no** es el estado `invalid`: el enlace sigue siendo bueno. Se pinta el error en
el propio campo y se anuncia:

```
│ Código de verificación *                         │
│ ┌──────────────────────────────────────────────┐ │  ds-field-invalid
│ │  1 2 3 4 5 7                                 │ │  + ds-field-shake
│ └──────────────────────────────────────────────┘ │
│ ⚠ El código no es correcto. Te quedan 2 intentos.│  aria-live=assertive
```

- El error va **asociado al campo** por `aria-describedby`, igual que en `AppInput.vue`.
- El campo se **selecciona entero** (`select()`) al fallar, para que reescribir sea teclear encima.
- `.ds-field-shake` (`primitives.css:790`) aporta el temblor. Está cubierto por la regla global de
  `prefers-reduced-motion` de `main.css` en esta consola.
- Con `remainingAttempts === 0` (o `429`) se pasa a `invalid` con el texto de bloqueo (§5.5).

Texto: `El código no es correcto. Te quedan {n} intentos.` / singular: `Te queda 1 intento.`

### 5.5 Estado `invalid`

Un solo estado y **un solo texto** para: falta el token, token desconocido, token caducado, token ya
usado, solicitud ya resuelta por otra persona, e intentos agotados. La única variante es el texto
de intentos agotados, porque ahí el usuario **sí** necesita saber que fue cosa suya.

```
┌──────────────────────────────────────────────────────────────────────┐
│      ┌──────────────────────────────────────────────────┐            │
│      │                    ( ! )                         │  statusIcon
│      │                                                  │  danger    │
│      │ Este enlace ya no sirve                          │  <h1>      │
│      │                                                  │            │
│      │ El enlace de aprobación no es válido, caducó o   │  subtitle  │
│      │ ya se usó. Si la solicitud sigue pendiente,      │            │
│      │ pide que te la envíen otra vez.                  │            │
│      │                                                  │            │
│      │           [ Ir a iniciar sesión ]                │ ds-btn--ghost
│      └──────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

Variante por intentos agotados — mismo estado, distinto texto:

- `<h1>`: `Demasiados intentos`
- Subtítulo: `Introdujiste el código incorrecto demasiadas veces y este enlace quedó bloqueado. Pide que te envíen la solicitud otra vez.`

### 5.6 Estados `approved` y `rejected`

```
approved                                 rejected
┌──────────────────────────┐             ┌──────────────────────────┐
│          ( ✓ )           │             │          ( ✕ )           │
│                          │             │                          │
│ Acceso aprobado          │             │ Solicitud rechazada      │
│                          │             │                          │
│ Enviamos una invitación  │             │ Descartamos la solicitud │
│ a ada@empresa.com. Tiene │             │ y avisamos a quien la    │
│ una hora para crear su   │             │ hizo. No hace falta que  │
│ contraseña; después,     │             │ hagas nada más.          │
│ tendrás que aprobar una  │             │                          │
│ solicitud nueva.         │             │                          │
│                          │             │                          │
│  [ Ir a iniciar sesión ] │             │  [ Ir a iniciar sesión ] │
└──────────────────────────┘             └──────────────────────────┘
   statusTone="success"                     statusTone="danger"
```

El aviso de la caducidad de 1 h en `approved` **importa**: si el solicitante tarda, el aprobador
tiene que saber de antemano que habrá que repetir el ciclo. Es información que solo tiene el sistema
(NN/g H1).

### 5.7 Textos exactos

| Elemento | Texto |
|---|---|
| Eyebrow | `APROBACIÓN DE ACCESO` |
| `<h1>` (form) | `Revisa esta solicitud` |
| Subtítulo (form) | `Alguien pidió una cuenta de administración de plataforma. Tu decisión es definitiva.` |
| Rótulos de datos | `Nombre` · `Correo` · `Solicitada` · `Motivo` |
| Banner de aviso | `Aprobar crea una cuenta con control total de la plataforma. No se puede deshacer.` |
| Etiqueta del código | `Código de verificación` (obligatorio) |
| Ayuda del código | `Los 6 dígitos que te enviamos por correo.` |
| Error: vacío | `El código es obligatorio.` |
| Error: incompleto | `El código tiene 6 dígitos.` |
| Error: incorrecto | `El código no es correcto. Te quedan {n} intentos.` |
| Botones | `Rechazar` · `Aprobar acceso` |
| Cargando | `Aprobando…` · `Rechazando…` |
| `loading` | `Comprobando el enlace…` |
| `invalid` `<h1>` | `Este enlace ya no sirve` |
| `invalid` subtítulo | `El enlace de aprobación no es válido, caducó o ya se usó. Si la solicitud sigue pendiente, pide que te la envíen otra vez.` |
| bloqueado `<h1>` | `Demasiados intentos` |
| bloqueado subtítulo | `Introdujiste el código incorrecto demasiadas veces y este enlace quedó bloqueado. Pide que te envíen la solicitud otra vez.` |
| `approved` `<h1>` | `Acceso aprobado` |
| `approved` subtítulo | `Enviamos una invitación a {email}. Tiene una hora para crear su contraseña; después, tendrás que aprobar una solicitud nueva.` |
| `rejected` `<h1>` | `Solicitud rechazada` |
| `rejected` subtítulo | `Descartamos la solicitud y avisamos a quien la hizo. No hace falta que hagas nada más.` |
| Salida (todos) | `Ir a iniciar sesión` |

---

## 6 · `/aceptar-invitacion` — crear contraseña

**Calco del patrón de `VetSoftwarePublicFront/src/features/auth/views/RestablecerContrasenaView.vue`**,
con cuatro diferencias deliberadas que se listan al final (§6.6).

**Máquina de estados:** `loading | form | invalid | success`. Token por query param.
Validación previa **antes** de pintar el formulario (`:44-48` del original).

`document.title`: `Crear contraseña · VetSoftware` / `Enlace no válido · VetSoftware` /
`Contraseña creada · VetSoftware`.

### 6.1 `loading`

Igual que §5.1. Texto: `Comprobando la invitación…`
Sin token en la query → directo a `invalid`, sin llamada (`RestablecerContrasenaView.vue:38-42`).

### 6.2 `form`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🐾] VetSoftware                             Iniciar sesión          │
│                                                                      │
│      ┌──────────────────────────────────────────────────┐            │
│      │ INVITACIÓN                                       │  eyebrow   │
│      │ Crea tu contraseña                               │  <h1>      │
│      │ Vas a activar la cuenta de plataforma de         │  subtitle  │
│      │ ada@empresa.com. La usarás cada vez que inicies  │            │
│      │ sesión.                                          │            │
│      │                                                  │            │
│      │ ┌──────────────────────────────────────────────┐ │ ErrorSummary
│      │ │ ⚠ Hay 1 problema en este formulario          │ │ (tras envío)
│      │ │   · La contraseña debe tener al menos 12 …   │ │            │
│      │ └──────────────────────────────────────────────┘ │            │
│      │                                                  │            │
│      │ Contraseña *                                     │            │
│      │ ┌──────────────────────────────────────────┬───┐ │            │
│      │ │ ••••••••••••                             │ 👁 │ │            │
│      │ └──────────────────────────────────────────┴───┘ │            │
│      │                                                  │            │
│      │  ✓ Al menos 12 caracteres                        │ checklist  │
│      │  ○ Como máximo 100 caracteres                    │ aria-live  │
│      │                                                  │ =polite    │
│      │ Confirmar contraseña *                           │            │
│      │ ┌──────────────────────────────────────────┬───┐ │            │
│      │ │ ••••••••••••                             │ 👁 │ │            │
│      │ └──────────────────────────────────────────┴───┘ │            │
│      │                                                  │            │
│      │ ┌──────────────────────────────────────────────┐ │            │
│      │ │        Crear contraseña y activar  →         │ │ primary    │
│      │ └──────────────────────────────────────────────┘ │            │
│      └──────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

El correo se muestra **porque lo devuelve el `GET` de validación**, y sirve para que el usuario
compruebe que la invitación es para él. No se muestra si el backend no lo devuelve; **no se saca
del token en el cliente**.

### 6.3 `success` y `invalid`

```
success                                   invalid
┌──────────────────────────┐              ┌──────────────────────────┐
│          ( ✓ )           │              │          ( ! )           │
│ Cuenta activada          │              │ Este enlace ya no sirve  │
│                          │              │                          │
│ Tu contraseña quedó      │              │ La invitación no es      │
│ creada. Ya puedes        │              │ válida, caducó o ya se   │
│ iniciar sesión con ella. │              │ usó. Pide que te envíen  │
│                          │              │ una nueva.               │
│ [ Iniciar sesión ]       │              │ [ Ir a iniciar sesión ]  │
└──────────────────────────┘              └──────────────────────────┘
   ds-btn--primary                           ds-btn--ghost
```

**Sin auto-login y sin redirección automática.** El usuario acaba de elegir una contraseña que aún
no ha escrito nunca: la pantalla de éxito con un botón explícito le da el momento de fijarla y de
guardarla en el gestor de contraseñas. Es lo que hace el original
(`RestablecerContrasenaView.vue:129-138`) y aquí, con una cuenta de plataforma, importa más.
**Prohibido un `setTimeout` que redirija solo:** WCAG 2.2 §2.2.1 Timing Adjustable (A).

**Igual que en el original (`:60-64`), si el `POST` falla el estado pasa a `invalid`.** Matiz que sí
hay que corregir: eso solo vale si el fallo es del token (`404`/`410`). Un `500` o una caída de red
**no** deben tirar el formulario con la contraseña dentro — el usuario perdería lo escrito, que es
la prioridad número uno de este producto. Regla:

- `404` / `410` → estado `invalid`.
- `400` con errores de campo → se quedan en el formulario, mapeados por campo.
- cualquier otra cosa → **se queda en `form`**, banner `.ds-banner--error` arriba +
  `errorFrom('No se pudo crear la contraseña', e)`.

### 6.4 Textos exactos

| Elemento | Texto |
|---|---|
| Eyebrow | `INVITACIÓN` |
| `<h1>` (form) | `Crea tu contraseña` |
| Subtítulo (form) | `Vas a activar la cuenta de plataforma de {email}. La usarás cada vez que inicies sesión.` |
| Subtítulo sin email | `Vas a activar tu cuenta de plataforma. Esta contraseña la usarás cada vez que inicies sesión.` |
| Etiqueta 1 | `Contraseña` (obligatorio) |
| Etiqueta 2 | `Confirmar contraseña` (obligatorio) |
| Botón mostrar/ocultar | `aria-label` `Mostrar contraseña` / `Ocultar contraseña` (calcado de `LoginView.vue:113`) |
| Botón | `Crear contraseña y activar` · cargando: `Creando…` |
| `loading` | `Comprobando la invitación…` |
| `success` `<h1>` | `Cuenta activada` |
| `success` subtítulo | `Tu contraseña quedó creada. Ya puedes iniciar sesión con ella.` |
| `success` botón | `Iniciar sesión` |
| `invalid` `<h1>` | `Este enlace ya no sirve` |
| `invalid` subtítulo | `La invitación no es válida, caducó o ya se usó. Pide que te envíen una nueva.` |
| `invalid` botón | `Ir a iniciar sesión` |
| Error genérico de envío | `No pudimos crear la contraseña. Inténtalo de nuevo.` |

### 6.5 Lo que NO se dice en `invalid`

Ni «caducó hace 20 minutos», ni «esta invitación ya se usó el 21 de agosto», ni «no existe ninguna
invitación con ese token». Un solo texto para los tres casos. Distinguirlos convierte la pantalla en
un oráculo para quien pruebe tokens.

### 6.6 Diferencias deliberadas frente al original del tenant

| # | Original (`RestablecerContrasenaView.vue`) | Aquí | Motivo |
|---|---|---|---|
| 1 | `AuthField` + `AuthInput` + `PrimaryButton` (`:4-7`) | `AppInput` + `.ds-btn` | No existen en esta consola (§1) |
| 2 | Mínimo **8** caracteres (`:27`) | Mínimo **12** | Cuenta de plataforma con control total; ver §8 |
| 3 | `.rp-spin`, rotación CSS local (`:168-176`) | `PawLoader` | **R06**: `PawLoader` es el único loader |
| 4 | Cualquier fallo del `POST` → `invalid` (`:60-64`) | Solo `404`/`410` → `invalid` | No perder la contraseña escrita por un 500 |
| 5 | Sin resumen de errores | `ErrorSummary` | Existe en esta consola y hoy tiene 0 usos |
| 6 | Sin `document.title` | Título por estado | §2.4.2, R08 |

---

## 7 · El campo del código de 6 dígitos

### 7.1 Decisión: **un solo `<input>`**, no seis casillas

Seis casillas son la solución que parece obvia y es la que falla. Con evidencia, no con gusto:

- **Semántica.** Seis `<input>` son seis controles que necesitan seis nombres accesibles distintos.
  Con `aria-label="Dígito 1"`…`"Dígito 6"` el lector de pantalla dicta seis campos donde el usuario
  percibe uno, y el `<label>` visible («Código de verificación») no describe a ninguno en concreto:
  **WCAG 2.2 §1.3.1 (A)** y **§3.3.2 Labels or Instructions (A)**. Con `aria-hidden` en cinco, se
  ocultan controles operables, que es peor.
- **Pegado.** El pegado es el gesto real: el código llega por correo y se copia. En un solo campo
  funciona nativamente. En seis hay que interceptar `paste` en cada casilla y repartir; y el
  pegado desde el teclado (`Ctrl+V`) sobre la casilla 4 tiene que rellenar hacia atrás, cosa que casi
  ninguna implementación hace bien.
- **Autocompletado.** `autocomplete="one-time-code"` —la vía por la que iOS y macOS ofrecen el
  código desde Mail y Android desde el SMS— rellena **un** campo. Con seis, no aparece la sugerencia.
- **Borrado.** Retroceso entre casillas exige un `keydown` a medida que se rompe con teclados
  virtuales de Android (eventos de composición, `keyCode 229`) y con métodos de entrada.
- **§2.5.8 Target Size (24×24) no es el argumento**: seis casillas de 40 px lo cumplen. El
  argumento es la semántica, el pegado y el autocompletado.

La única ventaja real de las seis casillas es que se ve cuántos dígitos faltan. Eso se consigue
igual con `letter-spacing` y `--font-mono` sobre un campo, más la ayuda `Los 6 dígitos que te
enviamos por correo.`

El **APG del W3C no tiene patrón para código de un solo uso** — no hay a qué contrastarlo, así que
la decisión se sostiene sobre §1.3.1, §3.3.2 y el comportamiento medible de pegado/autocompletado.

### 7.2 Marcado

```html
<div class="field ds-stack">
  <label :for="id" class="label">Código de verificación<span class="required">*</span></label>
  <div class="inputbox ds-field ds-flex-row" :class="toneClass">
    <input
      :id="id"
      ref="input"
      :value="modelValue"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      minlength="6"
      pattern="[0-9]{6}"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      enterkeyhint="done"
      class="code ds-flex-fill"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      :disabled="disabled"
      @input="onInput"
      @blur="onBlur"
    />
  </div>
  <p v-if="error" :id="errorId" class="error" role="alert">
    <component :is="ICONS.WARNING" :size="11" aria-hidden="true" /><span>{{ error }}</span>
  </p>
  <p v-else :id="hintId" class="ds-hint">Los 6 dígitos que te enviamos por correo.</p>
</div>
```

Notas obligatorias:

- **`type="text"`, no `type="number"`.** `number` aporta flechas de incremento inútiles, pierde los
  ceros a la izquierda, permite `e`, `+`, `-` y `.`, y el evento de rueda del ratón cambia el valor.
  `inputmode="numeric"` ya saca el teclado numérico en el móvil, que es lo único que se quería.
- **`aria-describedby` apunta al error cuando lo hay y a la ayuda cuando no.** Hoy hay **una sola
  ocurrencia de `aria-describedby` en todo `src/` de esta consola** —`ModalShell.vue:186`, que
  describe el cuerpo del diálogo— y **ninguna en un campo de formulario**: `AppInput.vue:95-99`
  pinta el error como un `<p>` hermano sin asociarlo. Eso es **WCAG 2.2 §3.3.1 Error
  Identification (A)** incumplido en los 15 consumidores de `AppInput` y los 6 de
  `AppTextarea` (comando que lo reproduce: `grep -rn "aria-describedby" src/`). Ver §11: aquí se hace
  bien desde el principio, y el arreglo de `AppInput`/`AppTextarea` se propone aparte porque su
  radio de impacto es toda la consola.
- **`toneClass`** replica exactamente `AppInput.vue:66-70`: ramas **excluyentes**
  (`ds-field-invalid` + `ds-field-invalid-focus` / `tone-border` + `ds-field-disabled` /
  `ds-field-rest` + `ds-focus-ring`). Combinar `ds-field-rest` con un estado hace que el reposo gane
  por orden de fuente y el campo en error se quede sin fondo rojo, en silencio — está documentado en
  la cabecera de `AppInput.vue:12-20` y es la trampa de esta base de código.

### 7.3 Saneado

```ts
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 6)
  el.value = digits            // reescribe el DOM: el pegado con guiones o espacios se limpia solo
  emit('update:modelValue', digits)
}
```

Cubre `123456`, `123 456`, `123-456` y el pegado con salto de línea del cliente de correo.
**No** se intenta extraer el código de una frase (`El código es 123456`): la heurística
falla más de lo que acierta y `123` de otra parte del texto rompería el valor.

`select()` al fallar el código (§5.4) para que reescribir sea teclear encima.

### 7.4 Presentación

```css
.code {
  font-family: var(--font-mono);
  font-size: var(--text-h3);        /* 18px */
  letter-spacing: 0.4em;
  text-indent: 0.4em;               /* compensa el espacio sobrante tras el último dígito */
  font-variant-numeric: tabular-nums;
}
```

Estas 6 declaraciones son el **único** CSS nuevo de las tres vistas y viven en `CodeInput.vue`.

### 7.5 Validación

| Caso | Mensaje |
|---|---|
| vacío al pulsar un botón | `El código es obligatorio.` |
| 1–5 dígitos | `El código tiene 6 dígitos.` |
| 6 dígitos, rechazado por el servidor | `El código no es correcto. Te quedan {n} intentos.` |

Se valida **al pulsar**, nunca al teclear (nada de un error rojo tras el primer dígito).
`@blur` sí puede marcar `touched`, coherente con la convención del repo.

---

## 8 · Contraseña: reglas y medidor

### 8.1 Reglas

| Regla | Valor | Mensaje |
|---|---|---|
| Obligatoria | — | `La contraseña es obligatoria.` |
| Mínimo | **12 caracteres** | `La contraseña debe tener al menos 12 caracteres.` |
| Máximo | 100 caracteres | `La contraseña no puede pasar de 100 caracteres.` |
| Confirmación obligatoria | — | `Confirma la contraseña.` |
| Confirmación coincide | — | `Las contraseñas no coinciden.` |

**12 y no 8.** El 8 del tenant (`RestablecerContrasenaView.vue:27`) es para un empleado de clínica
con permisos de su empresa. Esto es una cuenta con control total de la plataforma: todos los tenants,
todos los catálogos, todos los roles base. NIST SP 800-63B fija 8 como suelo absoluto y recomienda
subirlo para cuentas privilegiadas; 12 es el valor que sostiene el resto de la industria.
**El máximo de 100 tiene que coincidir con el `@Size(max)` del DTO del backend** (regla 2 de
`validators.ts:13-16`): si el servidor acepta otro número, manda el servidor y este documento se
corrige.

**Lo que NO se exige:** mayúsculas, dígitos ni símbolos obligatorios. Las reglas de composición
empujan a `Password1!`, que es peor que una frase larga, y NIST SP 800-63B las desaconseja
explícitamente. **Salvo que el backend las imponga** — en cuyo caso el cliente las replica **exactas**,
porque un cliente más permisivo que el servidor produce un rechazo tras el envío, con el formulario
lleno, que es el peor error de formulario que existe.

**Ambos campos con `autocomplete="new-password"`** (como `RestablecerContrasenaView.vue:103,117`):
es lo que le dice al gestor de contraseñas que ofrezca generar una y que la guarde.

### 8.2 Mostrar/ocultar

Los dos campos llevan botón de ojo, calcado de `LoginView.vue:110-118`: `type="button"`,
`:aria-label` que cambia entre `Mostrar contraseña` y `Ocultar contraseña`, icono
`ICONS.EYE`/`ICONS.EYE_OFF`. **§2.5.8 Target Size (24×24 CSS px):** el `.eye-btn` de `LoginView`
no declara tamaño mínimo; el icono son 15 px. **Hay que darle `min-width: 24px; min-height: 24px`**
en el nuevo campo. Es un defecto heredado que no se debe copiar.

Los dos ojos son independientes: revelar la contraseña no revela la confirmación. Si se revelan
las dos a la vez, la confirmación deja de confirmar nada.

### 8.3 Medidor de fortaleza: **sí, pero como lista de requisitos, no como barra**

**Recomendación: lista de requisitos con estado (`PasswordChecklist.vue`), no barra de colores, no `zxcvbn`.**

Por qué no la barra: «Media», «Fuerte» y «Débil» no son accionables — no dicen qué cambiar — y el
color como único canal de información incumple **§1.4.1 Use of Color (A)**. Por qué no `zxcvbn`:
son ~400 kB de diccionarios; este repo acaba de retirar un chunk de 183 kB de iconos por ese motivo
exacto (`icons.ts:56-68`). Meterlos en una pantalla que se usa **una vez por administrador y por
vida** es indefendible.

La lista, en cambio, es determinista, testable, cada línea corresponde a un validador que ya existe,
y se lee igual con lector de pantalla:

```
✓ Al menos 12 caracteres
○ Como máximo 100 caracteres
```

- Contenedor con `aria-live="polite"` y `role="status"`. **`polite`, no `assertive`**: es
  información de apoyo mientras se teclea, no una interrupción.
- Cada línea con icono **y** texto: `ICONS.CHECK` cuando se cumple, `ICONS.UNCHECKED` cuando no.
  El icono es `aria-hidden`; el estado se transmite con un prefijo de solo lectura de pantalla
  (`.ds-sr-only`): `Cumplido: ` / `Pendiente: `. Sin ese prefijo, la lista se oye como dos frases
  sueltas sin decir si están hechas.
- Se pinta **desde el primer carácter tecleado**, no al `blur`. No es una validación de error: es
  una guía. La regla de «no validar antes de tiempo» prohíbe pintar **errores** al teclear, no ayuda.
- La confirmación **no** entra en la lista: su error es un error de campo normal, tras `@blur`.

**Si hay que recortar alcance, esto es lo primero que cae**, y entonces la ayuda estática bajo el
campo dice `Al menos 12 caracteres.` (`hint` de `AppInput`, `:99`), que cumple **§3.3.2** —
las instrucciones tienen que estar **antes** del error, no solo después.

---

## 9 · Accesibilidad — lista de comprobación WCAG 2.2 AA

Cada línea es verificable. Las que ya cumplen se marcan como tal para que nadie las «mejore».

### 9.1 Foco

| # | Regla | Criterio |
|---|---|---|
| A1 | Al cambiar de estado (`form`→`sent`, `form`→`approved`, …) el foco va al **`<h1>` del estado nuevo**, que lleva `tabindex="-1"`. Sin esto el foco se queda en un botón que ya no existe y el navegador lo manda a `<body>`: el siguiente Tab reinicia el recorrido. | **§2.4.3 (A)**; APG, *Developing a Keyboard Interface* → «Persistence of focus»; **R02** del repo |
| A2 | Tras un `validate()` fallido, el foco va al **`ErrorSummary`** (`ErrorSummary.vue:56-58`), no al primer campo. | GOV.UK *Error summary*; §3.3.1 |
| A3 | El anillo de foco es el del sistema (`var(--ring)`, `tokens.css:286`) en **todos** los controles nuevos, vía `.ds-focus-ring` o `.ds-btn:focus-visible`. **Prohibido `outline: none` sin sustituto.** | **§2.4.7 (AA)** y **§2.4.11 Focus Appearance (AA)**; **R03** del repo |
| A4 | El skip link del layout es alcanzable con el primer Tab y **visible al recibir foco** (§2.3, ojo con `clip-path`). | **§2.4.1 (A)** |
| A5 | Ningún `autofocus` al montar en `checking`/`loading`. Cuando aparece `form`, **sí** se enfoca el primer campo (nombre / código / contraseña): la pantalla existe para eso y el usuario llegó desde un correo, no navegando. | §2.4.3 |
| A6 | La confirmación (`AppConfirmDialog`) ya atrapa el foco, lo devuelve al disparador y no se cierra con Escape a propósito (`ModalShell.vue:151,157,188`; `AppConfirmDialog.vue:22`). **No tocar.** | §2.4.3; APG *Alert Dialog* |

### 9.2 Anuncio de cambios de estado

| Sitio | `role` / `aria-live` | Fuente |
|---|---|---|
| Cambio de estado de pantalla completa | **ninguno** — lo resuelve mover el foco al `<h1>` (A1). Poner además un `aria-live` lo lee dos veces. | `docs/ux/patron-de-mensajes.md` §4.1 |
| Banner de error de envío | `role="alert"` (implícito `assertive`, **no escribir `aria-live`**) | ídem, y `LoginView.vue:79` ya lo hace así |
| `ErrorSummary` | `role="alert"` ya incluido (`ErrorSummary.vue:77`) | — |
| Error de campo (código, contraseña) | dentro de un contenedor persistente con `aria-live="polite"`, **y** asociado por `aria-describedby` | §3.3.1, §4.1.3 |
| Error del código tras respuesta del servidor | `role="alert"`: interrumpe, porque el usuario acaba de pulsar y espera respuesta | §4.1.3 |
| Lista de requisitos de contraseña | `role="status"` + `aria-live="polite"` | §4.1.3 |
| `PawLoader` | ya trae `role="status"` (`PawLoader.vue:26`) | — |
| Banner informativo presente al cargar (§4.3) | **ninguno** — no apareció por una interacción | `patron-de-mensajes.md` §4.1 |

### 9.3 Formularios

- `<label for>` real en todos los campos. `AppInput`/`AppTextarea` ya lo hacen (`AppInput.vue:75`).
- **`aria-describedby` que apunte al error y a la ayuda.** Es lo que hoy falta en toda la consola
  (§7.2). En las vistas nuevas es obligatorio.
- `aria-invalid` en el campo con error: `AppInput.vue:88` ya lo pone.
- **El texto del error en línea y el del resumen son literalmente el mismo string.**
  `toSummaryItems` (`ErrorSummary.vue:16-27`) lo garantiza si se le pasa el mismo mapa `errors`.
- `novalidate` en los tres `<form>` (como `LoginView.vue:73`): la validación nativa del navegador
  sale en inglés, no es accesible de forma consistente y compite con la del componente.
- Enter dentro de un campo envía el formulario. En `/aprobar-acceso`, donde hay **dos** acciones,
  Enter tiene que activar la **primaria** (`Aprobar acceso`, `type="submit"`) y `Rechazar` debe ser
  `type="button"`. Y como aprobar abre confirmación, un Enter accidental no aprueba nada.

### 9.4 Orden de tabulación

Orden del DOM = orden visual, sin un solo `tabindex` positivo. Para `/aprobar-acceso`:

```
1 Saltar al contenido → 2 (marca, no focalizable) → 3 código
→ 4 Rechazar → 5 Aprobar acceso → 6..8 enlaces del pie
```

Los datos de la solicitud son un `<dl>`: no son focalizables ni deben serlo. En móvil, donde los
botones se apilan con `Aprobar acceso` arriba, **el orden del DOM cambia con ellos** — se reordena
con `flex-direction: column-reverse` **NO**: eso deja el orden visual y el de tabulación
desalineados (§2.4.3 y §1.3.2 Meaningful Sequence). Se reordena el DOM o se acepta el orden de
escritorio también en móvil.

### 9.5 Objetivos táctiles

**§2.5.8 Target Size (Minimum) (AA), 24×24 CSS px.** A verificar en: el botón de ojo (§8.2, hoy
sin tamaño mínimo en `LoginView.vue:338-347`), los enlaces del pie (12 px de fuente, `:392-401`),
el enlace de la barra superior y el skip link. Los `.ds-btn` cumplen de sobra
(`padding: var(--space-9) var(--space-16)` sobre 13 px de texto).

### 9.6 Movimiento

Esta consola **sí** tiene la regla global `prefers-reduced-motion`, y es la variante universal con
`!important` que gana a cualquier `<style scoped>` (`src/assets/styles/base.css:108-119`), así que
`.ds-field-shake` y las transiciones del layout quedan cubiertas. **No añadir bloques
`@media (prefers-reduced-motion: reduce)` locales nuevos para animaciones o transiciones**: son
redundantes aquí y suman líneas al presupuesto de CSS. (El gemelo del tenant sí los necesita; este
repo no.)

**Con una excepción que hay que entender:** la guarda global solo pone a cero *duraciones*
(`animation-duration`, `transition-duration`, `scroll-behavior`). **No anula un `transform` de
estado.** Por eso `LoginView.vue:436-440` tiene un bloque local que hace `transform: none` en el
hover de su botón — y por eso ese bloque desaparece junto con `.primary-btn` (§2.4): `.ds-btn` no
eleva en hover y no hay nada que anular. Si algún día un control nuevo desplaza en hover o en foco,
necesita su bloque local; nada de lo especificado aquí lo hace.

---

## 10 · Contraste — lo medido

Calculado con la fórmula de WCAG 2.2 sobre los hexadecimales de `LoginView.vue` que pasan a
`PublicLayout`:

| Color sobre fondo | Ratio | Uso | Umbral | Veredicto |
|---|---|---|---|---|
| `#6b5b80` / `#f3e8ff` | **5,18:1** | pie y barra superior, 12–13 px | 4,5:1 | ✅ |
| `#6b5b80` / `#ede8f4` | **5,08:1** | pie sobre el extremo oscuro del degradado | 4,5:1 | ✅ |
| `#6b5b80` / `#ffffff` | **6,12:1** | subtítulo de la tarjeta, 13 px | 4,5:1 | ✅ |
| `#7e22ce` / `#f3e8ff` | **5,92:1** | enlace «Solicita acceso» | 4,5:1 | ✅ |
| `#7e22ce` / `#ffffff` | **6,98:1** | eyebrow, 11 px | 4,5:1 | ✅ |
| `#3d2e57` / `#ffffff` | **12,16:1** | etiqueta de campo, 12 px | 4,5:1 | ✅ |
| `#1a1325` / `#ffffff` | **18,04:1** | texto tecleado | 4,5:1 | ✅ |
| `#581c87` / `#f3e8ff` | **9,22:1** | enlace en hover | 4,5:1 | ✅ |
| `#a89bbd` / `#ffffff` | **2,60:1** | icono guía dentro del campo | 3:1 si es informativo | ⚠️ ver abajo |
| `#ece5f4` / `#ffffff` | **1,23:1** | borde de la tarjeta | 3:1 si delimita un control | ⚠️ ver abajo |

**El texto del shell público cumple AA sin excepción.** Los dos avisos:

- **El icono guía dentro del campo (2,60:1)** va `aria-hidden="true"` (`LoginView.vue:87,102`) y
  duplica lo que ya dice la etiqueta: es **decoración**, y §1.4.11 exime a los objetos gráficos que
  no son necesarios para entender el contenido. **No es un incumplimiento.** Pero está 0,4 por
  debajo del umbral de un icono informativo, y si alguien le da significado (por ejemplo, un candado
  que indique «solo lectura»), pasa a incumplir. **En los campos nuevos: o no se pone icono guía, o
  se pone con `--text-subtle` (`--warm-500`, medido a 5,36:1 en A11Y-09).** Los tres formularios de
  esta especificación **no llevan icono dentro del campo**: no aportan nada y el código de 6 dígitos
  necesita el ancho.
- **El borde de la tarjeta (1,23:1)** delimita una superficie, no un control: §1.4.11 no aplica.
  Lo que sí importa es el **borde de los campos**, y ese ya lo pone `.ds-field-rest` con
  `--warm-450`, medido en el propio `primitives.css` a **3,55:1** sobre `--warm-50` — cumple.

**Lo que NO se midió y hay que medir antes de dar esto por cerrado:** el contraste del anillo de
foco (`--ring`) **contra el fondo del degradado del shell público**, no contra `--warm-50`.
`tokens.css:283-287` documenta el contrato de `--ring`: *«solo sobre `--warm-50`/`--surface`/blanco»*.
En la tarjeta blanca se cumple; sobre el degradado (el skip link enfocado, por ejemplo) **está fuera
de contrato**. Por eso el skip link, al recibir foco, debe pintarse sobre `background: var(--warm-50)`
y no sobre el degradado. **§2.4.11 Focus Appearance (AA)**.

---

## 11 · Lo que queda abierto — decisiones del humano

Tres son de esta tanda y tres son sistémicas. **No se abre ningún issue por iniciativa propia**; van
redactadas para que se decida.

1. **`aria-describedby` en `AppInput` y `AppTextarea`** — *grave, sistémico*.
   `AppInput.vue:95-99` y `AppTextarea.vue` pintan el error como `<p>` hermano sin asociarlo al
   control. **Ni una sola ocurrencia de `aria-describedby` en un campo de formulario de `src/`**
   (la única del repo es `ModalShell.vue:186`, y describe el cuerpo de un diálogo). El lector de pantalla enfoca el
   campo, oye la etiqueta, y **no oye el error**. Criterio: **§3.3.1 Error Identification (A)**.
   Radio: **2 primitivas, 21 consumidores, los 17 formularios de catálogo de la consola.**
   Arreglo: `useId()` para `errorId`/`hintId`, `:aria-describedby="error ? errorId : (hint ? hintId : undefined)"`,
   `:id` en los dos `<p>`. ~8 líneas por componente, sin cambio visual.
   *Propuesta de issue:* `admin-web` · «`AppInput`/`AppTextarea`: el error no está asociado al campo (WCAG §3.3.1)».
2. **Tono de la confirmación** — *menor*. `AppConfirmDialog` solo sabe pintar rojo (§5.3). Añadir
   `tone?: 'danger' | 'accent'` a `ConfirmOptions` con `'danger'` por defecto: 3 ficheros, 0 call
   sites afectados.
3. **Los cuatro `href="#"` del shell** (`LoginView.vue:56,136,137,138`) — *menor*. Al pasar al
   layout se multiplican por cuatro pantallas. Si no hay destino, `<span>`; si lo hay, `<RouterLink>`
   o `<a href>` real. **Decisión de producto, no de diseño.**
4. **Entropía del token de aprobación** — *bloqueante si sale mal*. La pantalla enseña nombre, correo
   y motivo a quien tenga el enlace (§3.3, punto 3). Requiere confirmación del backend.
5. **`document.title`** — el patrón que aquí se estrena es el arreglo de **public-web #133** para
   estas tres rutas. Conviene decidir si se generaliza al router (una línea en `afterEach`) o se
   queda por vista.
6. **Sin una sola puerta de accesibilidad en el pipeline.** Nada de este documento se verificará
   solo. La propuesta mínima y barata: `eslint-plugin-vuejs-accessibility` en `eslint.config.ts`
   (estático, sin navegador, sin coste de CI) + `@axe-core/playwright` en las tres rutas públicas
   nuevas, que son las únicas que no necesitan sesión y por tanto **las más baratas de auditar de
   toda la consola**. Esta tanda es la ocasión: son rutas nuevas, no hay deuda que arrastrar.

---

## 12 · Verificación — qué prueba sujeta qué

Para `front-e2e-visual`. Ninguna existe hoy.

| # | Prueba | Qué sujeta |
|---|---|---|
| V1 | Unit: `/solicitar-acceso` con `GET` de disponibilidad a 404 → renderiza el estado cerrado y **el texto no contiene** `superadministrador`, `ya existe`, `configurad`, ni el `detail` del `ProblemDetail`. | §4.4, la fuga |
| V2 | Unit: `POST` a 404 → mismo estado cerrado que V1, mismo texto. | §4.4 |
| V3 | Unit: `validate()` fallido → `ErrorSummary` con N items **en orden del DOM** y foco en el resumen. | §4.6, A2 |
| V4 | Unit: el texto del error en línea y el del item del resumen son **el mismo string**. | §9.3 |
| V5 | Unit `CodeInput`: pegar `12-34 56` deja `123456`; pegar `1234567` deja `123456`; `abc` deja `''`. | §7.3 |
| V6 | Unit `CodeInput`: `inputmode="numeric"`, `autocomplete="one-time-code"`, `type="text"` (**no** `number`), y `aria-describedby` apunta al error cuando hay error. | §7.2 |
| V7 | Unit: `Rechazar` y `Aprobar acceso` **no** llaman a la API sin confirmar; con `confirm` resuelto a `false`, cero llamadas. | §5.3 |
| V8 | Unit: contraseña de 11 caracteres → error; de 12 → sin error; confirmación distinta → error de confirmación. | §8.1 |
| V9 | Unit: `POST` de aceptación con `500` → **sigue en `form`** y la contraseña escrita **no se pierde**; con `410` → `invalid`. | §6.3 |
| V10 | Unit: los tres estados `invalid` (falta token / token malo / caducado) producen **el mismo texto**. | §5.5, §6.5 |
| V11 | Unit `PublicLayout`: skip link presente, apunta a `#pub-main`, y `main` tiene ese `id`. | §2.3, §2.4.1 |
| V12 | Unit: `document.title` cambia con el estado en las tres vistas. | §2.4.2 |
| V13 | Playwright + **ARIA snapshot** (`toMatchAriaSnapshot`) de los 4 estados de `/solicitar-acceso`: fija la semántica —encabezados, roles, nombres accesibles— no los píxeles. | §9 completo |
| V14 | Playwright: recorrido solo con teclado de `/aprobar-acceso` hasta abrir la confirmación y volver con `Cancelar`, comprobando dónde queda el foco. | A1, A6, §9.4 |
| V15 | `scripts/css-budget.mjs` en verde **sin tocar `css-budget.config.json`**. | §2.5 |
| V16 | `stylelint` en verde: ni un cuerpo de `<style scoped>` que duplique una primitiva. | FE-08 |

---

## 13 · Orden de implementación sugerido

1. `PublicLayout` + migración de `LoginView` + retirada del `.primary-btn` local. **Solo esto**,
   con las líneas base visuales delante: es un refactor pixel-exacto y tiene que demostrarse como tal.
2. Rutas + `platform-access.api.ts` + tipos.
3. `/aceptar-invitacion` — la más parecida a algo que ya existe, la que menos incógnitas tiene.
4. `/solicitar-acceso` — incluido el estado cerrado, que **se implementa primero**, no al final.
5. `CodeInput` + `/aprobar-acceso`.
6. `PasswordChecklist` (recortable).

El paso 1 y el paso 4 son los que más valor tienen y los que se pueden entregar por separado.
