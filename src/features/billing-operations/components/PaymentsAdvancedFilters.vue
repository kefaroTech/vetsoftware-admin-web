<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { ICONS } from '@/constants/icons'
import {
  PAYMENT_STATUS_LABEL,
  type PaymentsFilterState,
  type PaymentStatus,
} from '../types/billing-operations.types'

/**
 * Estado, rango de fechas y «solo pendientes con más de 1 hora», los tres
 * En el servidor: el checkbox ya no filtra la página cargada, así que encontrar
 * El `PENDING` más viejo de todo el histórico de una empresa deja de exigir
 * pasar página por página.
 *
 * <p>Marcar el checkbox fuerza `status=PENDING` — son la misma pregunta, «¿qué
 * pago quedó a medias?», y dejar el select en otra cosa a la vez no tiene una
 * lectura que las combine — así que el select se deshabilita mientras dure.
 */
const props = defineProps<{ filter: PaymentsFilterState }>()

const emit = defineEmits<{ apply: [filter: PaymentsFilterState] }>()

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  ...(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((value) => ({
    value,
    label: PAYMENT_STATUS_LABEL[value],
  })),
]

const form = reactive({
  status: props.filter.status ?? '',
  receivedFrom: props.filter.receivedFrom ?? '',
  receivedTo: props.filter.receivedTo ?? '',
  agingOnly: props.filter.agingOnly,
})

watch(
  () => props.filter,
  (filter) => {
    form.status = filter.status ?? ''
    form.receivedFrom = filter.receivedFrom ?? ''
    form.receivedTo = filter.receivedTo ?? ''
    form.agingOnly = filter.agingOnly
  },
)

function apply() {
  emit('apply', {
    status: form.agingOnly ? null : ((form.status || null) as PaymentStatus | null),
    receivedFrom: form.receivedFrom || null,
    receivedTo: form.receivedTo || null,
    agingOnly: form.agingOnly,
  })
}

function clear() {
  form.status = ''
  form.receivedFrom = ''
  form.receivedTo = ''
  form.agingOnly = false
  apply()
}
</script>

<template>
  <form class="ds-wrap-row" @submit.prevent="apply">
    <AppSelect
      v-model="form.status"
      :options="STATUS_OPTIONS"
      label="Estado"
      :disabled="form.agingOnly"
    />
    <AppInput v-model="form.receivedFrom" type="date" label="Recibido desde" />
    <AppInput v-model="form.receivedTo" type="date" label="Recibido hasta" />
    <AppCheckbox v-model="form.agingOnly" label="Solo pendientes con más de 1 hora" />
    <div class="ds-flex-row">
      <button type="submit" class="ds-btn ds-btn--ghost ds-btn--sm">
        <component :is="ICONS.SEARCH" :size="14" />
        Filtrar
      </button>
      <button type="button" class="ds-btn ds-btn--plain ds-btn--sm" @click="clear">
        <component :is="ICONS.CLOSE" :size="14" />
        Quitar filtros
      </button>
    </div>
  </form>
</template>
