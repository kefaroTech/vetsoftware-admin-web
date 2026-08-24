<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { ICONS } from '@/constants/icons'
import { formatDocumentAmount } from '@/features/billing-operations/composables/billingFormat'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'
import { useSubscriptionMoney } from '../../composables/useSubscriptionMoney'
import {
  RECORD_LINK_PARAMS,
  useRecordLinkId,
  useSignaledArrival,
} from '../../composables/useRecordLink'
import {
  MONEY_INTRO_NOTE,
  MONEY_VERBS,
  SIGN_CONVENTION_NOTE,
} from '../../composables/subscriptionMoneyText'
import SubscriptionChargesTable from '../../components/record/SubscriptionChargesTable.vue'
import SubscriptionDocumentsTable from '../../components/record/SubscriptionDocumentsTable.vue'
import SubscriptionPaymentsTable from '../../components/record/SubscriptionPaymentsTable.vue'
import RegisterPaymentModal from '../../components/record/RegisterPaymentModal.vue'
import type { SubscriptionChargeStatus } from '../../types/subscription-money.types'
import type { RegisterSubscriptionPaymentRequest } from '../../types/subscription-money.types'

/**
 * `/dinero` — <b>devengado · facturado · cobrado</b> (§3.5 y §4.4.2, tarea W2-E).
 *
 * <p><b>Tres bloques porque son tres cosas.</b> El modelo separa a propósito
 * devengar (el servicio se prestó), facturar (se emitió el documento) y cobrar
 * (entró la plata); la interfaz mantiene la separación y <b>la nombra</b> en vez
 * de meterlo todo en «Facturación». Un cargo sin facturar no es una factura, y una
 * cuenta de cobro emitida no es dinero recibido: las dos confusiones se pagan en
 * la misma moneda —dar por cobrado lo que no lo está— y las dos empiezan por una
 * pantalla que las mezcla.
 *
 * <p><b>La segunda mitad de la pregunta que vertebra el modelo se recorre desde
 * aquí.</b> «¿Por qué se le facturaron 179.000?» se responde bajando por
 * `documento → cargos → prorrateo → otrosí → la línea que lo abrió`: cada
 * documento ofrece «Ver sus cargos», cada cargo enseña su fracción de prorrateo
 * —«18 de 31 días»— y enlaza a su otrosí y a su línea. Y también se entra por el
 * otro extremo: «Historia» enlaza aquí con `?otrosi=` justamente porque la
 * fracción no está en el otrosí, vive en el cargo.
 *
 * <p>El armazón ya cargó el contrato y garantiza `companyId`: esta vista no lo
 * recarga, lo lee y se lo pasa a su cliente de API para que la cabecera
 * `X-Company-Id` viaje en sus cuatro llamadas. La cabecera con la identidad de la
 * empresa también es suya y no se repinta aquí.
 */
const { companyId, subscriptionId, subscription, companyName } = useSubscriptionRecord()
const {
  visibleCharges,
  documentRows,
  paymentRows,
  accrued,
  collected,
  accruedAnnouncement,
  collectedAnnouncement,
  focusedDocumentId,
  focusedDocumentNotice,
  documentScopeNotice,
  chargeStatus,
  documentScope,
  loadingCharges,
  loadingDocuments,
  loadingPayments,
  savingPayment,
  chargesError,
  chargesErrorTraceId,
  documentsError,
  documentsErrorTraceId,
  paymentsError,
  paymentsErrorTraceId,
  chargesPage,
  chargesPageSize,
  chargesTotal,
  chargesPageCount,
  documentsPage,
  documentsPageSize,
  documentsTotal,
  documentsPageCount,
  paymentsPage,
  paymentsPageSize,
  paymentsTotal,
  paymentsPageCount,
  openMoney,
  changeChargeStatus,
  changeDocumentScope,
  focusDocument,
  goToChargesPage,
  goToDocumentsPage,
  goToPaymentsPage,
  registerPayment,
} = useSubscriptionMoney()

const accruedHeading = ref<HTMLElement | null>(null)
const paymentModal = ref<InstanceType<typeof RegisterPaymentModal> | null>(null)
const paymentOpen = ref(false)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que el contrato ha cargado—, pero el tipo sí lo
 * admite. El `?? 0` no llega a ejecutarse nunca.
 */
const scopeCompanyId = computed(() => companyId.value ?? 0)
const recordSubscriptionId = computed(() => subscriptionId.value ?? 0)
const subscriptionNumber = computed(() => subscription.value?.subscriptionNumber ?? '—')

/**
 * <b>La vuelta de la cadena.</b> «Historia» enlaza aquí con `?otrosi=<idOtrosí>`
 * (`AmendmentEntry.vue:97-107`) porque `prorationDays`/`periodDays` no están en el
 * otrosí: viven en el cargo, y sin ellos el prorrateo del otrosí no se puede
 * reconstruir. El nombre del parámetro lo fijaron W2-B y W2-C; inventar un tercero
 * dejaría los extremos de la cadena hablando idiomas distintos.
 */
const linkedAmendmentId = useRecordLinkId(RECORD_LINK_PARAMS.AMENDMENT)

/**
 * <b>Y la otra entrada, nueva en W3-D.</b> «Lo contratado» enlaza aquí con
 * `?item=<idLínea>` —«los cargos que generó»—, que es la mitad literal de la
 * pregunta del modelo: «¿por qué se le facturaron 179.000?» se responde partiendo
 * de la línea tanto como del documento.
 */
const linkedItemId = useRecordLinkId(RECORD_LINK_PARAMS.ITEM)

/**
 * Los cargos señalados, en el orden en que se pintan. <b>Se cruzan en cliente
 * sobre la página cargada</b>, y no es una decisión de comodidad:
 * `GET /subscription-billing/charges` no acepta filtrar por otrosí ni por línea
 * (issue de backend #463). De ahí que el aviso hable siempre de «esta página» y
 * nunca de «este contrato»: la diferencia entre las dos frases es la diferencia
 * entre informar y cerrar una cuenta que no está cerrada.
 */
const signaledCharges = computed(() =>
  visibleCharges.value.filter(
    (charge) =>
      (linkedAmendmentId.value != null && charge.amendmentId === linkedAmendmentId.value) ||
      (linkedItemId.value != null && charge.subscriptionItemId === linkedItemId.value),
  ),
)

/**
 * Qué se dice del enlace de entrada. <b>Cuando no se encuentra, se dice</b>: el
 * cargo puede estar en otra página o filtrado por estado, y callarse dejaría al
 * operador creyendo que ese otrosí no generó ningún cargo — que es una conclusión
 * contable, no un detalle de interfaz.
 */
const amendmentNotice = computed(() => {
  if (loadingCharges.value || chargesError.value) return ''
  const otrosi = linkedAmendmentId.value
  const item = linkedItemId.value
  if (otrosi == null && item == null) return ''
  const origen = otrosi != null ? `el otrosí #${otrosi}` : `la línea #${item}`
  const encontrados = signaledCharges.value.length
  if (encontrados === 0) {
    return `Vienes de ${origen} y ninguno de los cargos de esta página salió de ahí. Puede estar en otra página o quedar fuera del estado seleccionado: el servidor no permite pedir los cargos de un otrosí ni de una línea concretos.`
  }
  return `Vienes de ${origen}: ${encontrados} ${encontrados === 1 ? 'cargo salió' : 'cargos salieron'} de ahí y van señalados abajo.`
})

/**
 * Llevar el cargo señalado a la vista y al foco, una sola vez por llegada. Es la
 * mitad que le faltaba a esta pantalla: señalaba con texto, pero dejaba al
 * operador desplazándose a mano por una página de veinte cargos para encontrar lo
 * que el enlace le había prometido.
 */
useSignaledArrival({
  linkedId: computed(() => linkedAmendmentId.value ?? linkedItemId.value),
  anchors: computed(() => signaledCharges.value.map((charge) => `cargo-${charge.id}`)),
  settled: computed(() => !loadingCharges.value && !chargesError.value),
})

/** El número de documento por id, para que la cadena diga «DC-2026-00184» y no «#7». */
const documentNumbers = computed(() =>
  Object.fromEntries(documentRows.value.map((document) => [document.id, document.documentNumber])),
)

const chargeStatusOptions: { value: SubscriptionChargeStatus | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'PENDING', label: 'Devengados, sin facturar' },
  { value: 'INVOICED', label: 'Ya facturados' },
  { value: 'VOIDED', label: 'Anulados' },
]

/**
 * <b>Recarga siempre al abrir la pantalla.</b> Regla del proyecto, y aquí con un
 * motivo propio: es la sub-vista desde la que se registra dinero, y operar sobre
 * una foto vieja del saldo es cómo se cobra dos veces lo mismo.
 */
onMounted(() => void openMoney(scopeCompanyId.value, recordSubscriptionId.value))

async function onChargeStatus(next: SubscriptionChargeStatus | null) {
  await changeChargeStatus(scopeCompanyId.value, recordSubscriptionId.value, next)
}

/**
 * Bajar por la cadena: de una cuenta de cobro a los cargos que la componen. El
 * foco va al `<h2>` del bloque de arriba —lleva `tabindex="-1"`— porque el
 * contenido que acaba de cambiar está allí y no donde se pulsó. Mismo mecanismo
 * que `ErrorSummary.vue:56-58`.
 */
async function onFocusDocument(documentId: number) {
  focusDocument(documentId)
  await nextTick()
  accruedHeading.value?.focus()
}

async function onClearDocumentFilter() {
  focusDocument(null)
  await nextTick()
  accruedHeading.value?.focus()
}

async function onSubmitPayment(payload: RegisterSubscriptionPaymentRequest) {
  const created = await registerPayment(scopeCompanyId.value, recordSubscriptionId.value, payload)
  if (created) await paymentModal.value?.showRecord(created)
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="record-money-title">
    <!-- 1 · Los tres verbos, nombrados. Va arriba: quien lo lea después ya habrá
         sacado su conclusión equivocada. -->
    <div class="ds-card ds-stack ds-stack--10">
      <h2 id="record-money-title" class="ds-title">El dinero de este contrato</h2>
      <p class="ds-dialog-body">{{ MONEY_INTRO_NOTE }}</p>

      <dl class="ds-detail-grid">
        <div v-for="verb in MONEY_VERBS" :key="verb.verb">
          <dt class="ds-label">{{ verb.verb }}</dt>
          <dd class="valor">
            {{ verb.meaning }}
            <span class="ds-meta">Bloque «{{ verb.block }}».</span>
          </dd>
        </div>
      </dl>

      <p class="ds-meta">{{ SIGN_CONVENTION_NOTE }}</p>
    </div>

    <!-- 2 · DEVENGADO. -->
    <div class="ds-stack ds-stack--10">
      <div class="ds-block-head">
        <h2 ref="accruedHeading" class="ds-title" tabindex="-1">Devengado</h2>
        <p class="ds-meta">
          {{ accrued.pendingCount + accrued.invoicedCount }} cargos en la página
        </p>
      </div>

      <p class="ds-sr-only" role="status">{{ accruedAnnouncement }}</p>

      <!-- Las tres cifras, sin fundirlas en un total único: mezclar lo que no
           está facturado con lo que ya lo está es la cifra más peligrosa de la
           pantalla. -->
      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Devengado sin facturar</dt>
          <dd class="valor ds-num">{{ formatDocumentAmount(accrued.pendingAmount) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Ya facturado</dt>
          <dd class="valor ds-num">{{ formatDocumentAmount(accrued.invoicedAmount) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Cargos anulados</dt>
          <dd class="valor ds-num">{{ accrued.voidedCount }}</dd>
        </div>
      </dl>

      <div v-if="amendmentNotice" class="ds-banner ds-banner--info" role="status">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ amendmentNotice }}</span>
      </div>

      <!-- El filtro por documento, con su alcance dicho. Un filtro que aparenta
           ser completo sobre una página de veinte cierra cuentas que no lo están. -->
      <div v-if="focusedDocumentId != null" class="ds-banner ds-banner--info" role="status">
        <component :is="ICONS.RECEIPT" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ focusedDocumentNotice }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="onClearDocumentFilter"
        >
          <component :is="ICONS.CLOSE" :size="14" />
          Quitar el filtro
        </button>
      </div>

      <fieldset class="alcance">
        <legend class="ds-label">Qué cargos se listan</legend>
        <label v-for="option in chargeStatusOptions" :key="option.label" class="opcion">
          <input
            type="radio"
            name="estado-cargo"
            :checked="chargeStatus === option.value"
            @change="onChargeStatus(option.value)"
          />
          {{ option.label }}
        </label>
      </fieldset>

      <SubscriptionChargesTable
        :rows="visibleCharges"
        :company-id="scopeCompanyId"
        :subscription-id="recordSubscriptionId"
        :loading="loadingCharges"
        :error="chargesError"
        :error-trace-id="chargesErrorTraceId"
        :document-numbers="documentNumbers"
        :filtered-by-document="focusedDocumentId != null"
        :highlighted-amendment-id="linkedAmendmentId"
        :highlighted-item-id="linkedItemId"
        @retry="openMoney(scopeCompanyId, recordSubscriptionId)"
        @focus-document="onFocusDocument"
      />

      <AppPagination
        v-if="!loadingCharges && !chargesError && chargesTotal > 0"
        :page="chargesPage"
        :page-size="chargesPageSize"
        :total="chargesTotal"
        :page-count="chargesPageCount"
        @update:page="goToChargesPage(scopeCompanyId, recordSubscriptionId, $event)"
      />
    </div>

    <!-- 3 · FACTURADO. -->
    <div class="ds-stack ds-stack--10">
      <div class="ds-block-head">
        <h2 class="ds-title">Facturado</h2>
        <p class="ds-meta">{{ documentScopeNotice }}</p>
      </div>

      <fieldset class="alcance">
        <legend class="ds-label">Qué documentos se listan</legend>
        <label class="opcion">
          <input
            type="radio"
            name="alcance-documentos"
            :checked="documentScope === 'contract'"
            @change="changeDocumentScope('contract')"
          />
          Solo los de este contrato
        </label>
        <label class="opcion">
          <input
            type="radio"
            name="alcance-documentos"
            :checked="documentScope === 'company'"
            @change="changeDocumentScope('company')"
          />
          Todos los de la empresa
        </label>
      </fieldset>

      <SubscriptionDocumentsTable
        :rows="documentRows"
        :subscription-id="recordSubscriptionId"
        :focused-document-id="focusedDocumentId"
        :loading="loadingDocuments"
        :error="documentsError"
        :error-trace-id="documentsErrorTraceId"
        @retry="openMoney(scopeCompanyId, recordSubscriptionId)"
        @focus-document="onFocusDocument"
      />

      <AppPagination
        v-if="!loadingDocuments && !documentsError && documentsTotal > 0"
        :page="documentsPage"
        :page-size="documentsPageSize"
        :total="documentsTotal"
        :page-count="documentsPageCount"
        @update:page="goToDocumentsPage(scopeCompanyId, $event)"
      />
    </div>

    <!-- 4 · COBRADO. La única escritura de la pantalla vive aquí. -->
    <div class="ds-stack ds-stack--10">
      <div class="ds-block-head">
        <h2 id="record-money-collected-title" class="ds-title" tabindex="-1">Cobrado</h2>
        <button type="button" class="ds-btn ds-btn--primary" @click="paymentOpen = true">
          <component :is="ICONS.ADD" :size="15" />
          Registrar pago
        </button>
      </div>

      <p class="ds-sr-only" role="status">{{ collectedAnnouncement }}</p>

      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Cobrado (solo pagos confirmados)</dt>
          <dd class="valor ds-num">{{ formatDocumentAmount(collected.confirmedAmount) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Registrados que no cuentan</dt>
          <dd class="valor ds-num">{{ collected.notCountedCount }}</dd>
        </div>
      </dl>

      <!-- Se dice de quién es esta lista. No es un descuido del endpoint: un pago
           no pertenece a una factura ni a un contrato, y dejarlo implícito haría
           que alguien leyera «los pagos de este contrato». -->
      <p class="ds-meta">
        Los pagos son de la <strong>empresa</strong>, no de este contrato: un cliente puede pagar
        tres cuentas de cobro de un giro o abonar la mitad de una.
      </p>

      <SubscriptionPaymentsTable
        :rows="paymentRows"
        :loading="loadingPayments"
        :error="paymentsError"
        :error-trace-id="paymentsErrorTraceId"
        @retry="openMoney(scopeCompanyId, recordSubscriptionId)"
      />

      <AppPagination
        v-if="!loadingPayments && !paymentsError && paymentsTotal > 0"
        :page="paymentsPage"
        :page-size="paymentsPageSize"
        :total="paymentsTotal"
        :page-count="paymentsPageCount"
        @update:page="goToPaymentsPage(scopeCompanyId, $event)"
      />
    </div>

    <RegisterPaymentModal
      ref="paymentModal"
      :open="paymentOpen"
      :company-name="companyName"
      :subscription-number="subscriptionNumber"
      :saving="savingPayment"
      return-focus-to="#record-money-collected-title"
      @close="paymentOpen = false"
      @submit="onSubmitPayment"
    />
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

/* `<fieldset>` trae borde y padding del navegador; aquí es solo el agrupador
   semántico de los radios, que es lo que evita escribir `role="radiogroup"` y
   `aria-labelledby` a mano. Misma forma que en «Acceso» y «Lo contratado». */
.alcance {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-14);
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
}

.opcion {
  display: inline-flex;
  gap: var(--space-6);
  align-items: center;
}
</style>
