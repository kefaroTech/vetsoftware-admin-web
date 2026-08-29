<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import SubscriptionRef from '@/components/ui/SubscriptionRef.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatDate } from '@/composables/format'
import type { SubscriptionItemOverlapResponse } from '../types/subscriptions-admin.types'

/**
 * <b>Vigilancia de solapes</b>: los artículos cobrados dos veces durante un mismo
 * tramo del contrato. Es la pantalla que menos se puede permitir fallar, y era la
 * única del bloque del dinero que se había quedado fuera de cuatro convenciones
 * que el resto del producto ya tenía resueltas:
 *
 * <ol>
 *   <li><b>Las fechas salían en ISO crudo.</b> Había un `formatDate` local que
 *       devolvía `value ?? 'Sin límite'` —o sea, no formateaba— y encima
 *       <i>sombreaba</i> el nombre del formateador canónico, así que quien leyera
 *       la plantilla daba por hecho que era el bueno. En pantalla se leía
 *       `#88 · 2026-03-01 → 2026-08-31`. Ahora se usa `formatDate` de
 *       `composables/format`, que ya acepta el texto de vacío como segundo
 *       argumento.</li>
 *   <li><b>La empresa se pintaba cruda</b> (`#42`), única tabla del producto que
 *       lo hacía: no llevaba a ninguna parte y el lector de pantalla anunciaba
 *       «almohadilla cuarenta y dos». Ahora pasa por `CompanyRef`, como las otras
 *       catorce.</li>
 *   <li><b>El contrato tampoco era enlace</b>, teniendo `companyId` y
 *       `subscriptionId` en la misma fila. Ahora es `SubscriptionRef`.</li>
 *   <li><b>El badge rotulaba el error como «Sin datos»</b> mientras el vacío
 *       decía «Sano». Ver `health`, abajo.</li>
 * </ol>
 */

const props = defineProps<{
  items: SubscriptionItemOverlapResponse[]
  loading: boolean
  error: string | null
  traceId: string | null
}>()

defineEmits<{ retry: [] }>()

/**
 * El estado de la comprobación, en una palabra.
 *
 * <p><b>«No se pudo comprobar» y no «Sin datos».</b> El vacío —no hay solapes—
 * dice «Sano»; el fallo de lectura —no sabemos si hay solapes— decía «Sin
 * datos», que un operador barriendo la pantalla lee como «no hay nada que mirar
 * aquí»: la conclusión opuesta a la correcta, en la única pantalla que detecta
 * doble cobro. «No pudimos leerlo» y «no hay nada» son cosas distintas y aquí
 * valen dinero. La tabla de abajo ya las distinguía bien (ramas 1 y 4 de
 * `AppTable`); mentía solo el badge de la cabecera.
 */
const health = computed(() => {
  if (props.error) return { label: 'No se pudo comprobar', variant: 'danger' as const }
  if (props.loading) return { label: 'Verificando', variant: 'neutral' as const }
  if (props.items.length === 0) return { label: 'Sano', variant: 'success' as const }
  return {
    label: `${props.items.length} ${props.items.length === 1 ? 'solape' : 'solapes'}`,
    variant: 'danger' as const,
  }
})
</script>

<template>
  <section class="ds-stack ds-stack--10" aria-labelledby="overlaps-title">
    <div class="ds-block-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="overlaps-title" class="ds-title">Vigilancia de solapes</h2>
        <p class="ds-meta">
          Detecta artículos cobrados dos veces durante un mismo tramo del contrato.
        </p>
      </div>
      <AppBadge :label="health.label" :variant="health.variant" />
    </div>

    <AppTable
      :headers="['Empresa', 'Contrato', 'Artículo', 'Primera línea', 'Segunda línea']"
      :empty="items.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="traceId"
      :skeleton-rows="3"
      @retry="$emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Sin solapes detectados"
          description="La lista vacía confirma que no hay tramos de un mismo artículo facturados dos veces."
        />
      </template>

      <tr v-for="overlap in items" :key="`${overlap.firstItemId}-${overlap.secondItemId}`">
        <td><CompanyRef :company-id="overlap.companyId" /></td>
        <td>
          <SubscriptionRef
            :company-id="overlap.companyId"
            :subscription-id="overlap.subscriptionId"
          />
        </td>
        <td>
          <span class="ds-text-strong">{{ overlap.itemCode }}</span>
          <span class="ds-meta"> · #{{ overlap.catalogItemId }}</span>
        </td>
        <td>
          #{{ overlap.firstItemId }} · {{ formatDate(overlap.firstFrom) }} →
          {{ formatDate(overlap.firstTo, 'Sin límite') }}
        </td>
        <td>
          #{{ overlap.secondItemId }} · {{ formatDate(overlap.secondFrom) }} →
          {{ formatDate(overlap.secondTo, 'Sin límite') }}
        </td>
      </tr>
    </AppTable>
  </section>
</template>
