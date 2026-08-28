<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { FileCheck, FileWarning, Link2 } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { segmentedTabId } from '@/components/ui/segmented-tabs'
import { formatCurrency, formatDate } from '@/composables/format'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import ExternalAmountsGrid from './ExternalAmountsGrid.vue'
import MatchExternalInvoiceForm from './MatchExternalInvoiceForm.vue'
import ResolveReconciliationModal from './ResolveReconciliationModal.vue'
import VerdictLine from './VerdictLine.vue'
import { externalVerdict, lacksExternalInvoice } from '../composables/reconciliationVerdict'
import {
  useExternalInvoiceReconciliations,
  type ExternalScope,
} from '../composables/useExternalInvoiceReconciliations'
import type {
  ExternalInvoiceReconciliationResponse,
  MatchExternalInvoiceRequest,
  ResolveExternalInvoiceReconciliationRequest,
} from '../types/reconciliation.types'

/**
 * El cuadre con el facturador externo: nuestro documento contra su factura.
 *
 * <p><b>«Sin factura externa» es una bandeja, no un filtro.</b> Los otros tres
 * veredictos se ven porque una cifra chirría; este no tiene ninguna cifra que
 * chirríe —el emisor no ha dicho nada— así que si hay que ir a buscarlo entre
 * los cuadrados, no se busca. Tiene su propia ruta en el backend y aquí tiene su
 * propia pestaña, y es la que se abre primero.
 *
 * <p><b>Cuadrar dentro de la tolerancia es cuadrar.</b> Dos pesos de diferencia
 * entre nuestro impuesto agregado y el que el emisor calculó línea a línea son
 * aritmética de redondeo. Sale en verde y con esas palabras, y no entra en la
 * lista de trabajo: hinchar el cierre con filas que no tienen nada que arreglar
 * es como se deja de mirar el cierre entero.
 */
const { reconciliations, scope, selectedExternal, setScope, load, select, match, resolve } =
  useExternalInvoiceReconciliations()

const panelId = useId()
const SCOPES = [
  { value: 'MISSING_EXTERNAL', label: 'Devengados sin factura' },
  { value: 'ALL', label: 'Todos los cuadres' },
] as const

const matchModalOpen = ref(false)
const resolveModalOpen = ref(false)
const saving = ref(false)
const matchFormRef = ref<InstanceType<typeof MatchExternalInvoiceForm> | null>(null)

const scopeModel = computed({
  get: () => scope.value as string,
  set: (value: string) => void setScope(value as ExternalScope),
})

const activeTabId = computed(() => segmentedTabId(panelId, scope.value))

/** La recarga al abrir es obligatoria: un cuadre de hace diez minutos ya es otro. */
onMounted(async () => {
  scope.value = 'MISSING_EXTERNAL'
  await load()
})

useUnsavedChangesGuard(() => matchModalOpen.value && (matchFormRef.value?.isDirty() ?? false))

function openMatch(reconciliation: ExternalInvoiceReconciliationResponse) {
  select(reconciliation)
  matchModalOpen.value = true
}

function openResolve(reconciliation: ExternalInvoiceReconciliationResponse) {
  select(reconciliation)
  resolveModalOpen.value = true
}

function closeMatch() {
  if (saving.value) return
  matchModalOpen.value = false
}

async function submitMatch(payload: MatchExternalInvoiceRequest) {
  const current = selectedExternal.value
  if (!current || saving.value) return
  saving.value = true
  try {
    await match(current.id, payload)
    matchModalOpen.value = false
  } catch {
    // El composable ya avisó con el ProblemDetail y su traza; el modal se queda
    // abierto para que no haya que teclear la factura otra vez.
  } finally {
    saving.value = false
  }
}

async function submitResolve(payload: ResolveExternalInvoiceReconciliationRequest) {
  const current = selectedExternal.value
  if (!current || saving.value) return
  saving.value = true
  try {
    await resolve(current.id, payload)
    resolveModalOpen.value = false
  } catch {
    // Ídem: la firma escrita no se pierde.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--14">
    <AppSegmentedTabs
      v-model="scopeModel"
      :options="SCOPES"
      label="Bandeja de cuadres"
      :panel-id="panelId"
    />

    <div :id="panelId" role="tabpanel" :aria-labelledby="activeTabId" class="ds-stack ds-stack--14">
      <p v-if="scope === 'MISSING_EXTERNAL'" class="ds-banner ds-banner--warning" role="status">
        <FileWarning :size="16" class="ds-banner-icon" />
        <span>
          Documentos que devengamos y que <strong>nunca recibieron factura del emisor</strong>. Es
          dinero devengado que nadie facturó: no hay ninguna cifra que chirríe, porque no hay cifra.
          Si esta bandeja no se vacía antes del cierre, la diferencia aparece en la inspección.
        </span>
      </p>

      <AppTable
        :headers="[
          'Empresa',
          'Documento',
          'Devengado',
          'Declarado por el emisor',
          'Veredicto',
          'Acciones',
        ]"
        :empty="reconciliations.items.value.length === 0"
        :loading="reconciliations.loading.value"
        :error="reconciliations.error.value"
        :trace-id="reconciliations.errorTraceId.value"
        @retry="reconciliations.reload"
      >
        <template #empty>
          <AppEmptyState
            :icon="FileCheck"
            :title="
              scope === 'MISSING_EXTERNAL'
                ? 'No queda nada devengado sin facturar'
                : 'Todavía no hay cuadres abiertos'
            "
            :description="
              scope === 'MISSING_EXTERNAL'
                ? 'Todo lo devengado tiene su factura del emisor. Esta bandeja vacía es la única forma de cerrar el periodo sin sorpresas.'
                : 'Un cuadre se abre cuando un documento de cobro se enfrenta a la factura fiscal del tercero.'
            "
          />
        </template>

        <tr v-for="row in reconciliations.items.value" :key="row.id" class="ds-row-hover">
          <td><CompanyRef :company-id="row.companyId" /></td>
          <td>
            <div class="ds-stack ds-stack--8">
              <span class="ds-text-strong">#{{ row.billingDocumentId }}</span>
              <span class="ds-meta">Abierto el {{ formatDate(row.createdDate) }}</span>
            </div>
          </td>
          <td class="ds-num">
            <div class="ds-stack ds-stack--8">
              <span>{{ formatCurrency(row.computedTotal) }}</span>
              <span class="ds-meta">imp. {{ formatCurrency(row.computedTax) }}</span>
            </div>
          </td>
          <td class="ds-num">
            <div class="ds-stack ds-stack--8">
              <span>{{ formatCurrency(row.externalTotal) }}</span>
              <span class="ds-meta">
                {{
                  lacksExternalInvoice(row)
                    ? 'el emisor no ha dicho nada'
                    : `imp. ${formatCurrency(row.externalTax)}`
                }}
              </span>
            </div>
          </td>
          <td><VerdictLine :verdict="externalVerdict(row.status)" /></td>
          <td>
            <div class="ds-actions ds-actions--start">
              <button
                type="button"
                class="ds-icon-btn"
                :aria-label="`Casar la factura del emisor con el documento #${row.billingDocumentId}`"
                @click="openMatch(row)"
              >
                <Link2 :size="15" />
              </button>
              <button
                v-if="row.resolvedAt === null"
                type="button"
                class="ds-icon-btn"
                :aria-label="`Cerrar el cuadre del documento #${row.billingDocumentId}`"
                @click="openResolve(row)"
              >
                <FileCheck :size="15" />
              </button>
              <span v-else class="ds-meta">
                Cerrado el {{ formatDate(row.resolvedAt) }}
                <template v-if="row.postingPeriod"> · {{ row.postingPeriod }}</template>
              </span>
            </div>
          </td>
        </tr>
      </AppTable>

      <AppPagination
        v-if="
          !reconciliations.loading.value &&
          !reconciliations.error.value &&
          reconciliations.total.value > 0
        "
        :page="reconciliations.page.value"
        :page-size="reconciliations.pageSize"
        :total="reconciliations.total.value"
        :page-count="reconciliations.pageCount.value"
        @update:page="reconciliations.goTo"
      />
    </div>

    <AppModal
      :open="matchModalOpen"
      title="Casar la factura del emisor"
      :max-width="780"
      @close="closeMatch"
    >
      <div v-if="selectedExternal" class="ds-stack ds-stack--16">
        <ExternalAmountsGrid :reconciliation="selectedExternal" />
        <MatchExternalInvoiceForm
          ref="matchFormRef"
          :reconciliation="selectedExternal"
          :saving="saving"
          @submit="submitMatch"
          @cancel="closeMatch"
        />
      </div>
    </AppModal>

    <ResolveReconciliationModal
      :open="resolveModalOpen"
      :reconciliation="selectedExternal"
      :saving="saving"
      @close="resolveModalOpen = false"
      @submit="submitResolve"
    />
  </section>
</template>
