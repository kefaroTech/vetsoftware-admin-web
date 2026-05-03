<script setup lang="ts">
import { computed } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { ICONS } from '@/constants/icons'

const { notifications, dismiss } = useNotification()

function colorFor(type: string) {
  if (type === 'success') return 'success'
  if (type === 'error') return 'error'
  if (type === 'warning') return 'warning'
  return 'grey-darken-3'
}

function iconFor(type: string) {
  if (type === 'success') return ICONS.SUCCESS
  if (type === 'error') return ICONS.ERROR
  if (type === 'warning') return ICONS.WARNING
  return ICONS.INFO
}

const items = computed(() => notifications.value)
</script>

<template>
  <div class="vet-toast-wrapper">
    <v-snackbar
      v-for="n in items"
      :key="n.id"
      :model-value="true"
      :color="colorFor(n.type)"
      :timeout="-1"
      location="bottom right"
      class="ma-2"
    >
      <div class="d-flex align-center ga-2">
        <v-icon :icon="iconFor(n.type)" />
        <span>{{ n.message }}</span>
      </div>
      <template #actions>
        <v-btn :icon="ICONS.CLOSE" variant="text" size="small" @click="dismiss(n.id)" />
      </template>
    </v-snackbar>
  </div>
</template>
