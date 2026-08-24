<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import {
  RELATION_TYPE_MEANING,
  RELATION_TYPE_OPTIONS,
  type CatalogItemDependencyResponse,
  type CatalogItemResponse,
  type CreateCatalogItemDependencyRequest,
  type RelationType,
  type UpdateCatalogItemDependencyRequest,
} from '../types/commercial-catalog.types'

/**
 * Una regla del configurador entre dos artículos (`catalog_item_dependencies`).
 *
 * ── `note` es copy para el cliente, no un comentario técnico ───────────────
 *
 * El esquema la admite vacía; **esta interfaz la exige**. Es el texto que lee
 * quien está comprando —«Facturar electrónicamente necesita el módulo de
 * Caja»—, y sin ella el configurador le enseña al cliente un rechazo críptico
 * en el único momento en que se le podía explicar. Por eso el rótulo del campo
 * habla de mensaje y el marcador de posición es un ejemplo real, no un
 * `lorem`.
 *
 * ── El artículo relacionado no se edita ────────────────────────────────────
 *
 * `UpdateCatalogItemDependencyRequest` no lo lleva: cambiar el otro extremo es
 * otra regla, no la misma. En edición el selector va deshabilitado, con su
 * `hint` diciendo por qué, en vez de desaparecer — quien edita necesita ver
 * sobre qué par está trabajando.
 */
const props = defineProps<{
  /** El artículo sujeto de la regla. Se excluye de las opciones: nadie depende de sí mismo. */
  catalogItemId: number
  catalogItems: CatalogItemResponse[]
  initial?: CatalogItemDependencyResponse | null
  saving?: boolean
  optionsLoading?: boolean
  optionsError?: string | null
}>()

const emit = defineEmits<{
  submit: [data: CreateCatalogItemDependencyRequest | UpdateCatalogItemDependencyRequest]
  cancel: []
  retryOptions: []
}>()

interface FormState {
  relatedItemId: number | null
  relationType: RelationType
  note: string
}
type Field = keyof FormState

const uid = useId()
const ids: Record<Field, string> = {
  relatedItemId: `${uid}-related-item`,
  relationType: `${uid}-relation-type`,
  note: `${uid}-note`,
}
const ORDER: Field[] = ['relatedItemId', 'relationType', 'note']

const form = reactive<FormState>({ relatedItemId: null, relationType: 'REQUIRES', note: '' })
const touched = reactive<Record<Field, boolean>>({
  relatedItemId: false,
  relationType: false,
  note: false,
})
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)
const baseline = ref('')

const relatedOptions = computed(() =>
  props.catalogItems
    .filter((item) => item.id !== props.catalogItemId)
    .map((item) => ({
      value: item.id,
      label: `${item.code} · ${item.name}${item.enabled ? '' : ' (deshabilitado)'}`,
    })),
)

/** La frase que la regla va a producir, para releerla antes de guardar. */
const preview = computed(() => {
  const related = props.catalogItems.find((item) => item.id === form.relatedItemId)
  if (!related) return null
  const subject = props.catalogItems.find((item) => item.id === props.catalogItemId)
  return `${subject?.name ?? 'Este artículo'} ${RELATION_TYPE_MEANING[form.relationType]} ${related.name}.`
})

function reset(initial?: CatalogItemDependencyResponse | null) {
  Object.assign(form, {
    relatedItemId: initial?.relatedItemId ?? null,
    relationType: initial?.relationType ?? 'REQUIRES',
    note: initial?.note ?? '',
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

/** Validadores puros por campo: entran el valor, sale el mensaje o cadena vacía. */
function validateRelatedItem(value: number | null): string {
  if (value === null) return 'Debes elegir el otro artículo de la regla.'
  if (value === props.catalogItemId) return 'Un artículo no puede depender de sí mismo.'
  return ''
}

function validateNote(value: string): string {
  const text = value.trim()
  if (!text) return 'Escribe el mensaje que verá el cliente cuando se aplique la regla.'
  if (text.length < 10) return 'El mensaje debe tener al menos 10 caracteres para que se entienda.'
  if (text.length > 255) return 'El mensaje no puede pasar de 255 caracteres.'
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  relatedItemId: props.initial ? '' : validateRelatedItem(form.relatedItemId),
  relationType: form.relationType ? '' : 'Debes elegir el tipo de regla.',
  note: validateNote(form.note),
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
  const common: UpdateCatalogItemDependencyRequest = {
    relationType: form.relationType,
    note: form.note.trim(),
  }
  if (props.initial) {
    emit('submit', common)
    return
  }
  if (form.relatedItemId === null) return
  emit('submit', { relatedItemId: form.relatedItemId, ...common })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <ErrorSummary ref="summaryRef" :items="summaryItems" />

    <div v-if="optionsError" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">{{ optionsError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('retryOptions')">
        Reintentar
      </button>
    </div>

    <AppSelect
      :id="ids.relatedItemId"
      v-model="form.relatedItemId"
      :options="relatedOptions"
      label="El otro artículo de la regla"
      required
      :disabled="!!initial || optionsLoading"
      :placeholder="optionsLoading ? 'Cargando…' : 'Selecciona un artículo'"
      :hint="initial ? 'El otro extremo no se cambia: eso sería otra regla.' : undefined"
      :error="err('relatedItemId')"
      @blur="touch('relatedItemId')"
    />

    <AppSelect
      :id="ids.relationType"
      v-model="form.relationType"
      :options="RELATION_TYPE_OPTIONS"
      label="Tipo de regla"
      required
      :hint="`«${RELATION_TYPE_MEANING[form.relationType]}»`"
      :error="err('relationType')"
      @blur="touch('relationType')"
    />

    <p v-if="preview" class="ds-banner ds-banner--info" role="status">
      <span class="ds-flex-fill">{{ preview }}</span>
    </p>

    <AppTextarea
      :id="ids.note"
      v-model="form.note"
      label="Mensaje para el cliente"
      required
      :rows="3"
      placeholder="Facturar electrónicamente necesita el módulo de Caja."
      hint="Es el texto que el configurador le enseña a quien está comprando. Máximo 255 caracteres."
      :error="err('note')"
      @blur="touch('note')"
    />

    <div class="actions ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving || optionsLoading">
        {{ saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear regla' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.actions {
  justify-content: flex-end;
}
</style>
