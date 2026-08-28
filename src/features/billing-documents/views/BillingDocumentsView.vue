<script setup lang="ts">
import { computed, onMounted, useId } from 'vue'
import { storeToRefs } from 'pinia'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import { segmentedTabId, type SegmentedTabOption } from '@/components/ui/segmented-tabs'
import { ICONS } from '@/constants/icons'
import BillingDocumentsTable from '@/features/billing-operations/components/BillingDocumentsTable.vue'
import {
  daysSince,
  formatDocumentAmount,
} from '@/features/billing-operations/composables/billingFormat'
import { useAwaitingExternalDocuments } from '@/features/billing-operations/composables/useBillingOperations'
import type { IssueStatus } from '@/features/billing-operations/types/billing-operations.types'
import ContractGapNotice from '../components/ContractGapNotice.vue'
import { useBillingDocumentsStore } from '../stores/billing-documents.store'
import { ISSUE_STATUS_PRESENTATION, STALLED_AFTER_DAYS } from '../types/billing-documents.types'

/**
 * <b>Los documentos de cobro con su circuito</b> (§G2).
 *
 * <p><b>Qué se replanteó y qué se reutiliza.</b> Esta pantalla no duplica
 * `/cobranza`: la reencuadra. `/cobranza/pendientes` es una <b>bandeja que se
 * vacía</b> —una fila, un verbo, la fila se va—; esto es el <b>circuito</b>, donde
 * el mismo documento se mira para entenderlo y no para despacharlo. Por eso aquí
 * la fila no lleva acción de escritura: lleva al documento, y las escrituras viven
 * en su detalle, que es donde se ve lo que se está firmando. La tabla, el motor de
 * paginación y el formateo de importes son los de `billing-operations`, sin copia.
 *
 * <p><b>El estado que importa abre la pantalla.</b> `AWAITING_EXTERNAL` es dinero
 * devengado que nadie facturó: el servicio se prestó, se calculó el documento y
 * ahí se quedó. No falla nada, y por eso es el más fácil de no ver. La cabecera lo
 * dice con el recuento y con cuántos llevan más de {{ STALLED_AFTER_DAYS }} días
 * atascados, que es la cifra que mueve a actuar.
 *
 * <p><b>Tres de las cuatro pestañas no tienen barrido</b> y la pantalla lo dice
 * en vez de enseñar una tabla vacía. `/system/subscription-billing/documents/**`
 * solo publica `awaiting-external` y `overdue`; para `DRAFT`,
 * `EXTERNAL_REGISTERED` y `VOIDED` no hay ninguna ruta de plataforma. Filtrar en
 * el cliente una página de veinte sobre trescientas diría «no hay» sobre algo que
 * sí hay, así que no se hace: se declara el hueco y se nombra lo que falta.
 *
 * <p><b>Las pestañas son un `role="tablist"` y no rutas</b>, al revés que en
 * `/cobranza`. Allí cada pestaña es una pantalla con su propia forma —pagos,
 * mora—; aquí las cuatro son la misma lista con un filtro distinto, y partirlas
 * en cuatro rutas daría cuatro ficheros idénticos. `AppSegmentedTabs` ya trae el
 * contrato de teclado del patrón Tabs del APG.
 */
const store = useBillingDocumentsStore()
const { tab } = storeToRefs(store)

const { items, page, pageSize, total, pageCount, loading, error, errorTraceId, reload, goTo } =
  useAwaitingExternalDocuments()

const panelId = useId()

const TABS: SegmentedTabOption[] = (
  ['DRAFT', 'AWAITING_EXTERNAL', 'EXTERNAL_REGISTERED', 'VOIDED'] as const
).map((status) => ({ value: status, label: ISSUE_STATUS_PRESENTATION[status].label }))

/** Hoy solo este estado tiene barrido de plataforma. */
const SERVED_BY_CONTRACT: IssueStatus = 'AWAITING_EXTERNAL'

const served = computed(() => tab.value === SERVED_BY_CONTRACT)

const headline = computed(() =>
  total.value === 1
    ? '1 documento esperando su factura fiscal'
    : `${total.value} documentos esperando su factura fiscal`,
)

/**
 * Suma de <b>la página</b>, dicha como tal.
 *
 * <p>§H3 pide el importe acumulado en la cabecera y el contrato no devuelve
 * ningún agregado: solo la página. Escribir aquí la suma de veinte filas y
 * llamarla «el acumulado» sería inventar el dato más importante de la pantalla,
 * así que se dice exactamente sobre cuántos documentos está sumado.
 */
const pageAmount = computed(() => items.value.reduce((sum, doc) => sum + doc.totalAmount, 0))

/** Cuántos de los que se ven llevan más de un ciclo entero esperando. */
const stalled = computed(
  () => items.value.filter((doc) => (daysSince(doc.createdDate) ?? 0) > STALLED_AFTER_DAYS).length,
)

/** Regla del proyecto: se recarga siempre al abrir la pantalla. */
onMounted(() => void reload())
</script>

<template>
  <AppLayout>
    <div class="ds-page ds-page--stack ds-page--wide">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Documentos de cobro</h1>
          <p class="ds-meta">
            El documento de cobro es <strong>interno</strong>: lo emite la plataforma para saber qué
            se le cobró a cada clínica. <strong>No es la factura fiscal</strong> — esa la emite el
            proveedor externo y es la única que el cliente ve. Aquí se ve todo porque esta es la
            consola de plataforma.
          </p>
        </div>
      </div>

      <AppSegmentedTabs
        :model-value="tab"
        :options="TABS"
        label="Estado del circuito"
        :panel-id="panelId"
        @update:model-value="store.setTab($event as IssueStatus)"
      />

      <div
        :id="panelId"
        role="tabpanel"
        :aria-labelledby="segmentedTabId(panelId, tab)"
        class="ds-stack ds-stack--14"
        tabindex="0"
      >
        <p class="ds-meta significado">{{ ISSUE_STATUS_PRESENTATION[tab].meaning }}</p>

        <template v-if="served">
          <h2 class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
          <!-- El recuento cambia al paginar y hay que anunciarlo sin interrumpir. -->
          <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>

          <p v-if="items.length > 0" class="ds-meta">
            Los {{ items.length }} de esta página suman
            <strong class="ds-num">{{ formatDocumentAmount(pageAmount) }}</strong
            >. El servidor no devuelve el acumulado de los {{ total }}, así que esta suma es solo la
            de lo que se está viendo.
          </p>

          <div v-if="stalled > 0" class="ds-banner ds-banner--warning">
            <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
            <span class="ds-flex-fill">
              <strong>{{ stalled }}</strong> de esta página llevan más de
              {{ STALLED_AFTER_DAYS }} días esperando: ya sobrevivieron a un cierre de mes entero.
              Es plata devengada que nadie facturó.
            </span>
          </div>

          <BillingDocumentsTable
            :documents="items"
            aging-header="Esperando desde"
            aging-from="createdDate"
            :stalled-after-days="STALLED_AFTER_DAYS"
            detail-link
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
                title="Todo facturado"
                description="Ningún documento espera su referencia externa. Cuando se genere uno nuevo aparecerá aquí."
                :icon="ICONS.SUCCESS"
              />
            </template>
          </BillingDocumentsTable>
        </template>

        <ContractGapNotice
          v-else
          :title="`No hay forma de listar los documentos en «${ISSUE_STATUS_PRESENTATION[tab].label}»`"
          reason="De los cuatro estados del circuito, el contrato solo publica un barrido de
            plataforma para «Esperando factura» y otro para los vencidos. Este estado no tiene
            ninguno, y filtrar en el cliente una página de veinte sobre el total diría «no hay»
            sobre documentos que sí existen."
          needed="Un `issueStatus` en `GET /system/subscription-billing/documents`, o una ruta por
            estado como las dos que ya existen."
        >
          <p class="ds-meta significado">
            Mientras tanto, los documentos de <strong>una</strong> empresa concreta —todos sus
            estados— se ven en el expediente de su contrato, en «Dinero».
          </p>
        </ContractGapNotice>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.titular {
  margin: 0;
}

.significado {
  margin: 0;
  max-width: 72ch;
}
</style>
