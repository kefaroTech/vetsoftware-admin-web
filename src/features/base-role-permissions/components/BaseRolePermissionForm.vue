<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { selection } from '@/composables/validators'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ICONS } from '@/constants/icons'
import { baseRolesApi } from '@/features/base-roles/api/base-roles.api'
import { basePermissionsApi } from '@/features/base-permissions/api/base-permissions.api'
import type { BaseRoleResponse } from '@/features/base-roles/types/base-roles.types'
import type { BasePermissionResponse } from '@/features/base-permissions/types/base-permissions.types'
import type {
  BaseRolePermissionResponse,
  CreateBaseRolePermissionRequest,
} from '../types/base-role-permissions.types'

const props = defineProps<{
  initial?: BaseRolePermissionResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRolePermissionRequest]
  cancel: []
}>()

const { errorFrom } = useToast()

const form = ref<CreateBaseRolePermissionRequest>({ baseRoleId: 0, basePermissionId: 0 })
const submitted = ref(false)
const baseRoles = ref<BaseRoleResponse[]>([])
const basePermissions = ref<BasePermissionResponse[]>([])

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

const cargandoCatalogos = ref(false)

/**
 * Mensaje del fallo al traer los dos catálogos que llenan los desplegables.
 *
 * Es la misma enfermedad que EST-06 cerró en los listados, pero un escalón más
 * abajo: si un `listAll()` fallaba, el `await` reventaba sin `catch`, el modal
 * salía con los dos desplegables VACÍOS y nadie decía nada. El usuario concluía
 * que no hay roles ni permisos dados de alta — y desde FORM-06 el formulario le
 * exige además elegir uno («Debes seleccionar el rol base.»), así que era
 * imposible de completar y sin una sola pista de por qué.
 *
 * El aviso efímero NO basta aquí: se va a los nueve segundos y los desplegables
 * siguen vacíos. Por eso el mensaje se queda en pantalla, con su reintento.
 */
const catalogoError = ref<string | null>(null)

const roleOptions = computed(() =>
  baseRoles.value.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
)
const permissionOptions = computed(() =>
  basePermissions.value.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
)

/**
 * FORM-06: `selection()` da por válida cualquier cifra, y este formulario usa
 * el 0 como «sin seleccionar» (ningún id del backend es 0). Se traduce a `null`
 * para que el validador vea lo mismo que ve el usuario: un desplegable vacío.
 */
function elegido(id: number): number | null {
  return id > 0 ? id : null
}

// `@NotNull` de `CreateBaseRolePermissionRequest` en el backend, en los dos campos.
const errors = computed(() => ({
  baseRoleId: selection(elegido(form.value.baseRoleId), 'el rol base'),
  basePermissionId: selection(elegido(form.value.basePermissionId), 'el permiso base'),
}))

async function cargarCatalogos() {
  cargandoCatalogos.value = true
  catalogoError.value = null
  try {
    const [roles, permisos] = await Promise.all([
      baseRolesApi.listAll(),
      basePermissionsApi.listAll(),
    ])
    baseRoles.value = roles
    basePermissions.value = permisos
    if (!props.initial) {
      const firstRole = roles[0]
      const firstPerm = permisos[0]
      if (firstRole) form.value.baseRoleId = firstRole.id
      if (firstPerm) form.value.basePermissionId = firstPerm.id
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
      'No se pudieron cargar los roles y permisos base.',
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
      baseRoleId: val?.baseRole?.id ?? 0,
      basePermissionId: val?.basePermission?.id ?? 0,
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
      v-model="form.baseRoleId"
      label="Rol base"
      required
      :options="roleOptions"
      :placeholder="cargandoCatalogos ? 'Cargando…' : undefined"
      :error="submitted ? errors.baseRoleId : undefined"
    />
    <AppSelect
      v-model="form.basePermissionId"
      label="Permiso base"
      required
      :options="permissionOptions"
      :placeholder="cargandoCatalogos ? 'Cargando…' : undefined"
      :error="submitted ? errors.basePermissionId : undefined"
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
