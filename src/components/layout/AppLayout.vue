<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-main">
      <AppHeader />
      <div class="app-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 244px 1fr;
  min-height: 100vh;
  background: #fbfaff;
  color: #1a1325;
}

.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
}

.app-content {
  flex: 1;
  padding: 28px 32px;
  overflow: auto;
}
</style>
