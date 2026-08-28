<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { Ban, CheckCircle2, Landmark, Plus } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { segmentedTabId } from '@/components/ui/segmented-tabs'
import { formatCurrency, formatDate } from '@/composables/format'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import RegisterBankReceiptForm from './RegisterBankReceiptForm.vue'
import VerdictLine from './VerdictLine.vue'
import { bankReceiptVerdict } from '../composables/reconciliationVerdict'
import { useBankReceipts, type BankReceiptScope } from '../composables/useBankReceipts'
import type { BankReceiptResponse, RegisterBankReceiptRequest } from '../types/reconciliation.types'

/**
 * Los extractos bancarios: lo que de verdad entró en la cuenta.
 *
 * <p>Es el suelo de toda la conciliación. La liquidación dice lo que la pasarela
 * transfirió y el extracto dice lo que el banco abonó; mientras las dos no se
 * casen, lo que hay es una promesa, no una caja.
 *
 * <p><b>«Sin identificar» es la bandeja por defecto</b>, por lo mismo que en el
 * cuadre externo: un abono identificado ya no es trabajo, y una lista con los tres
 * estados mezclados esconde el único que lo es.
 */
const { receipts, scope, setScope, load, register, identify, discard } = useBankReceipts()
const { confirm } = useConfirmDialog()

const panelId = useId()
const SCOPES = [
  { value: 'UNIDENTIFIED', label: 'Sin identificar' },
  { value: 'ALL', label: 'Todo el extracto' },
] as const

const registerModalOpen = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof RegisterBankReceiptForm> | null>(null)

const scopeModel = computed({
  get: () => scope.value as string,
  set: (value: string) => void setScope(value as BankReceiptScope),
})

const activeTabId = computed(() => segmentedTabId(panelId, scope.value))

onMounted(async () => {
  scope.value = 'UNIDENTIFIED'
  await load()
})

useUnsavedChangesGuard(() => registerModalOpen.value && (formRef.value?.isDirty() ?? false))

async function submitRegister(payload: RegisterBankReceiptRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await register(payload)
    registerModalOpen.value = false
  } catch {
    // El composable ya avisó con el ProblemDetail y su traza.
  } finally {
    saving.value = false
  }
}

async function markIdentified(receipt: BankReceiptResponse) {
  const accepted = await confirm({
    message: `¿Marcar como identificado el abono de ${formatCurrency(receipt.amount)} del ${formatDate(receipt.receivedOn)}?`,
    consequence:
      'Deja de aparecer en la bandeja de trabajo y en el desplegable con el que se casan las liquidaciones.',
    confirmLabel: 'Marcar como identificado',
  })
  if (!accepted) return
  try {
    await identify(receipt.id)
  } catch {
    // El composable ya avisó.
  }
}

async function markDiscarded(receipt: BankReceiptResponse) {
  const accepted = await confirm({
    message: `¿Descartar el abono de ${formatCurrency(receipt.amount)} del ${formatDate(receipt.receivedOn)}?`,
    consequence:
      'Se conserva por trazabilidad, pero deja de contar para la conciliación. Descartar un abono que sí era nuestro deja caja sin explicar y nadie vuelve a mirarlo.',
    confirmLabel: 'Descartar el abono',
  })
  if (!accepted) return
  try {
    await discard(receipt.id)
  } catch {
    // El composable ya avisó.
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--14">
    <div class="ds-block-head">
      <AppSegmentedTabs
        v-model="scopeModel"
        :options="SCOPES"
        label="Bandeja del extracto"
        :panel-id="panelId"
      />
      <button type="button" class="ds-btn ds-btn--primary" @click="registerModalOpen = true">
        <Plus :size="15" />
        Registrar abono
      </button>
    </div>

    <div :id="panelId" role="tabpanel" :aria-labelledby="activeTabId" class="ds-stack ds-stack--14">
      <AppTable
        :headers="['Recibido', 'Cuenta', 'Referencia', 'Importe', 'Estado', 'Acciones']"
        :empty="receipts.items.value.length === 0"
        :loading="receipts.loading.value"
        :error="receipts.error.value"
        :trace-id="receipts.errorTraceId.value"
        @retry="receipts.reload"
      >
        <template #empty>
          <AppEmptyState
            :icon="Landmark"
            :title="
              scope === 'UNIDENTIFIED'
                ? 'No queda caja sin explicar'
                : 'Todavía no hay abonos registrados'
            "
            :description="
              scope === 'UNIDENTIFIED'
                ? 'Todo lo que entró en la cuenta está identificado. Es la única forma de saber que la caja del periodo es la que dicen las liquidaciones.'
                : 'Registra los abonos del extracto para poder casarlos con las liquidaciones de la pasarela.'
            "
          >
            <button type="button" class="ds-btn ds-btn--primary" @click="registerModalOpen = true">
              <Plus :size="15" />
              Registrar el primero
            </button>
          </AppEmptyState>
        </template>

        <tr v-for="receipt in receipts.items.value" :key="receipt.id" class="ds-row-hover">
          <td>{{ formatDate(receipt.receivedOn) }}</td>
          <td>{{ receipt.bankAccountRef }}</td>
          <td>
            <div class="ds-stack ds-stack--8">
              <span class="ds-text-strong">{{ receipt.bankReference }}</span>
              <span v-if="receipt.description" class="ds-meta">{{ receipt.description }}</span>
            </div>
          </td>
          <td class="ds-num">{{ formatCurrency(receipt.amount) }}</td>
          <td><VerdictLine :verdict="bankReceiptVerdict(receipt.status)" /></td>
          <td>
            <div class="ds-actions ds-actions--start">
              <template v-if="receipt.status === 'UNIDENTIFIED'">
                <button
                  type="button"
                  class="ds-icon-btn"
                  :aria-label="`Marcar como identificado el abono ${receipt.bankReference}`"
                  @click="markIdentified(receipt)"
                >
                  <CheckCircle2 :size="15" />
                </button>
                <button
                  type="button"
                  class="ds-icon-btn"
                  :aria-label="`Descartar el abono ${receipt.bankReference}`"
                  @click="markDiscarded(receipt)"
                >
                  <Ban :size="15" />
                </button>
              </template>
              <span v-else-if="receipt.identifiedAt" class="ds-meta">
                Resuelto el {{ formatDate(receipt.identifiedAt) }}
              </span>
            </div>
          </td>
        </tr>
      </AppTable>

      <AppPagination
        v-if="!receipts.loading.value && !receipts.error.value && receipts.total.value > 0"
        :page="receipts.page.value"
        :page-size="receipts.pageSize"
        :total="receipts.total.value"
        :page-count="receipts.pageCount.value"
        @update:page="receipts.goTo"
      />
    </div>

    <AppModal
      :open="registerModalOpen"
      title="Registrar un abono del extracto"
      :max-width="680"
      @close="registerModalOpen = false"
    >
      <RegisterBankReceiptForm
        ref="formRef"
        :saving="saving"
        @submit="submitRegister"
        @cancel="registerModalOpen = false"
      />
    </AppModal>
  </section>
</template>
