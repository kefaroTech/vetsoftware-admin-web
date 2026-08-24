<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { ICONS } from '@/constants/icons'
import { usePlatformSetup } from '@/features/platform-setup/composables/usePlatformSetup'
import BillingDocumentsTable from '../components/BillingDocumentsTable.vue'
import RegisterExternalInvoiceModal from '../components/RegisterExternalInvoiceModal.vue'
import { useOverdueDocuments } from '../composables/useBillingOperations'
import type { BillingDocumentResponse } from '../types/billing-operations.types'

/**
 * **La cartera**: documentos con saldo cuya fecha de vencimiento ya pasó.
 *
 * <p>Misma forma que «Pendiente de facturar», distinto criterio de urgencia: la
 * antigüedad se cuenta desde el **vencimiento**, no desde la emisión.
 *
 * <p><b>Lo que saca una fila de ESTA lista es un pago, y el pago no se registra
 * aquí.</b> `POST /subscription-payments` resuelve la empresa con
 * `Authz.currentCompanyId()`, así que exige la cabecera `X-Company-Id`: su sitio
 * es el expediente del contrato, donde la empresa es explícita y permanente
 * (onda 2). Se dice en un banner en vez de ofrecer un botón que fallaría con un
 * 400, y en vez de callarlo y dejar al operador buscándolo.
 *
 * <p>Sí se ofrece «Registrar factura externa» en las filas que además están en
 * `AWAITING_EXTERNAL`: un documento puede estar vencido y todavía sin referencia
 * fiscal, y esa acción sí es de plataforma.
 */
const { items, page, pageSize, total, pageCount, loading, error, errorTraceId, reload, goTo } =
  useOverdueDocuments()

const selected = ref<BillingDocumentResponse | null>(null)

/** Igual que en «Pendiente de facturar»: «Nadie debe nada» es un logro, y sobre
 *  una plataforma sin sembrar sería un logro falso. Solo se sondea si hay vacío. */
const { blocked: setupBlocked, loading: setupLoading, load: loadSetup } = usePlatformSetup()

watch(
  () => [loading.value, error.value, total.value] as const,
  ([isLoading, failed, count]) => {
    if (!isLoading && !failed && count === 0) void loadSetup()
  },
  { immediate: true },
)

const headline = computed(() =>
  total.value === 1
    ? '1 documento vencido con saldo'
    : `${total.value} documentos vencidos con saldo`,
)

onMounted(() => void reload())

function onClose() {
  selected.value = null
  void reload()
}
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="vencidos-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="vencidos-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
      <div>
        <p class="ds-pill ds-tone--neutral sello">
          <component :is="ICONS.LOCK" :size="13" />
          Estos registros no se editan; se corrigen con otro documento
        </p>
      </div>
    </div>

    <!-- Condición permanente de la pantalla, no una interrupción: banner informativo
         sin `role="alert"` (§5.3). -->
    <div class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Un documento sale de esta lista cuando entra el pago.
        <strong>Registrar un pago se hace desde el expediente del contrato</strong>, donde la
        empresa está a la vista: la operación exige que la empresa sea explícita y nunca implícita.
      </span>
    </div>

    <BillingDocumentsTable
      :documents="items"
      aging-header="Vencido desde"
      aging-from="dueDate"
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
        <!-- No es que la cartera esté al día: es que todavía no hay plataforma. -->
        <PlatformSetupChecklist v-if="setupBlocked" variant="compact" purpose="facturar" />

        <!-- Ahora sí, un logro: la cartera al día. -->
        <AppEmptyState
          v-else-if="!setupLoading"
          title="Nadie debe nada"
          description="Ningún documento vencido con saldo pendiente."
          :icon="ICONS.SUCCESS"
        />
      </template>

      <template #row-actions="{ document }">
        <button
          v-if="document.issueStatus === 'AWAITING_EXTERNAL'"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="selected = document"
        >
          <component :is="ICONS.RECEIPT" :size="14" />
          Registrar factura externa
        </button>
        <!-- Sin acción para el resto. No se pinta un botón atenuado: si la
             operación no existe para esa fila, no existe en el marcado. -->
      </template>
    </BillingDocumentsTable>

    <RegisterExternalInvoiceModal
      :open="selected !== null"
      :document="selected"
      return-focus-to="#vencidos-titulo"
      @close="onClose"
    />
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}

.sello {
  margin: 0;
}
</style>
