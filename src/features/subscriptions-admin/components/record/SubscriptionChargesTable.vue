<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { formatDate } from '@/composables/format'
import { formatDocumentAmount } from '@/features/billing-operations/composables/billingFormat'
import {
  chargeAmountClass,
  chargeAmountReading,
  chargeOriginLabel,
  voidBadgeLabel,
} from '../../composables/subscriptionMoneyText'
import {
  CHARGE_STATUS_PRESENTATION,
  CHARGE_TYPE_PRESENTATION,
  type SubscriptionChargeResponse,
} from '../../types/subscription-money.types'
import ChargeChain from './ChargeChain.vue'

/**
 * <b>Devengado</b>: el servicio se prestó. Una fila por cargo.
 *
 * <p><b>Ni una celda editable.</b> Un cargo no se corrige: se emite otro cargo
 * negativo que lo anula, y los dos quedan (§3.2). Por eso no hay «Editar» —la
 * operación no existe, así que no está en el marcado— ni un `<input disabled>`,
 * que diría «editable, pero ahora no»: mentira dos veces sobre un asiento
 * contable.
 *
 * <p><b>El signo, con la convención declarada.</b> El importe negativo lleva
 * `ds-amount--neg` <b>y</b> su lectura en texto <b>y</b> el distintivo «Anula el
 * cargo #N». El color nunca porta él solo la información (§5.2, WCAG §1.4.1), y
 * de hecho el signo «−» ya está en la cifra. Pintar ese negativo como si fuera un
 * error sería mentir sobre la contabilidad: sumado a su original da cero, que es
 * justo lo que hace que las cuentas cierren.
 *
 * <p><b>Todo importe va con `.ds-num`</b> (`primitives.css:1296`): alineado a la
 * derecha y con cifras tabulares. Una columna de dinero sin `tabular-nums` no se
 * puede escanear, y esta es una tabla que se lee en vertical buscando la cifra
 * rara.
 *
 * <p>Sin símbolo de moneda, y no es un descuido: `SubscriptionChargeResponse` no
 * declara `currency` —igual que `BillingDocumentResponse`—, así que se usa
 * `formatDocumentAmount()`, el mismo formateador que ya eligió la pantalla de
 * cobranza por esta misma razón. Rotular «$» sobre una cifra cuya divisa el
 * servidor no declara es inventar el dato.
 *
 * <p>La tabla va dentro de `.ds-table-scroll` (lo pone `AppTable`): es ancha y
 * §1.4.10 Reflow exige desplazarla, no truncarla.
 */
defineProps<{
  rows: SubscriptionChargeResponse[]
  companyId: number
  subscriptionId: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
  /** Número del documento por id, para que la cadena enseñe «DC-2026-00184» y no «#7». */
  documentNumbers: Record<number, string>
  /** Hay un filtro por documento puesto: el vacío significa otra cosa. */
  filteredByDocument: boolean
  /**
   * El otrosí del que se viene por `?otrosi=`, si lo hay. Sus cargos se señalan
   * con <b>texto</b> —«Del otrosí que traías»— y no con un fondo: un matiz de
   * color no tiene nombre accesible y aquí lo señalado es lo que se buscaba.
   */
  highlightedAmendmentId: number | null
  /**
   * La línea del contrato de la que se viene por `?item=`, si la hay. «Lo
   * contratado» enlaza aquí con «los cargos que generó» esta línea, y sus cargos se
   * señalan con el mismo criterio: <b>texto</b>, no un fondo.
   */
  highlightedItemId: number | null
}>()

defineEmits<{ retry: []; focusDocument: [documentId: number] }>()
</script>

<template>
  <AppTable
    :headers="[
      'Concepto',
      'Periodo de servicio',
      'Cantidad × unitario',
      'Importe',
      'Estado',
      'De dónde sale',
    ]"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <p v-if="filteredByDocument">
        Ningún cargo de esta página pertenece a esa cuenta de cobro. Puede tenerlos en otra página:
        el servidor no permite pedir los cargos de un documento concreto.
      </p>
      <p v-else>
        Este contrato no tiene ningún cargo devengado con el estado seleccionado. Devengar es que el
        servicio se prestó; que no haya ninguno no significa que no se haya facturado nada.
      </p>
    </template>

    <!-- `id` estable como ancla de llegada y `tabindex="-1"` para poder recibir el
         foco. Negativo: no añade una parada de tabulación por fila. -->
    <tr
      v-for="charge in rows"
      :id="`cargo-${charge.id}`"
      :key="charge.id"
      tabindex="-1"
      class="ds-row-hover ds-focus-ring"
    >
      <td>
        <span class="ds-text-strong">{{ charge.description }}</span>
        <span class="ds-meta bloque">
          {{ CHARGE_TYPE_PRESENTATION[charge.chargeType].label }} · cargo #{{ charge.id }}
        </span>
        <span
          v-if="highlightedAmendmentId != null && charge.amendmentId === highlightedAmendmentId"
          class="ds-meta bloque"
        >
          <AppBadge variant="neutral" label="Del otrosí que traías" />
        </span>
        <span
          v-if="highlightedItemId != null && charge.subscriptionItemId === highlightedItemId"
          class="ds-meta bloque"
        >
          <AppBadge variant="neutral" label="De la línea que traías" />
        </span>
      </td>

      <td>
        {{ formatDate(charge.servicePeriodStart) }} → {{ formatDate(charge.servicePeriodEnd) }}
        <!-- Se dice qué es esta fecha, porque es la que más se confunde: NO es
             cuándo se facturó ni cuándo se cobró. -->
        <span class="ds-meta bloque">Cuándo se prestó el servicio</span>
      </td>

      <td class="ds-num">{{ charge.quantity }} × {{ formatDocumentAmount(charge.unitAmount) }}</td>

      <td class="ds-num">
        <span :class="chargeAmountClass(charge)">{{ chargeAmountReading(charge).amount }}</span>
        <span class="ds-meta bloque lectura">{{ chargeAmountReading(charge).sentence }}</span>
      </td>

      <td>
        <AppBadge
          :variant="CHARGE_STATUS_PRESENTATION[charge.status].variant"
          :label="CHARGE_STATUS_PRESENTATION[charge.status].label"
        />
        <!-- El distintivo textual de la anulación, ADEMÁS del importe negativo. -->
        <span v-if="voidBadgeLabel(charge)" class="ds-meta bloque">
          {{ voidBadgeLabel(charge) }}
        </span>
      </td>

      <td :title="chargeOriginLabel(charge)">
        <ChargeChain
          :charge="charge"
          :company-id="companyId"
          :subscription-id="subscriptionId"
          :document-number="
            charge.billingDocumentId == null
              ? null
              : (documentNumbers[charge.billingDocumentId] ?? null)
          "
          @focus-document="$emit('focusDocument', $event)"
        />
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
/* Solo geometría: el color de `.ds-meta` y el del signo vienen de las
   primitivas globales. Una regla base con color aquí pesaría (0,2,0) y les
   ganaría (trampa de especificidad de `AGENTS.md`). */
.bloque {
  display: block;
}

/* La lectura del importe acompaña a la cifra y se alinea con ella, que está a
   la derecha por `.ds-num`. */
.lectura {
  max-width: 18rem;
  text-align: right;
}
</style>
