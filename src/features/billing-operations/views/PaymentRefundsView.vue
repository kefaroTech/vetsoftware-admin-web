<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import PaymentRefundsTable from '../components/PaymentRefundsTable.vue'
import RegisterRefundModal from '../components/RegisterRefundModal.vue'
import { usePaymentRefunds } from '../composables/usePaymentRefunds'

/**
 * <b>Devoluciones de dinero</b>: sacar plata de la plataforma y devolvérsela a una
 * empresa.
 *
 * <p><b>Es la única pestaña del circuito que mueve caja hacia fuera</b>, y por eso
 * su alta va detrás del modal de acción firmada: importe, medio, cuenta destino,
 * fecha, motivo de lista cerrada, motivo escrito y autorizante. Los siete están en
 * el contrato; ninguno se inventó para esta pantalla.
 *
 * <p><b>Recarga al abrir</b>, regla obligatoria del proyecto: una lista de caja que
 * se sirve de memoria enseña un saldo que ya no es.
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
  saving,
  companyId,
  reload,
  goTo,
  applyCompanyFilter,
  register,
} = usePaymentRefunds()

const registering = ref(false)

const headline = computed(() => {
  const base =
    total.value === 1 ? '1 devolución registrada' : `${total.value} devoluciones registradas`
  return companyId.value === null ? base : `${base} de la empresa #${companyId.value}`
})

onMounted(() => void reload())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="devoluciones-titulo">
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="devoluciones-titulo" class="ds-display--sm titular" tabindex="-1">
          {{ headline }}
        </h2>
        <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
        <p class="ds-meta">
          Cada fila es una salida de caja con su autorizante. Aquí no se borra nada: corregir una
          devolución equivocada es registrar el movimiento contrario.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--primary" @click="registering = true">
        <component :is="ICONS.ADD" :size="15" />
        Registrar devolución
      </button>
    </div>

    <CompanyScopeFilter
      :company-id="companyId"
      items-label="las devoluciones"
      @apply="applyCompanyFilter"
    />

    <PaymentRefundsTable
      :refunds="items"
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
        <!-- El filtro que no casó dice otra cosa que el catálogo vacío, y ofrece
             otra salida: confundirlos manda a soporte un ticket por un número mal
             escrito. -->
        <AppEmptyState
          v-if="companyId !== null"
          :title="`Ninguna devolución de la empresa #${companyId}`"
          description="El filtro lo aplica el servidor, así que esto vale para todas las páginas, no solo para la que estás viendo."
          :icon="ICONS.SEARCH"
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="applyCompanyFilter(null)">
            <component :is="ICONS.CLOSE" :size="15" />
            Quitar el filtro
          </button>
        </AppEmptyState>

        <AppEmptyState
          v-else
          title="Todavía no se ha devuelto dinero a nadie"
          description="Las devoluciones aparecen aquí en cuanto se registran. Ninguna se puede borrar después."
        />
      </template>
    </PaymentRefundsTable>

    <RegisterRefundModal
      :open="registering"
      :saving="saving"
      :default-company-id="companyId"
      @close="registering = false"
      @submit="
        async (empresa, payload) => {
          if (await register(empresa, payload)) registering = false
        }
      "
    />
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
