<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Send, TriangleAlert } from 'lucide-vue-next'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PriceListCoveragePanel from './PriceListCoveragePanel.vue'
import { PUBLISH_IS_TERMINAL, type PriceListCoverage } from '../composables/priceListCoverage'
import { priceListEffectiveness } from '../composables/priceListValidity'
import type { PriceListResponse } from '../types/commercial-catalog.types'

/**
 * Publicar una tarifa — con la cobertura delante y sin vuelta atrás.
 *
 * ── Por qué esto ya no es un `confirm()` de una línea ─────────────────────
 *
 * <p>Publicar hacía dos cosas mal a la vez: no comprobaba nada y no decía que era
 * terminal. Una lista a la que le falta el precio de un artículo activo se
 * publicaba en silencio, y si el olvidado era el del núcleo <b>ninguna empresa
 * podía registrarse</b> — el alta cotiza el núcleo y no encontraba precio. El
 * fallo aparecía en la primera alta que se intentara, sin que nada apuntara a la
 * tarifa.
 *
 * <p>Así que la comprobación va <b>antes</b> de la decisión y dentro del mismo
 * diálogo: no es un aviso que se cierre y se olvide, es lo que se está mirando
 * cuando se pulsa el botón.
 *
 * ── La casilla, y por qué no se deshabilita el botón ──────────────────────
 *
 * <p>El backend deja publicar una tarifa incompleta y a veces es legítimo —una
 * tarifa de un solo artículo para un piloto—, así que la pantalla no puede
 * prohibir lo que el servidor permite. Lo que sí hace es que no se pueda hacer
 * <b>sin querer</b>: con huecos, hay que marcar una casilla que nombra la
 * consecuencia. Un botón apagado no explica nada y empuja a buscar la ruta
 * alternativa; una casilla obliga a leer.
 *
 * ── Despublicar no existe, y se dice ──────────────────────────────────────
 *
 * <p>El contrato expone `publish` y `archive`, y ninguna ruta que devuelva una
 * lista publicada a borrador. Un artículo publicado a 120.000 en vez de a 12.000
 * y detectado a las tres horas no se corrige: se archiva la lista y se publica
 * otra, y mientras tanto lo mal publicado cotiza. Eso se dice aquí, antes, que es
 * donde todavía sirve de algo. Ver `PUBLISH_IS_TERMINAL`.
 */
const props = defineProps<{
  open: boolean
  priceList: PriceListResponse | null
  coverage: PriceListCoverage
  /** El día de hoy en la zona del negocio, como `yyyy-MM-dd`. Ver `priceListValidity`. */
  today: string
  coverageLoading?: boolean
  coverageError?: string | null
  coverageTraceId?: string | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; retryCoverage: []; confirm: [] }>()

const acknowledged = ref(false)
const attempted = ref(false)

/** Cada apertura empieza sin marcar: un permiso no se hereda del caso anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    acknowledged.value = false
    attempted.value = false
  },
)

const hasGaps = computed(() => props.coverage.gaps.length > 0)
const hasCoreGaps = computed(() => props.coverage.coreGaps.length > 0)

/** Mientras la cobertura viaja no se publica: publicar a ciegas es el defecto. */
const blocked = computed(() => props.coverageLoading === true || !!props.coverageError)

const acknowledgeLabel = computed(() =>
  hasCoreGaps.value
    ? 'Entiendo que falta el precio de un artículo del núcleo y que, mientras esta tarifa sea la vigente, ninguna empresa podrá registrarse.'
    : 'Entiendo que cotizar los artículos sin precio será rechazado.',
)

const acknowledgeError = computed(() =>
  attempted.value && hasGaps.value && !acknowledged.value
    ? 'Marca la casilla para publicar una tarifa con huecos.'
    : '',
)

/**
 * Lo que la publicación deja hecho, dicho con la vigencia dentro: una tarifa
 * publicada fuera de su ventana queda congelada y además no cotiza, y eso hay que
 * saberlo antes y no cuando el servidor lo rechace (D-73).
 */
const validityNote = computed(() => {
  if (!props.priceList) return ''
  const validity = priceListEffectiveness(props.priceList, props.today)
  if (validity.level === 'caducada')
    return `Además, su vigencia ya terminó (${validity.label.toLowerCase()}): cotizar con ella será rechazado hasta que amplíes su fecha final.`
  if (validity.level === 'futura')
    return `Además, todavía no cotiza: ${validity.label.toLowerCase()}.`
  return ''
})

function confirm() {
  attempted.value = true
  if (blocked.value) return
  if (hasGaps.value && !acknowledged.value) return
  emit('confirm')
}
</script>

<template>
  <AppModal
    v-if="priceList"
    :open="open"
    :title="`Publicar «${priceList.name}»`"
    :max-width="720"
    @close="emit('close')"
  >
    <div class="ds-stack ds-stack--16">
      <p class="ds-dialog-body">
        La lista y sus precios quedarán congelados para preservar lo ofrecido.
        <template v-if="validityNote"> {{ validityNote }}</template>
      </p>

      <p class="ds-banner ds-banner--warning" role="status">
        <TriangleAlert :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ PUBLISH_IS_TERMINAL }}</span>
      </p>

      <PriceListCoveragePanel
        :coverage="coverage"
        :loading="coverageLoading"
        :error="coverageError"
        :trace-id="coverageTraceId"
        editable
        @retry="emit('retryCoverage')"
      />

      <div v-if="hasGaps && !blocked" class="ds-stack ds-stack--8">
        <AppCheckbox v-model="acknowledged" :label="acknowledgeLabel" />
        <p v-if="acknowledgeError" class="error" role="alert">{{ acknowledgeError }}</p>
      </div>

      <p v-if="blocked" class="ds-meta">
        No se publica mientras la cobertura no se haya podido comprobar: publicar sin saber qué
        falta es exactamente lo que esta pantalla existe para impedir.
      </p>
    </div>

    <template #footer>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="saving || blocked"
        @click="confirm"
      >
        <Send :size="15" />
        {{ saving ? 'Publicando…' : 'Publicar la lista' }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
/* El texto de error de una casilla suelta. No sale de `primitives.css` —allí no
   hay clase de error de campo— y no se puede añadir sin tocar un fichero gemelo
   TR-02, así que se declara aquí lo mínimo: el tono y el tamaño. */
.error {
  margin: 0;
  color: var(--danger-500);
  font-size: var(--text-xs);
}
</style>
