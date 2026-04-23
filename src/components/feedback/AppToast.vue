<script setup lang="ts">
import { useNotification } from '@/composables/useNotification'

const { notifications, dismiss } = useNotification()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="n in notifications"
          :key="n.id"
          :class="[
            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg',
            n.type === 'success'
              ? 'bg-green-600'
              : n.type === 'error'
                ? 'bg-red-600'
                : n.type === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-gray-800',
          ]"
        >
          <span>{{ n.message }}</span>
          <button class="ml-2 opacity-70 hover:opacity-100" @click="dismiss(n.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
