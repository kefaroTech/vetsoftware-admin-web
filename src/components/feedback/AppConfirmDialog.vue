<script setup lang="ts">
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ModalShell from '@/components/ui/ModalShell.vue'

const { isOpen, message, accept, cancel } = useConfirmDialog()
</script>

<template>
  <!--
    No descartable a propósito (`:closable="false"`, sin cierre por clic fuera):
    la promesa que abrió el diálogo tiene que resolver a `true` o a `false`, y
    dejarlo cerrar por Escape la abandonaría sin resolver — el usuario se
    quedaría mirando una acción que nunca ocurre y nadie le diría por qué.
  -->
  <ModalShell
    :open="isOpen"
    title="Confirmar acción"
    compact
    :width="420"
    accent="danger"
    :closable="false"
    :close-on-backdrop="false"
    @close="cancel"
  >
    <template #body>
      <p class="mensaje">{{ message }}</p>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="cancel">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--danger-solid" @click="accept">Confirmar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.mensaje {
  margin: 0;
  color: var(--text);
  font-size: var(--text-body);
  line-height: 1.5;
}
</style>
