<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch, type Component } from 'vue'
import { X } from 'lucide-vue-next'
import { useModalLayer } from '@/composables/useModalLayer'
import { useModalHistory } from '@/composables/useModalHistory'
import { useModalFocus } from '@/composables/useModalFocus'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    icon?: Component
    /** Ancho fijo en px (aprox.). SOLO en modo `compact`; los normales usan `widthVw`. */
    width?: number
    /** Ancho relativo al viewport (%). Por defecto 90% (tope 1600px). Ignorado en `compact`. */
    widthVw?: number
    /** Alto relativo al viewport (%). Por defecto 90% (el cuerpo scrollea). Ignorado en `compact`. */
    heightVh?: number
    /** Modo compacto: se dimensiona por CONTENIDO con ancho fijo `width`. Solo diálogos sí/no. */
    compact?: boolean
    accent?: 'amatista' | 'danger' | 'warn'
    /** `'dialog'` (por defecto) o `'alertdialog'`: para el diálogo que interrumpe
     *  para confirmar o avisar de algo con consecuencia, cuyo cuerpo hay que oír sí o sí. */
    role?: 'dialog' | 'alertdialog'
    closeOnBackdrop?: boolean
    /** `false` = NO descartable: sin X y sin Escape. Para decisiones forzadas del footer. */
    closable?: boolean
    /** Sube el z-index para apilarse por encima de otro modal ya abierto (modales anidados). */
    elevated?: boolean
    /**
     * A11Y-08 · dónde devolver el foco al cerrar cuando el disparador ya no está
     * en el DOM. Elemento, función que lo resuelva al cerrar, o selector CSS.
     * Sin esto: cadena de respaldo — disparador capturado al abrir → `<h1>` de
     * `main` → `main`.
     */
    returnFocusTo?: HTMLElement | (() => HTMLElement | null) | string | null
    /** Sobrescribe el foco inicial (por defecto: X; si no, primer tabulable; si no, la tarjeta). */
    initialFocus?: () => HTMLElement | null
    /** FORM-07 · si devuelve `true`, X/Escape/backdrop NO emiten `close`: confirma antes.
     *  Función evaluada en el instante del intento de cierre, no en el render. */
    confirmCloseWhen?: () => boolean
    confirmCloseTitle?: string
    confirmCloseMessage?: string
    confirmKeepLabel?: string
    confirmDiscardLabel?: string
    /** EST-09 · entrada de historial para que "atrás" cierre el modal en vez de abandonar la pantalla. */
    historyEntry?: boolean
    /** Bloqueo de scroll del fondo mientras hay algún modal abierto. */
    lockScroll?: boolean
  }>(),
  {
    width: 720,
    accent: 'amatista',
    role: 'dialog',
    // Regla global: los modales NO se cierran al hacer click fuera (solo con la X / Escape).
    closeOnBackdrop: false,
    closable: true,
    confirmCloseTitle: 'Se perderán los datos escritos',
    confirmCloseMessage:
      'Los cambios de este formulario no se han guardado. Si sales ahora se pierden.',
    confirmKeepLabel: 'Seguir editando',
    confirmDiscardLabel: 'Descartar cambios',
    historyEntry: true,
    lockScroll: true,
  },
)

const emit = defineEmits<{ close: []; 'after-close': [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)
const cardEl = ref<HTMLElement | null>(null)
const titleId = useId()
const bodyId = useId()
const confirmOpen = ref(false)

const layerRegistry = useModalLayer()
const modalHistory = useModalHistory()
const modalFocus = useModalFocus({
  cardEl,
  closeBtn,
  getInitialFocus: () => props.initialFocus,
  getReturnFocusTo: () => props.returnFocusTo,
})
let myLayer: ReturnType<typeof layerRegistry.enter> | null = null

// Regla global: TODOS los modales ocupan ~90% del viewport (ancho y alto), salvo
// los `compact` (confirmaciones/alertas), que se dimensionan por contenido con
// ancho fijo `width`. `widthVw`/`heightVh` permiten ajustar el % por modal.
const cardWidth = computed(() =>
  props.compact
    ? `min(${props.width + 180}px, calc(100vw - 32px))`
    : `min(${props.widthVw ?? 90}vw, 1600px, calc(100vw - 32px))`,
)

// Alto: SIEMPRE lo define el contenido, acotado por un máximo. En modo normal el
// tope es un % del viewport (los formularios cortos se ajustan a su contenido; los
// largos crecen hasta el tope y el cuerpo scrollea). En compact el tope es casi la
// pantalla completa (pero igual manda el contenido).
const cardMaxHeight = computed(() =>
  props.compact ? 'calc(100vh - 32px)' : `min(${props.heightVh ?? 90}vh, calc(100vh - 24px))`,
)

/** FORM-07 · ruta canónica de cierre: resuelve `confirmCloseWhen` antes de emitir. */
function requestClose() {
  if (props.confirmCloseWhen?.()) {
    confirmOpen.value = true
    return
  }
  doClose()
}

function doClose() {
  emit('close')
}

/** Botón destructivo de la capa de confirmación: cierra la propia capa y, ya sin
 *  confirmación pendiente, cierra el modal que la disparó. */
function discardAndClose() {
  confirmOpen.value = false
  doClose()
}

function onKey(e: KeyboardEvent) {
  if (!props.open || !props.closable) return
  // Con varios modales anidados, Escape SOLO lo atiende el superior de la pila.
  if (myLayer && !layerRegistry.isTop(myLayer)) return
  if (e.key === 'Escape') {
    e.preventDefault()
    requestClose()
  }
}

function onBackdrop() {
  if (props.closeOnBackdrop) requestClose()
}

function onPopState() {
  if (!props.open || !props.closable || !myLayer || !layerRegistry.isTop(myLayer)) return
  modalHistory.clear()
  requestClose()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      modalFocus.captureTrigger()
      myLayer = layerRegistry.enter(props.lockScroll)
      if (props.historyEntry) modalHistory.push()
      requestAnimationFrame(() => modalFocus.resolveInitialFocus()?.focus())
    } else if (myLayer) {
      const mine = myLayer
      myLayer = null
      layerRegistry.leave(mine)
      if (props.historyEntry) modalHistory.release()
      modalFocus.resolveReturnFocus()?.focus({ preventScroll: true })
      emit('after-close')
    }
  },
  { immediate: true },
)

defineExpose({ requestClose })

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('popstate', onPopState)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="overlay"
        :class="{ elevated }"
        :role="role"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="bodyId"
        @click.self="onBackdrop"
        @keydown.capture="modalFocus.onTrapTab"
      >
        <div
          ref="cardEl"
          class="card"
          :class="`accent-${accent}`"
          :style="{ width: cardWidth, maxHeight: cardMaxHeight }"
          tabindex="-1"
        >
          <header class="head">
            <div v-if="icon" class="icon-box" :class="{ 'ds-tone--accent': accent === 'amatista' }">
              <component :is="icon" :size="20" :stroke-width="1.7" />
            </div>
            <div class="head-text ds-flex-fill">
              <h2 :id="titleId" class="title">{{ title }}</h2>
              <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
            </div>
            <button
              v-if="closable"
              ref="closeBtn"
              type="button"
              class="close ds-hover-neutral"
              aria-label="Cerrar"
              @click="requestClose"
            >
              <X :size="18" :stroke-width="1.7" />
            </button>
          </header>

          <div :id="bodyId" class="body">
            <slot name="body" />
          </div>

          <footer v-if="$slots['footer-left'] || $slots['footer-actions']" class="foot">
            <div class="foot-left">
              <slot name="footer-left" />
            </div>
            <div class="foot-actions">
              <slot name="footer-actions" :request-close="requestClose" />
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- FORM-07 · capa de confirmación, dibujada con el propio ModalShell
       (recursión de profundidad 2: esta instancia no recibe confirmCloseWhen,
       así que no vuelve a montar otra). Cero líneas de estilo nuevas: reutiliza
       ds-dialog-body y ds-btn de primitives.css. -->
  <ModalShell
    v-if="confirmCloseWhen"
    :open="confirmOpen"
    :title="confirmCloseTitle"
    compact
    :width="420"
    accent="danger"
    :closable="false"
    :close-on-backdrop="false"
    :elevated="elevated"
    :history-entry="false"
    role="alertdialog"
    @close="confirmOpen = false"
  >
    <template #body>
      <p class="ds-dialog-body">{{ confirmCloseMessage }}</p>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="confirmOpen = false">
        {{ confirmKeepLabel }}
      </button>
      <button type="button" class="ds-btn ds-btn--danger-solid" @click="discardAndClose">
        {{ confirmDiscardLabel }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(20 15 30 / 55%);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: var(--z-modal);
  font-family: var(--font-sans);
}

/* Modal anidado: se apila por encima de otro modal ya abierto. */
.overlay.elevated {
  z-index: var(--z-modal-nested);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.card {
  background: var(--warm-50);
  border-radius: 16px;
  box-shadow: 0 30px 80px rgb(20 15 30 / 35%);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: clamp(18px, 1.5vw + 8px, 28px) clamp(20px, 2vw + 12px, 36px) clamp(14px, 1vw + 8px, 20px);
  border-bottom: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  top: 0;
  z-index: var(--z-raised);
}

.icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* El tono amatista migró a `.ds-tone--accent` (primitives.css), aplicado
   directamente sobre `.icon-box` cuando `accent === 'amatista'`. Los otros
   dos acentos se quedan locales: no coinciden byte a byte con ninguna
   `.ds-tone--*` (`--danger` es `danger-200`/`oklch(50% 0.2 25deg)`, no
   `danger-150`/`danger-600`). */
.accent-danger .icon-box {
  background: var(--danger-150);
  color: var(--danger-600);
}

.accent-warn .icon-box {
  background: var(--warning-50);
  color: oklch(45% 0.13 80deg);
}

.title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.15;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.4;
}

.close {
  background: transparent;
  border: none;
  color: var(--warm-500);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s ease;
}

.body {
  flex: 1;
  overflow: auto;
  padding: clamp(20px, 1.6vw + 10px, 32px) clamp(20px, 2vw + 12px, 36px);
}

.foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: clamp(12px, 1vw + 4px, 18px) clamp(20px, 2vw + 12px, 36px);
  border-top: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  bottom: 0;
}

.foot-left {
  flex: 1;
  font-size: 12.5px;
  color: var(--warm-500);
}

.foot-actions {
  display: flex;
  gap: 8px;
}

@media (width <= 560px) {
  .card {
    border-radius: 14px;
  }

  .head {
    padding: 18px 20px 14px;
  }

  .body {
    padding: 18px 20px;
  }

  .foot {
    align-items: stretch;
    flex-direction: column;
    padding: 12px 20px 14px;
  }

  .foot-left {
    flex: none;
    width: 100%;
    line-height: 1.35;
  }

  .foot-actions {
    width: 100%;
  }

  .foot-actions :deep(button) {
    flex: 1;
    justify-content: center;
    min-width: 0;
  }
}
</style>
