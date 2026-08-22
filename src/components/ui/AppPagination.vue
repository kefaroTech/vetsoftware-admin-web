<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Paginador de los listados de la consola.
 *
 * DS-03b: tenía cero consumidores y era el único fichero de este repositorio
 * escrito con **utilidades de Vuetify** (`d-flex align-center
 * justify-space-between py-3`, `text-body-2 text-medium-emphasis`, `d-flex
 * ga-2`) — un cuarto sistema de diseño en 43 líneas muertas, apoyado en un CSS
 * que ningún otro componente consume.
 *
 * No se retira, se reescribe: VUE-06 necesita un paginador para el listado de
 * empresas —la única lista del producto que existe para crecer sin techo— y la
 * alternativa era portar el `Pagination.vue` del front del tenant, que nacería
 * como gemelo TR-02 y solo `front-parity` puede escribirlo. Lo que sí se copia
 * de aquél es lo que le faltaba a este: el rango «Mostrando x–y de z» y el
 * `<nav aria-label>`, sin los cuales el usuario no sabe cuántos registros hay
 * ni el lector de pantalla sabe qué es esta región.
 *
 * `page` es **1-based**, la que ve el usuario y la que viaja en la URL. La
 * conversión al índice desde 0 del backend vive en un solo sitio,
 * `useServerPaged`, y no se replica aquí: al usuario no se le enseña un índice
 * de programador.
 */
const props = defineProps<{
  page: number
  pageSize: number
  /** Elementos que casan con la consulta, no los del catálogo entero. */
  total: number
  pageCount: number
}>()

defineEmits<{ 'update:page': [value: number] }>()

const desde = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const hasta = computed(() => Math.min(props.page * props.pageSize, props.total))
const hayPrevia = computed(() => props.page > 1)
const haySiguiente = computed(() => props.page < props.pageCount)
</script>

<template>
  <nav class="paginador" aria-label="Paginación">
    <p class="rango ds-meta">Mostrando {{ desde }}–{{ hasta }} de {{ total }}</p>
    <div class="botones ds-flex-row">
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="!hayPrevia"
        @click="$emit('update:page', page - 1)"
      >
        <component :is="ICONS.CHEVRON_LEFT" :size="14" />
        Anterior
      </button>
      <span class="ds-meta">Página {{ page }} de {{ Math.max(pageCount, 1) }}</span>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="!haySiguiente"
        @click="$emit('update:page', page + 1)"
      >
        Siguiente
        <component :is="ICONS.CHEVRON_RIGHT" :size="14" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.paginador {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-16);
  padding: var(--space-12) 0;
}

.rango {
  margin: 0;
}
</style>
