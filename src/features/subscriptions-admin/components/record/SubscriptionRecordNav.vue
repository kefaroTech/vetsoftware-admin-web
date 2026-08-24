<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'

/**
 * La barra de sub-vistas del expediente: <b>enlaces dentro de un `<nav>`, no un
 * `role="tablist"`</b> (§2.2).
 *
 * <p>Se ve como una barra de pestañas y se comporta como lo que es: navegación.
 * Eso evita tener que implementar el contrato de teclado del patrón Tabs del APG
 * —flechas, `tabindex` móvil, `aria-selected`— que un `<nav>` de enlaces no
 * necesita, y a cambio da enlace profundo y botón «atrás», que es lo que usa
 * soporte cuando pega la URL de «Dinero» en un ticket.
 *
 * <p>El patrón exacto —`RouterLink` con `custom` y el mismo `isActive`
 * gobernando a la vez la clase y `aria-current="page"`— es el que ya resolvió
 * `AppSidebar.vue:224-247`, con el comentario que explica por qué no se usa
 * `active-class`: `RouterLink` solo emite `aria-current` cuando la ruta coincide
 * exactamente, así que el enlace resaltado y el anunciado como actual podían no
 * ser el mismo. Se copia ese patrón; no se inventa otro.
 *
 * <p><b>La barra se pinta desde las sub-vistas registradas</b>, no desde una
 * lista de seis rótulos escrita a mano. Mientras W2-B … W2-F no hayan aterrizado,
 * sus pestañas no existen — y eso es correcto: una pestaña que lleva a una ruta
 * que no está registrada es un enlace roto, y pintarla desactivada sería prometer
 * una pantalla que no hay.
 *
 * <p>El estado activo lo pone `.ds-tab--active` (`primitives.css:1422`), que
 * aporta exactamente `border-bottom-color` + `color`; la geometría de la pestaña
 * la pone este componente. No se inventa una primitiva de pestaña nueva.
 */
defineProps<{ companyId: number; subscriptionId: number }>()
</script>

<template>
  <nav class="tabs ds-table-scroll" aria-label="Secciones del contrato">
    <RouterLink
      v-for="tab in subscriptionRecordTabs"
      :key="tab.routeName"
      v-slot="{ href, navigate, isActive }"
      :to="{
        name: tab.routeName,
        params: { companyId: String(companyId), id: String(subscriptionId) },
      }"
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
/* `.ds-table-scroll` aporta el desplazamiento horizontal (§1.4.10): en pantalla
   estrecha las seis pestañas se desplazan, no se recortan ni se apilan. */
.tabs {
  display: flex;
  gap: var(--space-18);
  border-bottom: 1px solid var(--border);
}

/* El `padding` vertical es lo que da el objetivo de 24 px de alto de §2.5.8;
   el color del estado activo lo pone `.ds-tab--active`, no esta regla. */
.tab {
  display: inline-flex;
  align-items: center;
  padding: var(--space-10) var(--space-2);
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: var(--text-body);
  text-decoration: none;
  white-space: nowrap;
}

.tab:hover {
  color: var(--text);
}
</style>
