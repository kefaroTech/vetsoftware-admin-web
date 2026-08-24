<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import DunningEventsTable from '../components/DunningEventsTable.vue'
import { useDunningEvents } from '../composables/useBillingOperations'

/**
 * **Gestión de mora**: el feed global de avisos.
 *
 * <p>Nadie navega a «eventos de cobranza» en abstracto: o estás cerrando el mes,
 * o estás mirando por qué una cuenta concreta está en solo lectura. Por eso vive
 * como pestaña de cobranza y, además, como sub-vista del expediente de cada
 * contrato (onda 2).
 *
 * <p><b>Para qué existe la lista.</b> Para lo que dice el modelo: *demostrar que
 * se avisó antes de restringir la cuenta*. Es una prueba, así que el detalle de
 * cada aviso se pinta completo.
 *
 * <p>De solo consulta: registrar un aviso hecho por fuera —una llamada, un
 * WhatsApp— es `POST /dunning-events`, company-scoped, y vive en el expediente.
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
} = useDunningEvents()

const headline = computed(() => {
  const base = total.value === 1 ? '1 aviso de mora' : `${total.value} avisos de mora`
  return companyId.value === null ? base : `${base} de la empresa #${companyId.value}`
})

onMounted(() => void reload())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="mora-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="mora-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
      <p class="ds-meta">
        El rastro de lo que se avisó, a quién y cuándo, antes de restringir una cuenta. Una empresa
        en mora pasa a solo lectura y <strong>conserva la consulta y la impresión</strong> de toda
        su información, incluida la historia clínica.
      </p>
    </div>

    <CompanyScopeFilter
      :company-id="companyId"
      items-label="los avisos"
      @apply="applyCompanyFilter"
    />

    <DunningEventsTable
      :events="items"
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
        <!-- El filtro no casó: otro texto y otra salida. -->
        <AppEmptyState
          v-if="companyId !== null"
          :title="`Ningún aviso de mora de la empresa #${companyId}`"
          description="El filtro lo aplica el servidor, así que esto vale para todas las páginas, no solo para la que estás viendo."
          :icon="ICONS.SEARCH"
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="applyCompanyFilter(null)">
            <component :is="ICONS.CLOSE" :size="15" />
            Quitar el filtro
          </button>
        </AppEmptyState>

        <!-- Sin filtro y sin avisos. NO lleva icono de éxito: sobre una
             plataforma recién desplegada «nadie ha necesitado un aviso» es
             vacío, no un logro, y celebrarlo sería afirmar algo que no se sabe.
             Aquí se enuncia el hecho y ya. -->
        <AppEmptyState
          v-else
          title="No hay ningún aviso de mora registrado"
          description="Los avisos aparecen aquí en cuanto el sistema o una persona registran uno sobre una cuenta con pago vencido."
        />
      </template>
    </DunningEventsTable>
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
