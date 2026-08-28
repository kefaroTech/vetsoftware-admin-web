<script lang="ts">
/**
 * Los validadores del eje de cupo. Puros, uno por campo y exportados: es lo que
 * una prueba puede barrer sin montar el formulario.
 */

/** El código viaja copiado a cada cupo contratado: se fija en el alta y no se toca. */
export function validateCode(value: string): string | null {
  const raw = value.trim()
  if (raw.length < 2) return 'El código es obligatorio y necesita al menos 2 caracteres.'
  if (raw.length > 50) return 'El código no puede pasar de 50 caracteres.'
  if (!/^[A-Z][A-Z0-9_]*$/.test(raw))
    return 'Usa mayúsculas, dígitos y guion bajo, empezando por letra. Ejemplo: PET_COUNT'
  return null
}

export function validateName(value: string): string | null {
  const raw = value.trim()
  if (raw.length < 2) return 'El nombre es obligatorio y necesita al menos 2 caracteres.'
  if (raw.length > 120) return 'El nombre no puede pasar de 120 caracteres.'
  return null
}

/**
 * Vacío es válido: no todos los ejes cuelgan de un submódulo. Lo que no vale es
 * un número que no identifique a ninguno.
 */
export function validateSubModuleId(value: number | null): string | null {
  if (value === null) return null
  return Number.isInteger(value) && value > 0 ? null : 'Elige un submódulo de la lista.'
}

/**
 * Los días de gracia son opcionales y **no negativos**. Vacío significa «no hay
 * gracia declarada», que no es lo mismo que cero: cero prometería liberación
 * inmediata, y eso es una afirmación que el catálogo no ha hecho.
 */
export function validateReleaseDelayDays(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (!/^\d+$/.test(raw)) return 'Los días de gracia son un número entero de días. Ejemplo: 30'
  if (Number(raw) > 3650) return 'Diez años de gracia no es una gracia: revisa el valor.'
  return null
}

/** Fecha válida de calendario. Puede ser futura: es justo para lo que sirve. */
export function validateAvailableFrom(value: string): string | null {
  if (!value) return 'Indica desde cuándo el eje se puede contratar.'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return 'La fecha no es válida.'
  const d = new Date(`${value}T00:00:00`)
  if (
    Number.isNaN(d.getTime()) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  )
    return 'Esa fecha no existe en el calendario.'
  return null
}
</script>

<script setup lang="ts">
import { computed, onMounted, reactive, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useSubmodules } from '@/features/submodules/composables/useSubmodules'
import {
  MEASURE_KIND_MEANING,
  MEASURE_KIND_OPTIONS,
  measureKindLabel,
} from '../composables/limitText'
import type {
  CreateLimitDimensionRequest,
  LimitDimensionResponse,
  LimitMeasureKind,
  UpdateLimitDimensionRequest,
} from '../types/limits.types'

/**
 * El formulario del eje de cupo, en sus dos modos.
 *
 * <p><b>En edición, tres campos desaparecen y en su sitio queda lo que valen
 * ahora, en solo lectura, con el motivo escrito.</b> `UpdateLimitDimensionRequest`
 * solo admite `name`, `subModuleId` y `releaseDelayDays`: el código está copiado
 * en cada cupo ya contratado y el tipo de medida gobierna cómo se cuenta el
 * consumo ya registrado. Dejarlos escribir y que el servidor los descartara en
 * silencio es la forma más barata de que alguien crea haber cambiado algo que
 * sigue igual (R14).
 *
 * <p><b>El catálogo de submódulos se recarga al abrir</b> —regla del proyecto— y
 * mientras carga el desplegable lo dice en su `placeholder`; si falla, un banner
 * rojo con salida a reintentar, nunca una lista vacía que parecería «no hay
 * submódulos».
 */
const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit'
    dimension?: LimitDimensionResponse | null
    saving?: boolean
  }>(),
  { dimension: null, saving: false },
)

const emit = defineEmits<{
  createSubmit: [payload: CreateLimitDimensionRequest]
  updateSubmit: [payload: UpdateLimitDimensionRequest]
  cancel: []
}>()

const codeId = useId()
const nameId = useId()
const measureId = useId()
const subModuleId = useId()
const delayId = useId()
const availableId = useId()

const {
  submodules,
  loading: submodulesLoading,
  error: submodulesError,
  fetchAll: fetchSubmodules,
} = useSubmodules()

const form = reactive({
  code: '',
  name: '',
  measureKind: 'STOCK' as LimitMeasureKind,
  subModuleId: null as number | null,
  releaseDelayDays: '',
  availableFrom: '',
})

const touched = reactive({
  code: false,
  name: false,
  measureKind: false,
  subModuleId: false,
  releaseDelayDays: false,
  availableFrom: false,
})

/** Carga el eje recibido en el formulario. En alta deja los valores en blanco. */
function hydrate(dimension: LimitDimensionResponse | null) {
  form.code = dimension?.code ?? ''
  form.name = dimension?.name ?? ''
  form.measureKind = dimension?.measureKind ?? 'STOCK'
  form.subModuleId = dimension?.subModule?.id ?? null
  form.releaseDelayDays =
    dimension?.releaseDelayDays == null ? '' : String(dimension.releaseDelayDays)
  form.availableFrom = dimension?.availableFrom ?? ''
}

watch(() => props.dimension, hydrate, { immediate: true })

onMounted(() => void fetchSubmodules())

const submoduleOptions = computed(() =>
  submodules.value.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
)

const isCreate = computed(() => props.mode === 'create')

const errors = computed(() => ({
  // En edición estos tres no viajan, así que tampoco se validan: un error sobre
  // un campo que no se puede tocar bloquearía el guardado sin salida posible.
  code: isCreate.value ? validateCode(form.code) : null,
  name: validateName(form.name),
  subModuleId: validateSubModuleId(form.subModuleId),
  releaseDelayDays: validateReleaseDelayDays(form.releaseDelayDays),
  availableFrom: isCreate.value ? validateAvailableFrom(form.availableFrom) : null,
}))

type Field = keyof typeof errors.value

function err(field: Field): string {
  return touched[field] ? (errors.value[field] ?? '') : ''
}

const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))

/**
 * Marca todo como tocado y responde si se puede enviar. El padre aborta y avisa
 * cuando devuelve `false`.
 */
function validate(): boolean {
  touched.code = true
  touched.name = true
  touched.measureKind = true
  touched.subModuleId = true
  touched.releaseDelayDays = true
  touched.availableFrom = true
  return !hasErrors.value
}

/** Vacío se envía como `null`, nunca como `0`: son cosas distintas. */
const releaseDelayDays = computed(() =>
  form.releaseDelayDays.trim() === '' ? null : Number(form.releaseDelayDays.trim()),
)

function submit() {
  if (!validate() || props.saving) return
  if (isCreate.value) {
    emit('createSubmit', {
      code: form.code.trim(),
      name: form.name.trim(),
      measureKind: form.measureKind,
      subModuleId: form.subModuleId,
      releaseDelayDays: releaseDelayDays.value,
      availableFrom: form.availableFrom,
    })
    return
  }
  emit('updateSubmit', {
    name: form.name.trim(),
    subModuleId: form.subModuleId,
    releaseDelayDays: releaseDelayDays.value,
  })
}

/**
 * `true` si hay algo escrito que se perdería al cerrar. Lo consume
 * `useUnsavedChangesGuard` en el alta (FORM-08): salir de la pantalla con el
 * modal abierto y relleno se llevaba lo escrito sin decir nada.
 *
 * <p>En edición se compara contra el eje cargado, no contra el vacío: abrir un
 * expediente y no tocar nada no es tener cambios sin guardar.
 */
function isDirty(): boolean {
  const base = props.dimension
  if (base === null) {
    return (
      form.code.trim() !== '' ||
      form.name.trim() !== '' ||
      form.subModuleId !== null ||
      form.releaseDelayDays.trim() !== '' ||
      form.availableFrom !== ''
    )
  }
  return (
    form.name.trim() !== base.name ||
    form.subModuleId !== (base.subModule?.id ?? null) ||
    releaseDelayDays.value !== base.releaseDelayDays
  )
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <div v-if="submodulesError" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ submodulesError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="fetchSubmodules">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>

    <AppInput
      v-if="isCreate"
      :id="codeId"
      v-model="form.code"
      label="Código"
      required
      mono
      placeholder="PET_COUNT"
      hint="Identificador estable del eje. Se copia a cada cupo contratado, así que después no se podrá cambiar."
      :maxlength="50"
      :error="err('code')"
      @blur="touched.code = true"
    />

    <AppInput
      :id="nameId"
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Mascotas registradas"
      hint="Cómo se lee el eje en las pantallas y en los contratos."
      :maxlength="120"
      :error="err('name')"
      @blur="touched.name = true"
    />

    <AppSelect
      v-if="isCreate"
      :id="measureId"
      v-model="form.measureKind"
      :options="MEASURE_KIND_OPTIONS"
      label="Qué mide"
      required
      :hint="MEASURE_KIND_MEANING[form.measureKind]"
      @blur="touched.measureKind = true"
    />

    <AppSelect
      :id="subModuleId"
      v-model="form.subModuleId"
      :options="submoduleOptions"
      label="Submódulo"
      :placeholder="submodulesLoading ? 'Cargando…' : 'Sin submódulo'"
      hint="Opcional: el submódulo cuyo consumo cuenta este eje. Déjalo vacío si el eje no cuelga de ninguno."
      :error="err('subModuleId')"
      @blur="touched.subModuleId = true"
    />

    <AppInput
      :id="delayId"
      v-model="form.releaseDelayDays"
      label="Días de gracia"
      inputmode="numeric"
      placeholder="30"
      hint="Opcional: días entre liberar cupo y que se note. Vacío significa que no hay gracia declarada, no que sean cero días."
      :error="err('releaseDelayDays')"
      @blur="touched.releaseDelayDays = true"
    />

    <AppInput
      v-if="isCreate"
      :id="availableId"
      v-model="form.availableFrom"
      label="Disponible desde"
      required
      type="date"
      hint="Desde cuándo el eje se puede contratar. Después no se podrá cambiar: habrá cupos atados a ella."
      :error="err('availableFrom')"
      @blur="touched.availableFrom = true"
    />

    <!-- Lo que en edición NO se puede tocar, dicho con su valor y su motivo. -->
    <div v-if="!isCreate && dimension" class="ds-panel ds-stack ds-stack--8">
      <p class="ds-label--xs">Fijado en el alta y ya no editable</p>
      <dl class="ds-detail-grid">
        <dt class="ds-meta">Código</dt>
        <dd class="ds-text-strong codigo">{{ dimension.code }}</dd>
        <dt class="ds-meta">Qué mide</dt>
        <dd class="ds-text-strong">{{ measureKindLabel(dimension.measureKind) }}</dd>
        <dt class="ds-meta">Disponible desde</dt>
        <dd class="ds-text-strong">{{ formatDate(dimension.availableFrom) }}</dd>
      </dl>
      <p class="ds-meta">
        El código está copiado en cada cupo ya contratado y el tipo de medida gobierna cómo se contó
        el consumo que ya existe. Cambiarlos reinterpretaría hacia atrás datos reales, así que el
        endpoint de edición no los admite.
      </p>
    </div>

    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : isCreate ? 'Crear el eje' : 'Guardar los cambios' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.codigo {
  font-family: var(--font-mono);
}
</style>
