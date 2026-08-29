<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Banknote } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { formatAmount, formatDate } from '@/composables/format'
import type { BankReceiptResponse, GatewaySettlementResponse } from '../types/reconciliation.types'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'

/**
 * Casar una liquidación con el abono bancario que la pagó.
 *
 * <p><b>No usa `SignedActionModal` y eso es deliberado.</b> Esa pieza garantiza
 * que nunca se emite sin un motivo de lista cerrada, y su valor está en que el
 * motivo se guarde: `LinkBankReceiptRequest` solo declara `bankReceiptId`, así
 * que un motivo aquí no tendría dónde ir y la firma sería teatro. Se pide una
 * confirmación explícita con la consecuencia delante, que es lo que sí se puede
 * cumplir. Queda anotado como hueco del contrato.
 *
 * <p><b>La comparación de importes va delante de la decisión.</b> El neto del
 * lote y el importe del abono deberían coincidir; cuando no, se dice cuánto
 * separa a los dos <b>antes</b> de casarlos, porque después el abono ya está
 * consumido y deshacerlo no está en el contrato.
 */
const props = defineProps<{
  open: boolean
  settlement: GatewaySettlementResponse | null
  receipts: BankReceiptResponse[]
  options: { value: number; label: string }[]
  loading?: boolean
  error?: string | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; retry: []; submit: [bankReceiptId: number] }>()

const chosen = ref<number | null>(null)
const touched = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    chosen.value = null
    touched.value = false
  },
)

const chosenReceipt = computed(
  () => props.receipts.find((receipt) => receipt.id === chosen.value) ?? null,
)

/** La diferencia entre el neto del lote y el abono, cuando ya se puede calcular. */
const gap = computed(() => {
  if (!props.settlement || !chosenReceipt.value) return null
  return props.settlement.netAmount - chosenReceipt.value.amount
})

const selectError = computed(() =>
  touched.value && chosen.value === null ? 'Elige el abono con el que se casa este lote.' : '',
)

function submit() {
  touched.value = true
  if (chosen.value === null || props.saving) return
  emit('submit', chosen.value)
}
</script>

<template>
  <AppModal
    :open="open"
    title="Casar con el abono bancario"
    :max-width="620"
    @close="emit('close')"
  >
    <div v-if="settlement" class="ds-stack ds-stack--16">
      <MoneyScopeNote />

      <p class="ds-dialog-body">
        La liquidación <span class="ds-text-strong">{{ settlement.settlementReference }}</span> de
        {{ settlement.gateway }}, liquidada el {{ formatDate(settlement.settledOn) }}, dejó un neto
        de <span class="ds-num">{{ formatAmount(settlement.netAmount) }}</span
        >.
      </p>

      <div v-if="props.error" class="ds-banner ds-banner--error" role="alert">
        <span class="ds-flex-fill">{{ props.error }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('retry')">
          Reintentar
        </button>
      </div>

      <AppSelect
        v-model="chosen"
        :options="options"
        label="Abono bancario sin identificar"
        required
        :disabled="loading"
        :placeholder="loading ? 'Cargando…' : 'Selecciona el abono'"
        hint="Solo se listan los abonos que todavía no se han identificado."
        :error="selectError"
        @blur="touched = true"
      />

      <p v-if="gap !== null && gap !== 0" class="ds-banner ds-banner--warning" role="status">
        <Banknote :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">
          El neto del lote y el abono no coinciden: se separan
          <span class="ds-num">{{ formatAmount(gap) }}</span>
          . Casarlos igualmente es legítimo —la pasarela agrupa varios lotes en una transferencia—
          pero la diferencia queda sin explicar, y el contrato no ofrece forma de deshacer el
          enlace.
        </span>
      </p>

      <p v-else-if="gap === 0" class="ds-meta">
        El neto del lote y el importe del abono coinciden al peso.
      </p>
    </div>

    <template #footer>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Casando…' : 'Casar con este abono' }}
      </button>
    </template>
  </AppModal>
</template>
