<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { companyRecordTabs } from '@/router/routes/companies.routes'

/**
 * La barra de sub-vistas del expediente de empresa: <b>enlaces dentro de un
 * `<nav>`, no un `role="tablist"`</b>.
 *
 * <p>Se ve como una barra de pestañas y se comporta como lo que es: navegación.
 * Eso evita tener que implementar el contrato de teclado del patrón Tabs del APG
 * —flechas, `tabindex` móvil, `aria-selected`— que un `<nav>` de enlaces no
 * necesita, y a cambio da enlace profundo y botón «atrás», que es lo que usa
 * soporte cuando pega la URL de «Cartera» en un ticket.
 *
 * <p>El patrón exacto —`RouterLink` con `custom` y el mismo `isActive` gobernando
 * a la vez la clase y `aria-current="page"`— es el que ya resolvió
 * `AppSidebar.vue`: `RouterLink` solo emite `aria-current` cuando la ruta coincide
 * exactamente, así que el enlace resaltado y el anunciado como actual podían no
 * ser el mismo. Se copia ese patrón; no se inventa otro.
 *
 * <p><b>La barra se pinta desde las sub-vistas registradas</b>, no desde una lista
 * de rótulos escrita a mano, así que una pestaña nueva aparece con solo crear su
 * `*.tab.ts`. Las que todavía no tienen pantalla <b>sí salen</b>, y eso es
 * deliberado: llevan a un destino que dice en palabras qué va a haber ahí. Lo que
 * no puede haber es un enlace a una ruta sin registrar, que es un 404.
 *
 * <p><b>Copia deliberada de `SubscriptionRecordNav`, no una pieza compartida.</b>
 * Con dos instancias no hay patrón todavía; ver `company-record.types.ts`.
 */
defineProps<{ companyId: number }>()
</script>

<template>
  <nav class="tabs ds-table-scroll" aria-label="Secciones del expediente de la empresa">
    <RouterLink
      v-for="tab in companyRecordTabs"
      :key="tab.routeName"
      v-slot="{ href, navigate, isActive }"
      :to="{ name: tab.routeName, params: { id: String(companyId) } }"
      custom
    >
      <a
        :href="href"
        class="tab"
        :class="{ 'ds-tab--active': isActive }"
        :aria-current="isActive ? 'page' : undefined"
        @click="navigate"
      >
        {{ tab.label }}
      </a>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* `.ds-table-scroll` aporta el desplazamiento horizontal: en pantalla estrecha
   las diez pestañas se desplazan, no se recortan ni se apilan. */
.tabs {
  display: flex;
  gap: var(--space-18);
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
}

/* El color y el color del borde NO pueden vivir en la base: el `[data-v-…]`
   del `scoped` la sube a (0,2,0) y ganaría a `.ds-tab--active` (0,1,0), que
   es quien pinta el estado. El tono de la pestaña inactiva se hereda del
   contenedor, que la clase de estado sí puede sobrescribir. */
.tab {
  display: inline-flex;
  align-items: center;
  padding: var(--space-10) var(--space-2);
  border-bottom-width: 2px;
  border-bottom-style: solid;
  font-size: var(--text-body);
  text-decoration: none;
  white-space: nowrap;
}

.tab:not(.ds-tab--active) {
  border-bottom-color: transparent;
}

.tab:not(.ds-tab--active):hover {
  color: var(--text);
}
</style>
