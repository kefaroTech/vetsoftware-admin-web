<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useCompanies } from '../composables/useCompanies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { useQuerySync } from '@/composables/useQuerySync'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import CompanyForm from '../components/CompanyForm.vue'
import {
  isPlatformSetupProblem,
  stepsFlaggedByServer,
} from '@/features/platform-setup/composables/usePlatformSetup'
import type { PlatformSetupStepId } from '@/features/platform-setup/types/platform-setup.types'
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

/**
 * §3.7 · El alta de una empresa falla mientras el catálogo comercial no esté
 * sembrado: el backend rechaza la petición con `PLATFORM_CATALOG_NOT_CONFIGURED`
 * porque el contrato inicial y la empresa nacen en la misma transacción
 * (`ProvisionCompanyService`), y sin catálogo no hay contrato que firmar.
 *
 * Cuando eso ocurre, el modal deja de pedir datos y **pinta la misma lista de
 * pasos, con las mismas palabras**, que la pantalla de catálogo. Es lo que
 * cierra el círculo: si el servidor enumerase lo que falta con otras palabras
 * que la pantalla donde se arregla, el operador creería que son dos problemas
 * distintos (GOV.UK, *Validation pattern*).
 *
 * El formulario no se desmonta —va con `v-show`—: lo escrito sigue ahí cuando se
 * vuelve a él, igual que en cualquier otro fallo del alta (FORM-08).
 */
const setupBlocked = ref(false)
const flaggedSteps = ref<PlatformSetupStepId[]>([])
const checklistRef = ref<InstanceType<typeof PlatformSetupChecklist> | null>(null)

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
    setupBlocked.value = false
  } catch (e) {
    // El composable ya avisó del fallo con su traza; el modal sigue abierto con
    // lo escrito. Lo único que se añade aquí es la explicación accionable del
    // único fallo que no depende de lo que el operador escribió.
    if (isPlatformSetupProblem(e)) {
      flaggedSteps.value = stepsFlaggedByServer(e)
      setupBlocked.value = true
      // El foco va al `<h2>` de lo que hay que hacer ahora, no al botón de
      // guardar que acaba de dejar de servir ni al principio del documento
      // (§5.1). `nextTick` porque la lista aún no está en el DOM.
      await nextTick()
      checklistRef.value?.focus()
    }
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
  setupBlocked.value = false
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
      caption="Empresas"
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
        <td class="ds-meta">{{ formatDate(company.createdDate) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink
              :to="`/empresas/${company.id}`"
              class="ds-icon-btn"
              :aria-label="`Editar ${company.name}`"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Eliminar ${company.name}`"
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
      <div v-if="setupBlocked" class="ds-stack ds-stack--16">
        <PlatformSetupChecklist ref="checklistRef" :flagged="flaggedSteps" />
        <div class="ds-actions">
          <button type="button" class="ds-btn ds-btn--ghost" @click="setupBlocked = false">
            Volver al formulario
          </button>
        </div>
      </div>
      <CompanyForm
        v-show="!setupBlocked"
        ref="formRef"
        :saving="saving"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>
