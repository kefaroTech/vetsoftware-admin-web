<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch, type Component } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    icon?: Component
    /**
     * Ancho fijo en px (aprox.). SOLO se usa en modo `compact`; los modales
     * normales ocupan un % del viewport (ver `widthVw`) e ignoran `width`.
     */
    width?: number
    /**
     * Ancho relativo al viewport (en %). Por defecto los modales ocupan 90% del
     * ancho de pantalla (acotado a 1600px en monitores ultra-anchos). Pasa un
     * valor para usar otro %. Ignorado en modo `compact`.
     */
    widthVw?: number
    /**
     * Alto relativo al viewport (en %). Por defecto los modales ocupan 90% del
     * alto de pantalla (el cuerpo scrollea dentro). Pasa un valor para otro %.
     * Ignorado en modo `compact`.
     */
    heightVh?: number
    /**
     * Modo compacto: el modal se dimensiona por CONTENIDO con ancho fijo `width`
     * (px). Úsalo solo para diálogos pequeños de confirmación/alerta (sí/no),
     * donde ocupar el 90% de la pantalla se vería roto.
     */
    compact?: boolean
    accent?: 'amatista' | 'danger' | 'warn'
    closeOnBackdrop?: boolean
    /**
     * Cuando es `false` el modal es NO descartable: se oculta la X y Escape deja de
     * cerrarlo. Úsalo para decisiones forzadas donde el usuario debe elegir una acción
     * del footer para salir (p.ej. la facturación tras guardar la consulta).
     */
    closable?: boolean
    /** Sube el z-index para apilarse por encima de otro modal ya abierto (modales anidados). */
    elevated?: boolean
  }>(),
  {
    width: 720,
    accent: 'amatista',
    // Regla global: los modales NO se cierran al hacer click fuera (solo con la X / Escape).
    closeOnBackdrop: false,
    closable: true,
  },
)

const emit = defineEmits<{ close: [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)
const titleId = useId()

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

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' && props.closable) {
    e.preventDefault()
    emit('close')
  }
}

function onBackdrop() {
  if (props.closeOnBackdrop) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) requestAnimationFrame(() => closeBtn.value?.focus())
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="overlay"
        :class="{ elevated }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="onBackdrop"
      >
        <div
          class="card"
          :class="`accent-${accent}`"
          :style="{ width: cardWidth, maxHeight: cardMaxHeight }"
        >
          <header class="head">
            <div v-if="icon" class="icon-box">
              <component :is="icon" :size="20" :stroke-width="1.7" />
            </div>
            <div class="head-text">
              <h2 :id="titleId" class="title">{{ title }}</h2>
              <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
            </div>
            <button
              v-if="closable"
              ref="closeBtn"
              type="button"
              class="close"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :size="18" :stroke-width="1.7" />
            </button>
          </header>

          <div class="body">
            <slot name="body" />
          </div>

          <footer v-if="$slots['footer-left'] || $slots['footer-actions']" class="foot">
            <div class="foot-left">
              <slot name="footer-left" />
            </div>
            <div class="foot-actions">
              <slot name="footer-actions" />
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(20 15 30 / 55%);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: 1500;
  font-family: var(--font-sans);
}

/* Modal anidado: se apila por encima de otro modal ya abierto. */
.overlay.elevated {
  z-index: 1600;
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
  z-index: 1;
}

.icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.accent-amatista .icon-box {
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.accent-danger .icon-box {
  background: var(--danger-150);
  color: var(--danger-600);
}

.accent-warn .icon-box {
  background: var(--warning-50);
  color: oklch(45% 0.13 80deg);
}

.head-text {
  flex: 1;
  min-width: 0;
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

.close:hover {
  background: var(--warm-100);
  color: var(--warm-900);
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
