<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { selection } from '@/composables/validators'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ICONS } from '@/constants/icons'
import { membershipsApi } from '@/features/memberships/api/memberships.api'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { MembershipResponse } from '@/features/memberships/types/memberships.types'
import type { SubModuleResponse } from '@/features/submodules/types/submodules.types'
import type {
  MembershipSubModuleResponse,
  CreateMembershipSubModuleRequest,
} from '../types/membership-sub-modules.types'

const props = defineProps<{
  initial?: MembershipSubModuleResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipSubModuleRequest]
  cancel: []
}>()

const { errorFrom } = useToast()

const form = ref<CreateMembershipSubModuleRequest>({ membershipId: 0, subModuleId: 0 })
const submitted = ref(false)
const memberships = ref<MembershipResponse[]>([])
const submodules = ref<SubModuleResponse[]>([])

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

const cargandoCatalogos = ref(false)

/**
 * Mensaje del fallo al traer los dos catálogos que llenan los desplegables.
 *
 * Es la misma enfermedad que EST-06 cerró en los listados, pero un escalón más
 * abajo: si un `listAll()` fallaba, el `await` reventaba sin `catch`, el modal
 * salía con los dos desplegables VACÍOS y nadie decía nada. El usuario concluía
 * que no hay membresías ni submódulos dados de alta — y desde FORM-06 el
 * formulario le exige además elegir uno («Debes seleccionar la membresía.»),
 * así que era imposible de completar y sin una sola pista de por qué.
 *
 * El aviso efímero NO basta aquí: se va a los nueve segundos y los desplegables
 * siguen vacíos. Por eso el mensaje se queda en pantalla, con su reintento.
 */
const catalogoError = ref<string | null>(null)

const membershipOptions = computed(() =>
  memberships.value.map((m) => ({ value: m.id, label: m.name })),
)
const submoduleOptions = computed(() =>
  submodules.value.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
)

/**
 * FORM-06: `selection()` da por válida cualquier cifra, y este formulario usa
 * el 0 como «sin seleccionar» (ningún id del backend es 0). Se traduce a `null`
 * para que el validador vea lo mismo que ve el usuario: un desplegable vacío.
 */
function elegido(id: number): number | null {
  return id > 0 ? id : null
}

// `@NotNull` de `CreateMembershipSubModuleRequest` en el backend, en los dos campos.
const errors = computed(() => ({
  membershipId: selection(elegido(form.value.membershipId), 'la membresía'),
  subModuleId: selection(elegido(form.value.subModuleId), 'el submódulo'),
}))

async function cargarCatalogos() {
  cargandoCatalogos.value = true
  catalogoError.value = null
  try {
    const [membresias, submodulos] = await Promise.all([
      membershipsApi.listAll(),
      submodulesApi.listAll(),
    ])
    memberships.value = membresias
    submodules.value = submodulos
    if (!props.initial) {
      const firstMembership = membresias[0]
      const firstSubmodule = submodulos[0]
      if (firstMembership) form.value.membershipId = firstMembership.id
      if (firstSubmodule) form.value.subModuleId = firstSubmodule.id
    }
    // FORM-08: la preselección de arriba es del formulario, no del usuario. Si
    // no se rebasa la referencia, un modal recién abierto ya se declara «sucio»
    // y el aviso de cambios sin guardar salta sin que nadie haya escrito nada.
    // Va DENTRO del `try`: si la carga falla no se ha tocado nada, y rebasarla
    // ahí daría por bueno un estado que no es el que el usuario dejó.
    baseline.value = JSON.stringify(form.value)
  } catch (e) {
    // El objeto de error se conserva y se le pasa entero a `errorFrom`: escribir
    // el texto a mano en el `catch` tiraría el `X-Trace-Id` que trae la
    // respuesta, que es lo único con lo que se puede rastrear el fallo.
    catalogoError.value = getProblemDetailMessage(
      e,
      'No se pudieron cargar las membresías y los submódulos.',
    )
    errorFrom('Error al cargar los catálogos', e)
  } finally {
    cargandoCatalogos.value = false
  }
}

onMounted(cargarCatalogos)

watch(
  () => props.initial,
  (val) => {
    form.value = {
      membershipId: val?.membership?.id ?? 0,
      subModuleId: val?.subModule?.id ?? 0,
    }
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
    <!-- Persistente y con salida: el desplegable vacío no se explica solo. -->
    <p v-if="catalogoError" class="ds-banner ds-banner--error ds-banner--sm" role="alert">
      <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ catalogoError }}</span>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="cargandoCatalogos"
        @click="cargarCatalogos"
      >
        <component :is="ICONS.RETRY" :size="13" />
        Reintentar
      </button>
    </p>

    <AppSelect
      v-model="form.membershipId"
      label="Membresía"
      required
      :options="membershipOptions"
      :placeholder="cargandoCatalogos ? 'Cargando…' : undefined"
      :error="submitted ? errors.membershipId : undefined"
    />
    <AppSelect
      v-model="form.subModuleId"
      label="Submódulo"
      required
      :options="submoduleOptions"
      :placeholder="cargandoCatalogos ? 'Cargando…' : undefined"
      :error="submitted ? errors.subModuleId : undefined"
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
