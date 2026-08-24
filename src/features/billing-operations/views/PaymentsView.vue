<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import PaymentsTable from '../components/PaymentsTable.vue'
import { usePlatformPayments } from '../composables/useBillingOperations'

/**
 * **Cobrar**: los pagos recibidos, en el feed global de la plataforma.
 *
 * <p><b>De solo consulta, por una razón de contrato convertida en decisión de
 * diseño.</b> Registrar un pago, conciliarlo y cambiarle el estado resuelven la
 * empresa con `Authz.currentCompanyId()` y exigen la cabecera `X-Company-Id`.
 * Ofrecerlos aquí obligaría a que la empresa fuera implícita — el mecanismo con
 * el que se le aplica un cobro a la empresa equivocada. Esas tres acciones viven
 * en el expediente del contrato, donde la empresa es visible y permanente.
 *
 * <p><b>Aquí sí aparece el segundo de los tres vacíos.</b> Este endpoint acepta
 * `companyId`, así que el filtro lo resuelve el SERVIDOR: cuando no casa,
 * «ninguno» es verdad sobre el total y no sobre una página. Ese vacío dice otra
 * cosa que el de «no hay pagos» y ofrece otra salida — quitar el filtro—, porque
 * confundir un filtro que no casó con un catálogo vacío hace que el operador
 * abra un ticket por algo que se arregla borrando un número.
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
  reload,
  goTo,
  applyCompanyFilter,
} = usePlatformPayments()

const headline = computed(() => {
  const base = total.value === 1 ? '1 pago recibido' : `${total.value} pagos recibidos`
  return companyId.value === null ? base : `${base} de la empresa #${companyId.value}`
})

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

    <div class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Esta pestaña consulta. <strong>Registrar un pago, conciliarlo o cambiarle el estado</strong>
        se hace desde el expediente del contrato de la empresa: son operaciones sobre una empresa
        concreta y la empresa nunca puede quedar implícita.
      </span>
    </div>

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
        <!-- Vacío nº 2 de los tres: el FILTRO no casó. Otro texto y otra salida
             que el de «no hay pagos»; confundirlos manda a soporte un ticket por
             un número mal escrito. -->
        <AppEmptyState
          v-if="companyId !== null"
          :title="`Ningún pago de la empresa #${companyId}`"
          description="El filtro lo aplica el servidor, así que esto vale para todas las páginas, no solo para la que estás viendo."
          :icon="ICONS.SEARCH"
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="applyCompanyFilter(null)">
            <component :is="ICONS.CLOSE" :size="15" />
            Quitar el filtro
          </button>
        </AppEmptyState>

        <!-- Vacío nº 3: sin filtro y sin pagos. No es un logro ni una avería, así
             que no lleva icono de éxito ni de error: es un hecho. -->
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
