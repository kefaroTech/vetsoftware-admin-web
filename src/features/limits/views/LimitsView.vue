<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { LIMITS_ROUTE_NAMES } from '@/router/routes/limits.routes'

/**
 * El armazón de `/limites`: encabezado, las cuatro secciones y poco más.
 *
 * <p><b>Abre en «Ejes de cupo», no en un resumen.</b> Los ejes son el catálogo del
 * que cuelga todo lo demás: las excepciones y la bitácora hablan de
 * `limitDimensionId`, así que sin los ejes cargados esas dos pantallas son
 * columnas de números. Y un panel de indicadores no le dice a nadie qué hacer a
 * continuación.
 *
 * <p><b>Las secciones son RUTAS.</b> El patrón exacto —`RouterLink custom` +
 * `isActive` gobernando a la vez la clase y `aria-current`— se copia del armazón
 * de cobranza en vez de inventarse otro. El estado activo lo pone
 * `.ds-tab--active`, que ya existe en `primitives.css`: no se inventa una
 * primitiva de pestaña nueva.
 *
 * <p>El encabezado nombra los tres conceptos que la sección separa a propósito,
 * porque mezclarlos es de donde salen las llamadas: <b>eje</b> es qué se cuenta,
 * <b>techo</b> es cuánto se permite, y <b>consumo</b> es cuánto se lleva. Un
 * consumo por encima del techo no es un error del sistema.
 */
const TABS = [
  { name: LIMITS_ROUTE_NAMES.DIMENSIONS, label: 'Ejes de cupo' },
  { name: LIMITS_ROUTE_NAMES.OVERRIDES, label: 'Excepciones de techo' },
  { name: LIMITS_ROUTE_NAMES.OVER_LIMIT, label: 'Cuentas desbordadas' },
  { name: LIMITS_ROUTE_NAMES.EVENTS, label: 'Bitácora de cupo' },
] as const
</script>

<template>
  <AppLayout>
    <div class="ds-page ds-page--stack ds-page--wide">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Cupos y límites</h1>
          <p class="ds-meta">
            El <strong>eje</strong> es qué se cuenta (mascotas, citas, usuarios, sedes, facturas) ·
            el <strong>techo</strong> es cuánto permite el plan, el contrato o una excepción
            negociada · el <strong>consumo</strong> es cuánto lleva la cuenta. Que el consumo supere
            el techo <strong>está permitido a propósito</strong>: la cuenta queda congelada,
            conserva todo lo suyo y deja de poder crear más.
          </p>
        </div>
      </div>

      <nav class="pestanas ds-wrap-row" aria-label="Secciones de cupo">
        <RouterLink
          v-for="tab in TABS"
          :key="tab.name"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: tab.name }"
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
/* La fila y su separación las pone `.ds-wrap-row`; aquí solo la línea que
   separa las pestañas del contenido. */
.pestanas {
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
}

/* §2.5.8 · 24 px de alto efectivo como mínimo: el padding vertical de 10 px
   sobre una línea de texto lo supera con margen.
   El color y el color del borde NO pueden vivir en la base: el `[data-v-…]`
   del `scoped` la sube a (0,2,0) y ganaría a `.ds-tab--active` (0,1,0), que
   es quien pinta el estado. El tono de la pestaña inactiva se hereda del
   contenedor, que la clase de estado sí puede sobrescribir. */
.pestana {
  padding: var(--space-10) var(--space-14);
  border-bottom-width: 2px;
  border-bottom-style: solid;
  font-size: var(--text-body);
  text-decoration: none;
}

.pestana:not(.ds-tab--active) {
  border-bottom-color: transparent;
}

.pestana:not(.ds-tab--active):hover {
  color: var(--text);
}
</style>
