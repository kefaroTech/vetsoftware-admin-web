<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import RecordSkeleton from '@/components/ui/RecordSkeleton.vue'
import { ICONS } from '@/constants/icons'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ExternalInvoiceRecord from '@/features/billing-operations/components/ExternalInvoiceRecord.vue'
import RegisterExternalInvoiceModal from '@/features/billing-operations/components/RegisterExternalInvoiceModal.vue'
import { BILLING_DOCUMENT_ROUTE_NAMES } from '@/router/routes/billing-documents.routes'
import ApplyToDocumentModal from '../components/ApplyToDocumentModal.vue'
import ContractGapNotice from '../components/ContractGapNotice.vue'
import DocumentApplicationsBlock from '../components/DocumentApplicationsBlock.vue'
import DocumentChargesBlock from '../components/DocumentChargesBlock.vue'
import DocumentIdentityCard from '../components/DocumentIdentityCard.vue'
import DocumentTaxBreakdown from '../components/DocumentTaxBreakdown.vue'
import IssueCreditNoteModal from '../components/IssueCreditNoteModal.vue'
import RegisterWithholdingModal from '../components/RegisterWithholdingModal.vue'
import { useBillingDocumentDetail } from '../composables/useBillingDocumentDetail'
import { useDocumentMoneyActions } from '../composables/useDocumentMoneyActions'

/**
 * <b>El documento de cobro, entero</b> (§G3). Seis bloques, cada uno en su
 * componente.
 *
 * <p><b>Está partido desde el primer commit y no después.</b> La especificación
 * marcó esta pantalla como candidata a pasarse del techo de 500 líneas por SFC
 * (`css-budget.config.json`, `maxOversizedSfc: 0`), y el momento de partirla es
 * antes de escribirla: un fichero de 700 líneas se parte mal porque para entonces
 * los bloques ya se leen entre ellos. Aquí la vista orquesta y no pinta ningún
 * dato por su cuenta.
 *
 * <p><b>Lo que esta pantalla NO ofrece, y por qué</b> (§3.6 — una operación que no
 * existe se explica donde se buscaría, con su razón y su alternativa):
 *
 * <ul>
 *   <li><b>Editar el importe.</b> No existe en el servidor. Un documento no se
 *       corrige: se emite una nota crédito encadenada y las dos quedan. Por eso no
 *       hay ni un lápiz apagado ni un `&lt;input disabled&gt;` con la cifra.</li>
 *   <li><b>Mandarle la factura al cliente.</b> Esto es un documento
 *       <b>interno</b>. La factura fiscal la emite un tercero y es la única que el
 *       cliente debe ver; un botón de «enviar» aquí mandaría el documento
 *       equivocado.</li>
 *   <li><b>Anular el documento.</b> Existe en el contrato (`/void`) y no se ofrece:
 *       anular y corregir no son lo mismo, y ofrecer los dos botones juntos es cómo
 *       se anula un documento que ya existe fuera. Lo que sí se ofrece es la nota
 *       crédito.</li>
 * </ul>
 *
 * <p><b>Las cuatro escrituras del dinero</b> —aplicar, contra-aplicar, registrar
 * retención y emitir nota crédito— se orquestan aquí y se pintan en sus
 * componentes. La pantalla recarga entera después de cada una: una aplicación
 * cambia el saldo, y una nota crédito cambia además lo que el documento puede
 * ofrecer.
 *
 * <p><b>Emitir la nota crédito solo aparece cuando los renglones están probados
 * completos.</b> Se compone de cargos, y los cargos de un documento no se pueden
 * pedir al servidor: son un cruce en cliente que solo vale si su suma da el
 * subtotal. Sin esa prueba, el botón no está y el modal lo explica.
 *
 * <p><b>La empresa viene de la URL</b>, nunca de un store de «empresa activa»: es
 * la que se manda en `X-Company-Id` y decidirlo con un valor invisible es mirar la
 * cartera de otra clínica creyendo que es esta.
 */
const route = useRoute()
const { confirm } = useConfirmDialog()
const {
  document,
  applications,
  applicationsTotal,
  chargeLines,
  taxCheck,
  settlement,
  loading,
  errors,
  errorTraceIds,
  load,
  submitForExternalIssue,
  applyRegistered,
} = useBillingDocumentDetail()

const companyId = computed(() => Number(route.params.companyId))
const documentId = computed(() => Number(route.params.id))
const registering = ref(false)
const applying = ref(false)
const withholding = ref(false)
const creditNote = ref(false)

const {
  saving,
  reversingApplicationId,
  resetActions,
  apply,
  reverseApplication,
  registerWithholding,
  issueCreditNote,
} = useDocumentMoneyActions(() => load(companyId.value, documentId.value))

/**
 * Recarga al abrir la pantalla y cada vez que cambia el documento de la URL:
 * regla obligatoria del proyecto, y además lo único que impide que el documento
 * anterior se quede pintado bajo el número del nuevo.
 */
onMounted(() => void load(companyId.value, documentId.value))
watch([companyId, documentId], ([empresa, id]) => {
  // El «guardando» del documento anterior no vale para este.
  resetActions()
  void load(empresa, id)
})

async function onSubmitForExternalIssue() {
  const accepted = await confirm({
    message: '¿Mandar este documento a la cola de emisión?',
    consequence:
      'Deja de ser un cálculo y pasa a esperar la factura fiscal del proveedor externo. A partir de ahí solo se corrige con una nota crédito.',
    confirmLabel: 'Mandar a facturar',
  })
  if (accepted) await submitForExternalIssue()
}

/**
 * <b>Contra-aplicar se confirma, no se firma.</b> El borde
 * (`POST /billing-document-applications/{id}/reversal`) no acepta cuerpo, así que
 * no hay dónde guardar un motivo; abrir el modal de acción firmada pediría uno que
 * se tira en el camino y haría creer que queda registrado. La consecuencia sí se
 * escribe entera, porque es lo que la gente espera mal: no desaparece nada.
 */
async function onReverse(applicationId: number) {
  const accepted = await confirm({
    message: `¿Contra-aplicar la aplicación #${applicationId}?`,
    consequence:
      'No se borra nada: se añade una fila que la anula y las dos quedan a la vista. El motivo no se puede guardar — el contrato de esta operación no acepta cuerpo.',
    confirmLabel: 'Contra-aplicar',
  })
  if (!accepted) return
  await reverseApplication(companyId.value, applicationId)
}
</script>

<template>
  <AppLayout>
    <div class="ds-page ds-page--stack ds-page--wide">
      <RouterLink
        :to="{ name: BILLING_DOCUMENT_ROUTE_NAMES.LIST }"
        class="ds-btn ds-btn--plain volver"
      >
        <component :is="ICONS.BACK" :size="14" />
        Documentos de cobro
      </RouterLink>

      <!-- Fallo al cargar el documento: no hay nada que pintar debajo, así que la
           pantalla dice qué pasó y ofrece reintentar, en vez de seis bloques vacíos. -->
      <div v-if="errors.document" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ errors.document }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="load(companyId, documentId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errors.document && errorTraceIds.document" class="ds-meta">
        Traza: {{ errorTraceIds.document }}
      </p>

      <RecordSkeleton v-else-if="!document" :lines="4" />

      <template v-else>
        <!-- 1 · Cabecera -->
        <DocumentIdentityCard :document="document">
          <template #actions>
            <button
              v-if="document.issueStatus === 'DRAFT'"
              type="button"
              class="ds-btn ds-btn--primary"
              @click="onSubmitForExternalIssue"
            >
              <component :is="ICONS.RECEIPT" :size="14" />
              Mandar a facturar
            </button>
            <button
              v-else-if="document.issueStatus === 'AWAITING_EXTERNAL'"
              type="button"
              class="ds-btn ds-btn--primary"
              @click="registering = true"
            >
              <component :is="ICONS.RECEIPT" :size="14" />
              Registrar factura externa
            </button>

            <button type="button" class="ds-btn ds-btn--ghost" @click="withholding = true">
              <component :is="ICONS.ADD" :size="14" />
              Registrar retención
            </button>

            <!-- Solo con los renglones probados completos: la nota crédito se
                 compone de cargos y acreditar sobre una lista incompleta corrige
                 por menos de lo debido. -->
            <button
              v-if="chargeLines?.complete"
              type="button"
              class="ds-btn ds-btn--ghost"
              @click="creditNote = true"
            >
              <component :is="ICONS.RECEIPT" :size="14" />
              Emitir nota crédito
            </button>
          </template>
        </DocumentIdentityCard>

        <!-- 2 · Los cargos que lo componen -->
        <DocumentChargesBlock
          :lines="chargeLines"
          :subscription-id="document.subscriptionId"
          :loading="loading.charges"
          :error="errors.charges"
          :error-trace-id="errorTraceIds.charges"
          @retry="load(companyId, documentId)"
        />

        <!-- 3 · Desglose de impuestos -->
        <DocumentTaxBreakdown
          :taxes="document.taxes"
          :subtotal="document.subtotalAmount"
          :check="taxCheck"
        />

        <!-- 4 · Qué lo salda -->
        <DocumentApplicationsBlock
          :rows="applications"
          :total="applicationsTotal"
          :settlement="settlement"
          :loading="loading.applications"
          :error="errors.applications"
          :error-trace-id="errorTraceIds.applications"
          :reversing-id="reversingApplicationId"
          @retry="load(companyId, documentId)"
          @reverse="onReverse"
          @apply="applying = true"
        />

        <!-- 5 · La factura fiscal enlazada. La ficha ya existe y se reutiliza tal
             cual: es la misma referencia, vista desde otra pantalla. -->
        <ExternalInvoiceRecord
          v-if="document.issueStatus === 'EXTERNAL_REGISTERED'"
          :document="document"
        />
        <div v-else class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Este documento todavía no tiene factura fiscal externa. La emite el proveedor, no
            VetSoftware; aquí se registra su referencia para poder cruzarla después.
          </span>
        </div>

        <!-- 6 · Historia del documento -->
        <ContractGapNotice
          title="La historia del documento"
          reason="De qué estado pasó a cuál, cuándo, quién lo movió y por qué. La tabla existe en
            la base (`billing_document_status_history`) y el contrato no publica ninguna ruta que
            la devuelva, así que esta pantalla no puede reconstruirla: lo único que se sabe es en
            qué estado está hoy."
          needed="Una ruta que devuelva la historia de estados de un documento, gemela de la que
            ya existe para el contrato (`/subscriptions/{id}/status-history`)."
        />

        <RegisterExternalInvoiceModal
          :open="registering"
          :document="registering ? document : null"
          return-focus-to="#documento-titulo"
          @close="registering = false"
          @registered="applyRegistered"
        />

        <ApplyToDocumentModal
          :open="applying"
          :document-id="document.id"
          :document-number="document.documentNumber"
          :balance-amount="document.balanceAmount"
          :saving="saving.apply"
          return-focus-to="#aplicaciones-titulo"
          @close="applying = false"
          @submit="
            async (payload) => {
              if (await apply(companyId, payload)) applying = false
            }
          "
        />

        <RegisterWithholdingModal
          :open="withholding"
          :document-id="document.id"
          :document-number="document.documentNumber"
          :balance-amount="document.balanceAmount"
          :saving="saving.withholding"
          return-focus-to="#documento-titulo"
          @close="withholding = false"
          @submit="
            async (payload) => {
              if (await registerWithholding(companyId, payload)) withholding = false
            }
          "
        />

        <IssueCreditNoteModal
          :open="creditNote"
          :document-id="document.id"
          :document-number="document.documentNumber"
          :charges="chargeLines?.rows ?? []"
          :charges-complete="chargeLines?.complete ?? false"
          :saving="saving.creditNote"
          return-focus-to="#documento-titulo"
          @close="creditNote = false"
          @submit="
            async (payload) => {
              if (await issueCreditNote(companyId, documentId, payload)) creditNote = false
            }
          "
        />
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.volver {
  align-self: flex-start;
}
</style>
