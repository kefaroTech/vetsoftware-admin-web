<script setup lang="ts">
import ModalShell from './ModalShell.vue'

/**
 * Modal de esta consola. Es una fachada delgada sobre `ModalShell`, el mismo
 * componente que el front operativo: TR-02 deja una sola implementación de
 * overlay, foco inicial, cierre con Escape y clic fuera.
 *
 * Se usa siempre en modo `compact` —dimensionado por contenido— porque aquí los
 * modales son formularios de catálogo, no las pantallas de trabajo a 90 % del
 * viewport para las que existe el modo normal.
 */
withDefaults(
  defineProps<{
    open: boolean
    title: string
    maxWidth?: number
  }>(),
  { maxWidth: 560 },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <ModalShell :open="open" :title="title" compact :width="maxWidth" @close="emit('close')">
    <template #body>
      <slot />
    </template>
    <template v-if="$slots.footer" #footer-actions>
      <slot name="footer" />
    </template>
  </ModalShell>
</template>
