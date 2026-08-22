<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBasePermissions } from '../composables/useBasePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { coincide } from '@/composables/text'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBasePermissionRequest } from '../types/base-permissions.types'

const { permissions, loading, error, errorTraceId, fetchAll, create, remove } = useBasePermissions()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof BasePermissionForm> | null>(null)

/** Término de búsqueda. El dueño del estado es la vista; `AppListSearch` rebota. */
const q = ref('')

/**
 * Búsqueda en CLIENTE, y es honesta: `GET /base-permissions` devuelve
 * `List<BasePermissionResponse>` sin paginar, así que el navegador ya tiene el
 * conjunto entero y el filtro es exhaustivo por construcción — regla de
 * honestidad de `docs/ux/patron-de-busqueda-en-listado.md` §5. El día que ese
 * endpoint pase a `PageResponse<T>`, esto deja de valer y la búsqueda tiene que
 * bajar al servidor: filtrar una página en cliente encuentra menos de lo que hay.
 *
 * Filtra sobre `permissions`, que es el contenido del store —lo que la tabla
 * pinta de verdad—, y no sobre una copia del crudo del endpoint.
 *
 * `coincide` pliega acentos, mayúsculas y espacios: con `toLowerCase()` a secas,
 * «gestion» no encontraría «Gestión», que es justo lo que teclea quien va
 * rápido. Es el catálogo más poblado de los cuatro —un permiso por acción y
 * submódulo—, y por eso mira también el submódulo padre: agrupar por él es el
 * corte con el que la gente lo lee.
 */
const filtrados = computed(() =>
  permissions.value.filter((p) =>
    coincide(q.value, p.name, p.code, p.subModule?.name, p.subModule?.code),
  ),
)

/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : filtrados.value.length))

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: CreateBasePermissionRequest) {
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

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el permiso "${name}"?`)
  if (!ok) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Permisos base</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo permiso
      </button>
    </div>

    <!-- El placeholder dice qué campos mira de verdad el predicado. -->
    <AppListSearch
      v-model="q"
      label="Buscar permisos base"
      placeholder="Nombre o código o submódulo padre…"
      :result-count="recuento"
    />

    <AppTable
      :headers="['Nombre', 'Código', 'Submódulo', 'Fecha creación', 'Acciones']"
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
          title="Aún no hay permisos base"
          description="Un permiso base es la acción sobre un submódulo que un rol concede."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nuevo permiso
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="p in filtrados" :key="p.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ p.name }}</td>
        <td class="codigo">{{ p.code }}</td>
        <td>{{ p.subModule?.name ?? '—' }}</td>
        <td class="ds-meta">{{ p.createdDate }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink :to="`/permisos-base/${p.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(p.id, p.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda de §5: el denominador es el número REAL de elementos en
         memoria. El día que el backend trunque la respuesta, dejará de cuadrar
         de forma observable en pantalla en vez de degradar en silencio.

         No se pinta cargando ni bajo un error: «Mostrando 0 de 0» debajo del
         banner de fallo afirma que no hay registros cuando lo cierto es que no
         se pudo preguntar, y durante el esqueleto contradice al esqueleto. -->
    <p v-if="!loading && !error && permissions.length > 0" class="ds-meta">
      Mostrando {{ filtrados.length }} de {{ permissions.length }}
    </p>

    <AppModal :open="showModal" title="Nuevo permiso base" @close="handleClose">
      <BasePermissionForm
        ref="formRef"
        :saving="saving"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>

<style scoped>
/* Sustituye a `text-body-2 font-mono`. `text-body-2` era una utilidad de
   Vuetify (DS-03b) y `font-mono` no existía como clase en ninguna hoja de este
   repo —solo el token `--font-mono`—, así que la columna de código nunca
   llegó a verse monoespaciada. Una sola declaración a propósito: el
   presupuesto FE-08 solo agrupa como duplicados los cuerpos de dos
   declaraciones o más, y esta misma regla vive en cuatro listados. */
.codigo {
  /* El genérico va explícito aunque el token ya lo lleve dentro: ni stylelint
     ni la inspección de IntelliJ pueden mirar dentro de la `var()`. */
  font-family: var(--font-mono), monospace;
}
</style>
