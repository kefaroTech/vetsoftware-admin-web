<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Banknote, Landmark, Plus, ShieldAlert } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { formatCurrency, formatDate } from '@/composables/format'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import AttachProviderInvoiceForm from './AttachProviderInvoiceForm.vue'
import LinkBankReceiptModal from './LinkBankReceiptModal.vue'
import RegisterSettlementForm from './RegisterSettlementForm.vue'
import SettlementAmounts from './SettlementAmounts.vue'
import SettlementCountCell from './SettlementCountCell.vue'
import { useBankReceipts } from '../composables/useBankReceipts'
import { useGatewaySettlements } from '../composables/useGatewaySettlements'
import type {
  AttachProviderInvoiceRequest,
  GatewaySettlementResponse,
  RegisterGatewaySettlementRequest,
} from '../types/reconciliation.types'

/**
 * Las liquidaciones de la pasarela.
 *
 * ── El aviso de aislamiento, que es el eje de esta pantalla ───────────────
 *
 * <p>Una liquidación agrupa los cobros de <b>muchas clínicas</b> en una sola
 * fila. Esta consola es de plataforma y aquí sí se ve el agregado entero — pero
 * esta pantalla <b>no construye ningún camino que lleve del pago de un cliente a
 * su lote</b>:
 *
 * <ul>
 *   <li>No se pinta ninguna empresa, ni `CompanyRef`, ni ningún enlace a una.</li>
 *   <li>`settlementReference` es texto plano. No es un enlace, no abre nada y no
 *       es criterio de búsqueda de ninguna otra pantalla: se lee y se copia a
 *       mano contra el portal de la pasarela.</li>
 *   <li>La cuenta del lote sale de `/reconciliation`, que devuelve
 *       <b>cuántos</b> cobros hay y jamás <b>cuáles</b>. Con eso basta para
 *       reclamar y no basta para reconstruir la cartera de un competidor a
 *       partir del recibo de un cliente.</li>
 * </ul>
 *
 * <p>Si algún día hiciera falta ver los pagos de un lote, no es un enlace desde
 * aquí: es una decisión de producto con su propia autorización.
 *
 * ── La cuenta declarada ───────────────────────────────────────────────────
 *
 * <p>El lote dice cuántos cobros trae y el servidor cuenta cuántos hay atados. Si
 * dice 37 y hay 36, hay un pago perdido y la fila lo dice con esas palabras —
 * porque «no cuadra» no sirve para reclamarle nada a la pasarela.
 */
const {
  settlements,
  selectedSettlement,
  settlementCounts,
  settlementCountErrors,
  load,
  goTo,
  select,
  register,
  attachProviderInvoice,
  linkBankReceipt,
} = useGatewaySettlements()

const {
  unidentifiedReceipts,
  unidentifiedOptions,
  unidentifiedLoading,
  unidentifiedError,
  loadUnidentified,
} = useBankReceipts()

const registerModalOpen = ref(false)
const linkModalOpen = ref(false)
const detailOpen = ref(false)
const saving = ref(false)
const registerFormRef = ref<InstanceType<typeof RegisterSettlementForm> | null>(null)

onMounted(load)

useUnsavedChangesGuard(() => registerModalOpen.value && (registerFormRef.value?.isDirty() ?? false))

function openDetail(settlement: GatewaySettlementResponse) {
  select(settlement)
  detailOpen.value = true
}

/** Recarga siempre al abrir el modal: la lista de abonos libres cambia sola. */
async function openLink(settlement: GatewaySettlementResponse) {
  select(settlement)
  linkModalOpen.value = true
  try {
    await loadUnidentified(true)
  } catch {
    // El modal enseña el error persistente y ofrece reintentar.
  }
}

async function submitRegister(payload: RegisterGatewaySettlementRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await register(payload)
    registerModalOpen.value = false
  } catch {
    // El composable ya avisó; el modal conserva lo tecleado.
  } finally {
    saving.value = false
  }
}

async function submitAttachInvoice(payload: AttachProviderInvoiceRequest) {
  const current = selectedSettlement.value
  if (!current || saving.value) return
  saving.value = true
  try {
    await attachProviderInvoice(current.id, payload)
  } catch {
    // El composable ya avisó; el formulario conserva lo tecleado.
  } finally {
    saving.value = false
  }
}

async function submitLink(bankReceiptId: number) {
  const current = selectedSettlement.value
  if (!current || saving.value) return
  saving.value = true
  try {
    await linkBankReceipt(current.id, bankReceiptId)
    linkModalOpen.value = false
  } catch {
    // Ídem.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--14">
    <div class="ds-block-head">
      <p class="ds-meta cabecera">
        Cada fila es un lote con el que la pasarela nos pagó de una vez, con sus cinco importes.
        <strong>Un lote agrupa los cobros de muchas clínicas</strong>: aquí se lee el agregado, y
        desde aquí no se llega al pago de ningún cliente concreto.
      </p>
      <button type="button" class="ds-btn ds-btn--primary" @click="registerModalOpen = true">
        <Plus :size="15" />
        Registrar liquidación
      </button>
    </div>

    <AppTable
      :headers="['Pasarela', 'Liquidada', 'Bruto', 'Coste', 'Neto', 'La cuenta', 'Acciones']"
      :empty="settlements.items.value.length === 0"
      :loading="settlements.loading.value"
      :error="settlements.error.value"
      :trace-id="settlements.errorTraceId.value"
      @retry="load"
    >
      <template #empty>
        <AppEmptyState
          :icon="Landmark"
          title="Todavía no hay liquidaciones registradas"
          description="Una liquidación es el lote con el que la pasarela transfiere lo cobrado, ya descontada su comisión. Registrarlas es lo que permite contrastar que trae los cobros que dice traer."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="registerModalOpen = true">
            <Plus :size="15" />
            Registrar la primera
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="settlement in settlements.items.value" :key="settlement.id" class="ds-row-hover">
        <td>
          <div class="ds-stack ds-stack--8">
            <span class="ds-text-strong">{{ settlement.gateway }}</span>
            <!-- Etiqueta, no llave: texto plano, sin enlace y sin ser criterio
                 de búsqueda de ninguna otra pantalla. Ver el javadoc. -->
            <span class="ds-meta">{{ settlement.settlementReference }}</span>
          </div>
        </td>
        <td>{{ formatDate(settlement.settledOn) }}</td>
        <td class="ds-num">{{ formatCurrency(settlement.grossAmount) }}</td>
        <td class="ds-num">{{ formatCurrency(settlement.totalCost) }}</td>
        <td class="ds-num">{{ formatCurrency(settlement.netAmount) }}</td>
        <td>
          <SettlementCountCell
            :count="settlementCounts[settlement.id]"
            :error="settlementCountErrors[settlement.id]"
          />
        </td>
        <td>
          <div class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn"
              :aria-label="`Ver los importes del lote ${settlement.settlementReference}`"
              @click="openDetail(settlement)"
            >
              <Banknote :size="15" />
            </button>
            <button
              v-if="settlement.bankReceiptId === null"
              type="button"
              class="ds-icon-btn"
              :aria-label="`Casar el lote ${settlement.settlementReference} con un abono bancario`"
              @click="openLink(settlement)"
            >
              <Landmark :size="15" />
            </button>
            <span v-else class="ds-meta">Casado con el abono #{{ settlement.bankReceiptId }}</span>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!settlements.loading.value && !settlements.error.value && settlements.total.value > 0"
      :page="settlements.page.value"
      :page-size="settlements.pageSize"
      :total="settlements.total.value"
      :page-count="settlements.pageCount.value"
      @update:page="goTo"
    />

    <AppModal
      :open="detailOpen"
      title="Los importes del lote"
      :max-width="640"
      @close="detailOpen = false"
    >
      <div v-if="selectedSettlement" class="ds-stack ds-stack--16">
        <SettlementAmounts :settlement="selectedSettlement" />

        <SettlementCountCell
          :count="settlementCounts[selectedSettlement.id]"
          :error="settlementCountErrors[selectedSettlement.id]"
          explain
        />

        <p class="ds-banner ds-banner--info ds-banner--sm" role="status">
          <ShieldAlert :size="15" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Este lote agrupa cobros de varias empresas. La consola enseña el agregado y la cuenta
            —cuántos cobros declara y cuántos hay atados—, nunca la lista de pagos ni la empresa de
            ninguno de ellos.
          </span>
        </p>

        <!-- La factura de la pasarela no es la liquidación: es el documento con
             el que nos cobra la comisión. Sin él, lo que se quedó es un gasto sin
             soporte, y un gasto sin soporte no se deduce. Por eso el formulario
             está aquí y no escondido tras otra pantalla. -->
        <div class="ds-stack ds-stack--8">
          <p v-if="selectedSettlement.providerInvoiceRef" class="ds-meta">
            Factura de la pasarela: {{ selectedSettlement.providerInvoiceRef }}
            <template v-if="selectedSettlement.providerTaxId">
              · NIT {{ selectedSettlement.providerTaxId }}
            </template>
          </p>
          <p v-else class="ds-meta">
            La pasarela todavía no nos ha facturado su comisión, o no se ha adjuntado su factura.
          </p>
          <AttachProviderInvoiceForm
            :settlement="selectedSettlement"
            :saving="saving"
            @submit="submitAttachInvoice"
            @cancel="detailOpen = false"
          />
        </div>
      </div>
    </AppModal>

    <AppModal
      :open="registerModalOpen"
      title="Registrar una liquidación"
      :max-width="880"
      @close="registerModalOpen = false"
    >
      <RegisterSettlementForm
        ref="registerFormRef"
        :saving="saving"
        @submit="submitRegister"
        @cancel="registerModalOpen = false"
      />
    </AppModal>

    <LinkBankReceiptModal
      :open="linkModalOpen"
      :settlement="selectedSettlement"
      :receipts="unidentifiedReceipts"
      :options="unidentifiedOptions"
      :loading="unidentifiedLoading"
      :error="unidentifiedError"
      :saving="saving"
      @close="linkModalOpen = false"
      @retry="loadUnidentified(true)"
      @submit="submitLink"
    />
  </section>
</template>

<style scoped>
/* La cabecera de la sección lleva prosa larga a la izquierda y el botón a la
   derecha; `.ds-block-head` no acota el ancho del texto y sin esto la frase
   corre hasta pegarse al botón. */
.cabecera {
  max-width: 78ch;
}
</style>
