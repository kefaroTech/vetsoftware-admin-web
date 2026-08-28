<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { formatDocumentAmount } from '@/features/billing-operations/composables/billingFormat'
import type { BillingDocumentTaxSummary } from '@/features/billing-operations/types/billing-operations.types'
import ContractGapNotice from './ContractGapNotice.vue'
import { TAX_TOLERANCE, TAX_TREATMENT_PRESENTATION } from '../types/billing-documents.types'

/**
 * <b>Bloque 3 · el desglose de impuestos</b>, y el veredicto de los dos pesos.
 *
 * <p>Una fila por tratamiento y tarifa, con la base y el importe.
 * <b>Excluido y exento no se colapsan</b> en «tarifa cero»: son dos filas con dos
 * rótulos, porque son dos cosas distintas y su diferencia decide si el emisor
 * puede descontar el IVA de sus compras.
 *
 * <p><b>El veredicto es la razón de ser de este bloque.</b> La plataforma calcula
 * el impuesto <b>una vez sobre la base agregada</b>; el emisor externo lo calcula
 * <b>línea a línea</b>. Las dos formas son correctas y llegan a cifras que
 * difieren en unos pesos. Por eso hay tres veredictos y no dos:
 *
 * <ul>
 *   <li><b>Cuadra</b> — la suma de las filas da exactamente el impuesto del
 *       documento.</li>
 *   <li><b>Dentro de la tolerancia</b> — difieren en {@code ≤ 2}. El documento
 *       está <b>cerrado</b>, no en mora, y la pantalla lo dice con esas palabras.
 *       Sin esta rama, cada documento con dos pesos de resto manda a alguien a
 *       perseguir una diferencia que no existe, y cada uno de esos viajes termina
 *       en «déjalo así» sin que quede escrito por qué.</li>
 *   <li><b>Discrepa</b> — pasa de la tolerancia y sí hay algo que mirar.</li>
 * </ul>
 *
 * <p>El umbral se escribe en pantalla («tolerancia de 2»): un límite que no se ve
 * es un límite que nadie puede rebatir. Y el veredicto va en <b>texto</b> con su
 * icono, nunca solo en un tono (§5.2, WCAG 2.2 §1.4.1).
 */
defineProps<{
  taxes: BillingDocumentTaxSummary[]
  subtotal: number
  /** Lo que dice el documento, la suma de las filas y su diferencia. */
  check: {
    declared: number
    summed: number
    difference: number
    verdict: 'MATCHED' | 'WITHIN_TOLERANCE' | 'MISMATCH'
  } | null
}>()

const VERDICT_TEXT = {
  MATCHED: 'Cuadra: la suma de las filas da exactamente el impuesto del documento.',
  WITHIN_TOLERANCE:
    'Dentro de la tolerancia. Tú calculas el impuesto una vez sobre la base agregada y el ' +
    'emisor externo lo calcula línea a línea: de ahí salen estos pesos de resto. El documento ' +
    'está cerrado, no en mora.',
  MISMATCH:
    'Discrepa. La diferencia pasa de la tolerancia, así que no la explica el redondeo del ' +
    'cálculo línea a línea: hay algo que revisar en el desglose.',
} as const

const VERDICT_TONE = {
  MATCHED: 'ds-banner--success',
  WITHIN_TOLERANCE: 'ds-banner--info',
  MISMATCH: 'ds-banner--warning',
} as const

const VERDICT_ICON = {
  MATCHED: ICONS.SUCCESS,
  WITHIN_TOLERANCE: ICONS.INFO,
  MISMATCH: ICONS.WARNING,
} as const
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="impuestos-titulo">
    <div class="ds-block-head">
      <h3 id="impuestos-titulo" class="ds-title titulo">Desglose de impuestos</h3>
      <p class="ds-meta descripcion">
        Una fila por tratamiento y tarifa. Tolerancia aplicada: {{ TAX_TOLERANCE }}.
      </p>
    </div>

    <ContractGapNotice
      v-if="taxes.length === 0"
      title="Este documento no trae desglose de impuestos"
      reason="La respuesta devuelve la lista de impuestos vacía. Puede ser un documento sin
        impuesto o un desglose que no se guardó; desde aquí no se distinguen los dos casos, así
        que no se escribe «0» sobre algo que no se sabe."
      needed="Que la respuesta distinga «sin impuesto» de «sin desglose guardado»."
    />

    <div v-else class="ds-table-scroll">
      <table class="ds-table ds-table--dense">
        <thead>
          <tr>
            <th scope="col">Tratamiento</th>
            <th scope="col">Tarifa</th>
            <th scope="col">Base gravable</th>
            <th scope="col">Impuesto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tax in taxes" :key="tax.id" class="ds-row-hover">
            <td>
              <span class="ds-text-strong">{{
                TAX_TREATMENT_PRESENTATION[tax.taxTreatment].label
              }}</span>
              <span class="ds-meta linea">{{
                TAX_TREATMENT_PRESENTATION[tax.taxTreatment].meaning
              }}</span>
            </td>
            <td class="ds-num">{{ tax.taxRate }} %</td>
            <td class="ds-num">{{ formatDocumentAmount(tax.taxableBase) }}</td>
            <td class="ds-num">{{ formatDocumentAmount(tax.taxAmount) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colspan="2">Suma de las filas</th>
            <td class="ds-num">{{ formatDocumentAmount(subtotal) }}</td>
            <td class="ds-num">{{ formatDocumentAmount(check?.summed) }}</td>
          </tr>
          <tr>
            <th scope="row" colspan="3">Impuesto que declara el documento</th>
            <td class="ds-num">{{ formatDocumentAmount(check?.declared) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- El veredicto no interrumpe: es información, no una alerta. Su texto lleva
         el significado íntegro; el tono y el icono solo lo refuerzan. -->
    <div v-if="check && taxes.length > 0" class="ds-banner" :class="VERDICT_TONE[check.verdict]">
      <component :is="VERDICT_ICON[check.verdict]" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        <strong>Diferencia: {{ formatDocumentAmount(check.difference) }}.</strong>
        {{ VERDICT_TEXT[check.verdict] }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.titulo,
.descripcion {
  margin: 0;
}

/* El significado del tratamiento va bajo su rótulo, no en otra columna:
   pertenece al tratamiento y no es un dato independiente. */
.linea {
  display: block;
}
</style>
