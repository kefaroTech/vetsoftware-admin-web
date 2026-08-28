<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { measureKindLabel } from '../composables/limitText'
import type { LimitDimensionResponse } from '../types/limits.types'

/**
 * Los ejes de cupo, en tabla.
 *
 * <p><b>El código va primero y en monoespaciado</b> porque es el identificador
 * que viaja copiado a cada cupo contratado: es lo que alguien busca cuando
 * compara esta pantalla con un contrato o con un registro del backend.
 *
 * <p><b>«Mide» no se abrevia ni se pinta con color.</b> `STOCK` y `CUMULATIVE`
 * son la diferencia entre un desborde del que se puede salir dando de baja
 * registros y uno del que no, así que llevan su rótulo escrito.
 *
 * <p><b>Los días de gracia ausentes se dicen, no se cuentan como cero.</b>
 * `releaseDelayDays` llega vacío cuando no hay ninguno, y «0 días» afirmaría que
 * la liberación es inmediata, que es una promesa distinta de «no está fijado».
 */
defineProps<{
  dimensions: LimitDimensionResponse[]
  loading: boolean
  error: string | null
  errorTraceId: string | null
  /** A dónde lleva cada fila. La construye la vista, que es quien sabe de rutas. */
  detailTo: (dimension: LimitDimensionResponse) => { name: string; params: { id: string } }
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <AppTable
    :headers="['Código', 'Nombre', 'Mide', 'Submódulo', 'Disponible desde', 'Gracia', 'Acciones']"
    :empty="dimensions.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <tr v-for="dimension in dimensions" :key="dimension.id" class="ds-row-hover">
      <td class="codigo">{{ dimension.code }}</td>
      <td class="ds-text-strong">{{ dimension.name }}</td>
      <td>
        <AppBadge variant="neutral" :label="measureKindLabel(dimension.measureKind)" />
      </td>
      <td class="ds-meta">
        <!-- El nombre del submódulo no lo garantiza el contrato: con el código
             la fila sigue siendo identificable, y sin submódulo se dice. -->
        <template v-if="dimension.subModule">
          {{ dimension.subModule.name ?? dimension.subModule.code }}
        </template>
        <template v-else>No cuelga de ningún submódulo</template>
      </td>
      <td class="ds-meta">{{ formatDate(dimension.availableFrom) }}</td>
      <td class="ds-meta">
        <template v-if="dimension.releaseDelayDays == null">Sin días de gracia</template>
        <template v-else>
          {{ dimension.releaseDelayDays }}
          {{ dimension.releaseDelayDays === 1 ? 'día' : 'días' }}
        </template>
      </td>
      <td>
        <div class="ds-actions ds-actions--start">
          <RouterLink
            class="ds-icon-btn"
            :to="detailTo(dimension)"
            :aria-label="`Abrir el eje ${dimension.name}`"
          >
            <component :is="ICONS.ARROW_RIGHT" :size="15" />
          </RouterLink>
        </div>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
/* El código se compara dígito a dígito con un contrato o con un log. */
.codigo {
  font-family: var(--font-mono);
}
</style>
