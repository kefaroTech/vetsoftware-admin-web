<script setup lang="ts">
import { computed } from 'vue'
import MissingDataNote from '../MissingDataNote.vue'
import CardState from '../summary/CardState.vue'
import FiscalFact from './FiscalFact.vue'
import {
  FISCAL_MISSING_DATA_TITLE,
  NO_WITHHOLDING_TEXT,
  WITHHOLDING_RULES_GAP,
  formatWithholdingRate,
} from '../../../composables/companyFiscalText'
import type { WithholdingConfigDto } from '../../../types/company-fiscal.types'

/**
 * <b>Las tarifas de retención que se espera que aplique la clínica</b> — la parte
 * de §I7 que sí tiene endpoint (`GET /withholding-configs`).
 *
 * <p><b>Las tres tarifas no comparten unidad</b>, y esa es la razón por la que este
 * componente existe en vez de tres líneas sueltas en la vista: reteFuente y reteIVA
 * son porcentajes, y reteICA va <b>por mil</b>. El contrato declara los tres como el
 * mismo número, así que la unidad la pone `formatWithholdingRate`, que documenta de
 * dónde sale. Pintar el ICA con un `%` enseñaría una tarifa diez veces mayor a la
 * persona que la está comprobando.
 *
 * <p><b>Una tarifa ausente no es una tarifa del cero por ciento.</b> Ninguno de los
 * campos es obligatorio en el contrato, y un `0 %` puesto por defecto se lee como
 * «no retiene», que es una afirmación distinta de «nadie lo ha declarado». Cuando
 * falta, se dice que falta.
 */
const props = defineProps<{
  withholding: WithholdingConfigDto | null
  hasNoWithholding: boolean
  loading: boolean
  error: string | null
}>()

/**
 * Las tres, ya formateadas y con su unidad. `null` = no declarada, y la plantilla
 * lo dice con palabras. Se resuelven aquí y no en la plantilla para que las tres
 * líneas del marcado sean idénticas y no haya sitio donde colar un `%` al ICA.
 */
const tarifas = computed(() => [
  {
    key: 'reteFuente',
    label: 'Retención en la fuente',
    hint: 'Se aplica sobre la base gravable.',
    value: formatWithholdingRate(props.withholding?.reteFuenteRate, '%'),
  },
  {
    key: 'reteIva',
    label: 'Retención de IVA',
    hint: 'Se aplica sobre el IVA generado, no sobre la base.',
    value: formatWithholdingRate(props.withholding?.reteIvaRate, '%'),
  },
  {
    key: 'reteIca',
    label: 'Retención de ICA',
    hint: 'Va por mil (‰), no por ciento: es la unidad con la que el sistema la calcula.',
    value: formatWithholdingRate(props.withholding?.reteIcaRate, '‰'),
  },
])
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14">
    <h3 class="ds-item-label ds-item-label--lg titulo">Retenciones esperadas</h3>

    <CardState :loading="loading" :error="error">
      <p v-if="hasNoWithholding" class="parrafo">{{ NO_WITHHOLDING_TEXT }}</p>

      <dl v-else-if="withholding" class="ds-detail-grid lista">
        <FiscalFact v-for="tarifa in tarifas" :key="tarifa.key" :label="tarifa.label" wide>
          <span v-if="tarifa.value" class="ds-text-strong ds-num">{{ tarifa.value }}</span>
          <span v-else>No declarada. No es lo mismo que una tarifa del cero.</span>
          <span class="ds-meta pista">{{ tarifa.hint }}</span>
        </FiscalFact>
      </dl>

      <MissingDataNote
        :title="FISCAL_MISSING_DATA_TITLE"
        :what="WITHHOLDING_RULES_GAP.what"
        :why="WITHHOLDING_RULES_GAP.why"
        :blocked-by="WITHHOLDING_RULES_GAP.blockedBy"
      />
    </CardState>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
}

.parrafo {
  margin: 0;
}

.lista {
  margin: 0;
}

/* La aclaración de unidad va debajo del número y no al lado: al lado compite con
   la cifra, que es lo que hay que leer primero. */
.pista {
  display: block;
}
</style>
