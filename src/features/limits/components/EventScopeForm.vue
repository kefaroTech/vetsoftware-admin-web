<script lang="ts">
/**
 * Valida la ventana de fechas. Pura y exportada: la barre una prueba sin montar
 * nada, y las dos pantallas de bitácora comparten exactamente el mismo criterio.
 *
 * <p>El endpoint exige `from` y `to`, así que ninguna puede quedar vacía. Y
 * `from` posterior a `to` no devuelve «nada»: devuelve un rango imposible, que
 * en una pantalla sin este aviso se lee como «no pasó nada», que es una
 * afirmación falsa sobre el cliente.
 */
export function validateEventRange(
  from: string,
  to: string,
): { from: string | null; to: string | null } {
  const errores: { from: string | null; to: string | null } = { from: null, to: null }
  if (!from) errores.from = 'Indica desde qué día quieres ver la bitácora.'
  if (!to) errores.to = 'Indica hasta qué día quieres ver la bitácora.'
  if (!errores.from && !errores.to && from > to)
    errores.to = 'El día final es anterior al inicial: así el rango no puede devolver nada.'
  return errores
}
</script>

<script setup lang="ts">
import { computed, reactive, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ICONS } from '@/constants/icons'
import { validateCompanyId } from './CompanyScopePicker.vue'

/**
 * **Empresa y ventana**: los tres datos que la bitácora de cupo necesita antes de
 * poder preguntar nada.
 *
 * <p><b>La ventana se enseña escrita y editable, nunca implícita.</b> Un rango
 * por defecto que no se ve es un filtro aplicado que nadie sabe que está
 * aplicado: alguien concluiría «a este cliente no le ha pasado nada» sobre una
 * consulta de noventa días.
 *
 * <p>El validador de la empresa se importa del selector de al lado en vez de
 * reescribirse: dos redacciones del mismo error en la misma sección es
 * exactamente la deriva que el proyecto persigue.
 */
const props = defineProps<{
  companyId: number | null
  from: string
  to: string
  /** Qué se consulta, para el rótulo del botón: «la bitácora». */
  itemsLabel: string
}>()

const emit = defineEmits<{ apply: [companyId: number, from: string, to: string] }>()

const companyFieldId = useId()
const fromFieldId = useId()
const toFieldId = useId()

const form = reactive({
  companyId: props.companyId === null ? '' : String(props.companyId),
  from: props.from,
  to: props.to,
})
const touched = reactive({ companyId: false, from: false, to: false })

watch(
  () => [props.companyId, props.from, props.to] as const,
  ([companyId, from, to]) => {
    form.companyId = companyId === null ? '' : String(companyId)
    form.from = from
    form.to = to
  },
)

const errors = computed(() => {
  const rango = validateEventRange(form.from, form.to)
  return { companyId: validateCompanyId(form.companyId), from: rango.from, to: rango.to }
})

function err(field: 'companyId' | 'from' | 'to'): string {
  return touched[field] ? (errors.value[field] ?? '') : ''
}

function apply() {
  touched.companyId = true
  touched.from = true
  touched.to = true
  if (errors.value.companyId || errors.value.from || errors.value.to) return
  emit('apply', Number(form.companyId.trim()), form.from, form.to)
}
</script>

<template>
  <form class="consulta ds-wrap-row" @submit.prevent="apply">
    <AppInput
      :id="companyFieldId"
      v-model="form.companyId"
      label="Empresa"
      required
      inputmode="numeric"
      placeholder="42"
      hint="Identificador de la empresa. La plataforma no sirve un feed de todas a la vez."
      :error="err('companyId')"
      @blur="touched.companyId = true"
    />
    <AppInput
      :id="fromFieldId"
      v-model="form.from"
      label="Desde"
      required
      type="date"
      :error="err('from')"
      @blur="touched.from = true"
    />
    <AppInput
      :id="toFieldId"
      v-model="form.to"
      label="Hasta"
      required
      type="date"
      :error="err('to')"
      @blur="touched.to = true"
    />
    <button type="submit" class="boton ds-btn ds-btn--primary ds-btn--sm">
      <component :is="ICONS.SEARCH" :size="14" />
      Consultar {{ itemsLabel }}
    </button>
  </form>
</template>

<style scoped>
.consulta {
  align-items: flex-start;
}

/* Alineado con la caja de los campos, que llevan rótulo encima. */
.boton {
  margin-top: var(--space-18);
}
</style>
