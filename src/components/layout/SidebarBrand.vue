<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { useViewport } from '@/composables/useViewport'

/**
 * Cabecera del sidebar: marca y subtítulo de la consola.
 *
 * Se extrajo de `AppSidebar.vue` por el mismo motivo y con el mismo criterio
 * que `SidebarUserCard` (auditoría FE-08): no comparte ni una regla con la
 * navegación —es marca, no navegación— y `AppSidebar` había cruzado el techo de
 * 500 líneas de `scripts/css-budget.mjs`. El presupuesto no se sube: se paga.
 *
 * EST-10: al colapsar, el texto se oculta con `.ds-sr-only` y no con
 * `display: none`, por el mismo motivo que los rótulos de navegación — ver la
 * cabecera de `viewport.store.ts`.
 *
 * `isCompact` se lee aquí del composable en vez de recibirse por prop: es
 * estado global de viewport, y pasarlo desde el padre solo añadiría un punto
 * donde los dos pueden discrepar.
 */
const { isCompact } = useViewport()
</script>

<template>
  <div class="sidebar-header">
    <div class="logo">
      <component :is="ICONS.PAW" :size="16" />
    </div>
    <div class="brand-text" :class="{ 'ds-sr-only': isCompact }">
      <div class="brand">VetSoftware</div>
      <div class="brand-sub">Panel administrativo</div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  padding: 0 var(--space-12) var(--space-22);
  border-bottom: 1px solid var(--border);
}

.logo {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--amatista-500), var(--amatista-800));
  display: grid;
  place-items: center;
  color: var(--warm-50);
  box-shadow: var(--shadow-xs);
}

.brand {
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.brand-sub {
  font-size: var(--text-caption);
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin-top: 1px;
}

/* EST-10 · viaja con la cabecera desde `AppSidebar.vue`: al colapsar, la marca
   se centra y pierde el hueco lateral. */
@media (width <= 1024px) {
  .sidebar-header {
    justify-content: center;
    padding: 0 0 var(--space-18);
  }
}
</style>
