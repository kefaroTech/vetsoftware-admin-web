<script setup lang="ts">
import { computed } from 'vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatDate } from '@/composables/format'
import {
  TRIAL_GRANT_NOT_REVOCABLE,
  TRIAL_POLICY_OUTCOME_LABEL,
  trialGrantTrimmed,
  type TrialGrantState,
} from '../composables/trialWindowText'
import type { CompanyTrialGrantResponse } from '../types/trials.types'

/**
 * <b>Las concesiones de una prueba, y qué le pasó a cada una al vencer.</b>
 *
 * <p>Dos columnas que parecen la misma y no lo son, y por eso van juntas y
 * separadas: <b>«Debía terminar en»</b> es la política escrita el día que se
 * concedió, y <b>«Terminó en»</b> es el desenlace. Cuando no coinciden hay una
 * conversación pendiente con el cliente; cuando el desenlace está en blanco y la
 * fecha ya pasó, hay trabajo pendiente aquí dentro. Rellenar ese hueco con
 * «Abandonada» sería inventarse una decisión que nadie tomó (R14).
 *
 * <p><b>La única acción posible es escribir el desenlace, y solo aparece cuando
 * toca.</b> Una concesión no se desconcede —el contrato no publica borrado ni
 * revocación—, así que no hay ni habrá botón que lo sugiera; la frase que lo
 * explica va debajo de la tabla, porque quien busque el botón tiene que
 * encontrar el motivo de que no exista. Lo que sí se puede hacer es cerrarla con
 * lo que pasó, y ese botón se pinta <b>solo en las filas que lo esperan</b>:
 * `state.awaitingOutcome`, es decir, las que ya vencieron y siguen en blanco.
 * Ofrecerlo sobre una prueba viva invitaría a cerrarla antes de tiempo, y sobre
 * una ya cerrada prometería una corrección que no existe.
 *
 * <p>⚠️ El artículo se identifica por su número. `CompanyTrialGrantResponse`
 * expone `catalogItemId` y nada más —ni código ni nombre—, y resolverlo con una
 * llamada por fila sería peor que el problema. Se pinta el número con nombre
 * accesible en vez de dejar una celda opaca.
 */
const props = withDefaults(
  defineProps<{
    rows: { grant: CompanyTrialGrantResponse; state: TrialGrantState }[]
    loading?: boolean
    error?: string | null
    errorTraceId?: string | null
    /**
     * Si esta pantalla puede escribir desenlaces. Va explícito y por defecto a
     * `false`: la tabla la monta también el expediente del contrato, que es de
     * lectura, y una columna de acciones que aparece sola donde nadie la pidió es
     * cómo se acaba escribiendo desde una pantalla que no debía escribir.
     */
    canRecordOutcome?: boolean
  }>(),
  { canRecordOutcome: false },
)

defineEmits<{ retry: []; 'record-outcome': [grant: CompanyTrialGrantResponse] }>()

const BASE_HEADERS = [
  'Artículo',
  'Concedida el',
  'Último día, incluido',
  'Días',
  'Debía terminar en',
  'Terminó en',
]

const headers = computed(() =>
  props.canRecordOutcome ? [...BASE_HEADERS, 'Acciones'] : BASE_HEADERS,
)
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Concesiones de la ventana de prueba"
      :headers="headers"
      :empty="rows.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Esta ventana no tiene concesiones"
          description="La ventana existe, pero todavía no se ha probado ningún artículo dentro de ella."
        />
      </template>

      <tr v-for="row in rows" :key="row.grant.id" class="ds-row-hover">
        <td>
          <span class="num" :aria-label="`Artículo de catálogo ${row.grant.catalogItemId}`">
            #{{ row.grant.catalogItemId }}
          </span>
        </td>
        <td>{{ formatDate(row.grant.grantedOn) }}</td>
        <td>{{ formatDate(row.grant.trialEndDate) }}</td>
        <td>
          <span class="num">{{ row.grant.effectiveDays }}</span>
          <span v-if="trialGrantTrimmed(row.grant)" class="ds-meta recorte">
            {{ trialGrantTrimmed(row.grant) }}
          </span>
        </td>
        <td>{{ TRIAL_POLICY_OUTCOME_LABEL[row.grant.policyTrialOutcome] }}</td>
        <td><AppBadge :variant="row.state.variant" :label="row.state.label" /></td>
        <td v-if="canRecordOutcome">
          <!-- Solo en las filas que ya vencieron sin desenlace. En las demás la
               celda queda vacía a propósito: no hay nada que hacerles. -->
          <button
            v-if="row.state.awaitingOutcome"
            type="button"
            class="ds-btn ds-btn--ghost ds-btn--sm"
            @click="$emit('record-outcome', row.grant)"
          >
            Escribir el desenlace
            <span class="ds-sr-only">
              del artículo {{ row.grant.catalogItemId }}, que terminó el
              {{ formatDate(row.grant.trialEndDate) }}
            </span>
          </button>
        </td>
      </tr>
    </AppTable>

    <p class="ds-meta">{{ TRIAL_GRANT_NOT_REVOCABLE }}</p>
  </div>
</template>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}

/* El recorte se lee bajo el número, no a su lado: es una explicación de esa
   cifra y en una fila estrecha tiene que poder envolver sin empujar columnas. */
.recorte {
  display: block;
}
</style>
