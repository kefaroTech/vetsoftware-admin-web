<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-main ds-stack">
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
  background: var(--surface);
  color: var(--text);
}

.app-main {
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
}

.app-content {
  flex: 1;
  padding: var(--space-28) var(--space-32);
  overflow: auto;
}

/* EST-10 · La consola se soporta en escritorio y tablet, con 768 px como
   mínimo declarado. Este era el único armazón de la aplicación sin una sola
   media query: a 244px fijos de sidebar, en una tablet vertical el contenido
   se quedaba con poco más de la mitad del ancho.
   Sintaxis de rango, que es la que usa el resto del árbol (`ModalShell`,
   `primitives.css`, el front del tenant); `max-width` sería una tercera
   convención. El valor DEBE coincidir con `COMPACT_MAX_WIDTH` de
   `src/stores/viewport.store.ts`, que es quien colapsa los rótulos. */
@media (width <= 1024px) {
  .app-shell {
    grid-template-columns: 72px 1fr;
  }

  .app-content {
    padding: var(--space-18);
  }
}
</style>
