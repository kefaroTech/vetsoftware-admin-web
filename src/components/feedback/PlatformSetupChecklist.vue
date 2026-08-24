<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { usePlatformSetup } from '@/features/platform-setup/composables/usePlatformSetup'
import {
  PLATFORM_SETUP_TEXTS,
  type PlatformSetupStep,
  type PlatformSetupStepId,
} from '@/features/platform-setup/types/platform-setup.types'

/**
 * La puesta en marcha de la plataforma (§3.7 de la especificación de
 * suscripciones), en las cuatro pantallas que arrancan vacías y en el fallo del
 * alta de una empresa.
 *
 * ── Por qué es un componente y no un `AppEmptyState` con más texto ──────────
 *
 * `AppEmptyState` tiene `title`, `description` y **un** slot de acción. Aquí hay
 * siete pasos con estado independiente y destino propio cada uno. Sin
 * componente, serían cinco copias del mismo bloque y el gate de duplicados
 * acabaría marcándolo (`scripts/css-budget.mjs`, regla 2).
 *
 * ── La regla de decisión que materializa ────────────────────────────────────
 *
 * > Lista vacía **y** sin filtro ni búsqueda **y** el recurso es prerrequisito
 * > de arranque → el estado no es «sin resultados», es «falta el paso N de la
 * > puesta en marcha», con la lista de pasos y sus enlaces.
 *
 * «Aún no hay registros» en una consola recién desplegada se lee como «esto está
 * roto» o «los datos no cargaron», y termina en un ticket (NN/g, *Empty State
 * Interface Design*).
 *
 * ── Accesibilidad ──────────────────────────────────────────────────────────
 *
 * - Región `role="status"` + `aria-live="polite"`: al volver de completar un
 *   paso, el recuento cambia y se anuncia **sin robar el foco** (§5.3).
 * - El recuento va también en el `<h2>` visible: quien ve la pantalla necesita
 *   el mismo dato que quien la escucha.
 * - El `<h2>` lleva `tabindex="-1"` y el componente expone `focus()`: cuando el
 *   alta falla, el foco va al encabezado de lo que hay que hacer ahora, no al
 *   botón que acaba de desaparecer ni al principio del documento (§5.1). Es el
 *   mismo mecanismo que `ErrorSummary.vue:56-58`.
 * - Ningún estado se comunica solo por color (§5.2): cada píldora lleva su
 *   rótulo textual —«Listo» / «Pendiente» / «Recomendado»— y el icono va
 *   `aria-hidden`, como refuerzo y nunca como único portador.
 * - Cero tonos nuevos: los cuatro de `ds-tone--*` ya están medidos contra
 *   §1.4.3 (DS-01).
 */
const props = withDefaults(
  defineProps<{
    /**
     * `full` pinta la lista entera; `compact` una sola línea con el recuento y
     * un enlace a donde se hace (§3.7, tabla «Dónde se pinta»).
     */
    variant?: 'full' | 'compact'
    /** Qué no se puede hacer todavía: «cotizar», «contratar»… Solo en `compact`. */
    purpose?: string
    /**
     * Pasos que el servidor nombró al rechazar el alta. Se marcan **con texto**,
     * no con color, para que el mensaje del servidor y esta lista se lean como
     * un solo problema y no como dos (GOV.UK, *Validation pattern*).
     */
    flagged?: PlatformSetupStepId[]
  }>(),
  { variant: 'full', purpose: 'continuar', flagged: () => [] },
)

const {
  steps,
  loading,
  error,
  errorTraceId,
  requiredTotal,
  requiredDone,
  pendingRequired,
  unknownSteps,
  blocked,
  load,
} = usePlatformSetup()

const router = useRouter()
/** Rutas que el router conoce hoy: las de las tareas hermanas pueden faltar aún. */
const knownPaths = computed(() => new Set(router.getRoutes().map((route) => route.path)))

const heading = ref<HTMLElement | null>(null)

onMounted(() => {
  void load()
})

const countLabel = computed(() =>
  PLATFORM_SETUP_TEXTS.count(requiredDone.value, requiredTotal.value),
)

const bodyLabel = computed(() =>
  blocked.value
    ? PLATFORM_SETUP_TEXTS.body
    : 'Los pasos obligatorios están completos: ya se puede dar de alta una empresa.',
)

/** El servidor dijo que falta catálogo y la comprobación no encuentra nada pendiente. */
const contradiction = computed(() => props.flagged.length > 0 && !blocked.value)

function pillLabel(step: PlatformSetupStep): string {
  if (step.state === 'unknown') return PLATFORM_SETUP_TEXTS.unknown
  if (step.state === 'done') return PLATFORM_SETUP_TEXTS.done
  return step.required ? PLATFORM_SETUP_TEXTS.pending : PLATFORM_SETUP_TEXTS.recommended
}

function pillTone(step: PlatformSetupStep): string {
  if (step.state === 'done') return 'ds-tone--success'
  if (step.state === 'unknown') return 'ds-tone--neutral'
  return step.required ? 'ds-tone--neutral' : 'ds-tone--accent-soft'
}

function pillIcon(step: PlatformSetupStep) {
  if (step.state === 'done') return ICONS.SUCCESS
  if (step.state === 'unknown') return ICONS.WARNING
  return step.required ? ICONS.UNCHECKED : ICONS.INFO
}

const isFlagged = (step: PlatformSetupStep) => props.flagged.includes(step.id)

/** Mueve el foco al encabezado. Lo llama quien hace aparecer la lista (§5.1). */
function focus() {
  heading.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <!-- `compact`: una línea, y nada si no falta nada. Un aviso de puesta en
       marcha sobre una plataforma ya sembrada es ruido. -->
  <p
    v-if="variant === 'compact' && (blocked || loading)"
    class="ds-empty--boxed compacto"
    role="status"
    aria-live="polite"
  >
    <component :is="ICONS.INFO" :size="15" class="icono" aria-hidden="true" />
    <span v-if="loading && steps.length === 0">Comprobando la puesta en marcha…</span>
    <span v-else>{{ PLATFORM_SETUP_TEXTS.missing(pendingRequired, purpose) }}</span>
    <RouterLink v-if="knownPaths.has('/catalogo-comercial')" to="/catalogo-comercial">
      Ver los pasos
    </RouterLink>
  </p>

  <section
    v-else-if="variant === 'full'"
    class="ds-empty--boxed ds-stack ds-stack--16"
    role="status"
    aria-live="polite"
  >
    <div class="ds-stack ds-stack--8">
      <h2 ref="heading" tabindex="-1" class="titulo">
        {{ PLATFORM_SETUP_TEXTS.heading }}
        <span class="ds-meta recuento">{{ countLabel }}</span>
      </h2>
      <p class="cuerpo">{{ bodyLabel }}</p>
    </div>

    <p v-if="loading && steps.length === 0" class="ds-meta">Comprobando los pasos…</p>

    <!-- Un fallo que impidió comprobarlo TODO: no hay lista honesta que pintar,
         así que se dice, con su traza, en vez de enseñar siete «Pendiente». -->
    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        {{ error }}
        <span v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="load()">
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>

    <div v-if="unknownSteps.length > 0" class="ds-banner ds-banner--warning">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        {{ unknownSteps.length }} de los pasos no se pudieron comprobar, así que el recuento no está
        completo.
      </span>
    </div>

    <div v-if="contradiction" class="ds-banner ds-banner--warning">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        El servidor rechazó el alta por falta de catálogo, pero esta comprobación no encuentra
        ningún paso pendiente. Copia el identificador de traza del aviso antes de reintentar.
      </span>
    </div>

    <ol v-if="steps.length > 0" class="ds-list-reset ds-stack ds-stack--14">
      <li v-for="step in steps" :key="step.id" class="paso">
        <span class="ds-pill" :class="pillTone(step)">
          <component :is="pillIcon(step)" :size="13" aria-hidden="true" />
          {{ pillLabel(step) }}
        </span>
        <div class="ds-stack ds-stack--8 texto">
          <RouterLink v-if="knownPaths.has(step.to)" :to="step.to" class="rotulo">
            {{ step.order }}. {{ step.label }}
          </RouterLink>
          <span v-else class="rotulo">
            {{ step.order }}. {{ step.label }}
            <span class="ds-meta">· la pantalla donde se hace todavía no existe</span>
          </span>
          <p class="ds-meta">{{ step.detail }}</p>
          <p v-if="step.reason" class="ds-meta">No se pudo comprobar: {{ step.reason }}</p>
          <p v-if="isFlagged(step)" class="ds-meta">
            El servidor lo nombró al rechazar el alta de la empresa.
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.compacto {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin: 0;
}

.icono {
  flex-shrink: 0;
  color: var(--text-subtle);
}

.titulo {
  margin: 0;
  color: var(--text);
  font-size: var(--text-h3);
}

.recuento {
  margin-left: var(--space-8);
}

.cuerpo {
  margin: 0;
  max-width: 68ch;
}

.paso {
  display: flex;
  align-items: flex-start;
  gap: var(--space-10);
}

.texto {
  min-width: 0;
}

.rotulo {
  color: var(--text);
  font-weight: var(--weight-medium);
}
</style>
