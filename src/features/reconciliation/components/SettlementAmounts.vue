<script setup lang="ts">
import { computed } from 'vue'
import { Info, TriangleAlert } from 'lucide-vue-next'
import { formatAmount } from '@/composables/format'
import {
  joinSpanish,
  negativeAmountLabels,
  settlementAmountsBalance,
} from '../composables/reconciliationVerdict'
import type { GatewaySettlementResponse } from '../types/reconciliation.types'
import MoneyCaption from '@/components/ui/MoneyCaption.vue'

/**
 * <b>Los cinco importes del lote</b>: bruto, comisión, impuesto de la comisión,
 * neto y gravamen de salida — más el coste total, que el servidor deriva.
 *
 * <p><b>Los negativos se pintan con su signo y se explican.</b> Un contracargo
 * dentro del lote resta, y un mes con más devoluciones que cobros puede dejar el
 * bruto por debajo de cero. Es un dato legítimo y frecuente al cierre; pasarlo a
 * valor absoluto —o esconderlo como si fuera un error de carga— convierte una
 * devolución de dos millones en un ingreso de dos millones, que es el peor error
 * posible en esta pantalla. El aviso está para que nadie lo lea como dato roto.
 *
 * <p><b>La cuenta se contrasta.</b> `bruto − comisión − impuesto − gravamen`
 * debería dar el neto, pero el neto viene del registro y no derivado, así que un
 * lote dado de alta a mano puede no cuadrar consigo mismo. Se compara con una
 * tolerancia de un peso, porque el redondeo del gravamen produce céntimos que no
 * son un descuadre.
 *
 * <p>⚠️ Este lote agrupa cobros de <b>muchas clínicas</b>. Aquí no se pinta
 * ninguna empresa, ni ningún enlace que lleve a una: el agregado se lee como
 * agregado.
 */
const props = defineProps<{ settlement: GatewaySettlementResponse }>()

const rows = computed(() => [
  { key: 'gross', label: 'Bruto cobrado', value: props.settlement.grossAmount, strong: true },
  {
    key: 'fee',
    label: 'Comisión de la pasarela',
    value: props.settlement.feeAmount,
    strong: false,
  },
  {
    key: 'feeTax',
    label: 'Impuesto de la comisión',
    value: props.settlement.feeTaxAmount,
    strong: false,
  },
  {
    key: 'gmf',
    label: 'Gravamen de salida',
    value: props.settlement.gmfAmount,
    strong: false,
  },
  { key: 'net', label: 'Neto liquidado', value: props.settlement.netAmount, strong: true },
])

const negatives = computed(() => negativeAmountLabels(props.settlement))
const balance = computed(() => settlementAmountsBalance(props.settlement))

const negativesText = computed(() => {
  const list = negatives.value
  if (list.length === 0) return ''
  return `Este lote trae ${list.length === 1 ? 'un importe' : 'importes'} en negativo (${joinSpanish(list)}).`
})
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <div class="ds-table-scroll">
      <table class="ds-table">
        <MoneyCaption>Los cinco importes de la liquidación y lo que costó cobrar.</MoneyCaption>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row" :class="row.strong ? 'ds-text-strong' : ''">{{ row.label }}</th>
            <td class="ds-num">{{ formatAmount(row.value) }}</td>
          </tr>
          <tr>
            <th scope="row">
              Lo que costó cobrar
              <span class="ds-meta"> · comisión + impuesto + gravamen, derivado</span>
            </th>
            <td class="ds-num">{{ formatAmount(settlement.totalCost) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="negatives.length > 0" class="ds-banner ds-banner--info ds-banner--sm" role="status">
      <Info :size="15" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        {{ negativesText }} No es un dato roto: un contracargo dentro del lote resta, y un mes con
        más devoluciones que cobros deja el bruto por debajo de cero. Se muestra con su signo a
        propósito.
      </span>
    </p>

    <p v-if="!balance.balanced" class="ds-banner ds-banner--warning ds-banner--sm" role="status">
      <TriangleAlert :size="15" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Los cinco importes no cuadran entre sí: bruto menos costes da
        <span class="ds-num">{{ formatAmount(balance.expectedNet) }}</span>
        y el neto registrado es
        <span class="ds-num">{{ formatAmount(settlement.netAmount) }}</span>
        — sobran
        <span class="ds-num">{{ formatAmount(balance.gap) }}</span>
        . Revisa el registro del lote antes de casarlo con el abono.
      </span>
    </p>
  </div>
</template>
