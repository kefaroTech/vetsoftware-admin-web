<script setup lang="ts">
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { ITEM_TYPE_OPTIONS } from '@/features/commercial-catalog/types/commercial-catalog.types'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Los artículos a la venta que el asistente <b>no puede proponer</b>.
 *
 * <p>Es la pregunta que más dinero mueve de esta pantalla y ningún endpoint la
 * contesta: el backend solo sabe listar las pistas vigentes. Un módulo nuevo sin
 * pista es invisible para el prospecto y nadie se entera hasta que alguien
 * pregunta por qué nunca sale en las cotizaciones. La lista se deriva en el
 * cliente cruzando las dos colecciones (ver el store de la feature, que también
 * escribe el número a partir del cual esa derivación deja de valer).
 *
 * <p><b>Lo que esta pestaña no puede distinguir</b> es «nunca tuvo pista» de
 * «se la retiraron»: para eso haría falta una llamada a `/revisions` por fila.
 * No se hace. La ficha del artículo lo contesta con exactitud, y es un clic de
 * más para una pregunta poco frecuente.
 */
defineProps<{
  items: CatalogItemResponse[]
  loading: boolean
  error: string | null
  traceId: string | null
}>()

const emit = defineEmits<{ retry: []; write: [item: CatalogItemResponse] }>()

const HEADERS = ['Código', 'Artículo', 'Tipo', { label: 'Acciones', align: 'actions' as const }]

function tipo(item: CatalogItemResponse): string {
  return ITEM_TYPE_OPTIONS.find((option) => option.value === item.itemType)?.label ?? item.itemType
}
</script>

<template>
  <AppTable
    caption="Artículos sin pista"
    :headers="HEADERS"
    :empty="items.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="traceId"
    @retry="emit('retry')"
  >
    <template #empty>
      <!-- Es un buen estado y se dice como tal: no lleva acción. -->
      <AppEmptyState title="Todos los artículos a la venta tienen pista." />
    </template>

    <tr v-for="item in items" :key="item.id" class="ds-row-hover">
      <td class="ds-text-strong">{{ item.code }}</td>
      <td>{{ item.name }}</td>
      <td>{{ tipo(item) }}</td>
      <td>
        <div class="ds-actions ds-actions--start">
          <button
            type="button"
            class="ds-btn ds-btn--sm ds-btn--primary"
            @click="emit('write', item)"
          >
            Escribir la pista
          </button>
        </div>
      </td>
    </tr>
  </AppTable>
</template>
