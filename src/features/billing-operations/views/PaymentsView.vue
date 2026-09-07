<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import PaymentsAdvancedFilters from '../components/PaymentsAdvancedFilters.vue'
import PaymentsTable from '../components/PaymentsTable.vue'
import { usePlatformPayments } from '../composables/useBillingOperations'

/**
 * **Cobrar**: los pagos recibidos, en el feed global de la plataforma.
 *
 * <p><b>De solo consulta, por una razón de contrato convertida en decisión de
 * diseño.</b> Registrar un pago, conciliarlo y cambiarle el estado resuelven la
 * empresa con `Authz.currentCompanyId()` y exigen la cabecera `X-Company-Id`.
 * Ofrecerlos aquí obligaría a que la empresa fuera implícita — el mecanismo con
 * El que se le aplica un cobro a la empresa equivocada. Esas tres acciones viven
 * En el expediente del contrato, donde la empresa es visible y permanente.
 *
 * <p><b>El filtro de estado, fecha y antigüedad los resuelve el
 * SERVIDOR</b>, igual que el filtro por empresa: cuando no hay resultados,
 * «ninguno» es verdad sobre el total y no sobre una página. Filtrar en cliente
 * La página cargada encuentra menos de lo que hay: el `PENDING` más viejo puede vivir en cualquier página.
 */
const {
  items,
  page,
  pageSize,
  total,
  pageCount,
  loading,
  error,
  errorTraceId,
  companyId,
  filter,
  exporting,
  reload,
  goTo,
  applyCompanyFilter,
  applyFilter,
  clearFilters,
  exportCsv,
} = usePlatformPayments()

const headline = computed(() => {
  const base = total.value === 1 ? '1 pago recibido' : `${total.value} pagos recibidos`
  return companyId.value === null ? base : `${base} de la empresa #${companyId.value}`
})

const hasActiveFilters = computed(
  () =>
    companyId.value !== null ||
    filter.value.status !== null ||
    filter.value.receivedFrom !== null ||
    filter.value.receivedTo !== null ||
    filter.value.agingOnly,
)

onMounted(() => void reload())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="pagos-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="pagos-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
      <p class="ds-meta">Lo que no está conciliado es lo que hay que revisar cada mes.</p>
    </div>

    <CompanyScopeFilter
      :company-id="companyId"
      items-label="los pagos"
      @apply="applyCompanyFilter"
    />

    <PaymentsAdvancedFilters :filter="filter" @apply="applyFilter" />

    <div class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Esta pestaña consulta. <strong>Registrar un pago, conciliarlo o cambiarle el estado</strong>
        se hace desde el expediente del contrato de la empresa: son operaciones sobre una empresa
        concreta y la empresa nunca puede quedar implícita.
      </span>
    </div>

    <button type="button" class="ds-btn ds-btn--ghost" :disabled="exporting" @click="exportCsv">
      <component :is="ICONS.EXPORT" :size="14" />
      {{ exporting ? 'Exportando…' : 'Exportar CSV' }}
    </button>

    <PaymentsTable
      :payments="items"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      :loading="loading"
      :error="error"
      :error-trace-id="errorTraceId"
      @retry="reload"
      @update:page="goTo"
    >
      <template #empty>
        <AppEmptyState
          v-if="hasActiveFilters"
          title="Ningún pago coincide con estos filtros"
          description="El filtro lo aplica el servidor, así que esto vale para todas las páginas, no solo para la que estás viendo."
          :icon="ICONS.SEARCH"
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="clearFilters">
            <component :is="ICONS.CLOSE" :size="15" />
            Quitar filtros
          </button>
        </AppEmptyState>

        <AppEmptyState
          v-else
          title="Todavía no se ha recibido ningún pago"
          description="Los pagos aparecen aquí en cuanto la pasarela los reporta o alguien los registra desde el expediente del contrato."
        />
      </template>
    </PaymentsTable>
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
