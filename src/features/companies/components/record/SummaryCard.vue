<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { ICONS } from '@/constants/icons'

/**
 * <b>Una de las seis tarjetas del resumen</b> (§I2): un titular, un cuerpo que
 * pone la pantalla, y la salida a la pestaña donde está el detalle.
 *
 * <p>Es un componente con slot y no seis tarjetas escritas a mano por una razón
 * medible: seis copias del par `<section class="ds-card">` + `<h3>` + enlace
 * dejarían el mismo cuerpo de reglas repetido seis veces, que es exactamente lo
 * que cuenta el presupuesto de CSS (`scripts/css-budget.mjs`, `maxDuplicateGroups`
 * en cero). Y porque el resumen es candidato declarado a pasarse del techo de 500
 * líneas por SFC: partirlo desde el primer commit es más barato que partirlo
 * después.
 *
 * <p><b>El enlace es opcional y no se inventa.</b> La tarjeta cuyo destino
 * todavía no tiene sentido —porque el dato no existe— no pinta salida: un enlace
 * que promete detalle sobre un hueco es peor que no tener enlace.
 *
 * <p>El rótulo del enlace lleva el sujeto y nunca dice «ver más» (WCAG 2.2 §2.4.4
 * y §4.1.2: el texto visible del enlace es también su nombre accesible, y «ver
 * más» repetido seis veces no nombra seis destinos distintos).
 */
defineProps<{
  title: string
  /** A dónde está el detalle. Sin `to` no se pinta enlace. */
  to?: RouteLocationRaw | null
  /** El texto del enlace, con sujeto: «Ver la cartera», no «ver más». */
  linkLabel?: string
}>()
</script>

<template>
  <section class="ds-card ds-stack ds-stack--10">
    <h3 class="ds-item-label ds-item-label--lg titulo">{{ title }}</h3>

    <slot />

    <RouterLink v-if="to && linkLabel" class="ds-btn ds-btn--plain ds-btn--sm salida" :to="to">
      {{ linkLabel }}
      <component :is="ICONS.ARROW_RIGHT" :size="14" />
    </RouterLink>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
}

/* La salida se pega al borde inferior de la tarjeta, no al final del texto:
   con seis tarjetas de altos distintos en una rejilla, los seis enlaces
   quedan a la misma altura y la vista los recorre de una pasada. */
.salida {
  margin-top: auto;
  align-self: flex-start;
}
</style>
