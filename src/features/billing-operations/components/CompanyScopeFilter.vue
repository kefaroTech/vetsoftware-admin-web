<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ICONS } from '@/constants/icons'

/**
 * El filtro por empresa de «Pagos» y «Gestión de mora».
 *
 * <p><b>Lo resuelve el SERVIDOR.</b> `GET /system/subscription-payments` y
 * `GET /system/dunning-events` aceptan `companyId`, así que «ninguno» es verdad
 * sobre el total y no sobre las 20 filas que se están mirando. Las otras dos
 * listas —pendientes y vencidos— **no** tienen este control precisamente porque
 * su endpoint no lo admite: filtrar en cliente una página de 300 filas diría
 * «no hay» sobre algo que sí hay (issue B-3).
 *
 * <p>Se pide el identificador y no el nombre porque el contrato no trae el
 * nombre en ninguno de los dos DTO (issue B-1). Decirlo en el texto de ayuda es
 * más honesto que un buscador que no puede buscar.
 */
const props = defineProps<{ companyId: number | null; itemsLabel: string }>()

const emit = defineEmits<{ apply: [companyId: number | null] }>()

const fieldId = useId()
const text = ref(props.companyId === null ? '' : String(props.companyId))
const touched = ref(false)

watch(
  () => props.companyId,
  (value) => {
    text.value = value === null ? '' : String(value)
    touched.value = false
  },
)

/** Vacío es válido: significa «sin filtro», que es el estado por defecto. */
const error = computed(() => {
  const raw = text.value.trim()
  if (!raw) return ''
  return /^\d+$/.test(raw) && Number(raw) > 0
    ? ''
    : 'El identificador de la empresa es un número entero. Ejemplo: 42'
})

function apply() {
  touched.value = true
  if (error.value) return
  const raw = text.value.trim()
  emit('apply', raw ? Number(raw) : null)
}

function clear() {
  text.value = ''
  touched.value = false
  emit('apply', null)
}
</script>

<template>
  <form class="filtro ds-wrap-row" @submit.prevent="apply">
    <AppInput
      :id="fieldId"
      v-model="text"
      label="Empresa"
      inputmode="numeric"
      placeholder="42"
      :hint="`Identificador de la empresa. Deja el campo vacío para ver ${itemsLabel} de todas.`"
      :error="touched ? error : ''"
      @blur="touched = true"
    />
    <div class="botones ds-flex-row">
      <button type="submit" class="ds-btn ds-btn--ghost ds-btn--sm">
        <component :is="ICONS.SEARCH" :size="14" />
        Filtrar
      </button>
      <button
        v-if="companyId !== null"
        type="button"
        class="ds-btn ds-btn--plain ds-btn--sm"
        @click="clear"
      >
        <component :is="ICONS.CLOSE" :size="14" />
        Quitar el filtro
      </button>
    </div>
  </form>
</template>

<style scoped>
.filtro {
  align-items: flex-start;
  gap: var(--space-12);
}

/* El campo lleva rótulo y ayuda encima y debajo; los botones se alinean con la
   caja del input, no con el bloque entero. */
.botones {
  margin-top: var(--space-18);
}
</style>
