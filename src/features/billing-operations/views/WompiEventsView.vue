<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { ICONS } from '@/constants/icons'
import WompiEventDetailModal from '../components/WompiEventDetailModal.vue'
import WompiEventsFilters from '../components/WompiEventsFilters.vue'
import WompiEventsTable from '../components/WompiEventsTable.vue'
import { useWompiEvents } from '../composables/useWompiEvents'
import type { WompiWebhookEventResponse } from '../types/wompi-events.types'

/**
 * El cuerpo crudo de cada webhook de Wompi. Se llega aquí filtrando a mano o —el camino real—
 * Siguiendo el enlace «Ver eventos» de la fila de un pago: el filtro de
 * referencia llega ya puesto en la URL.
 */
const {
  filters,
  items,
  page,
  pageSize,
  total,
  pageCount,
  loading,
  error,
  errorTraceId,
  reload,
  goTo,
  resetFilters,
} = useWompiEvents()

const detailOpen = ref(false)
const detailEvent = ref<WompiWebhookEventResponse | null>(null)

const hasActiveFilters = () =>
  filters.reference !== '' || filters.companyId !== '' || filters.from !== '' || filters.to !== ''

function applyFilters(next: { reference: string; companyId: string; from: string; to: string }) {
  filters.reference = next.reference
  filters.companyId = next.companyId
  filters.from = next.from
  filters.to = next.to
}

function openDetail(event: WompiWebhookEventResponse) {
  detailEvent.value = event
  detailOpen.value = true
}

onMounted(() => void reload())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="eventos-wompi-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="eventos-wompi-titulo" class="ds-display--sm" tabindex="-1">Eventos Wompi</h2>
      <p class="ds-meta">
        El cuerpo crudo de cada webhook, tal como lo entregó la pasarela — lo que hace falta para
        una disputa con el banco o con Wompi.
      </p>
    </div>

    <WompiEventsFilters
      :reference="filters.reference"
      :company-id="filters.companyId"
      :from="filters.from"
      :to="filters.to"
      @apply="applyFilters"
      @clear="resetFilters"
    />

    <WompiEventsTable
      :events="items"
      :loading="loading"
      :error="error"
      :error-trace-id="errorTraceId"
      @retry="reload"
      @view="openDetail"
    >
      <template #empty>
        <AppEmptyState
          v-if="hasActiveFilters()"
          title="Ningún evento coincide con estos filtros"
          description="El filtro lo aplica el servidor: vale para todo el histórico, no solo para esta página."
          :icon="ICONS.SEARCH"
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="resetFilters">
            <component :is="ICONS.CLOSE" :size="15" />
            Quitar filtros
          </button>
        </AppEmptyState>
        <AppEmptyState v-else title="Todavía no ha llegado ningún evento de Wompi" />
      </template>
    </WompiEventsTable>

    <AppPagination
      v-if="!error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="goTo"
    />

    <WompiEventDetailModal :open="detailOpen" :event="detailEvent" @close="detailOpen = false" />
  </section>
</template>
