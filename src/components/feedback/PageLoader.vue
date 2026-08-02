<script setup lang="ts">
import PawLoader from './PawLoader.vue'
import { useGlobalLoader } from '@/composables/useGlobalLoader'

const { visible } = useGlobalLoader()
</script>

<template>
  <Transition name="page-loader-fade">
    <div v-if="visible" class="page-loader" role="alert" aria-busy="true" aria-live="assertive">
      <PawLoader :size="192" color="#ffffff" />
    </div>
  </Transition>
</template>

<style scoped>
.page-loader {
  position: fixed;
  inset: 0;
  background: rgb(15 7 30 / 72%);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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
