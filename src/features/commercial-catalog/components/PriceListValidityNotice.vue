<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { overlappingPriceLists, type NotEffectiveWindow } from '../composables/priceListValidity'
import type { PriceListResponse } from '../types/commercial-catalog.types'

/**
 * Los dos avisos de vigencia de «Listas y precios» (D-73, épica E4).
 *
 * ── Por qué es un componente propio ───────────────────────────────────────
 *
 * `PriceListsPanel.vue` ya nació de partir una vista que rozaba el techo de
 * 500 líneas de `npm run css:budget`. Los dos banners y su prosa caben aquí
 * sin volver a empujar aquel fichero contra el techo, y además dejan el panel
 * ocupándose solo del ciclo de vida de las tarifas.
 *
 * ── El solape es un aviso, no un error ────────────────────────────────────
 *
 * §1 de `docs/ux/patron-de-mensajes.md`, pregunta 2: la acción se completó
 * —las dos listas están publicadas y son válidas— pero deja una consecuencia
 * que nadie ve mirando la tabla y que no se deshace barato. La prueba del
 * documento: si el operador cierra la pantalla sin leerlo, ¿alguien pierde
 * dinero? Sí — dos comerciales cotizan el mismo día al mismo cliente con dos
 * precios distintos y los dos son válidos. Banner de tono aviso,
 * `role="status"`, `aria-live="polite"` (§4.1).
 *
 * ── El alcance del aviso es honesto ───────────────────────────────────────
 *
 * `/price-lists` está paginado y esto solo ve la página que hay en pantalla:
 * dos listas que se pisan desde páginas distintas no se detectan. El banner lo
 * dice en vez de dar a entender que ha revisado el catálogo entero, que es
 * justo la clase de silencio que R14 prohíbe.
 */
const props = defineProps<{
  /** Las listas de la página visible. */
  lists: readonly PriceListResponse[]
  /** La ventana que devolvió un 409 `PRICE_LIST_NOT_EFFECTIVE`, si lo hubo. */
  notEffective?: NotEffectiveWindow | null
}>()

const emit = defineEmits<{ dismiss: [] }>()

const overlaps = computed(() => overlappingPriceLists(props.lists))

function windowLabel(from: string, to: string | null) {
  return to ? `del ${formatDate(from)} al ${formatDate(to)}` : `desde el ${formatDate(from)}`
}

/** La ventana del 409, con los huecos dichos y no rellenados. */
const rejectedWindow = computed(() => {
  const window = props.notEffective
  if (!window) return null
  if (!window.validFrom) return 'El servidor no envió la ventana de la tarifa.'
  return `La tarifa solo vale ${windowLabel(window.validFrom, window.validTo)}.`
})
</script>

<template>
  <div v-if="notEffective || overlaps.length > 0" class="ds-stack ds-stack--14">
    <!-- D-73 · El backend rechaza cotizar fuera de ventana. Persistente y con
         salida propia: el toast de `errorFrom` ya se llevó el mensaje del
         servidor y la traza, y esto es lo que hay que HACER. -->
    <div v-if="notEffective" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill ds-stack ds-stack--8">
        <span class="ds-text-strong">
          Esa tarifa está fuera de vigencia y no se puede usar para cotizar.
        </span>
        <span>{{ rejectedWindow }}</span>
        <span v-if="notEffective.effectiveOn">
          Se pidió cotizar para el {{ formatDate(notEffective.effectiveOn) }}.
        </span>
        <span>
          Amplía su fecha final si la subida aún no toca, o publica una lista nueva cuya ventana
          incluya el día en el que se va a vender.
        </span>
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('dismiss')">
        Entendido
      </button>
    </div>

    <div
      v-if="overlaps.length > 0"
      class="ds-banner ds-banner--warning"
      role="status"
      aria-live="polite"
    >
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill ds-stack ds-stack--8">
        <span class="ds-text-strong">
          Hay tarifas publicadas que se pisan: el mismo día valen dos precios distintos.
        </span>
        <span v-for="overlap in overlaps" :key="`${overlap.a.id}-${overlap.b.id}`">
          «{{ overlap.a.name }}» y «{{ overlap.b.name }}» valen las dos
          {{ windowLabel(overlap.from, overlap.to) }}.
        </span>
        <span class="ds-meta">
          Solo se han comparado las tarifas de esta página; puede haber más solapes en las otras.
        </span>
      </span>
    </div>
  </div>
</template>
