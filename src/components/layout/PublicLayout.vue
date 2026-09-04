<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'

/**
 * Shell de las pantallas públicas (login, solicitud de acceso, aprobación de
 * acceso, invitación).
 *
 * `eyebrow`/`title`/`subtitle`/`statusIcon` son PROPS y no slots a propósito:
 * un `<style scoped>` no alcanza al contenido inyectado por slot (se compila
 * con el `data-v` del padre), así que con slots las cuatro vistas tendrían que
 * redeclarar `.eyebrow`, `.title` y `.subtitle` en su propio scoped — cuatro
 * cuerpos idénticos que rechazan las dos puertas del repo
 * (`vetsoftware/no-duplicate-primitive` y `css-budget.config.json` con
 * `maxDuplicateGroups: 0`). Con props, el CSS vive en un solo sitio y las
 * vistas nuevas aportan casi cero líneas de estilo.
 */
const props = withDefaults(
  defineProps<{
    /** Rótulo de acento sobre el título. Opcional: los estados con icono no lo llevan. */
    eyebrow?: string
    /** Encabezado de la tarjeta. Se pinta como `<h1>`. Vacío ⇒ no se pinta. */
    title?: string
    /** Párrafo bajo el título. */
    subtitle?: string
    /** Icono circular sobre el título, para los estados terminales (éxito / error). */
    statusIcon?: Component
    /** Tono del icono de estado. */
    statusTone?: 'success' | 'danger' | 'accent'
    /** Envolver el slot en la tarjeta blanca. */
    card?: boolean
    /** Ancho máximo de la tarjeta en px. */
    maxWidth?: number
    /** Título del documento (WCAG 2.2 §2.4.2). Se escribe en `document.title`. */
    documentTitle?: string
  }>(),
  { card: true, maxWidth: 440, statusTone: 'accent' },
)

/**
 * El tono del círculo de estado se resuelve con las primitivas `.ds-tone--*`
 * en lugar de con tres cuerpos locales: un `{background; border-color; color}`
 * con los tokens de éxito es byte a byte el cuerpo de `.ds-banner--success`, y
 * la regla `vetsoftware/no-duplicate-primitive` lo rechaza — con razón.
 */
const TONE_CLASS = {
  success: 'ds-tone--success',
  danger: 'ds-tone--danger',
  accent: 'ds-tone--accent-soft',
} as const

const toneClass = computed(() => TONE_CLASS[props.statusTone])

const heading = ref<HTMLElement | null>(null)

/**
 * A11Y A1 · al cambiar de estado, el foco va al `<h1>` del estado nuevo. Sin
 * esto el foco se queda en un botón que ya no existe y el navegador lo devuelve
 * a `<body>`: el siguiente Tab reinicia el recorrido. Lo llama la vista, que es
 * quien sabe cuándo hubo cambio de estado y cuándo lo correcto es enfocar el
 * primer campo en su lugar (A5).
 */
function focusTitle() {
  heading.value?.focus({ preventScroll: false })
}

function applyDocumentTitle(value?: string) {
  if (value) document.title = value
}

onMounted(() => applyDocumentTitle(props.documentTitle))
watch(() => props.documentTitle, applyDocumentTitle)

defineExpose({ focusTitle })
</script>

<template>
  <div class="pub-shell ds-stack">
    <!-- WCAG 2.2 §2.4.1 Bypass Blocks. `.ds-sr-only` lo esconde; la regla de
         foco de abajo tiene que anular ADEMÁS `clip-path`, que sigue recortando
         aunque el elemento reciba el foco: sin eso el enlace existe y es
         invisible, que es peor que no tenerlo. -->
    <a class="pub-skip ds-sr-only" href="#pub-main">Saltar al contenido</a>

    <div class="blob blob-tr" aria-hidden="true" />
    <div class="blob blob-bl" aria-hidden="true" />

    <header class="topbar">
      <span class="brand-name">Lumbre</span>
      <div class="topbar-link"><slot name="topRight" /></div>
    </header>

    <main id="pub-main" class="pub-main" tabindex="-1">
      <div v-if="card" class="pub-card" :style="{ maxWidth: `${maxWidth}px` }">
        <div v-if="statusIcon" class="pub-status" :class="toneClass">
          <component :is="statusIcon" :size="38" :stroke-width="1.6" />
        </div>
        <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
        <h1 v-if="title" ref="heading" class="title" tabindex="-1">{{ title }}</h1>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
        <slot />
      </div>
      <slot v-else />
    </main>

    <footer class="footer">
      <span>© 2026 Lumbre</span>
      <div class="footer-links">
        <a href="#">Privacidad</a>
        <a href="#">Términos</a>
        <a href="#">Soporte</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.pub-shell {
  position: relative;
  min-height: 100vh;
  background: radial-gradient(
    ellipse at top,
    var(--amatista-100) 0%,
    var(--brand-canvas) 50%,
    var(--warm-150) 100%
  );
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: var(--text);
  overflow-x: hidden;
}

/* El anillo `--ring` solo está en contrato sobre `--warm-50`/`--surface`/blanco
   (tokens.css:290-302). Sobre el degradado del shell queda fuera, así que el
   enlace se pinta con su propio fondo claro al recibir el foco (§2.4.11). */
.pub-skip:focus-visible {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 3;
  width: auto;
  height: auto;
  min-width: 24px;
  min-height: 24px;
  padding: 10px 16px;
  margin: 0;
  overflow: visible;
  clip-path: none;
  border-radius: 9px;
  background: var(--warm-50);
  color: var(--amatista-600);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: var(--ring);
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.blob-tr {
  top: -150px;
  right: -150px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgb(137 137 248 / 25%), transparent 60%);
}

.blob-bl {
  bottom: -150px;
  left: -150px;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgb(119 119 227 / 18%), transparent 60%);
}

.topbar {
  position: relative;
  z-index: 1;
  padding: 24px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Sin isotipo: por debajo de 48 px la ilustración de marca es una mancha sin
   figura reconocible, así que en este tramo la identidad la carga el nombre. */
.brand-name {
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  letter-spacing: -0.01em;
  color: var(--text);
}

.topbar-link {
  font-size: 13px;
  color: var(--text-muted);
}

/* El enlace lo inyecta la vista por el slot `#topRight`, así que se compila con
   el `data-v` del PADRE y el scoped de aquí no lo alcanza sin `:deep()`. */
.topbar-link :deep(a) {
  color: var(--amatista-600);
  font-weight: 600;
  text-decoration: none;
}

.topbar-link :deep(a:hover) {
  color: var(--amatista-700);
}

.pub-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* Destino del skip link: recibe el foco por programa, no por teclado, y un
   anillo alrededor de toda la columna no informaría de nada. */
.pub-main:focus {
  outline: none;
}

.pub-card {
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 44px;
  box-shadow:
    0 24px 48px -16px rgb(67 57 160 / 18%),
    0 4px 12px -4px rgb(67 57 160 / 8%);
}

/* Círculo de estado de los estados terminales (5 estados en tres vistas). El
   color lo pone una clase `.ds-tone--*` desde el marcado; aquí, solo la forma. */
.pub-status {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--amatista-600);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.title {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--text);
}

/* Recibe el foco por programa al cambiar de estado (A1). El anillo sobre un
   titular de 34px no aporta y el usuario no llegó ahí tabulando. */
.title:focus {
  outline: none;
}

.subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 10px 0 28px;
  line-height: 1.5;
}

.footer {
  position: relative;
  z-index: 1;
  padding: 20px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.footer-links {
  display: flex;
  gap: 16px;
}

.footer-links a {
  color: var(--text-muted);
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--amatista-600);
}

@media (width <= 640px) {
  .topbar,
  .footer {
    padding: 16px 20px;
  }

  .pub-card {
    padding: 28px 24px;
  }

  .title {
    font-size: 28px;
  }

  .footer {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
