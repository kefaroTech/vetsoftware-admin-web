<script setup lang="ts">
import PawLoader from './PawLoader.vue'
import { useGlobalLoader } from '@/composables/useGlobalLoader'

const { visible } = useGlobalLoader()
</script>

<template>
  <Transition name="page-loader-fade">
    <div v-if="visible" class="page-loader" role="alert" aria-busy="true" aria-live="assertive">
      <PawLoader :size="192" color="var(--surface)" />
    </div>
  </Transition>
</template>

<style scoped>
.page-loader {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark-72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-loader);
  cursor: wait;
}

.page-loader-fade-enter-active,
.page-loader-fade-leave-active {
  transition: opacity 0.18s ease;
}

.page-loader-fade-enter-from,
.page-loader-fade-leave-to {
  opacity: 0;
}
</style>
