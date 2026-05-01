<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  maxWidth?: number | string
}>()

const emit = defineEmits<{
  close: []
}>()

const dialogModel = computed({
  get: () => props.open,
  set: (val) => {
    if (!val) emit('close')
  },
})
</script>

<template>
  <v-dialog v-model="dialogModel" :max-width="maxWidth ?? 560" scrollable>
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span class="text-h6">{{ title }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="emit('close')" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <slot />
      </v-card-text>
      <template v-if="$slots.footer">
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <slot name="footer" />
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>
