<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CapacityMeter from '@/components/ui/CapacityMeter.vue'
import ProvenanceLine from '@/components/ui/ProvenanceLine.vue'
import {
  capacityNoun,
  capacityTitle,
} from '@/features/subscriptions-admin/composables/entitlementText'
import { SUBSCRIPTION_RECORD_ROUTE_NAMES } from '@/router/routes/subscriptions-admin.routes'
import { companyRecordTabTarget } from '@/router/routes/companies.routes'
import type { CompanyCapacityResponse } from '@/features/subscriptions-admin/types/entitlements.types'
import SummaryCard from '../SummaryCard.vue'
import CardState from './CardState.vue'
import { capacitySummaryText } from '../../../composables/companySummaryText'

/**
 * <b>Cupos</b> — la quinta tarjeta de §I2. Es real de punta a punta:
 * `GET /entitlements/access` devuelve los ejes con su techo, su consumo y el
 * veredicto de agotado que da el servidor.
 *
 * <p><b>Solo se pintan los desbordados, y como mucho dos.</b> El resumen responde
 * «¿hay algo que atender?» en cinco segundos; la lista completa eje por eje es la
 * pestaña «Cupos». Enseñar aquí los nueve medidores convertiría la tarjeta en la
 * pantalla que sustituye.
 *
 * <p><b>`exhausted` se pasa explícito y por eso el contador no desaparece.</b>
 * `CapacityMeter` lo declara `boolean | null` justamente porque Vue castea a
 * `false` toda prop `Boolean` ausente: si aquí se omitiera, el aviso de agotado
 * dejaría de pintarse en silencio. Se pasa el valor del servidor tal cual.
 *
 * <p>La procedencia del techo se pinta <b>solo cuando el eje trae la línea que lo
 * paga</b> (`subscriptionId`). Sin ella no se sabe de dónde sale, y una etiqueta
 * de origen adivinada es peor que ninguna: es justo el sitio donde se decide si
 * un techo se puede tocar o hay que ir a otra pantalla.
 */
const props = defineProps<{
  capacities: CompanyCapacityResponse[]
  exhausted: CompanyCapacityResponse[]
  loading: boolean
  error: string | null
  companyId: number
}>()

const to = computed(() => companyRecordTabTarget('cupos', props.companyId))

const resumen = computed(() => capacitySummaryText(props.capacities.length, props.exhausted.length))

/** Dos como mucho: ver el bloque de arriba. */
const destacados = computed(() => props.exhausted.slice(0, 2))

function contratoDe(capacity: CompanyCapacityResponse) {
  if (capacity.subscriptionId == null) return null
  return {
    name: SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
    params: { companyId: String(props.companyId), id: String(capacity.subscriptionId) },
  }
}
</script>

<template>
  <SummaryCard title="Cupos" :to="to" :link-label="to ? 'Ver los cupos' : undefined">
    <CardState :loading="loading" :error="error">
      <p class="ds-text-strong parrafo">{{ resumen }}</p>

      <div v-for="capacity in destacados" :key="capacity.id" class="ds-stack ds-stack--8">
        <CapacityMeter
          :label="capacityTitle(capacity.dimensionCode)"
          :used="capacity.usedQuantity"
          :limit="capacity.limitQuantity"
          :unit="capacityNoun(capacity.dimensionCode)"
          :exhausted="capacity.exhausted"
        >
          <template #action>
            <RouterLink v-if="to" class="ds-btn ds-btn--ghost ds-btn--sm" :to="to">
              Ampliar en «Cupos»
            </RouterLink>
          </template>
        </CapacityMeter>

        <ProvenanceLine
          v-if="contratoDe(capacity)"
          source="CONTRACT"
          :detail="`Contrato #${capacity.subscriptionId}`"
          :to="contratoDe(capacity)"
          link-label="Ver el contrato que fija el techo"
        />
      </div>
    </CardState>
  </SummaryCard>
</template>

<style scoped>
.parrafo {
  margin: 0;
}
</style>
