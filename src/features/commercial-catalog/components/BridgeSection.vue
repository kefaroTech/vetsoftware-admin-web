<script setup lang="ts">
import { ref } from 'vue'

/**
 * El chasis de los tres bloques de `/catalogo-comercial/articulos/:id`.
 *
 * ── Por qué existe, y por qué es local a esta feature ─────────────────────
 *
 * No es un componente del catálogo `App*` ni pretende serlo: los tres puentes
 * de un artículo se pintan con la MISMA cabecera —encabezado, frase de ayuda y
 * una acción a la derecha— y `npm run css:budget` lo detectó al primer intento:
 * tres copias de `{margin:0; color:var(--text); font-size:var(--text-h3)}` y
 * tres de `{margin:0; max-width:72ch}` (regla 2 del presupuesto: «lo que se
 * copia en varios sitios es una primitiva que falta»). La primitiva no se puede
 * añadir a `primitives.css` porque es un fichero gemelo TR-02 y el otro front
 * no tiene estas pantallas; el sitio correcto es un componente de la feature.
 *
 * ── El `<h2 tabindex="-1">` vive aquí a propósito ─────────────────────────
 *
 * Tras cada escritura el foco vuelve al encabezado del bloque en el que se
 * estaba trabajando (§5.1): la fila que se acaba de borrar ya no existe y el
 * botón que se pulsó puede haber desaparecido, así que dejar el foco donde
 * estaba lo manda al principio del documento. Teniéndolo aquí, los tres
 * bloques heredan el mismo comportamiento con `sectionRef.focus()` en vez de
 * repetir el `ref` y la función tres veces.
 */
defineProps<{ title: string; help?: string }>()

const heading = ref<HTMLElement | null>(null)

/** Devuelve el foco al encabezado. Lo llama el bloque tras cada escritura. */
function focus() {
  heading.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <section class="ds-card bloque ds-stack ds-stack--16">
    <div class="cabecera">
      <div class="ds-stack ds-stack--8">
        <h2 ref="heading" tabindex="-1" class="titulo">{{ title }}</h2>
        <p v-if="help" class="ds-meta ayuda">{{ help }}</p>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.bloque {
  padding: var(--space-16);
}

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-16);
}

.titulo {
  margin: 0;
  color: var(--text);
  font-size: var(--text-h3);
}

.ayuda {
  margin: 0;
  max-width: 72ch;
}

@media (width <= 680px) {
  .cabecera {
    flex-direction: column;
  }
}
</style>
