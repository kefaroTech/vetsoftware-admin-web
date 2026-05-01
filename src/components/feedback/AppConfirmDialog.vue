<script setup lang="ts">
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { isOpen, message, accept, cancel } = useConfirmDialog()
</script>

<template>
  <v-dialog v-model="isOpen" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-h6 pa-4">Confirmar acción</v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <p class="text-body-1">{{ message }}</p>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="cancel">Cancelar</v-btn>
        <v-btn color="error" variant="elevated" @click="accept">Confirmar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
