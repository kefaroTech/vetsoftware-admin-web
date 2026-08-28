<script setup lang="ts">
/**
 * Los dos estados que las seis tarjetas del resumen comparten: <b>cargando</b> y
 * <b>no se pudo</b>.
 *
 * <p>Vive aparte porque el par se repetiría seis veces —dos ramas `v-if` con su
 * banner y su barra gris— y porque los dos tienen que decirse igual en las seis:
 * un operador que ve tres redacciones distintas de «no cargó» cree que son tres
 * problemas distintos.
 *
 * <p><b>El esqueleto va con `aria-hidden`</b>: unas barras grises no significan
 * nada leídas en voz alta. Quien anuncia «Cargando…» es la región `role="status"`
 * de la vista, que es la que tiene las palabras.
 *
 * <p>El error sí es `role="alert"`: es la respuesta a una petición que el
 * operador acaba de disparar al abrir la pantalla, y se la pierde si no se
 * interrumpe la lectura.
 */
defineProps<{ loading: boolean; error: string | null }>()
</script>

<template>
  <div v-if="loading" class="ds-stack ds-stack--8" aria-hidden="true">
    <span class="ds-skeleton ds-skeleton--text" />
    <span class="ds-skeleton ds-skeleton--text" />
  </div>

  <p
    v-else-if="error"
    class="ds-banner ds-banner--error ds-banner--sm ds-banner--flush"
    role="alert"
  >
    {{ error }}
  </p>

  <slot v-else />
</template>
