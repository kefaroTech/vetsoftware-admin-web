<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { length, selection } from '@/composables/validators'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ICONS } from '@/constants/icons'
import { modulesApi } from '@/features/modules/api/modules.api'
import type { ModuleResponse } from '@/features/modules/types/modules.types'
import type { SubModuleResponse, CreateSubModuleRequest } from '../types/submodules.types'

const props = defineProps<{
  initial?: SubModuleResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateSubModuleRequest]
  cancel: []
}>()

const { errorFrom } = useToast()

/** Estado inicial vacío. `moduleId: 0` es el «sin elegir» de este formulario. */
function emptyForm(): CreateSubModuleRequest {
  return { name: '', code: '', moduleId: 0 }
}

const form = ref<CreateSubModuleRequest>(emptyForm())
const submitted = ref(false)
const availableModules = ref<ModuleResponse[]>([])

/** Carga del catálogo en vuelo, para el `placeholder="Cargando…"` del select. */
const cargandoModulos = ref(false)

/**
 * Mensaje del último fallo al traer el catálogo de módulos. Un aviso efímero no
 * basta: se va a los nueve segundos y el desplegable sigue vacío, mientras
 * FORM-06 exige elegir un módulo que no está. El banner se queda en pantalla y
 * ofrece reintentar. Es la misma enfermedad que EST-06 cerró en los listados,
 * aquí en el desplegable.
 */
const catalogoError = ref<string | null>(null)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

const moduleOptions = computed(() =>
  availableModules.value.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
)

// `@NotBlank` + `@Size(max = …)` + `@NotNull` de `CreateSubModuleRequest`.
// El `|| null` NO es adorno: `selection` solo trata como vacíos `null`,
// `undefined` y la cadena vacía, así que el 0 de «sin elegir» pasaría por
// válido y el formulario enviaría `moduleId: 0` al servidor.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del submódulo', 2, 100),
  code: length(form.value.code, 'El código del submódulo', 2, 50),
  moduleId: selection(form.value.moduleId || null, 'el módulo'),
}))

async function cargarModulos() {
  cargandoModulos.value = true
  catalogoError.value = null
  try {
    const data = await modulesApi.listAll()
    availableModules.value = data
    const first = data[0]
    if (!props.initial && first) {
      form.value.moduleId = first.id
      // El valor por defecto lo pone el formulario, no el usuario. Sin refrescar
      // la línea base, `isDirty()` daría cierto nada más abrir el modal y el
      // guarda de FORM-08 pediría confirmación sin que nadie haya escrito nada.
      baseline.value = JSON.stringify(form.value)
    }
  } catch (e) {
    // Se conserva el OBJETO de error: `errorFrom` saca el mensaje del
    // `ProblemDetail` y arrastra el `X-Trace-Id`. Escribir el texto a mano en
    // este `catch` tiraría la traza, que es lo único con lo que alguien puede
    // reportar el fallo después.
    catalogoError.value = getProblemDetailMessage(e, 'No se pudieron cargar los módulos')
    errorFrom('Error al cargar los módulos', e)
  } finally {
    cargandoModulos.value = false
  }
}

onMounted(cargarModulos)

watch(
  () => props.initial,
  (val) => {
    // También cuando `val` es nulo: el modal de creación se reutiliza tras
    // haber editado, y sin este reseteo reabriría con lo de la ficha anterior.
    form.value = val
      ? { name: val.name, code: val.code, moduleId: val.module?.id ?? 0 }
      : emptyForm()
    submitted.value = false
    baseline.value = JSON.stringify(form.value)
  },
  { immediate: true },
)

/** FORM-08: lo consulta el padre desde `useUnsavedChangesGuard`. */
function isDirty() {
  return JSON.stringify(form.value) !== baseline.value
}

function submit() {
  if (props.saving) return
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
}

defineExpose({ isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" novalidate @submit.prevent="submit">
    <AppInput
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Gestión de citas"
      :error="submitted ? errors.name : undefined"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="APPOINTMENTS_MANAGE"
      :error="submitted ? errors.code : undefined"
    />
    <!-- El desplegable vacío no explica por qué está vacío. Todo sale de
         primitivas `ds-*`: esto no añade ni una regla de estilo propia. -->
    <p v-if="catalogoError" class="ds-banner ds-banner--error ds-banner--sm" role="alert">
      <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ catalogoError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="cargarModulos">
        <component :is="ICONS.RETRY" :size="13" />
        Reintentar
      </button>
    </p>
    <AppSelect
      v-model="form.moduleId"
      label="Módulo padre"
      required
      :options="moduleOptions"
      :placeholder="cargandoModulos ? 'Cargando…' : undefined"
      :error="submitted ? errors.moduleId : undefined"
    />
    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>
