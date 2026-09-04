<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBaseRolePermissions } from '../composables/useBaseRolePermissions'
import { useAdminPermissionPublish } from '../composables/useAdminPermissionPublish'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { coincide } from '@/composables/text'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import BaseRolePermissionForm from '../components/BaseRolePermissionForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBaseRolePermissionRequest } from '../types/base-role-permissions.types'

const { baseRolePermissions, loading, error, errorTraceId, fetchAll, create, remove } =
  useBaseRolePermissions()
const { publish, isPublishing } = useAdminPermissionPublish()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof BaseRolePermissionForm> | null>(null)

/**
 * Búsqueda EN CLIENTE, y no servida, por la regla de honestidad de
 * `docs/ux/patron-de-busqueda-en-listado.md` §5: `GET /base-role-permissions`
 * devuelve `List<BaseRolePermissionResponse>` sin paginar, así que el navegador
 * ya tiene el conjunto entero y filtrarlo en memoria es exhaustivo por
 * construcción. El día que ese endpoint pase a `PageResponse<T>`, esto se
 * convierte en una mentira —filtraría solo la página visible— y la búsqueda
 * tiene que bajar al servidor en el MISMO PR que la paginación.
 */
const q = ref('')

/**
 * Mira el nombre y el código de las DOS entidades relacionadas, que es lo que
 * identifica una asociación; el id no se busca porque no es lo que el usuario
 * lee en la tabla. El `placeholder` del campo dice exactamente esto.
 *
 * El plegado de acentos lo pone `coincide`: con `toLowerCase().includes()`,
 * «gestion» no encontraría «Gestión».
 */
const filtrados = computed(() =>
  baseRolePermissions.value.filter((p) =>
    coincide(
      q.value,
      p.baseRole?.name,
      p.baseRole?.code,
      p.basePermission?.name,
      p.basePermission?.code,
    ),
  ),
)

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: CreateBaseRolePermissionRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await create(data)
    showModal.value = false
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
  } finally {
    // FORM-09: AQUÍ y no dentro del `try`. Si se pone tras el `await`, el
    // camino de error nunca lo ejecuta y el botón queda deshabilitado para
    // siempre: el mismo daño que FORM-08, causado por el arreglo de FORM-09.
    saving.value = false
  }
}

function handleClose() {
  if (saving.value) return
  showModal.value = false
}

async function handleDelete(id: number) {
  const ok = await confirm('¿Eliminar esta asociación rol-permiso?')
  if (!ok) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}

async function handlePublish() {
  const ok = await confirm(
    'Esto sincronizará el rol ADMIN de todas las companies con el catálogo actual de permisos. ¿Continuar?',
  )
  if (ok) await publish()
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Permisos de roles base</h1>
      <div class="ds-flex-row">
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="isPublishing"
          @click="handlePublish"
        >
          {{ isPublishing ? 'Publicando…' : 'Publicar permisos a ADMIN' }}
        </button>
        <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
          <component :is="ICONS.ADD" :size="15" />
          Nueva asociación
        </button>
      </div>
    </div>

    <!-- El placeholder dice qué campos mira de verdad el predicado de arriba. -->
    <AppListSearch
      v-model="q"
      label="Buscar permisos de roles base"
      placeholder="Rol, permiso o sus códigos…"
      :result-count="loading ? null : filtrados.length"
    />

    <AppTable
      caption="Permisos de roles base"
      :headers="['Rol base', 'Permiso base', 'Fecha creación', 'Acciones']"
      :empty="filtrados.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="fetchAll"
    >
      <template #empty>
        <!-- Vacío de búsqueda y vacío de verdad son estados DISTINTOS (§4).
             Quien busca quiere encontrar, no dar de alta: la rama de búsqueda
             no lleva el botón de crear, y la de catálogo vacío no dice «sin
             resultados». -->
        <AppEmptyState
          v-if="q.trim()"
          :title="`Sin resultados para «${q.trim()}»`"
          description="Revisa la escritura o prueba con menos palabras."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="q = ''">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <AppEmptyState
          v-else
          title="Aún no hay asociaciones rol-permiso"
          description="Define qué permisos hereda el rol ADMIN de cada empresa nueva."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nueva asociación
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="p in filtrados" :key="p.id" class="ds-row-hover">
        <td>{{ p.baseRole?.name ?? '—' }}</td>
        <td>{{ p.basePermission?.name ?? '—' }}</td>
        <td class="ds-meta">{{ formatDate(p.createdDate) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink
              :to="`/permisos-roles-base/${p.id}`"
              class="ds-icon-btn"
              :aria-label="`Editar ${p.basePermission?.name ?? '—'} del rol ${p.baseRole?.name ?? '—'}`"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Eliminar ${p.basePermission?.name ?? '—'} del rol ${p.baseRole?.name ?? '—'}`"
              @click="handleDelete(p.id)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda de §5: el segundo número es el total REAL en memoria. El día
         que el backend trunque la respuesta dejará de coincidir con la realidad
         de forma observable aquí, en vez de degradar en silencio.

         No se pinta durante la carga ni bajo un error: «Mostrando 0 de 0» bajo
         el banner de fallo afirmaría que no hay registros cuando lo cierto es
         que no se pudo preguntar. -->
    <p v-if="!loading && !error && baseRolePermissions.length > 0" class="ds-meta">
      Mostrando {{ filtrados.length }} de {{ baseRolePermissions.length }}
    </p>

    <AppModal :open="showModal" title="Nueva asociación rol-permiso" @close="handleClose">
      <BaseRolePermissionForm
        ref="formRef"
        :saving="saving"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>
