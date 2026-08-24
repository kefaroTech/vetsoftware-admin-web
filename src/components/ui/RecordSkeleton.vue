<script setup lang="ts">
/**
 * **El esqueleto de carga de una ficha.** Cierra el issue #165.
 *
 * <p>Tres barras dentro de una tarjeta mientras el servidor contesta: el estado
 * intermedio propio que las fichas de detalle no tenían encapsulado. Es el
 * equivalente, para una ficha, de lo que `AppTable` ya hace para un listado.
 *
 * <h3>Por qué es un componente y no una primitiva CSS</h3>
 *
 * <p>El #165 proponía dos arreglos y los dos caían en `primitives.css` —declarar
 * `display`/ancho en `.ds-skeleton--text`, o añadir `.ds-skeleton-row`—, que es
 * <b>gemelo TR-02</b> y por tanto trabajo de `front-parity`. Por eso quedó como
 * issue en vez de improvisarse.
 *
 * <p>Hay una tercera vía que el issue no consideró y que no toca ese fichero:
 * subir la pieza entera —marcado incluido— a `src/components/ui/`, que no es TR-02.
 * Así el par `{display: block; width: 60%}` y el par `{height: var(--space-24);
 * width: 32%}` que el #165 contaba repetidos <b>dejan de existir en los
 * consumidores</b> en vez de mudarse de sitio.
 *
 * <h3>Por qué las barras del cuerpo no llevan ni una regla</h3>
 *
 * <p>Porque no las necesitan, y eso ya estaba comprobado en el árbol antes que
 * aquí: `SubscriptionItemsView` retiró las suyas al escribirse. Dentro de un
 * `.ds-stack` —que es `display:flex; flex-direction:column`— un `<span>` ya es un
 * elemento flex y ocupa el ancho de la columna, así que `display: block` y el
 * `width: 60%` sobraban. La <b>única</b> regla que queda es la de la barra del
 * titular, que sí tiene que ser más corta y más alta que las demás para que la
 * silueta se parezca a la ficha que va a sustituirla.
 *
 * <h3>Accesibilidad</h3>
 *
 * <p>`aria-hidden` en toda la pieza: unas barras grises no significan nada leídas
 * en voz alta, y anunciarlas sería ruido. Quien deba anunciar «Cargando…» es la
 * región `role="status"` de la vista, que es la que tiene las palabras — este
 * componente <b>no la trae</b> a propósito, porque el texto correcto depende de qué
 * se esté cargando y las vistas ya la declaran.
 *
 * <p>La animación en bucle la cubre `prefers-reduced-motion`, apagado globalmente
 * en `base.css` (DS-06) más la regla específica de `primitives.css`. No se añade
 * ninguna regla local: sería una copia de algo que ya está resuelto.
 */
withDefaults(
  defineProps<{
    /**
     * Barras de cuerpo bajo el titular. Dos por defecto, que es la silueta de una
     * ficha corta; una ficha con rejilla de detalle larga puede pedir más.
     */
    lines?: number
  }>(),
  { lines: 2 },
)
</script>

<template>
  <div class="ds-card ds-stack ds-stack--14" aria-hidden="true">
    <span class="ds-skeleton ds-skeleton--text titular" />
    <span v-for="line in lines" :key="line" class="ds-skeleton ds-skeleton--text" />
  </div>
</template>

<style scoped>
/* La única geometría propia de la pieza: el titular es más corto y más alto que
   las barras del cuerpo. Las demás no declaran nada — ver el bloque de arriba. */
.titular {
  width: 32%;
  height: var(--space-24);
}
</style>
