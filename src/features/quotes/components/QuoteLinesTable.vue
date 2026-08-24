<script setup lang="ts">
import { formatCurrency } from '@/composables/format'
import { itemTypeLabel, taxTreatmentLabel, type QuoteLineResponse } from '../types/quotes.types'

/**
 * Las líneas de la oferta — **copias congeladas**, no referencias al catálogo.
 *
 * <p>Se pinta `itemName` tal y como quedó guardado el día de la emisión. Si el catálogo lo
 * renombró después, se añade debajo «Hoy se llama "…"»: eso es fidelidad al documento **y**
 * utilidad para soporte, que es quien recibe la llamada de «yo compré otra cosa».
 *
 * <p>Todo importe lleva `.ds-num` (alineado a la derecha, cifras tabulares). Una columna de dinero
 * sin cifras tabulares no se puede escanear, y la regla no admite excepciones.
 *
 * <p>La tabla se desplaza dentro de `.ds-table-scroll` en vez de recortarse: es ancha a propósito
 * y WCAG 2.2 §1.4.10 (Reflow) no permite que el cuerpo de la página arrastre en horizontal.
 */
const props = defineProps<{
  lines: QuoteLineResponse[]
  /** Nombre que el artículo tiene HOY, para delatar un renombrado. Opcional: es una ayuda. */
  currentName?: (catalogItemId: number) => string | undefined
}>()

function renamedTo(line: QuoteLineResponse): string | null {
  const today = props.currentName?.(line.catalogItemId)
  if (!today || today === line.itemName) return null
  return today
}

/** «19 % gravado» / «Exento». El tratamiento es copia congelada y puede ser un código retirado. */
function taxLabel(line: QuoteLineResponse): string {
  const treatment = taxTreatmentLabel(line.taxTreatment)
  return line.taxRate > 0 ? `${line.taxRate} % · ${treatment}` : treatment
}
</script>

<template>
  <div class="ds-table-scroll">
    <table class="ds-table">
      <caption class="ds-sr-only">
        Líneas de la oferta, con el precio y el impuesto congelados al emitirla
      </caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Artículo</th>
          <th scope="col" class="ds-num">Cantidad</th>
          <th scope="col" class="ds-num">Precio unitario</th>
          <th scope="col" class="ds-num">Bruto</th>
          <th scope="col" class="ds-num">Descuento</th>
          <th scope="col">Impuesto</th>
          <th scope="col" class="ds-num">Total línea</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in lines" :key="line.id">
          <td>{{ line.lineNumber }}</td>
          <td>
            <span class="ds-text-strong">{{ line.itemName }}</span>
            <span class="ds-meta"> · {{ line.itemCode }} · {{ itemTypeLabel(line.itemType) }}</span>
            <p v-if="renamedTo(line)" class="ds-meta renombrado">
              Hoy se llama «{{ renamedTo(line) }}»
            </p>
          </td>
          <td class="ds-num">
            {{ line.quantity }}
            <span v-if="line.includedQuantity > 0" class="ds-meta">
              · {{ line.includedQuantity }} incluidas
            </span>
          </td>
          <td class="ds-num">{{ formatCurrency(line.unitAmount) }}</td>
          <td class="ds-num">{{ formatCurrency(line.grossAmount) }}</td>
          <td class="ds-num">
            {{ formatCurrency(line.discountAmount) }}
            <span v-if="line.discountPercent > 0" class="ds-meta">
              · {{ line.discountPercent }} %
            </span>
          </td>
          <td>
            {{ taxLabel(line) }}
            <span class="ds-meta"> · {{ formatCurrency(line.taxAmount) }}</span>
          </td>
          <td class="ds-num ds-text-strong">{{ formatCurrency(line.lineTotal) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.renombrado {
  margin: var(--space-2) 0 0;
}
</style>
