<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { ICONS } from '@/constants/icons'
import { usePlatformSetup } from '@/features/platform-setup/composables/usePlatformSetup'
import BillingDocumentsTable from '../components/BillingDocumentsTable.vue'
import RegisterExternalInvoiceModal from '../components/RegisterExternalInvoiceModal.vue'
import { useAwaitingExternalDocuments } from '../composables/useBillingOperations'
import type { BillingDocumentResponse } from '../types/billing-operations.types'

/**
 * **La pantalla con la que `/cobranza` abre**, y la razón de que abra aquí: esta
 * lista es el trabajo pendiente de una persona cada mes, no un informe.
 *
 * <p>Cuatro diferencias concretas entre una lista de trabajo y un informe, y las
 * cuatro están implementadas:
 *
 * <ol>
 *   <li><b>El titular es el recuento</b> («7 documentos esperando su factura
 *       fiscal»), no un título genérico. Un informe empieza por la tabla; una
 *       lista de trabajo empieza por cuánto queda.</li>
 *   <li><b>Una acción primaria por fila, y es la que la saca de la lista.</b> Es
 *       lo que convierte la pantalla en una bandeja que se vacía.</li>
 *   <li><b>Antigüedad visible</b>: cuánto lleva atascado cada documento, en texto.</li>
 *   <li><b>El vacío de aquí es un ÉXITO</b>, y se lee como tal.</li>
 * </ol>
 *
 * <p><b>Los tres vacíos, y por qué no se pueden confundir.</b>
 *
 * <ol>
 *   <li><b>Arranque de plataforma.</b> Si faltan pasos de la puesta en marcha,
 *       no puede existir ningún documento de cobro: no hay catálogo, ni tarifa,
 *       ni secuencia de numeración. Decir «Todo facturado» ahí sería celebrar un
 *       logro que nadie ha conseguido. Se pinta `PlatformSetupChecklist` en su
 *       variante compacta, que además se calla sola cuando la plataforma ya está
 *       sembrada.</li>
 *   <li><b>Todo facturado.</b> Con la plataforma en marcha y cero documentos
 *       esperando, esto es un ÉXITO y se lee como tal (`ICONS.SUCCESS`). «Aún no
 *       hay registros» se leería como «esto está roto» y terminaría en un
 *       ticket (NN/g, <i>Empty State Interface Design</i>).</li>
 *   <li><b>La búsqueda no casó.</b> No puede darse aquí, y por eso la pantalla
 *       no ofrece buscador: este endpoint **no admite filtro ni orden** (issue
 *       B-3), y filtrar en cliente 20 filas de 300 diría «no hay» sobre algo que
 *       sí hay. Ese tercer vacío vive donde el filtro es real: «Pagos» y
 *       «Gestión de mora», cuyo endpoint sí acepta `companyId`.</li>
 * </ol>
 *
 * <p>Mientras la puesta en marcha se está sondeando **no se pinta ninguno de los
 * dos**: afirmar «Todo facturado» sin saber todavía si la plataforma existe es
 * exactamente el error que esta rama previene.
 */
const { items, page, pageSize, total, pageCount, loading, error, errorTraceId, reload, goTo } =
  useAwaitingExternalDocuments()

const selected = ref<BillingDocumentResponse | null>(null)

/**
 * La puesta en marcha solo se sondea cuando la lista vuelve VACÍA: son siete
 * peticiones y no tienen nada que decir sobre una lista con documentos dentro.
 */
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
    ? '1 documento esperando su factura fiscal'
    : `${total.value} documentos esperando su factura fiscal`,
)

/** Regla del proyecto: se recarga siempre al abrir la pantalla, nunca se confía en la caché. */
onMounted(() => void reload())

/**
 * Registrada la referencia, el documento deja de estar en `AWAITING_EXTERNAL` y
 * por tanto deja de pertenecer a esta lista. Se recarga al CERRAR el modal y no
 * al registrar: quitar la fila mientras el operador está leyendo el comprobante
 * le mueve el suelo bajo los pies.
 */
function onClose() {
  selected.value = null
  void reload()
}
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="pendientes-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="pendientes-titulo" class="ds-display--sm titular" tabindex="-1">
        {{ headline }}
      </h2>
      <!-- El recuento cambia tras registrar una referencia y hay que anunciarlo,
           sin interrumpir: `status` (polite), nunca `alert` (§5.3). -->
      <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
      <p class="ds-meta">
        La factura fiscal la emite el proveedor externo, no Lumbre. Aquí se registra su referencia
        para poder cruzarla después.
      </p>
      <div>
        <p class="ds-pill ds-tone--neutral sello">
          <component :is="ICONS.LOCK" :size="13" />
          Estos registros no se editan; se corrigen con otro documento
        </p>
      </div>
    </div>

    <BillingDocumentsTable
      :documents="items"
      aging-header="Esperando desde"
      aging-from="createdDate"
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
        <!-- Vacío 1 · la plataforma todavía no está sembrada: no es que esté todo
             facturado, es que no puede haber nada que facturar. -->
        <PlatformSetupChecklist v-if="setupBlocked" variant="compact" purpose="facturar" />

        <!-- Vacío 2 · un LOGRO, y se lee como tal. -->
        <AppEmptyState
          v-else-if="!setupLoading"
          title="Todo facturado"
          description="Ningún documento espera su referencia externa. Cuando se genere uno nuevo aparecerá aquí."
          :icon="ICONS.SUCCESS"
        />
      </template>

      <!-- Un solo verbo, y de añadir. No hay «Editar»: la operación no existe. -->
      <template #row-actions="{ document }">
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="selected = document">
          <component :is="ICONS.RECEIPT" :size="14" />
          Registrar factura externa
        </button>
      </template>
    </BillingDocumentsTable>

    <RegisterExternalInvoiceModal
      :open="selected !== null"
      :document="selected"
      return-focus-to="#pendientes-titulo"
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
