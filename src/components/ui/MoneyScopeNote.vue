<script setup lang="ts">
import { MONEY_SCOPE_NOTE } from '@/composables/format'

/**
 * <b>La divisa de la plataforma en una superficie que no es una tabla</b> —
 * fichas, paneles, modales y las sumas que una vista pinta fuera de su tabla.
 *
 * <p>Es el hermano de `MoneyCaption` para el marcado donde no hay
 * `&lt;table&gt;` al que colgarle un `&lt;caption&gt;`. Misma regla y mismo
 * texto: se pinta <b>una sola vez por superficie</b>, nunca por celda ni por
 * campo, y el texto sale de `MONEY_SCOPE_NOTE` para que no vuelva a haber dos
 * redacciones de lo mismo a un clic de distancia.
 *
 * <p>Va inmediatamente debajo del encabezado de la superficie (o arriba del
 * cuerpo del modal), donde se lee antes que las cifras que califica. No lleva
 * `role` ni tono: no es un aviso, ni un error, ni un hueco del contrato —para
 * eso está `ContractGapNotice`—; es la unidad de las cifras de al lado.
 */
</script>

<template>
  <p class="ds-meta nota">{{ MONEY_SCOPE_NOTE }}</p>
</template>

<style scoped>
/* El espaciado lo pone la pila (`.ds-stack`) del contenedor, como en el resto
   de notas `.ds-meta` del repositorio. */
.nota {
  margin: 0;
}
</style>
