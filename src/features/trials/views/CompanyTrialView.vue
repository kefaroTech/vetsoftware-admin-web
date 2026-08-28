<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { useCompanyRecord } from '@/features/companies/composables/useCompanyRecord'
import { useCompanyTrial } from '../composables/useCompanyTrial'
import { TRIAL_WINDOW_NOT_EXTENDABLE, businessToday } from '../composables/trialWindowText'
import TrialWindowCard from '../components/TrialWindowCard.vue'
import TrialGrantsTable from '../components/TrialGrantsTable.vue'
import TrialExpirationsPanel from '../components/TrialExpirationsPanel.vue'
import OpenTrialWindowModal from '../components/OpenTrialWindowModal.vue'
import GrantTrialModal from '../components/GrantTrialModal.vue'
import RecordTrialOutcomeModal from '../components/RecordTrialOutcomeModal.vue'
import type {
  CompanyTrialGrantResponse,
  ConsumeTrialGrantRequest,
  GrantTrialRequest,
  OpenTrialWindowRequest,
} from '../types/trials.types'

/**
 * `/empresas/:id/prueba` — <b>la ventana de prueba de esta empresa, con sus
 * concesiones y sus desenlaces</b> (§I5, que es la misma pantalla que §C2).
 *
 * <p>El armazón ya cargó la empresa y garantiza `companyId`: esta sub-vista no la
 * recarga, la lee y carga lo suyo.
 *
 * <p><b>Tres estados, y ninguno se disfraza de otro:</b>
 *
 * <ol>
 *   <li><b>No hay ventana</b> (404 en `/current`). No es un fallo: es que esta
 *       empresa nunca ha estado en prueba. Se dice con esas palabras y con el
 *       botón de abrirla, no con un banner rojo.</li>
 *   <li><b>Hay ventana</b>: su tarjeta, sus concesiones y —cuando ya terminó sin
 *       desenlace— el aviso de que hay trabajo pendiente.</li>
 *   <li><b>Falló la carga</b>: banner con la traza y reintento.</li>
 * </ol>
 *
 * <p><b>El barrido de vencimientos se ancla al último día de esta ventana.</b>
 * Cuando se está mirando una prueba que termina el 30, la pregunta que sigue no
 * es «¿qué vence hoy?» sino «¿qué más vence el 30?»: es una sola llamada al
 * cliente en vez de tres. Sin ventana, se ancla a hoy.
 */
const { companyId, title } = useCompanyRecord()
const {
  window,
  windowMissing,
  windowState,
  grantRows,
  awaitingOutcomeCount,
  loading,
  saving,
  error,
  errorTraceId,
  openTrial,
  openWindow,
  closeWindow,
  grantModule,
  recordOutcome,
  closeTrial,
} = useCompanyTrial()

const confirm = useConfirmDialog()

const openModal = ref(false)
const grantModal = ref(false)
/** La concesión que se está cerrando. `null` = el modal del desenlace está cerrado. */
const outcomeTarget = ref<CompanyTrialGrantResponse | null>(null)
const windowRegion = ref<HTMLElement | null>(null)
const grantsRegion = ref<HTMLElement | null>(null)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que la empresa cargó—, pero el tipo sí lo admite.
 * El `?? 0` no llega a ejecutarse; está para que la plantilla no defienda un caso
 * que el armazón ya cerró.
 */
const recordCompanyId = computed(() => companyId.value ?? 0)

/** El día al que se ancla el barrido. Ver la cabecera del módulo. */
const sweepDay = computed(() => window.value?.endDate ?? businessToday())

const pendingOutcomeNotice = computed(() => {
  const count = awaitingOutcomeCount.value
  if (count === 0) return ''
  return count === 1
    ? 'Una concesión ya terminó y todavía no tiene desenlace escrito. Mientras siga en blanco, nadie sabe si se convirtió o se perdió.'
    : `${count} concesiones ya terminaron y todavía no tienen desenlace escrito. Mientras sigan en blanco, nadie sabe si se convirtieron o se perdieron.`
})

/** <b>Recarga siempre al abrir la pantalla.</b> */
onMounted(() => void openTrial(recordCompanyId.value))

/** Nada de la prueba de una empresa ajena esperando a que se abra la siguiente. */
onUnmounted(closeTrial)

async function onOpenWindow(payload: OpenTrialWindowRequest) {
  if (await openWindow(recordCompanyId.value, payload)) {
    openModal.value = false
    // El foco va a la tarjeta recién creada —lleva `tabindex="-1"`— y no se queda
    // en un botón que ya no existe.
    await nextTick()
    windowRegion.value?.focus()
  }
}

/**
 * <b>Conceder un artículo.</b> El modal recibe el último día de la ventana para
 * poder avisar del recorte antes de firmar: el servidor corta la concesión
 * contra la ventana, y ver los días reales después de concederlos ya no sirve de
 * nada — no hay operación que los corrija.
 */
async function onGrant(payload: GrantTrialRequest) {
  if (await grantModule(recordCompanyId.value, payload)) {
    grantModal.value = false
    // El foco vuelve a la tabla donde acaba de aparecer la fila, no a un botón
    // que quedó detrás del modal.
    await nextTick()
    grantsRegion.value?.focus()
  }
}

/** <b>Escribir el desenlace.</b> Se cierra una concesión concreta, no «la prueba». */
async function onRecordOutcome(payload: ConsumeTrialGrantRequest) {
  const target = outcomeTarget.value
  if (!target) return
  if (await recordOutcome(recordCompanyId.value, target.catalogItemId, payload)) {
    outcomeTarget.value = null
    await nextTick()
    grantsRegion.value?.focus()
  }
}

/**
 * Cerrar antes de tiempo no se deshace y no hay endpoint que reabra: la pregunta
 * lleva el sujeto dentro y el rótulo nombra la acción (WCAG 2.2 §3.3.4).
 */
async function onCloseWindow() {
  const accepted = await confirm.confirm({
    message: `¿Cerrar la prueba de ${title.value} antes de tiempo?`,
    consequence:
      'La empresa deja de estar en prueba desde ahora. No hay operación que la reabra ni que le devuelva los días que le quedaban: si vuelve a hacer falta, se abre una ventana nueva.',
    confirmLabel: 'Cerrar la prueba',
  })
  if (!accepted) return
  if (await closeWindow(recordCompanyId.value)) {
    await nextTick()
    windowRegion.value?.focus()
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="prueba-title">
    <div class="ds-block-head">
      <h1 id="prueba-title" class="ds-title">Prueba</h1>
    </div>

    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando la prueba…' : '' }}</p>

    <!-- 1 · Fallo del servidor. Va antes que el vacío: un 500 no puede
         disfrazarse de «esta empresa no tiene prueba» (R05). -->
    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openTrial(recordCompanyId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <template v-else>
      <div ref="windowRegion" tabindex="-1" class="region">
        <!-- 2 · Hay ventana. -->
        <TrialWindowCard
          v-if="window && windowState"
          :window="window"
          :state="windowState"
          can-close
          :closing="saving"
          @close="onCloseWindow"
        />

        <!-- 3 · No hay ventana, y eso NO es un error. -->
        <div v-else-if="windowMissing && !loading" class="ds-card ds-stack ds-stack--10">
          <AppEmptyState
            title="Esta empresa nunca ha estado en prueba"
            :description="TRIAL_WINDOW_NOT_EXTENDABLE"
          />
          <div class="ds-actions ds-actions--start">
            <button type="button" class="ds-btn ds-btn--primary" @click="openModal = true">
              <component :is="ICONS.ADD" :size="15" />
              Abrir una ventana de prueba
            </button>
          </div>
        </div>
      </div>

      <!-- 4 · El trabajo pendiente, si lo hay. Estado presente: banner, no toast. -->
      <div v-if="pendingOutcomeNotice" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ pendingOutcomeNotice }}</span>
      </div>

      <!-- 5 · Las concesiones y sus desenlaces. -->
      <div
        v-if="window || grantRows.length > 0"
        ref="grantsRegion"
        tabindex="-1"
        class="ds-stack ds-stack--10 region"
      >
        <div class="ds-block-head">
          <h2 class="ds-title">Concesiones y desenlaces</h2>
          <!-- Conceder exige una ventana viva: una concesión vive DENTRO de una
               ventana, y sin ella el servidor no tendría contra qué recortarla. -->
          <button
            v-if="window"
            type="button"
            class="ds-btn ds-btn--secondary ds-btn--sm"
            @click="grantModal = true"
          >
            <component :is="ICONS.ADD" :size="14" />
            Conceder un artículo a mano
          </button>
        </div>
        <TrialGrantsTable
          :rows="grantRows"
          :loading="loading"
          :error="null"
          :error-trace-id="null"
          can-record-outcome
          @retry="openTrial(recordCompanyId)"
          @record-outcome="outcomeTarget = $event"
        />
      </div>

      <!-- 6 · El barrido, anclado al último día de esta ventana. -->
      <TrialExpirationsPanel :initial-day="sweepDay" :current-company-id="companyId" />
    </template>

    <OpenTrialWindowModal
      :open="openModal"
      :company-name="title"
      :saving="saving"
      @close="openModal = false"
      @submit="onOpenWindow"
    />

    <GrantTrialModal
      :open="grantModal"
      :company-name="title"
      :window-end-date="window?.endDate ?? null"
      :saving="saving"
      @close="grantModal = false"
      @submit="onGrant"
    />

    <RecordTrialOutcomeModal
      :open="outcomeTarget !== null"
      :grant="outcomeTarget"
      :company-name="title"
      :saving="saving"
      @close="outcomeTarget = null"
      @submit="onRecordOutcome"
    />
  </section>
</template>

<style scoped>
/* La región que recibe el foco tras abrir o cerrar la ventana. Sin esto, el
   `tabindex="-1"` no tendría caja y el anillo de foco no se vería. */
.region {
  display: block;
}
</style>
