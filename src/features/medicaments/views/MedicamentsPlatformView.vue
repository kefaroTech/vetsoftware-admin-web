<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePlatformMedicaments } from '../composables/usePlatformMedicaments'
import { useQuerySync } from '@/composables/useQuerySync'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * «Medicamentos en toda la plataforma»: el vademécum global más lo que cada
 * empresa da de alta por su cuenta.
 *
 * Existe para responder a una sola pregunta —**qué están creando los tenants
 * por su cuenta**—, que es donde se ve lo que falta en el catálogo global y lo
 * que se está duplicando con veinte grafías distintas. Es una lente de
 * consulta, no un puesto de trabajo, y por eso **no tiene ni una acción en
 * ninguna fila**: ni sobre las de empresa, porque no hay nada legítimo que
 * hacer con el dato de un tenant desde aquí, ni sobre las globales, porque esa
 * misma fila ya es editable en la pantalla principal y duplicar el afordance
 * crea dos caminos a la misma mutación.
 *
 * Tampoco lleva controles deshabilitados: un botón apagado no explica si falta
 * permiso, si la fila está bloqueada o si la consola está rota, y además un
 * `<button disabled>` no es enfocable, así que quien navega con teclado no
 * recibe el «no disponible» — recibe silencio.
 */
const filtros = useQuerySync({ q: '', page: '1' }, { debounceMs: 300 }).state

const {
  medicaments,
  page,
  pageSize,
  total,
  pageCount,
  loading,
  error,
  errorTraceId,
  query,
  goTo,
  reload,
} = usePlatformMedicaments(filtros.q)

const termino = computed(() => filtros.q.trim())
/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : total.value))

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
watch(page, (n) => {
  filtros.page = String(n)
})

function buscar(valor: string) {
  filtros.q = valor
  query.value = valor
}
</script>

<template>
  <AppLayout>
    <div class="ds-detail-head">
      <RouterLink :to="{ name: ROUTE_NAMES.MEDICAMENTS_LIST }" class="ds-btn ds-btn--ghost">
        <component :is="ICONS.BACK" :size="15" aria-hidden="true" />
        Volver
      </RouterLink>
      <h1 class="ds-title">Medicamentos en toda la plataforma</h1>
    </div>

    <!-- El aviso de alcance va UNA vez y arriba. Es lo que hace innecesarios
         los «Solo lectura» por fila, que serían la misma frase multiplicada por
         el número de filas y anunciada en cada una por el lector de pantalla. -->
    <p class="ds-banner ds-banner--info ds-banner--sm aviso" role="note">
      <component :is="ICONS.INFO" :size="14" class="ds-banner-icon" aria-hidden="true" />
      <span>
        Esta vista reúne el vademécum global y los medicamentos que cada empresa da de alta por su
        cuenta. Es de solo lectura: los globales se administran en «Catálogo de medicamentos» y los
        de una empresa los gestiona su propia clínica.
      </span>
    </p>

    <AppListSearch
      :model-value="filtros.q"
      label="Buscar medicamentos en la plataforma"
      placeholder="Nombre del medicamento…"
      :result-count="recuento"
      @update:model-value="buscar"
    />

    <AppTable
      :headers="['Medicamento', 'Descripción', 'Ámbito', 'Fecha creación']"
      :empty="medicaments.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="reload"
    >
      <template #empty>
        <AppEmptyState
          v-if="termino"
          :title="`Sin resultados para «${termino}»`"
          description="Revisa la escritura o prueba con menos palabras. La búsqueda no distingue mayúsculas ni acentos."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="buscar('')">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <!-- La salida del vacío real existe, pero NO es «crear»: desde esta
             vista no se crea nada y ofrecerlo sería enseñar el camino
             equivocado. -->
        <AppEmptyState
          v-else
          title="Aún no hay medicamentos en la plataforma"
          description="Aquí aparecen el vademécum global y lo que cada empresa da de alta por su cuenta."
        >
          <RouterLink :to="{ name: ROUTE_NAMES.MEDICAMENTS_LIST }" class="ds-btn ds-btn--ghost">
            Ir al catálogo global
          </RouterLink>
        </AppEmptyState>
      </template>

      <tr v-for="m in medicaments" :key="m.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ m.name }}</td>
        <td class="ds-meta">{{ m.description || '—' }}</td>
        <td>
          <!-- Los dos ámbitos se diferencian por TEXTO y no solo por color
               (WCAG 2.2 §1.4.1). La empresa NO lleva píldora: para el tenant
               «Propio» es un estado, pero aquí es un dato distinto por fila, y
               veinte píldoras con veinte nombres convierten la columna en
               confeti y destruyen justo lo que la píldora aporta — que
               «Global» salte a la vista. Hay un estado singular y muchos
               datos, y la asimetría es intencionada.
               Fallback: sin empresa y sin `general` se pinta «—», nunca
               «Global»: el ámbito global no se INFIERE de la ausencia de
               empresa. -->
          <span v-if="m.general" class="ds-pill ds-tone--accent-soft">
            <component :is="ICONS.GLOBE" :size="14" aria-hidden="true" />
            Global
          </span>
          <template v-else-if="m.company">
            <span class="ds-text-strong">{{ m.company.name }}</span>
            <span class="ds-meta nit">NIT {{ m.company.identifier }}</span>
          </template>
          <span v-else class="ds-meta">—</span>
        </td>
        <td class="ds-meta">{{ formatDate(m.createdDate) }}</td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!loading && !error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="goTo"
    />
  </AppLayout>
</template>

<style scoped>
.aviso {
  margin: 0 0 var(--space-16);
}

/* El NIT va bajo el nombre, no al lado: es el dato secundario de la celda. */
.nit {
  display: block;
}
</style>
