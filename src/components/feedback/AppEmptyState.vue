<script setup lang="ts">
import type { Component } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Estado vacío accionable de la consola.
 *
 * DS-03b / EST-06: tenía cero consumidores y estaba escrito con utilidades de
 * Vuetify (`pa-12`, `text-h6`, `text-medium-emphasis`), un sistema de diseño que
 * en esta consola solo sobrevive de forma vestigial. Se reescribe sobre
 * `.ds-empty` —la primitiva que la consola ya usa en cinco sitios— en vez de
 * retirarse, porque es la pieza que da la SALIDA que al estado vacío le falta:
 * hoy las 17 vistas dicen «Sin resultados» y no ofrecen nada que pulsar.
 *
 * El `slot` por defecto es esa salida: se le pasa el mismo botón que ya vive en
 * la cabecera de la vista (NN/g, *Empty State Interface Design*).
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: Component
  }>(),
  { icon: () => ICONS.EMPTY },
)
</script>

<template>
  <div class="ds-empty ds-stack ds-stack--8 vacio">
    <component :is="icon" v-if="icon" :size="40" :stroke-width="1.5" class="icono" />
    <p class="titulo">{{ title }}</p>
    <p v-if="description" class="ds-meta descripcion">{{ description }}</p>
    <div v-if="$slots.default" class="accion">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.vacio {
  align-items: center;
}

.icono {
  color: var(--warm-400);
}

.titulo {
  margin: 0;
  color: var(--text);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
}

.descripcion {
  margin: 0;
  max-width: 42ch;
}

.accion {
  margin-top: var(--space-4);
}
</style>
