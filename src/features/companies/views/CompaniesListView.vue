<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCompanies } from '../composables/useCompanies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { useQuerySync } from '@/composables/useQuerySync'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import CompanyForm from '../components/CompanyForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateCompanyRequest } from '../types/companies.types'

/**
 * El término y la página viven en la URL: así el listado filtrado se puede
 * compartir por enlace, sobrevive a un F5 y vuelve igual al pulsar «atrás».
 * `useQuerySync` escribe con `replace` y no con `push`, de modo que teclear ocho
 * letras no mete ocho entradas en el historial.
 *
 * Se declara ANTES del composable porque el término inicial se le pasa por
 * argumento; ver el porqué en `useCompanies`.
 */
const filtros = useQuerySync({ q: '', page: '1' }, { debounceMs: 300 }).state

const {
  companies,
  page,
  pageSize,
  total,
  pageCount,
  loading,
  error,
  errorTraceId,
  query,
  reload,
  goTo,
  create,
  remove,
} = useCompanies(filtros.q)
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof CompanyForm> | null>(null)

onMounted(() => goTo(Number(filtros.page) || 1))

// URL → estado. Cubre «atrás»/«adelante» y la entrada directa por enlace.
watch(
  () => filtros.q,
  (valor) => {
    if (valor !== query.value) query.value = valor
  },
)
watch(
  () => filtros.page,
  (valor) => {
    const n = Number(valor) || 1
    if (n !== page.value) void goTo(n)
  },
)
// Estado → URL. `useServerPaged` vuelve solo a la página 1 al cambiar el
// término, así que la URL tiene que seguirle.
watch(page, (n) => {
  filtros.page = String(n)
})

/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : total.value))

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

function buscar(valor: string) {
  filtros.q = valor
  query.value = valor
}

function limpiarBusqueda() {
  buscar('')
}

async function handleDelete(id: number, name: string) {
  const confirmed = await confirm({
    message: `¿Eliminar la empresa "${name}"?`,
    consequence:
      'Se eliminará también su ficha en la plataforma. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar empresa',
  })
  if (!confirmed) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}

async function handleCreate(data: CreateCompanyRequest) {
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
    // siempre.
    saving.value = false
  }
}

function handleClose() {
  if (saving.value) return
  showModal.value = false
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Empresas</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva empresa
      </button>
    </div>

    <!-- Búsqueda SERVIDA, no en cliente: la respuesta es una página, así que
         filtrar en memoria miraría solo las veinte filas visibles y encontraría
         menos de lo que hay. El placeholder dice qué campos mira de verdad el
         backend: nombre o identificador fiscal. -->
    <AppListSearch
      :model-value="filtros.q"
      label="Buscar empresas"
      placeholder="Nombre o NIT…"
      :result-count="recuento"
      @update:model-value="buscar"
    />

    <AppTable
      :headers="['Nombre', 'Identificador', 'Teléfono', 'Estado', 'Fecha creación', 'Acciones']"
      :empty="companies.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="reload"
    >
      <template #empty>
        <!-- Vacío de búsqueda y vacío de verdad son estados DISTINTOS. Quien
             busca quiere encontrar, no dar de alta: la rama de búsqueda no
             lleva el botón de crear, y la de catálogo vacío no dice «sin
             resultados». -->
        <AppEmptyState
          v-if="filtros.q.trim()"
          :title="`Sin resultados para «${filtros.q.trim()}»`"
          description="Revisa la escritura o prueba con menos palabras."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="limpiarBusqueda">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <AppEmptyState
          v-else
          title="Aún no hay empresas"
          description="Cada empresa es un cliente de la plataforma, con sus sedes y sus empleados."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nueva empresa
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="company in companies" :key="company.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ company.name }}</td>
        <td>{{ company.identifier }}</td>
        <td>{{ company.contactNumber }}</td>
        <td>
          <!-- H6: `enabled` venía en la respuesta desde siempre y no se pintaba
               en ninguna pantalla. En la única vista que existe para saber qué
               tenants están vivos, uno suspendido se veía igual que uno al
               corriente. -->
          <AppBadge
            :variant="company.enabled ? 'neutral' : 'warning'"
            :label="company.enabled ? 'Activa' : 'Deshabilitada'"
          />
        </td>
        <td class="ds-meta">{{ company.createdDate }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink :to="`/empresas/${company.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(company.id, company.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- No se pinta bajo un banner de error: «Mostrando 0–0 de 0» diría que no
         hay registros cuando lo cierto es que no se pudo preguntar. -->
    <AppPagination
      v-if="!loading && !error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="goTo"
    />

    <AppModal :open="showModal" title="Nueva empresa" @close="handleClose">
      <CompanyForm ref="formRef" :saving="saving" @submit="handleCreate" @cancel="handleClose" />
    </AppModal>
  </AppLayout>
</template>
