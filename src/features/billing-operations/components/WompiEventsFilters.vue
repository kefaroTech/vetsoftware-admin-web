<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ICONS } from '@/constants/icons'

/**
 * Filtro por referencia, empresa y fecha del histórico de webhooks de
 * Wompi. Va detrás de un «Filtrar» explícito, no en vivo por tecla: preguntarle
 * al servidor en cada carácter de una referencia de transacción no ahorra nada.
 */
const props = defineProps<{ reference: string; companyId: string; from: string; to: string }>()

const emit = defineEmits<{
  apply: [filter: { reference: string; companyId: string; from: string; to: string }]
  clear: []
}>()

const form = reactive({
  reference: props.reference,
  companyId: props.companyId,
  from: props.from,
  to: props.to,
})

watch(
  () => [props.reference, props.companyId, props.from, props.to] as const,
  ([reference, companyId, from, to]) => {
    form.reference = reference
    form.companyId = companyId
    form.from = from
    form.to = to
  },
)

function apply() {
  emit('apply', { ...form })
}

function clear() {
  form.reference = ''
  form.companyId = ''
  form.from = ''
  form.to = ''
  emit('clear')
}
</script>

<template>
  <form class="ds-wrap-row" @submit.prevent="apply">
    <AppInput
      v-model="form.reference"
      label="Referencia de la pasarela"
      placeholder="Número de la transacción"
    />
    <AppInput v-model="form.companyId" label="Empresa" inputmode="numeric" placeholder="42" />
    <AppInput v-model="form.from" type="date" label="Recibido desde" />
    <AppInput v-model="form.to" type="date" label="Recibido hasta" />
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
