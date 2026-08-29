<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatAmount, formatDate } from '@/composables/format'
import {
  CHARGE_TYPE_PRESENTATION,
  type SubscriptionChargeResponse,
} from '@/features/subscriptions-admin/types/subscription-money.types'
import ContractGapNotice from './ContractGapNotice.vue'

/**
 * <b>Bloque 2 · los cargos que componen el documento.</b>
 *
 * <p><b>El contrato no sabe contestar «cuáles son los renglones de este
 * documento».</b> `GET /subscription-billing/charges` filtra por
 * `subscriptionId` y por `status`, y por nada más; el vínculo
 * `billingDocumentId` viaja en el cargo, no en la consulta. Así que estos
 * renglones son un <b>cruce hecho en el cliente</b> sobre los cargos del
 * contrato, y ese cruce solo vale si se puede demostrar completo.
 *
 * <p><b>La demostración es aritmética, no una promesa.</b> Si la suma de los
 * renglones encontrados da el subtotal del documento, están todos: falte lo que
 * falte en otras páginas, no era de este documento. Cuando no da, la tabla
 * <b>no se pinta</b>. Una lista de renglones a la que le faltan filas es peor que
 * ninguna, porque parece completa y alguien la va a sumar.
 *
 * <p><b>Un cargo no se corrige.</b> Ni un lápiz, ni un «Editar» apagado, ni un
 * `&lt;input disabled&gt;` con el importe: la operación no existe en el contrato,
 * así que no existe en el marcado (§3.2). Corregir es emitir otro cargo que anula
 * al primero, y los dos quedan.
 *
 * <p>Un cargo trae ya su cantidad —«37 unidades, 18.500»—, así que la agrupación
 * que pide D-18 la hace el modelo y no hay que reconstruirla aquí.
 */
defineProps<{
  lines: {
    rows: SubscriptionChargeResponse[]
    subtotal: number
    documentSubtotal: number
    truncated: boolean
    matches: boolean
    complete: boolean
  } | null
  subscriptionId: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: [] }>()

const HEADERS: AppTableHeader[] = [
  'Concepto',
  'Cuándo se prestó',
  { label: 'Cantidad × unitario', align: 'num' },
  { label: 'Subtotal', align: 'num' },
]
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="cargos-titulo">
    <div class="ds-block-head">
      <h3 id="cargos-titulo" class="ds-title titulo">Los cargos que lo componen</h3>
      <p class="ds-meta descripcion">
        Lo devengado que entró en este documento: el servicio se prestó y aquí se facturó.
      </p>
    </div>

    <!-- El cruce no se pudo demostrar completo: se dice, y no se pinta una tabla
         que parecería la lista entera. -->
    <ContractGapNotice
      v-if="lines && !lines.complete && !loading && !error"
      title="No se pueden enseñar los renglones de este documento"
      :reason="
        `El servidor no sabe devolver «los cargos del documento»: solo devuelve los del contrato ` +
        `#${subscriptionId}. Los que se cruzaron aquí suman ` +
        `${formatAmount(lines.subtotal)} y el documento dice ` +
        `${formatAmount(lines.documentSubtotal)}, así que el cruce está incompleto` +
        (lines.truncated
          ? ' — el contrato tiene más cargos de los que caben en una consulta.'
          : '.')
      "
      needed="Un filtro `billingDocumentId` en `GET /subscription-billing/charges`, o una ruta que
        devuelva los cargos de un documento."
    />

    <AppTable
      v-else
      money
      :headers="HEADERS"
      :empty="!lines || lines.rows.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Ningún cargo entró en este documento"
          description="El documento existe y no tiene renglones detrás. Un documento sin cargos es un dato que merece revisarse, no un vacío normal."
        />
      </template>

      <tr v-for="charge in lines?.rows ?? []" :key="charge.id" class="ds-row-hover">
        <td>
          <span class="ds-text-strong">{{ charge.description }}</span>
          <span class="ds-meta linea">
            {{ CHARGE_TYPE_PRESENTATION[charge.chargeType].label }} · cargo #{{ charge.id }}
          </span>
        </td>
        <td>
          {{ formatDate(charge.servicePeriodStart) }} → {{ formatDate(charge.servicePeriodEnd) }}
        </td>
        <td class="ds-num">{{ charge.quantity }} × {{ formatAmount(charge.unitAmount) }}</td>
        <td class="ds-num">{{ formatAmount(charge.subtotalAmount) }}</td>
      </tr>
    </AppTable>

    <dl v-if="lines && lines.complete && lines.rows.length > 0" class="ds-detail-grid cuentas">
      <div>
        <dt class="ds-label">Suma de los renglones</dt>
        <dd class="ds-num">{{ formatAmount(lines.subtotal) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Subtotal del documento</dt>
        <dd class="ds-num ds-text-strong">{{ formatAmount(lines.documentSubtotal) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.titulo,
.descripcion {
  margin: 0;
}

.linea {
  display: block;
}

.cuentas {
  max-width: 34rem;
}
</style>
