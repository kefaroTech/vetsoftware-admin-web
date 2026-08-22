<script setup lang="ts">
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'

const { isOpen, message, consequence, confirmLabel, accept, cancel } = useConfirmDialog()
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
      <!--
        `role="status"` y no `alert`: el diálogo ya interrumpió al usuario al
        abrirse, y la consecuencia es contexto de esa misma interrupción, no un
        segundo corte. `assertive` es un presupuesto y este producto tiene un
        solo consumidor legítimo, el velo global.
      -->
      <p
        v-if="consequence"
        class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush consecuencia"
        role="status"
      >
        <component :is="ICONS.WARNING" :size="14" class="ds-banner-icon" />
        <span>{{ consequence }}</span>
      </p>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="cancel">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--danger-solid" @click="accept">
        {{ confirmLabel }}
      </button>
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

.consecuencia {
  margin-top: var(--space-12);
}
</style>
