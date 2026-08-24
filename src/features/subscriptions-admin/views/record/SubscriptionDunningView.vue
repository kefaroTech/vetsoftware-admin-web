<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { DUNNING_EVENT_LABEL } from '@/features/billing-operations/types/billing-operations.types'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'
import { useDunningRecord } from '../../composables/useDunningRecord'
import { formatDateTime } from '../../composables/entitlementText'
import {
  EVENT_TYPE_MEANING,
  LEDGER_SEAL,
  PURPOSE_NOTE,
  WRITE_OFF_ACCESS_NOTE,
  WRITE_OFF_MEANING,
  WRITE_OFF_TITLE,
} from '../../composables/dunningRecordText'
import DunningTimeline from '../../components/record/DunningTimeline.vue'
import RecordDunningEventModal from '../../components/record/RecordDunningEventModal.vue'
import WriteOffDunningModal from '../../components/record/WriteOffDunningModal.vue'
import type { DunningEventDraft } from '../../types/dunning-record.types'

/**
 * `/cobranza` — <b>la historia de una cuenta</b> (§4.4.2, tarea W2-F).
 *
 * <p><b>En qué se diferencia de la Cobranza global.</b> Aquella (W1-E) es una
 * bandeja de trabajo: documentos atascados de todas las empresas, ordenados por
 * antigüedad, para irlos despachando. A esta no se entra a trabajar la cartera —
 * se llega estando ya dentro de un contrato, normalmente preguntándose por qué
 * está como está. Por eso comparte con ella el tipo, los rótulos y los tonos, y
 * no comparte la forma: el argumento completo está en `DunningTimeline.vue`.
 *
 * <p><b>Es una bitácora inmutable, y la pantalla lo dice tres veces.</b> Con el
 * sello de arriba, con la ausencia total de «Editar» —no está en el marcado, ni
 * gris ni oculto: el backend no expone `PUT` ni `DELETE`— y con los hechos en
 * `&lt;dl&gt;` en vez de en campos deshabilitados, que dirían «editable, pero
 * ahora no».
 *
 * <p><b>La secuencia va primero, y ya resuelta.</b> La pregunta por la que se
 * entra —«¿se le avisó antes de restringirle la cuenta?»— tiene respuesta binaria
 * y consecuencias, y una tabla no la responde: la insinúa. Así que la respuesta
 * está escrita arriba, con sus fechas y su margen en días, y la línea de tiempo
 * de debajo es la prueba que la sostiene.
 *
 * <p><b>Dar de baja contable no está aquí arriba.</b> Vive al final, en su propio
 * bloque, con su propio verbo y su propia confirmación: es una decisión con
 * consecuencias contables y no puede quedar a un clic de «anoté una llamada».
 *
 * <p>El armazón ya cargó el contrato y garantiza `companyId`: esta vista no lo
 * recarga, lo lee y se lo pasa a su cliente de API para que la cabecera
 * `X-Company-Id` viaje en sus dos llamadas.
 */
const { companyId, subscriptionId, subscription, companyName } = useSubscriptionRecord()
const {
  events,
  total,
  notLoaded,
  evidence,
  tally,
  reactivation,
  writtenOff,
  loading,
  saving,
  error,
  errorTraceId,
  openDunning,
  recordEvent,
} = useDunningRecord()

const evidenceRegion = ref<HTMLElement | null>(null)
const recordOpen = ref(false)
const writeOffOpen = ref(false)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que el contrato ha cargado—, pero el tipo sí lo
 * admite. El `?? 0` no llega a ejecutarse; está para que la plantilla no defienda
 * un caso que el armazón ya cerró.
 */
const scopeCompanyId = computed(() => companyId.value ?? 0)
const recordSubscriptionId = computed(() => subscriptionId.value ?? 0)

const subscriptionNumber = computed(
  () => subscription.value?.subscriptionNumber ?? `#${recordSubscriptionId.value}`,
)

/**
 * Las sub-vistas se auto-descubren, así que «Dinero» puede no estar registrada
 * todavía. Si no lo está, <b>no se pinta el enlace</b> —`router.resolve` fallaría
 * con una ruta sin registrar— y se dice por qué en vez de callarlo: la disciplina
 * de la onda es señalar con texto, y avisar cuando algo no se puede ofrecer.
 */
const moneyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'dinero'))

/** Los dos parámetros. Con `params: { id }` a secas, `router.resolve` falla. */
const moneyTarget = computed(() =>
  moneyTab.value
    ? {
        name: moneyTab.value.routeName,
        params: {
          companyId: String(scopeCompanyId.value),
          id: String(recordSubscriptionId.value),
        },
      }
    : null,
)

/**
 * Lo que se anuncia cuando la lista cambia (§5.3). Es una consulta, no una
 * urgencia, así que va en una región `status` y no interrumpe.
 */
const announcement = computed(() => {
  if (loading.value) return 'Cargando el expediente de cobranza…'
  const count = events.value.length
  return count === 0
    ? 'El expediente de cobranza está vacío.'
    : `Expediente de cobranza: ${count} ${count === 1 ? 'hito' : 'hitos'}, del más antiguo al más reciente.`
})

/** <b>Recarga siempre al abrir</b>: una prueba en caché no es una prueba. */
onMounted(() => void openDunning(scopeCompanyId.value, recordSubscriptionId.value))

/**
 * Tras anotar, el foco va al bloque de la evidencia —que lleva `tabindex="-1"`—
 * y no se queda en un botón cuyo contexto ya cambió: la frase de arriba es
 * justamente lo que el hito nuevo puede haber cambiado, y es lo que hay que leer.
 * Mismo mecanismo que `SubscriptionAccessView` tras un recálculo.
 */
async function onRecord(draft: DunningEventDraft) {
  if (await recordEvent(scopeCompanyId.value, recordSubscriptionId.value, draft)) {
    recordOpen.value = false
    writeOffOpen.value = false
    await nextTick()
    evidenceRegion.value?.focus()
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="record-dunning-title">
    <!-- El sello. Explica por qué en esta pantalla no hay nada que se pueda cambiar. -->
    <div class="ds-banner ds-banner--info ds-banner--flush" role="note">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <div class="ds-stack ds-stack--8 ds-flex-fill">
        <span>{{ LEDGER_SEAL }}</span>
        <span class="ds-meta">{{ PURPOSE_NOTE }}</span>
      </div>
    </div>

    <!-- 1 · La respuesta a la pregunta por la que se entra aquí. -->
    <div
      ref="evidenceRegion"
      class="ds-card ds-stack ds-stack--10"
      tabindex="-1"
      aria-labelledby="record-dunning-title"
    >
      <div class="ds-block-head">
        <h2 id="record-dunning-title" class="ds-title">Expediente de cobranza</h2>
        <AppBadge
          v-if="evidence.badgeLabel"
          :variant="evidence.state === 'unwarned' ? 'danger' : 'neutral'"
          :label="evidence.badgeLabel"
        />
      </div>

      <p class="ds-dialog-body titular">{{ evidence.headline }}</p>
      <p class="ds-meta">{{ evidence.detail }}</p>

      <div v-if="writtenOff" class="ds-banner ds-banner--warning ds-banner--sm">
        <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" />
        <span>
          Deuda declarada incobrable el {{ formatDateTime(writtenOff) }}.
          {{ WRITE_OFF_ACCESS_NOTE }}
        </span>
      </div>

      <dl v-if="tally || reactivation" class="ds-detail-grid">
        <div v-if="tally">
          <dt class="ds-label">Recordatorios por canal</dt>
          <dd class="valor">{{ tally }}</dd>
        </div>
        <div v-if="reactivation">
          <dt class="ds-label">Qué funcionó la última vez</dt>
          <dd class="valor">{{ reactivation }}</dd>
        </div>
      </dl>

      <p class="ds-meta">
        <template v-if="moneyTarget">
          <RouterLink :to="moneyTarget">Ver el dinero que hay detrás</RouterLink>
        </template>
        <template v-else>
          El dinero que hay detrás se verá en «Dinero», que todavía no está disponible.
        </template>
      </p>

      <div class="ds-actions ds-actions--start">
        <button
          type="button"
          class="ds-btn ds-btn--primary"
          :disabled="saving"
          @click="recordOpen = true"
        >
          <component :is="ICONS.ADD" :size="15" />
          Anotar un hito
        </button>
      </div>
    </div>

    <!-- 2 · La película, en orden y con los huecos entre hitos. -->
    <div class="ds-stack ds-stack--10">
      <p class="ds-sr-only" role="status">{{ announcement }}</p>

      <DunningTimeline
        :events="events"
        :loading="loading"
        :error="error"
        :error-trace-id="errorTraceId"
        @retry="openDunning(scopeCompanyId, recordSubscriptionId)"
      />

      <!-- El servidor tope la página en 200 filas. Con más hitos que eso, esta
           pantalla estaría enseñando media película: lo dice en vez de callarlo. -->
      <div v-if="notLoaded > 0" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span>
          Este expediente tiene {{ total }} hitos y aquí se han cargado los {{ events.length }} más
          antiguos. Faltan {{ notLoaded }} por mostrar.
        </span>
      </div>
    </div>

    <!-- 3 · Qué significa cada hito. Una vez, aquí, y no repetido en cada fila. -->
    <div class="ds-card ds-stack ds-stack--10">
      <h2 class="ds-title">Qué significa cada hito</h2>
      <dl class="ds-detail-grid">
        <div v-for="(meaning, type) in EVENT_TYPE_MEANING" :key="type">
          <dt class="ds-label">{{ DUNNING_EVENT_LABEL[type] }}</dt>
          <dd class="valor">{{ meaning }}</dd>
        </div>
      </dl>
    </div>

    <!-- 4 · La decisión contable, aparte de todo lo demás y al final. -->
    <div class="ds-card ds-stack ds-stack--10">
      <h2 class="ds-title">{{ WRITE_OFF_TITLE }}</h2>
      <p class="ds-dialog-body">{{ WRITE_OFF_MEANING }}</p>
      <p class="ds-meta">{{ WRITE_OFF_ACCESS_NOTE }}</p>
      <div class="ds-actions ds-actions--start">
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="saving"
          @click="writeOffOpen = true"
        >
          <component :is="ICONS.WARNING" :size="15" />
          {{ WRITE_OFF_TITLE }}
        </button>
      </div>
    </div>

    <RecordDunningEventModal
      :open="recordOpen"
      :subscription-number="subscriptionNumber"
      :company-name="companyName"
      :saving="saving"
      @close="recordOpen = false"
      @submit="onRecord"
    />

    <WriteOffDunningModal
      :open="writeOffOpen"
      :subscription-number="subscriptionNumber"
      :company-name="companyName"
      :already-written-off-at="writtenOff"
      :saving="saving"
      @close="writeOffOpen = false"
      @submit="onRecord"
    />
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

.titular {
  margin: 0;
  font-weight: var(--weight-semibold);
}
</style>
