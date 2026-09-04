<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { useViewport } from '@/composables/useViewport'

const router = useRouter()
const route = useRoute()

// Disparador del cajón de navegación en tablet. El estado es del store porque
// el cajón lo pinta `AppSidebar`, que es hermano de esta cabecera; ver
// `viewport.store.ts`.
const { isDrawerViewport, navOpen, toggleNav } = useViewport()

// El botón del header es un atajo a Empresas; se oculta en la propia lista para
// no duplicar el "Nueva empresa" que ya vive en esa pantalla.
const onCompaniesList = computed(() => route.name === ROUTE_NAMES.COMPANIES_LIST)

function goToCompanies() {
  router.push({ name: ROUTE_NAMES.COMPANIES_LIST })
}
</script>

<template>
  <header class="topbar">
    <!--
      Primero de la fila y alineado a la izquierda: es el punto donde cae el
      pulgar al sostener la tablet, y es el mismo sitio en todas las pantallas.
      La ETIQUETA NO cambia con el estado —patrón Disclosure del APG—: el
      nombre describe el control y `aria-expanded` describe el estado. Un
      `aria-label` que alternase «Abrir…»/«Cerrar…» duplicaría la información y,
      en el instante del cambio, algunos lectores anuncian las dos cosas.
    -->
    <button
      v-if="isDrawerViewport"
      type="button"
      class="menu-btn ds-icon-btn--accent ds-focus-ring"
      aria-label="Menú de navegación"
      aria-controls="app-nav"
      :aria-expanded="navOpen"
      @click="toggleNav"
    >
      <component :is="ICONS.MENU" :size="18" />
    </button>
    <div class="spacer" />
    <button
      v-if="!onCompaniesList"
      type="button"
      class="ds-btn ds-btn--solid ds-btn--snug ds-btn--strong ds-flex-row"
      @click="goToCompanies"
    >
      <component :is="ICONS.ADD" :size="14" />
      Nueva empresa
    </button>
  </header>
</template>

<style scoped>
.topbar {
  /* El tono oscuro del CTA se declara aquí, no en una regla de este `scoped`:
     una regla local lleva `[data-v-…]` y pesa (0,2,0), así que le ganaría a la
     primitiva (0,1,0) y `.ds-btn--solid` dejaría de gobernar el botón. La
     variable de escape es la salida que la propia primitiva documenta. */
  --ds-btn-solid-bg: var(--warm-900);

  padding: var(--space-16) var(--space-32);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: var(--space-14);
  flex-shrink: 0;
}

.spacer {
  flex: 1;
}

/* La hamburguesa es el ÚNICO acceso a la navegación en tablet, y solo existe
   en esa banda (`v-if`), por eso no hay `@media` que la suba. §2.5.8 Target
   Size (Minimum) pide 24×24 px CSS en AA; 44 es la cifra de comodidad, y en el
   control que abre todo el menú se paga entera. */
.menu-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--warm-450);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-800);
  flex-shrink: 0;
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

/* En la banda de cajón los 32 px de relleno lateral de `.topbar` compiten por el
   ancho con el contenido. */
@media (width <= 1024px) {
  .topbar {
    padding: var(--space-14) var(--space-18);
  }
}
</style>
