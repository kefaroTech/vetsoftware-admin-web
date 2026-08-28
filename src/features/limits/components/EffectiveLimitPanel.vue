<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import CapacityMeter from '@/components/ui/CapacityMeter.vue'
import ProvenanceLine from '@/components/ui/ProvenanceLine.vue'
import { ICONS } from '@/constants/icons'
import { formatDateTime } from '@/features/quotes/composables/quoteDateTime'
import { effectiveLimitText, provenanceOf } from '../composables/limitText'
import type { OverLimitRow } from '../composables/overLimitAccounts'
import type { EffectiveLimitResponse, LimitDimensionResponse } from '../types/limits.types'

/**
 * **El techo efectivo de un eje para una empresa, y de dónde sale.**
 *
 * <p><b>El techo lo resuelve el servidor.</b> Esta pantalla no cruza la excepción
 * con el contrato y con el catálogo para deducir cuál manda: llama a
 * `/effective-limits/{limitDimensionId}` y pinta lo que responde, con su
 * `source`. La precedencia
 * `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE` es del backend, y
 * replicarla aquí significaría que el día que se añada un origen la consola
 * seguiría contestando, con total seguridad, una cifra equivocada.
 *
 * <p><b>El consumo y el techo NO vienen del mismo sitio, y se dice.</b> El techo
 * es el de ahora; el consumo es el último que quedó registrado en la bitácora,
 * con su fecha. Presentarlos como una sola medición en vivo sería inventar una
 * precisión que el contrato no da.
 *
 * <p><b>Sin consumo registrado no se pinta el medidor.</b> `CapacityMeter` lee un
 * `used` ausente como cero, y «0 de 50» sobre un eje que nadie cuenta todavía es
 * exactamente el dato inventado que R14 prohíbe. En su lugar se dice el techo y
 * se dice que del consumo no se sabe nada.
 */
const props = defineProps<{
  dimension: LimitDimensionResponse | null
  limit: EffectiveLimitResponse | null
  /** Último estado conocido del eje, de la bitácora. `null` = no hay ninguno. */
  usage: OverLimitRow | null
  /**
   * Si esta pantalla llegó a consultar la bitácora.
   *
   * <p>Distingue los dos silencios que no se pueden pintar igual: «se preguntó y
   * nadie ha contado nunca este eje» y «esta pantalla ni siquiera pregunta por el
   * consumo». El segundo no autoriza a decir lo primero.
   */
  usageChecked: boolean
  loading: boolean
  error: string | null
  /** A dónde se va a ver la excepción que fija el techo, cuando la hay. */
  overrideTo?: RouteLocationRaw | null
  /** A dónde se va a mirar el consumo, cuando aquí no se consulta. */
  usageTo?: RouteLocationRaw | null
}>()

/** El sustantivo en minúscula que cierra los textos: «mascotas», «usuarios». */
const unit = computed(() => props.dimension?.name.toLowerCase() ?? 'unidades')

const provenance = computed(() => (props.limit ? provenanceOf(props.limit.source) : null))

/**
 * El dato concreto que acompaña al rótulo de procedencia. Solo el origen
 * `COMPANY_OVERRIDE` trae identificador (`overrideId`); los otros dos no traen
 * nada que nombrar, y nombrar «Contrato #—» sería peor que no nombrar.
 */
const provenanceDetail = computed(() =>
  props.limit?.overrideId == null ? null : `Excepción #${props.limit.overrideId}`,
)

const ceilingText = computed(() =>
  props.limit === null ? '' : effectiveLimitText(props.limit, unit.value),
)

/** El techo que se le pasa al medidor: `null` cuando no hay ninguno declarado. */
const meterLimit = computed(() =>
  props.limit === null || props.limit.unlimited ? null : props.limit.limitQuantity,
)

const isOver = computed(() => props.usage?.state === 'OVER')
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="techo-titulo">
    <div class="ds-block-head">
      <h3 id="techo-titulo" class="ds-item-label--lg titulo">
        {{ dimension ? dimension.name : 'Techo efectivo' }}
      </h3>
      <p v-if="dimension" class="ds-meta codigo">{{ dimension.code }}</p>
    </div>

    <p v-if="loading" class="ds-meta" role="status">Consultando el techo efectivo…</p>

    <div v-else-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ error }}</span>
    </div>

    <!-- Todavía no se ha preguntado. NO es «no hay techo»: son dos cosas
         distintas y pintarlas igual convierte una pantalla sin usar en un
         informe falso. -->
    <p v-else-if="limit === null" class="ds-meta">
      Elige un eje para consultar su techo efectivo. Lo resuelve el servidor, no esta pantalla.
    </p>

    <template v-else>
      <p class="ds-text-strong--md">{{ ceilingText }}</p>

      <ProvenanceLine
        v-if="provenance"
        :source="provenance"
        :detail="provenanceDetail"
        :to="provenance === 'NEGOTIATED_EXCEPTION' ? (overrideTo ?? null) : null"
        link-label="Ver la excepción que fija este techo"
        explain
      />

      <!-- `NONE` no tiene procedencia que pintar: `ProvenanceLine` solo conoce
           cuatro orígenes y el cuarto, «valor de fábrica», afirma algo más
           fuerte —que el producto nace así— que «nadie ha fijado techo». -->
      <p v-else class="ds-meta">
        Ningún techo fijado: ni la empresa tiene excepción, ni su contrato ni el plan declaran uno
        para este eje. Puede crear sin tope hasta que alguien fije uno.
      </p>

      <template v-if="usage">
        <CapacityMeter
          :label="dimension?.name ?? 'Consumo'"
          :used="usage.usedQuantity"
          :limit="meterLimit"
          :unit="unit"
          :exhausted="null"
        >
          <template #action>
            <slot name="capacity-action" />
          </template>
        </CapacityMeter>

        <p class="ds-meta">
          Consumo del último hecho registrado, el {{ formatDateTime(usage.occurredAt) }}. El techo
          de arriba es el de ahora: si cambió después, las dos cifras no son del mismo instante.
        </p>

        <!-- Estar por encima del techo está permitido a propósito. -->
        <div v-if="isOver" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            <strong>Cuenta desbordada y congelada.</strong> Tiene más de lo que su techo permite
            —pasa al bajar un plan sin retirar lo que ya había—. Conserva todo lo suyo y sigue
            consultándolo; lo único que no puede es crear más hasta que baje el consumo o suba el
            techo. No es un fallo del sistema.
          </span>
        </div>
      </template>

      <!-- Un hueco honesto antes que un cero inventado, y dos silencios
           distintos que no se pintan igual. -->
      <p v-else-if="usageChecked" class="ds-meta">
        Del consumo no se sabe nada: nadie ha registrado ningún hecho de cupo de este eje en la
        ventana consultada. No se pinta «0 de {{ meterLimit ?? '—' }}» porque sería inventarlo.
      </p>
      <p v-else class="ds-meta">
        Aquí solo se resuelve el techo. El consumo vive en la bitácora, que esta pantalla no
        consulta.
        <RouterLink v-if="usageTo" :to="usageTo"
          >Ver el consumo en «Cuentas desbordadas»</RouterLink
        >
      </p>
    </template>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
}

.codigo {
  font-family: var(--font-mono);
}
</style>
