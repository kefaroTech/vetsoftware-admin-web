<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount } from '@/composables/format'
import { amountGap, lacksExternalInvoice } from '../composables/reconciliationVerdict'
import type { ExternalInvoiceReconciliationResponse } from '../types/reconciliation.types'
import MoneyCaption from '@/components/ui/MoneyCaption.vue'

/**
 * <b>Los cuatro números enfrentados</b>: nuestro total y el suyo, nuestro
 * impuesto y el suyo.
 *
 * <p><b>Es una tabla y no cuatro tarjetas.</b> La pregunta es una comparación
 * —«¿coinciden?»— y una comparación se lee por filas: en cada una, lo que
 * calculamos, lo que dice el emisor y lo que separa a los dos. Cuatro cifras
 * sueltas obligan a hacer la resta con la vista.
 *
 * <p><b>Un hueco honesto antes que un cero inventado.</b> Mientras no hay factura
 * del emisor, `externalTotal` y `externalTax` llegan vacíos: se pinta «—» y una
 * línea que dice que todavía no hay con qué comparar. Poner ahí un cero
 * fabricaría una diferencia del tamaño de la factura entera y convertiría un
 * documento sin facturar en un descuadre — que es otra cosa, se arregla de otra
 * manera y la aritmética no sabe distinguir.
 *
 * <p><b>La diferencia del servidor va aparte y se enseña tal cual.</b> El contrato
 * trae un solo `difference` sin decir de cuál de los dos pares es; las dos de la
 * tabla se derivan aquí de los cuatro números y sirven para ver si lo que baila
 * es el total o solo el impuesto. Si las dos no cuadran con la del servidor,
 * manda la del servidor y la pantalla enseña las tres en vez de elegir por su
 * cuenta.
 */
const props = defineProps<{ reconciliation: ExternalInvoiceReconciliationResponse }>()

const missing = computed(() => lacksExternalInvoice(props.reconciliation))
const gap = computed(() => amountGap(props.reconciliation))

const rows = computed(() => [
  {
    key: 'total',
    concept: 'Total del documento',
    ours: props.reconciliation.computedTotal,
    theirs: props.reconciliation.externalTotal,
    gap: gap.value.total,
  },
  {
    key: 'tax',
    concept: 'Impuesto',
    ours: props.reconciliation.computedTax,
    theirs: props.reconciliation.externalTax,
    gap: gap.value.tax,
  },
])
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <div class="ds-table-scroll">
      <table class="ds-table">
        <MoneyCaption
          >Comparación entre lo que calculó la plataforma y lo que declaró el facturador
          externo.</MoneyCaption
        >
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Lo que calculamos</th>
            <th scope="col">Lo que dice el emisor</th>
            <th scope="col">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row" class="ds-text-strong">{{ row.concept }}</th>
            <td class="ds-num">{{ formatAmount(row.ours) }}</td>
            <td class="ds-num">{{ formatAmount(row.theirs) }}</td>
            <td class="ds-num">{{ formatAmount(row.gap) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="missing" class="ds-meta">
      El emisor todavía no ha declarado nada, así que no hay con qué comparar. Los huecos son
      huecos: un cero aquí sería una diferencia inventada del tamaño de la factura.
    </p>

    <p v-else-if="reconciliation.difference !== null" class="ds-meta">
      Diferencia declarada por el servidor:
      <span class="ds-num">{{ formatAmount(reconciliation.difference) }}</span>
      . Es la que manda; las de la tabla se derivan de los cuatro números para ver si lo que baila
      es el total o solo el impuesto.
    </p>
  </div>
</template>
