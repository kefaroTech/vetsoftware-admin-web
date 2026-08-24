<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { ICONS } from '@/constants/icons'

/**
 * El armazón del configurador: un título, el aviso que no se puede olvidar y
 * la barra de las dos sub-vistas.
 *
 * <p><b>Dos sub-vistas, no tres pantallas.</b> `/configurator/questions`,
 * `/options` y `/effects` son el esquema, no la tarea (especificación §2.1 y
 * §3.6): exponerlas por separado obligaría al comercial a entender el modelo de
 * datos para cambiar una pregunta. Las tareas reales son dos —«editar el
 * cuestionario» y «comprobar que no rompí nada»— y son pantallas muy distintas.
 *
 * <p><b>La barra es un `&lt;nav&gt;` de enlaces, no un `role="tablist"`.</b> Con
 * enlaces no hay que implementar el contrato de teclado del patrón *Tabs* del
 * APG (flechas, `tabindex` móvil, `aria-selected`), la URL de cada mitad se
 * puede pegar en un ticket y el botón «atrás» funciona. El patrón exacto
 * —`RouterLink custom` + `isActive` gobernando a la vez la clase y
 * `aria-current`— es el que ya usa `AppSidebar.vue:224-247`, y se copia en
 * lugar de inventar otro: `RouterLink` solo emite `aria-current` cuando la ruta
 * coincide exactamente, así que con `active-class` el enlace resaltado y el
 * anunciado como actual no siempre son el mismo.
 */
const TABS = [
  { path: '/configurador/cuestionario', label: 'Editar el cuestionario' },
  { path: '/configurador/probar', label: 'Probarlo' },
]
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <div class="ds-stack ds-stack--8">
        <h1 class="ds-title">Configurador</h1>
        <p class="ds-subtitle">
          El asistente con el que un prospecto arma su plan. Las preguntas, las respuestas y lo que
          cada una mete en el carrito son datos: se editan aquí, sin desplegar nada.
        </p>
      </div>

      <!--
        Condición permanente, no una interrupción: `role="status"` y no
        `role="alert"` (docs/ux/patron-de-mensajes.md §4). Vive en el armazón
        para que se vea en las dos sub-vistas.
      -->
      <p class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span>
          <strong>Este cuestionario no tiene borrador.</strong> Lo que guardes aquí lo ve el
          siguiente prospecto que entre en el configurador, al instante. No hay «publicar» ni
          «deshacer».
        </span>
      </p>

      <nav class="pestanas" aria-label="Secciones del configurador">
        <RouterLink
          v-for="tab in TABS"
          v-slot="{ href, navigate, isActive }"
          :key="tab.path"
          :to="tab.path"
          custom
        >
          <a
            :href="href"
            class="pestana"
            :class="{ 'ds-tab--active': isActive }"
            :aria-current="isActive ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </nav>

      <RouterView />
    </div>
  </AppLayout>
</template>

<style scoped>
.pestanas {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--border);
}

/* `.ds-tab--active` (primitives.css:1422) pone el estado activo —el color y el
   `border-bottom-color`—; aquí solo va la geometría de la pestaña, que es lo
   que esa primitiva NO aporta a propósito. El alto efectivo pasa de 24 px con
   este `padding`, que es el mínimo de WCAG 2.2 §2.5.8. */
.pestana {
  padding: var(--space-10) var(--space-14);
  border-bottom: 2px solid transparent;
  color: var(--text-subtle);
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.pestana:hover {
  color: var(--text);
}
</style>
