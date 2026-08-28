<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { formatDateTime } from '@/features/subscriptions-admin/composables/entitlementText'
import {
  EVENT_TYPE_MEANING,
  NO_CHANNEL_LABEL,
  overdueText,
} from '@/features/subscriptions-admin/composables/dunningRecordText'
import {
  DUNNING_CHANNEL_LABEL,
  DUNNING_EVENT_LABEL,
} from '@/features/billing-operations/types/billing-operations.types'
import { useCompanyRecord } from '../../composables/useCompanyRecord'
import { useCompanyReceivables } from '../../composables/useCompanyReceivables'
import { RECEIVABLES_GAPS } from '../../composables/companyReceivablesText'

/**
 * `/empresas/:id/cartera` — <b>la cartera de la empresa</b> (§I6).
 *
 * <p><b>Estaba bloqueada y ahora está parcialmente construida.</b> Su `blockedBy`
 * decía que el contrato no expone el acuse de entrega de un aviso, «y es justo el
 * dato que decide si una cuenta puede bajar a solo lectura: un rebote no es un
 * aviso». <b>Ese impedimento sigue en pie</b> —`DunningEventResponse` no tiene
 * ningún campo de entrega; se comprobó sobre `api/openapi.json`—, pero la
 * regeneración del contrato trajo `GET /system/dunning-events?companyId=`, que es
 * la mora de <b>todos</b> los contratos que ha tenido la empresa. Con eso se
 * puede contestar lo esencial de la ficha, así que se construye lo que hay y se
 * declara lo que falta, en vez de dejar la pestaña muda. Es el criterio que dejó
 * escrito `fiscal.tab.ts`.
 *
 * <p><b>Lo que esta pantalla puede afirmar y lo que no.</b> Puede decir que hubo
 * un aviso anotado antes de restringir; <b>no</b> puede decir que ese aviso
 * llegara. Un correo rebotado y uno leído se anotan igual, y la diferencia es la
 * que decide si la restricción se sostiene ante una reclamación. La pantalla lo
 * dice con esas palabras junto al resultado, en vez de dejar que se lea como una
 * prueba de entrega.
 *
 * <p><b>La evidencia se calcula, no se insinúa.</b> «¿Se avisó antes de pasar a
 * solo lectura?» encabeza la pantalla porque es la pregunta por la que se entra,
 * y una tabla no la responde. El cálculo se reusa de
 * `subscriptions-admin/composables/dunningRecordText.ts` y no se copia: dos
 * pantallas que respondieran distinto sobre los mismos hechos serían peor que una
 * sola.
 *
 * <p><b>Aquí no se anota nada.</b> Anotar un hito exige un `subscriptionId` y se
 * hace desde el expediente del contrato, donde está a la vista. Un desplegable de
 * contratos en esta pestaña sería una oportunidad de anotar la mora en el que no
 * era.
 */
const { companyId } = useCompanyRecord()
const {
  events,
  evidence,
  channels,
  reactivation,
  writeOff,
  truncated,
  loading,
  error,
  errorTraceId,
  openReceivables,
  closeReceivables,
} = useCompanyReceivables()

const recordCompanyId = computed(() => companyId.value ?? 0)

const HEADERS = ['Cuándo', 'Hito', 'Contrato', 'Documento', 'Mora', 'Canal', 'Detalle']

/** El tono del distintivo de la evidencia. Nunca solo color (WCAG 2.2 §1.4.1). */
const evidenceVariant = computed(() =>
  evidence.value.state === 'unwarned'
    ? 'danger'
    : evidence.value.state === 'empty'
      ? 'warning'
      : 'success',
)

/** <b>Recarga siempre al abrir la pantalla.</b> */
onMounted(() => void openReceivables(recordCompanyId.value))

/** Nada de la mora de una empresa ajena esperando a que se abra la siguiente. */
onUnmounted(closeReceivables)
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="cartera-title">
    <div class="ds-block-head">
      <h1 id="cartera-title" class="ds-title">Cartera</h1>
    </div>

    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando la cartera…' : '' }}</p>

    <!-- 1 · Fallo del servidor. Va antes que el vacío: un 500 no puede
         disfrazarse de «esta empresa no debe nada» (R05). Es la confusión más
         cara de esta pantalla concreta. -->
    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openReceivables(recordCompanyId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <template v-else>
      <!-- 2 · La respuesta, arriba y escrita. -->
      <div class="ds-card ds-stack ds-stack--10">
        <div class="ds-wrap-row cabecera">
          <h2 class="ds-subtitle ds-flex-fill">{{ evidence.headline }}</h2>
          <AppBadge
            v-if="evidence.badgeLabel"
            :variant="evidenceVariant"
            :label="evidence.badgeLabel"
          />
        </div>
        <p class="ds-meta">{{ evidence.detail }}</p>

        <!-- El límite de lo que se puede afirmar. Va PEGADO al resultado, no en
             una nota al pie: quien lea «se avisó 3 veces» tiene que leer aquí
             mismo que anotado no es entregado. -->
        <div class="ds-banner ds-banner--warning" role="note">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ RECEIVABLES_GAPS.deliveryStatus }}</span>
        </div>

        <p v-if="channels" class="ds-meta">Canales usados: {{ channels }}</p>
        <p v-if="reactivation" class="ds-meta">{{ reactivation }}</p>
        <p v-if="writeOff" class="ds-meta">Dada de baja contable el {{ writeOff }}.</p>
      </div>

      <!-- 3 · Los hitos, de todos los contratos que ha tenido la empresa. -->
      <div class="ds-stack ds-stack--10">
        <div class="ds-block-head">
          <h2 class="ds-title">Hitos de cobranza</h2>
        </div>
        <p class="ds-meta">
          De <strong>todos</strong> los contratos que ha tenido esta empresa, no solo del vigente:
          la mora del contrato anterior es la que suele explicar cómo llegó aquí.
        </p>

        <AppTable
          :headers="HEADERS"
          :empty="events.length === 0"
          :loading="loading"
          :error="null"
          :trace-id="null"
        >
          <template #empty>
            <AppEmptyState
              title="Esta empresa no tiene ningún hito de cobranza anotado"
              description="No significa que esté al día: significa que nadie ha anotado nada. Si se llamó o se escribió al cliente por fuera del sistema, el expediente está vacío y no habrá con qué probarlo."
            />
          </template>

          <tr v-for="event in events" :key="event.id" class="ds-row-hover">
            <td>{{ formatDateTime(event.occurredAt) }}</td>
            <td>
              <span :title="EVENT_TYPE_MEANING[event.eventType]">
                {{ DUNNING_EVENT_LABEL[event.eventType] }}
              </span>
            </td>
            <td class="num">
              {{ event.subscription?.subscriptionNumber ?? '—' }}
            </td>
            <td class="num">
              {{ event.billingDocument?.documentNumber ?? '—' }}
            </td>
            <td>{{ overdueText(event.daysOverdue) }}</td>
            <td>{{ event.channel ? DUNNING_CHANNEL_LABEL[event.channel] : NO_CHANNEL_LABEL }}</td>
            <td>{{ event.detail || '—' }}</td>
          </tr>
        </AppTable>

        <p v-if="truncated > 0" class="ds-meta">
          Se muestran los {{ events.length }} hitos más antiguos de {{ truncated + events.length }}.
          La respuesta de arriba sigue siendo exacta —el servidor manda la historia desde el
          principio—, pero la tabla no los trae todos.
        </p>
      </div>

      <!-- 4 · Lo que esta pestaña todavía no puede enseñar, y dónde está lo que
           sí. Un hueco declarado antes que un cero inventado (R14). -->
      <div class="ds-stack ds-stack--10">
        <h2 class="ds-title">Lo que esta pestaña todavía no muestra</h2>
        <ul class="huecos ds-meta">
          <li>{{ RECEIVABLES_GAPS.documents }}</li>
          <li>{{ RECEIVABLES_GAPS.credits }}</li>
          <li>{{ RECEIVABLES_GAPS.dataExport }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.cabecera {
  align-items: flex-start;
}

.num {
  font-variant-numeric: tabular-nums;
}

.huecos {
  max-width: 70ch;
  padding-left: var(--space-18);
  list-style: disc;
}

.huecos li + li {
  margin-top: var(--space-10);
}
</style>
