<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { length, selection } from '@/composables/validators'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ICONS } from '@/constants/icons'
import { speciesApi } from '@/features/species/api/species.api'
import type { SpecieResponse } from '@/features/species/types/species.types'
import type { AnimalColorResponse, CreateAnimalColorRequest } from '../types/animal-colors.types'

const props = defineProps<{
  initial?: AnimalColorResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateAnimalColorRequest]
  cancel: []
}>()

const { errorFrom } = useToast()

/** Estado inicial vacío. `specieId: 0` es el «sin elegir» de este formulario. */
function emptyForm(): CreateAnimalColorRequest {
  return { name: '', specieId: 0 }
}

const form = ref<CreateAnimalColorRequest>(emptyForm())
const submitted = ref(false)
const availableSpecies = ref<SpecieResponse[]>([])

/** Carga del catálogo en vuelo, para el `placeholder="Cargando…"` del select. */
const cargandoEspecies = ref(false)

/**
 * Mensaje del último fallo al traer el catálogo de especies. Un aviso efímero no
 * basta: se va a los nueve segundos y el desplegable sigue vacío, mientras
 * FORM-06 exige elegir una especie que no está. El banner se queda en pantalla y
 * ofrece reintentar. Es la misma enfermedad que EST-06 cerró en los listados,
 * aquí en el desplegable.
 */
const catalogoError = ref<string | null>(null)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

const specieOptions = computed(() =>
  availableSpecies.value.map((s) => ({ value: s.id, label: s.name })),
)

// `@NotBlank` + `@Size(max = 100)` en `name` y `@NotNull` en `specieId`, de
// `CreateAnimalColorRequest`. El `|| null` NO es adorno: `selection` solo trata
// como vacíos `null`, `undefined` y la cadena vacía, así que el 0 de «sin
// elegir» pasaría por válido y el formulario enviaría `specieId: 0` al servidor.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del color', 2, 100),
  specieId: selection(form.value.specieId || null, 'la especie'),
}))

async function cargarEspecies() {
  cargandoEspecies.value = true
  catalogoError.value = null
  try {
    const data = await speciesApi.listAll()
    availableSpecies.value = data
    const first = data[0]
    if (!props.initial && first) {
      form.value.specieId = first.id
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
    //
    // El fallo NO toca `form` ni `baseline`, así que un catálogo caído no deja
    // el formulario marcado como sucio ni dispara el guarda de FORM-08.
    catalogoError.value = getProblemDetailMessage(e, 'No se pudieron cargar las especies')
    errorFrom('Error al cargar las especies', e)
  } finally {
    cargandoEspecies.value = false
  }
}

onMounted(cargarEspecies)

watch(
  () => props.initial,
  (val) => {
    // También cuando `val` es nulo: el modal de creación se reutiliza tras
    // haber editado, y sin este reseteo reabriría con lo de la ficha anterior.
    form.value = val ? { name: val.name, specieId: val.specie?.id ?? 0 } : emptyForm()
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
      placeholder="Negro"
      :error="submitted ? errors.name : undefined"
    />
    <!-- El desplegable vacío no explica por qué está vacío. Todo sale de
         primitivas `ds-*`: esto no añade ni una regla de estilo propia. -->
    <p v-if="catalogoError" class="ds-banner ds-banner--error ds-banner--sm" role="alert">
      <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ catalogoError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="cargarEspecies">
        <component :is="ICONS.RETRY" :size="13" />
        Reintentar
      </button>
    </p>
    <AppSelect
      v-model="form.specieId"
      label="Especie"
      required
      :options="specieOptions"
      :placeholder="cargandoEspecies ? 'Cargando…' : undefined"
      :error="submitted ? errors.specieId : undefined"
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
