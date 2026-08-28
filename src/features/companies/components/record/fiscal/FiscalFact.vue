<script setup lang="ts">
/**
 * <b>Un dato de la pestaña fiscal</b>: su rótulo y su valor, dentro de una
 * `<dl class="ds-detail-grid">`.
 *
 * <p>Existe por una razón medible y no por gusto de abstraer. El par
 * `<div class="campo"><dt><dd>` aparece once veces entre el perfil y las
 * resoluciones, y con él aparecerían once veces los dos cuerpos de regla que lo
 * sostienen —la rejilla del par y el `margin: 0` que le quita al `<dd>` la sangría
 * del navegador—. Eso es exactamente lo que cuenta el presupuesto de CSS
 * (`scripts/css-budget.mjs`): un cuerpo repetido en más de tres componentes es una
 * primitiva que falta. Aquí se declara una vez.
 *
 * <p><b>`<dt>`/`<dd>` y no dos `<span>`</b>: una lista de definición es lo que un
 * lector de pantalla puede recorrer diciendo «Régimen, Responsable de IVA» en vez
 * de leer catorce cadenas sueltas. El envoltorio `<div>` es el que permite que la
 * rejilla trate el par como una celda, y está permitido dentro de `<dl>` desde
 * HTML5.
 *
 * <p><b>El valor va por slot, no por prop</b>: la mitad de estos datos llevan
 * marcado dentro —cifras con `.ds-num`, etiquetas, dos trozos con un separador— y
 * una prop de texto obligaría a interpolarlo o a partir el componente en dos.
 */
defineProps<{
  /** El rótulo, corto y en castellano. Es lo que se lee antes del valor. */
  label: string
  /** `true` cuando el valor es largo y ocupa las dos columnas de la rejilla. */
  wide?: boolean
}>()
</script>

<template>
  <div class="campo" :class="{ 'ds-grid-span': wide }">
    <dt class="ds-label">{{ label }}</dt>
    <dd class="valor"><slot /></dd>
  </div>
</template>

<style scoped>
.campo {
  display: grid;
  gap: var(--space-3);
}

/* Lo único que hay que quitarle a un `<dd>`: la sangría que le da el navegador. */
.valor {
  margin: 0;
}
</style>
