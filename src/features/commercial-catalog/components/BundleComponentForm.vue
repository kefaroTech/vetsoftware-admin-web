<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import type {
  BundleComponentResponse,
  CatalogItemResponse,
  CreateBundleComponentRequest,
  UpdateBundleComponentRequest,
} from '../types/commercial-catalog.types'

/**
 * Una pieza dentro de un paquete (`bundle_components`).
 *
 * ── El selector no ofrece lo que el servidor va a rechazar ─────────────────
 *
 * `CreateBundleComponentService` lanza `INVALID_BUNDLE_COMPOSITION` en dos
 * casos, y los dos se pueden evitar antes de pulsar: un `BUNDLE` no puede
 * contener otro `BUNDLE`, y nada puede contenerse a sí mismo. Así que esos
 * artículos **no aparecen** en la lista. Ofrecerlos y dejar que el 409 lo
 * explique sería enseñar una opción que no es una opción.
 *
 * Las piezas que el paquete ya trae tampoco se ofrecen: el alta del mismo par
 * no crea otra fila, cambia la que hay. Para cambiar la cantidad está el botón
 * de editar de la tabla.
 *
 * ── Solo la cantidad se edita ─────────────────────────────────────────────
 *
 * `UpdateBundleComponentRequest` lleva `quantity` y nada más. Cambiar la pieza
 * es quitar una y poner otra.
 */
const props = defineProps<{
  bundleItemId: number
  /** Candidatas ya filtradas por el panel: sin paquetes, sin el propio y sin las ya incluidas. */
  candidates: CatalogItemResponse[]
  initial?: BundleComponentResponse | null
  /** Para poner nombre a la pieza en edición, cuando ya no está entre las candidatas. */
  initialLabel?: string
  saving?: boolean
  optionsLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBundleComponentRequest | UpdateBundleComponentRequest]
  cancel: []
}>()

interface FormState {
  componentItemId: number | null
  quantity: string
}
type Field = keyof FormState

const uid = useId()
const ids: Record<Field, string> = {
  componentItemId: `${uid}-component-item`,
  quantity: `${uid}-quantity`,
}
const ORDER: Field[] = ['componentItemId', 'quantity']

const form = reactive<FormState>({ componentItemId: null, quantity: '1' })
const touched = reactive<Record<Field, boolean>>({ componentItemId: false, quantity: false })
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)
const baseline = ref('')

const componentOptions = computed(() =>
  props.candidates.map((item) => ({
    value: item.id,
    label: `${item.code} · ${item.name}${item.enabled ? '' : ' (deshabilitado)'}`,
  })),
)

function reset(initial?: BundleComponentResponse | null) {
  Object.assign(form, {
    componentItemId: initial?.componentItemId ?? null,
    quantity: String(initial?.quantity ?? 1),
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

function validateComponentItem(value: number | null): string {
  if (value === null) return 'Debes elegir la pieza que trae el paquete.'
  if (value === props.bundleItemId) return 'Un paquete no puede contenerse a sí mismo.'
  return ''
}

/** La cantidad es `int32` y el modelo no admite cero: un paquete trae al menos una. */
function validateQuantity(value: string): string {
  const parsed = Number(value)
  if (!value.trim() || !Number.isInteger(parsed) || parsed < 1) {
    return 'La cantidad debe ser un número entero mayor o igual a 1.'
  }
  if (parsed > 9999) return 'La cantidad no puede pasar de 9999.'
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  componentItemId: props.initial ? '' : validateComponentItem(form.componentItemId),
  quantity: validateQuantity(form.quantity),
}))

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((field) => [field, touched[field] ? errors.value[field] : ''])),
    ids,
    ORDER,
  ),
)

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

function validate() {
  for (const key of Object.keys(touched) as Field[]) touched[key] = true
  const ok = Object.values(errors.value).every((message) => !message)
  if (!ok) void Promise.resolve().then(() => summaryRef.value?.focus())
  return ok
}

function submit() {
  if (!validate()) return
  const quantity = Number(form.quantity)
  if (props.initial) {
    emit('submit', { quantity })
    return
  }
  if (form.componentItemId === null) return
  emit('submit', { componentItemId: form.componentItemId, quantity })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <ErrorSummary ref="summaryRef" :items="summaryItems" />

    <p v-if="initial" class="ds-stack ds-stack--8 dato">
      <span class="ds-label">Pieza</span>
      <span class="ds-text-strong">{{
        initialLabel ?? `Artículo #${initial.componentItemId}`
      }}</span>
    </p>
    <AppSelect
      v-else
      :id="ids.componentItemId"
      v-model="form.componentItemId"
      :options="componentOptions"
      label="Pieza que trae el paquete"
      required
      :disabled="optionsLoading"
      :placeholder="optionsLoading ? 'Cargando…' : 'Selecciona un artículo'"
      hint="No se listan otros paquetes: un paquete no puede contener otro."
      :error="err('componentItemId')"
      @blur="touch('componentItemId')"
    />

    <AppInput
      :id="ids.quantity"
      v-model="form.quantity"
      label="Cantidad"
      required
      type="number"
      inputmode="numeric"
      hint="Cuántas unidades de esa pieza entran en el paquete."
      :error="err('quantity')"
      @blur="touch('quantity')"
    />

    <div class="actions ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving || optionsLoading">
        {{ saving ? 'Guardando…' : initial ? 'Guardar cantidad' : 'Agregar pieza' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.dato {
  margin: 0;
}

.actions {
  justify-content: flex-end;
}
</style>
