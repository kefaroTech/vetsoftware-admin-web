<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { deSujeto, hintFirstBlock, signerLabel } from '../composables/hintText'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/**
 * Las pistas vigentes, una fila por artículo.
 *
 * <p><b>La fila más interesante es la del artículo retirado del catálogo</b>:
 * `catalogItemCode` y `catalogItemName` llegan `null` cuando el artículo dejó de
 * estar habilitado, y eso significa una pista viva sobre algo que ya no se
 * vende. No se esconde ni se despacha con guiones: lleva su distintivo escrito y
 * enlaza igual a la ficha, porque es candidata a retirar.
 *
 * <p>Sale de la vista de listado por presupuesto de líneas y porque el corte es
 * limpio: las dos pestañas son excluyentes en el marcado y no comparten un solo
 * manejador. Es el mismo criterio con el que `PriceListsPanel` salió de
 * `CommercialCatalogView`.
 */
defineProps<{
  hints: CatalogItemAiHintResponse[]
  loading: boolean
  error: string | null
  traceId: string | null
  empty: boolean
  meId: number | null
}>()

const emit = defineEmits<{
  retry: []
  revise: [hint: CatalogItemAiHintResponse]
  retire: [hint: CatalogItemAiHintResponse]
}>()

const HEADERS = [
  'Código',
  'Artículo',
  // Estructural y verdadero. «Definición» sería semántico y supuesto: el dominio
  // exige tres bloques, no dice qué va en cada uno.
  'Primer bloque',
  { label: 'Rev.', align: 'num' as const },
  'Publicada',
  { label: 'Acciones', align: 'actions' as const },
]
</script>

<template>
  <AppTable
    caption="Artículos con pista"
    :headers="HEADERS"
    :empty="empty"
    :loading="loading"
    :error="error"
    :trace-id="traceId"
    @retry="emit('retry')"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <tr v-for="hint in hints" :key="hint.id" class="ds-row-hover">
      <td class="ds-text-strong">{{ hint.catalogItemCode ?? '—' }}</td>
      <td>
        <div class="apilada">
          <span v-if="hint.catalogItemName" class="ds-text-strong">{{ hint.catalogItemName }}</span>
          <span v-else class="ds-meta">Artículo #{{ hint.catalogItemId }}</span>
          <AppBadge
            v-if="hint.catalogItemCode === null && hint.catalogItemName === null"
            variant="warning"
            label="Artículo no disponible"
          />
        </div>
      </td>
      <td>
        <span class="bloque">{{ hintFirstBlock(hint.hintText) }}</span>
      </td>
      <td class="ds-num">{{ hint.hintRevision }}</td>
      <td>
        <div class="apilada">
          <span>{{ formatDate(hint.publishedAt) }}</span>
          <span class="ds-meta">{{ signerLabel(hint.publishedBySystemUserId, meId) }}</span>
        </div>
      </td>
      <td>
        <div class="ds-actions ds-actions--start">
          <RouterLink
            :to="`/asistente/pistas/${hint.catalogItemId}`"
            class="ds-icon-btn"
            :aria-label="`Historial de la pista ${deSujeto(hint)}`"
          >
            <component :is="ICONS.HISTORY" :size="15" aria-hidden="true" />
          </RouterLink>
          <button
            type="button"
            class="ds-icon-btn"
            :aria-label="`Corregir la pista ${deSujeto(hint)}`"
            @click="emit('revise', hint)"
          >
            <component :is="ICONS.EDIT" :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--danger"
            :aria-label="`Retirar la pista ${deSujeto(hint)}`"
            @click="emit('retire', hint)"
          >
            <component :is="ICONS.DELETE" :size="15" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
/* Solo geometría. El primer bloque se recorta a dos líneas para que la fila no
   crezca sin control: el texto entero se lee en la ficha, que existe para eso. */
.bloque {
  display: block;
  max-width: 44ch;
  max-height: 3em;
  overflow: hidden;
  line-height: 1.5;
}

/* La segunda línea de la celda —la marca del artículo no disponible, la firma
   de quien publicó— se apila con rejilla en vez de con `display: block` +
   margen: ese cuerpo de regla ya se repite en tres componentes del catálogo y
   `css:budget` rechaza el cuarto (FE-08). */
.apilada {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}
</style>
