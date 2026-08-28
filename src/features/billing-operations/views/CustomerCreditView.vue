<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import ConsumeCreditModal from '../components/ConsumeCreditModal.vue'
import CustomerCreditBalancesTable from '../components/CustomerCreditBalancesTable.vue'
import CustomerCreditEntriesTable from '../components/CustomerCreditEntriesTable.vue'
import GrantCreditModal from '../components/GrantCreditModal.vue'
import { formatDocumentAmount } from '../composables/billingFormat'
import { useCustomerCredit } from '../composables/useCustomerCredit'
import {
  CREDIT_ENTRY_LABEL,
  CREDIT_EXPIRY_WARNING_DAYS,
  type CustomerCreditBalanceResponse,
} from '../types/customer-credit.types'

/**
 * <b>Saldo a favor</b>, visto como lo que es: una pila de lotes que caduca.
 *
 * <p><b>Los lotes por vencer van arriba</b> y salen de
 * `/system/customer-credit/expiring`, que corta por fecha en el servidor. Es la
 * única lista de la pestaña que evita un daño concreto: un lote que vence sin
 * consumirse se pierde, y el cliente se entera cuando ya no está. Con el corte hecho
 * en cliente sobre una página, «no hay nada por vencer» sería mentira la mitad de
 * las veces.
 *
 * <p><b>Cerrar los lotes vencidos se confirma, no se firma.</b>
 * `POST /system/customer-credit/expirations` no acepta cuerpo, así que no hay dónde
 * guardar un motivo; pedirlo en un modal de firma haría creer que queda registrado
 * cuando se tira en el camino.
 *
 * <p><b>Recarga al abrir</b>, regla obligatoria del proyecto.
 */
const { confirm } = useConfirmDialog()
const {
  balancesList,
  entriesList,
  expiringList,
  lastLotMovements,
  savingGrant,
  savingConsume,
  savingExpire,
  companyId,
  applyCompanyFilter,
  reloadAll,
  grant,
  consume,
  expire,
} = useCustomerCredit()

const granting = ref(false)
const consuming = ref<CustomerCreditBalanceResponse | null>(null)

const busy = computed(() => savingConsume.value || savingExpire.value)

const headline = computed(() => {
  const total = balancesList.total.value
  return total === 1 ? '1 empresa con saldo a favor' : `${total} empresas con saldo a favor`
})

/**
 * Cierra los lotes ya vencidos de una empresa. La consecuencia dice lo que la gente
 * espera mal: esto no «limpia» nada recuperable — ese saldo deja de estar disponible
 * para el cliente.
 */
async function onExpire(row: CustomerCreditBalanceResponse) {
  const accepted = await confirm({
    message: `¿Cerrar los lotes vencidos de la empresa #${row.companyId}?`,
    consequence:
      'El saldo de los lotes ya vencidos deja de estar disponible para el cliente. Queda un movimiento por cada lote cerrado, pero el saldo no se recupera. El motivo no se puede guardar: el contrato de esta operación no acepta cuerpo.',
    confirmLabel: 'Cerrar los vencidos',
  })
  if (accepted) await expire(row.companyId)
}

onMounted(() => void reloadAll())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="saldo-titulo">
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="saldo-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
        <p class="ds-sr-only" role="status">{{ balancesList.loading.value ? '' : headline }}</p>
        <p class="ds-meta">
          El saldo no es un número: es una pila de lotes. Se consume empezando por el que antes
          caduca, y lo que caduca sin usarse lo pierde el cliente.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--primary" @click="granting = true">
        <component :is="ICONS.ADD" :size="15" />
        Abrir lote
      </button>
    </div>

    <!-- El reparto del último consumo o de la última caducidad. Es el dato que el
         operador no puede deducir: pidió un importe y el servidor decidió de dónde
         salía. -->
    <div v-if="lastLotMovements.length > 1" class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        La última operación tocó {{ lastLotMovements.length }} lotes:
        <template v-for="(movement, index) in lastLotMovements" :key="movement.id">
          <template v-if="index > 0"> · </template>
          {{ CREDIT_ENTRY_LABEL[movement.entryKind] }} de
          {{ formatDocumentAmount(movement.amount) }}
        </template>
      </span>
    </div>

    <section class="ds-stack ds-stack--10" aria-labelledby="vencen-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="vencen-titulo" class="ds-title titular">Lotes por caducar</h3>
        <p class="ds-meta">
          Los que vencen en los próximos {{ CREDIT_EXPIRY_WARNING_DAYS }} días. El corte lo hace el
          servidor, así que esto vale sobre el total y no sobre la página.
        </p>
      </div>

      <CustomerCreditEntriesTable
        :rows="expiringList.items.value"
        :page="expiringList.page.value"
        :page-size="expiringList.pageSize.value"
        :total="expiringList.total.value"
        :page-count="expiringList.pageCount.value"
        :loading="expiringList.loading.value"
        :error="expiringList.error.value"
        :error-trace-id="expiringList.errorTraceId.value"
        @retry="expiringList.reload"
        @update:page="expiringList.goTo"
      >
        <template #empty>
          <AppEmptyState
            title="Ningún lote caduca en la ventana"
            :description="`Nada vence en los próximos ${CREDIT_EXPIRY_WARNING_DAYS} días. Ningún cliente va a perder saldo por ahora.`"
          />
        </template>
      </CustomerCreditEntriesTable>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="saldos-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="saldos-titulo" class="ds-title titular">Saldo por empresa</h3>
        <p class="ds-meta">
          El saldo consolidado y la fecha del primer lote que caduca. Este listado no acepta filtro
          por empresa en el servidor, así que no se ofrece uno.
        </p>
      </div>

      <CustomerCreditBalancesTable
        :rows="balancesList.items.value"
        :page="balancesList.page.value"
        :page-size="balancesList.pageSize.value"
        :total="balancesList.total.value"
        :page-count="balancesList.pageCount.value"
        :loading="balancesList.loading.value"
        :error="balancesList.error.value"
        :error-trace-id="balancesList.errorTraceId.value"
        :busy="busy"
        @retry="balancesList.reload"
        @update:page="balancesList.goTo"
        @consume="consuming = $event"
        @expire="onExpire"
      >
        <template #empty>
          <AppEmptyState
            title="Ninguna empresa tiene saldo a favor"
            description="Es un hecho, no un fallo: el saldo nace de un pago de más, una nota crédito o una cancelación."
          />
        </template>
      </CustomerCreditBalancesTable>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="movimientos-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="movimientos-titulo" class="ds-title titular">Movimientos</h3>
        <p class="ds-meta">
          Concesiones, consumos, caducidades y correcciones. Nada se reescribe: una corrección es
          otro movimiento y los dos quedan.
        </p>
      </div>

      <CompanyScopeFilter
        :company-id="companyId"
        items-label="los movimientos"
        @apply="applyCompanyFilter"
      />

      <CustomerCreditEntriesTable
        :rows="entriesList.items.value"
        :page="entriesList.page.value"
        :page-size="entriesList.pageSize.value"
        :total="entriesList.total.value"
        :page-count="entriesList.pageCount.value"
        :loading="entriesList.loading.value"
        :error="entriesList.error.value"
        :error-trace-id="entriesList.errorTraceId.value"
        @retry="entriesList.reload"
        @update:page="entriesList.goTo"
      >
        <template #empty>
          <AppEmptyState
            v-if="companyId !== null"
            :title="`Ningún movimiento de la empresa #${companyId}`"
            description="El filtro lo aplica el servidor, así que esto vale para todas las páginas."
            :icon="ICONS.SEARCH"
          >
            <button type="button" class="ds-btn ds-btn--ghost" @click="applyCompanyFilter(null)">
              <component :is="ICONS.CLOSE" :size="15" />
              Quitar el filtro
            </button>
          </AppEmptyState>

          <AppEmptyState
            v-else
            title="Todavía no hay ningún movimiento de saldo"
            description="Los movimientos aparecen aquí en cuanto se abre, se consume o caduca un lote."
          />
        </template>
      </CustomerCreditEntriesTable>
    </section>

    <GrantCreditModal
      :open="granting"
      :saving="savingGrant"
      :default-company-id="companyId"
      @close="granting = false"
      @submit="
        async (empresa, payload) => {
          if (await grant(empresa, payload)) granting = false
        }
      "
    />

    <ConsumeCreditModal
      :open="consuming !== null"
      :balance="consuming"
      :saving="savingConsume"
      @close="consuming = null"
      @submit="
        async (empresa, payload) => {
          if (await consume(empresa, payload)) consuming = null
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
