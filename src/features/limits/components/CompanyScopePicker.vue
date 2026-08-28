<script lang="ts">
/**
 * Valida el identificador de empresa. Puro y exportado: es lo que una prueba
 * puede barrer sin montar el componente, y el mismo texto se usa en el otro
 * selector de la sección.
 *
 * <p>Aquí la empresa **no** es opcional, a diferencia del filtro de cobranza:
 * las rutas de cupo van dirigidas por `companyId` en la URL y sin él no hay
 * ninguna consulta que hacer.
 */
export function validateCompanyId(value: string): string | null {
  const raw = value.trim()
  if (!raw) return 'Escribe el identificador de la empresa: sin él no hay nada que consultar.'
  if (!/^\d+$/.test(raw) || Number(raw) <= 0)
    return 'El identificador de la empresa es un número entero. Ejemplo: 42'
  return null
}
</script>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ICONS } from '@/constants/icons'

/**
 * **Sobre qué empresa se trabaja.** Es el primer paso de la pantalla de
 * excepciones, no un filtro que se pueda dejar en blanco.
 *
 * <p><b>Por qué se pide un número y no se busca por nombre.</b> Ninguno de los
 * tres DTO de cupo trae el nombre de la empresa —`CompanyLimitOverrideResponse`,
 * `CompanyLimitEventResponse` y `EffectiveLimitResponse` exponen `companyId` y
 * nada más—, y tampoco existe un endpoint que liste excepciones de todas las
 * empresas contra el que buscar. Decirlo en el texto de ayuda es más honesto que
 * un buscador que no puede buscar (R14).
 *
 * <p>El error no se enseña hasta que el campo se toca o se intenta enviar: quien
 * está escribiendo todavía no se ha equivocado.
 */
const props = defineProps<{
  companyId: number | null
  /** Qué se va a listar, para completar el texto de ayuda: «las excepciones». */
  itemsLabel: string
}>()

const emit = defineEmits<{ apply: [companyId: number] }>()

const fieldId = useId()
const text = ref(props.companyId === null ? '' : String(props.companyId))
const touched = reactive({ companyId: false })

watch(
  () => props.companyId,
  (value) => {
    text.value = value === null ? '' : String(value)
    touched.companyId = false
  },
)

const errors = computed(() => ({ companyId: validateCompanyId(text.value) }))

function err(field: 'companyId'): string {
  return touched[field] ? (errors.value[field] ?? '') : ''
}

function apply() {
  touched.companyId = true
  if (errors.value.companyId) return
  emit('apply', Number(text.value.trim()))
}
</script>

<template>
  <form class="alcance ds-wrap-row" @submit.prevent="apply">
    <AppInput
      :id="fieldId"
      v-model="text"
      label="Empresa"
      required
      inputmode="numeric"
      placeholder="42"
      :hint="`Identificador de la empresa cuyas ${itemsLabel} quieres ver. La plataforma no ofrece un listado de todas las empresas a la vez.`"
      :error="err('companyId')"
      @blur="touched.companyId = true"
    />
    <button type="submit" class="boton ds-btn ds-btn--primary ds-btn--sm">
      <component :is="ICONS.SEARCH" :size="14" />
      Consultar
    </button>
  </form>
</template>

<style scoped>
.alcance {
  align-items: flex-start;
}

/* El campo lleva rótulo encima y ayuda debajo; el botón se alinea con la caja
   del input, no con el bloque entero. */
.boton {
  margin-top: var(--space-18);
}
</style>
