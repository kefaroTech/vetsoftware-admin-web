<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMemberships } from '../composables/useMemberships'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { coincide } from '@/composables/text'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import MembershipStatusBadge from '../components/MembershipStatusBadge.vue'
import MembershipForm from '../components/MembershipForm.vue'
import { ICONS } from '@/constants/icons'
import { MEMBERSHIP_STATUS_LABELS } from '../types/memberships.types'
import type { CreateMembershipRequest } from '../types/memberships.types'

const { memberships, loading, error, errorTraceId, fetchAll, create, remove } = useMemberships()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof MembershipForm> | null>(null)

/**
 * Búsqueda EN CLIENTE, y no servida, por la regla de honestidad de
 * `docs/ux/patron-de-busqueda-en-listado.md` §5: `GET /memberships` devuelve
 * `List<MembershipResponse>` sin paginar, así que el navegador ya tiene el
 * conjunto entero y filtrarlo en memoria es exhaustivo por construcción. El día
 * que ese endpoint pase a `PageResponse<T>`, esto se convierte en una mentira
 * —filtraría solo la página visible— y la búsqueda tiene que bajar al servidor
 * en el MISMO PR que la paginación.
 */
const q = ref('')

/**
 * Mira los TRES campos que la tabla pinta, y el estado por su etiqueta visible
 * («Activa») y no por el valor del enum («ACTIVE»): quien busca teclea lo que
 * ve. El `placeholder` del campo dice exactamente esto.
 *
 * El plegado de acentos lo pone `coincide`: con `toLowerCase().includes()`,
 * «membresia» no encontraría «Membresía».
 */
const filtradas = computed(() =>
  memberships.value.filter((m) =>
    coincide(q.value, m.name, MEMBERSHIP_STATUS_LABELS[m.status], m.createdDate),
  ),
)

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: CreateMembershipRequest) {
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
  const ok = await confirm(`¿Eliminar la membresía "${name}"?`)
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
      <h1 class="ds-title">Membresías</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva membresía
      </button>
    </div>

    <!-- El placeholder dice qué campos mira de verdad el predicado de arriba. -->
    <AppListSearch
      v-model="q"
      label="Buscar membresías"
      placeholder="Nombre, estado o fecha…"
      :result-count="loading ? null : filtradas.length"
    />

    <AppTable
      :headers="['Nombre', 'Estado', 'Fecha creación', 'Acciones']"
      :empty="filtradas.length === 0"
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
          title="Aún no hay membresías"
          description="Cada membresía es el plan que decide qué submódulos puede usar una empresa."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nueva membresía
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="m in filtradas" :key="m.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ m.name }}</td>
        <td><MembershipStatusBadge :status="m.status" /></td>
        <td class="ds-meta">{{ m.createdDate }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink :to="`/membresias/${m.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(m.id, m.name)"
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
    <p v-if="!loading && !error && memberships.length > 0" class="ds-meta">
      Mostrando {{ filtradas.length }} de {{ memberships.length }}
    </p>

    <AppModal :open="showModal" title="Nueva membresía" @close="handleClose">
      <MembershipForm ref="formRef" :saving="saving" @submit="handleCreate" @cancel="handleClose" />
    </AppModal>
  </AppLayout>
</template>
