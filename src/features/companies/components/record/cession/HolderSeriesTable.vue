<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatDate } from '@/composables/format'
import {
  BILLING_TAX_REGIME_LABEL,
  PERSON_KIND_LABEL,
  billingProfileName,
  billingProfileTaxId,
  type HolderState,
} from '../../../composables/companyCessionText'
import type { CompanyBillingProfileResponse } from '../../../types/company-cession.types'

/**
 * <b>La serie de titulares del contrato</b>: quién respondió por esta empresa y
 * entre qué fechas.
 *
 * <p><b>Es una serie y no un estado, y la tabla existe para que eso se vea.</b>
 * Un titular anterior no es un dato caducado que estorbe: es lo que explica a
 * quién se facturó en marzo, y por eso sigue en la lista con su tramo. La
 * pregunta «¿cuántas veces se ha cedido este contrato?» se contesta contando
 * filas menos una —el primer titular llegó por el alta, no por una cesión—, y esa
 * cuenta la hace el composable, no esta tabla.
 *
 * <p><b>No hay columna de acciones y no falta ninguna.</b> Un titular no se edita
 * ni se borra: el contrato no publica ni `PUT` ni `DELETE` sobre el perfil de
 * facturación, y no los publica a propósito. Editar en sitio haría que una
 * factura del año pasado cambiara de destinatario; borrar dejaría un tramo de
 * tiempo sin nadie que respondiera por él. La única escritura es suceder, y su
 * botón vive en la cabecera de la pantalla porque es una acción sobre el
 * contrato, no sobre una fila.
 *
 * <p><b>«Hasta» en blanco no se pinta en blanco.</b> Un `validTo` nulo significa
 * «sigue abierto», que es distinto de «no se sabe», y una celda vacía se lee como
 * lo segundo.
 */
defineProps<{
  rows: { profile: CompanyBillingProfileResponse; state: HolderState }[]
  loading?: boolean
  error?: string | null
  errorTraceId?: string | null
}>()

defineEmits<{ retry: [] }>()

const HEADERS = ['Titular', 'Documento', 'Tipo', 'Régimen', 'Desde', 'Hasta', 'Estado']
</script>

<template>
  <AppTable
    caption="Titulares de la empresa"
    :headers="HEADERS"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <AppEmptyState
        title="Esta empresa no tiene ningún titular registrado"
        description="Nunca se le abrió un perfil de facturación. Lo que hace falta aquí no es una cesión —no hay a quién suceder— sino dar de alta el primer titular."
      />
    </template>

    <tr v-for="row in rows" :key="row.profile.id" class="ds-row-hover">
      <td>{{ billingProfileName(row.profile) }}</td>
      <td class="num">{{ billingProfileTaxId(row.profile) }}</td>
      <td>{{ PERSON_KIND_LABEL[row.profile.personKind] }}</td>
      <td>{{ BILLING_TAX_REGIME_LABEL[row.profile.taxRegime] }}</td>
      <td>{{ formatDate(row.profile.validFrom) }}</td>
      <td>
        <template v-if="row.profile.validTo">{{ formatDate(row.profile.validTo) }}</template>
        <span v-else class="ds-meta">sigue abierto</span>
      </td>
      <td><AppBadge :variant="row.state.variant" :label="row.state.label" /></td>
    </tr>
  </AppTable>
</template>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}
</style>
