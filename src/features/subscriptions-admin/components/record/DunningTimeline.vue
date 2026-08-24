<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import {
  DUNNING_CHANNEL_LABEL,
  DUNNING_EVENT_LABEL,
  DUNNING_EVENT_VARIANT,
} from '@/features/billing-operations/types/billing-operations.types'
import { formatDocumentAmount } from '@/features/billing-operations/composables/billingFormat'
import { formatDateTime } from '../../composables/entitlementText'
import {
  EVENT_TYPE_MEANING,
  annotatedLateText,
  gapText,
  overdueText,
} from '../../composables/dunningRecordText'
import type { DunningEventResponse } from '../../types/dunning-record.types'

/**
 * <b>La película de una cuenta</b>, no una lista de filas.
 *
 * <p><b>Por qué no se reutiliza `DunningEventsTable` de W1-E.</b> Se comparte con
 * ella todo lo que puede compartirse —el tipo, los cinco rótulos de hito, los
 * cinco de canal, los tonos y el formateador de importes sin divisa—, y por eso
 * las dos pantallas dicen exactamente las mismas palabras. Lo que no se comparte
 * es la forma, y por tres razones concretas:
 *
 * <ol>
 *   <li><b>Tres de sus ocho columnas sobran aquí.</b> «Empresa», «Contrato» y el
 *       contexto de empresa del documento existen porque aquel feed es
 *       cross-tenant. Dentro del expediente esos tres valores son constantes y
 *       están en la cabecera permanente (§4.4.2): repetirlos en cada fila es
 *       ruido, y repintar la identidad de la empresa es justo lo que el armazón
 *       pide no hacer.</li>
 *   <li><b>El orden es el contrario, y a propósito.</b> El feed global ordena
 *       `newestFirst()` porque es una bandeja de trabajo: lo urgente es lo más
 *       viejo sin atender. El expediente ordena `occurredAt ASC` porque se lee
 *       como una historia. Un componente que sirviera a los dos tendría que
 *       elegir, y el que perdiera se leería al revés.</li>
 *   <li><b>Lo que aquí es contenido, allí no existe.</b> El hueco entre un hito y
 *       el anterior —«7 días después»— no vive dentro de ninguna fila, vive entre
 *       dos, y es la mitad de la respuesta a «¿cuánto margen se le dio?». Una
 *       `&lt;table&gt;` de filas independientes no tiene dónde ponerlo.</li>
 * </ol>
 *
 * <p><b>Ni una sola celda editable.</b> No hay «Editar» ni deshabilitado ni
 * oculto: la operación no existe en el backend —la bitácora solo tiene `GET` y
 * `POST`— así que no está en el marcado (§3.2). Los hechos van en `&lt;dl&gt;`;
 * un campo gris diría «editable, pero ahora no», que es mentira dos veces.
 */
const props = defineProps<{
  events: DunningEventResponse[]
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: [] }>()

/**
 * Cada hito con el hueco que lo separa del anterior. El primero no lleva hueco:
 * no hay nada antes de lo que medirlo, y un «0 días» ahí sería inventado.
 */
const entries = computed(() =>
  props.events.map((event, index) => {
    const previous = index === 0 ? null : (props.events[index - 1] ?? null)
    return { event, gap: previous ? gapText(previous.occurredAt, event.occurredAt) : null }
  }),
)

/**
 * Los dos hitos que un operador podría contarle mal a un cliente llevan su
 * significado escrito en la propia entrada; los otros tres lo tienen en la
 * leyenda de la vista y repetirlo en cada uno sería ruido.
 */
function meaningOf(event: DunningEventResponse): string | null {
  return event.eventType === 'READ_ONLY_APPLIED' || event.eventType === 'WRITTEN_OFF'
    ? EVENT_TYPE_MEANING[event.eventType]
    : null
}
</script>

<template>
  <div class="ds-stack ds-stack--12">
    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <div class="ds-stack ds-stack--8 ds-flex-fill">
        <span>{{ error }}</span>
        <span v-if="errorTraceId" class="ds-meta">Traza {{ errorTraceId }}</span>
      </div>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="$emit('retry')">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>

    <AppEmptyState
      v-else-if="!loading && events.length === 0"
      title="Sin ningún hito de cobranza"
      description="Cuando se le avise al cliente por llamada, correo o WhatsApp, anótalo aquí: es lo que después demuestra que se avisó."
    />

    <!-- `<ol>` y no `<div>`: el orden es el contenido, y un lector de pantalla
         anuncia «lista de 5 elementos, 3 de 5» sin que haya que escribir ARIA. -->
    <ol v-else class="ds-list-reset ds-stack ds-stack--12">
      <li v-for="entry in entries" :key="entry.event.id" class="ds-stack ds-stack--8">
        <p v-if="entry.gap" class="ds-meta hueco">{{ entry.gap }}</p>

        <article class="ds-card ds-card--tight ds-stack ds-stack--10">
          <div class="ds-flex-row ds-flex-row--12">
            <time class="ds-text-strong" :datetime="entry.event.occurredAt">
              {{ formatDateTime(entry.event.occurredAt) }}
            </time>
            <AppBadge
              :variant="DUNNING_EVENT_VARIANT[entry.event.eventType]"
              :label="DUNNING_EVENT_LABEL[entry.event.eventType]"
            />
          </div>

          <dl class="ds-detail-grid">
            <div>
              <dt class="ds-label">Mora</dt>
              <dd class="valor">{{ overdueText(entry.event.daysOverdue) }}</dd>
            </div>
            <div>
              <dt class="ds-label">Canal</dt>
              <dd class="valor">
                {{
                  entry.event.channel
                    ? DUNNING_CHANNEL_LABEL[entry.event.channel]
                    : 'No se anotó ninguno'
                }}
              </dd>
            </div>
            <div v-if="entry.event.billingDocument">
              <dt class="ds-label">Documento de cobro</dt>
              <dd class="valor">
                {{
                  entry.event.billingDocument.documentNumber ?? `#${entry.event.billingDocument.id}`
                }}
                <span v-if="entry.event.billingDocument.balanceAmount !== null" class="ds-meta">
                  saldo {{ formatDocumentAmount(entry.event.billingDocument.balanceAmount) }}
                </span>
              </dd>
            </div>
          </dl>

          <!-- El detalle se pinta entero y no se recorta: es la prueba. -->
          <p class="ds-dialog-body detalle">
            {{ entry.event.detail ?? 'Sin detalle anotado.' }}
          </p>

          <p v-if="meaningOf(entry.event)" class="ds-meta">{{ meaningOf(entry.event) }}</p>
          <p v-if="annotatedLateText(entry.event)" class="ds-meta">
            {{ annotatedLateText(entry.event) }}
          </p>
        </article>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

/* El hueco entre dos hitos, sangrado para que se lea como lo que es: lo que pasó
   ENTRE dos entradas y no dentro de ninguna. */
.hueco {
  padding-left: var(--space-14);
}

.detalle {
  margin: 0;
}
</style>
