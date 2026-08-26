<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/**
 * Cabecera del sidebar: marca y subtítulo de la consola.
 *
 * Se extrajo de `AppSidebar.vue` por el mismo motivo y con el mismo criterio
 * que `SidebarUserCard` (auditoría FE-08): no comparte ni una regla con la
 * navegación —es marca, no navegación— y `AppSidebar` había cruzado el techo de
 * 500 líneas de `scripts/css-budget.mjs`. El presupuesto no se sube: se paga.
 *
 * Ya no lee el viewport. Con el raíl de iconos de EST-10, la marca se ocultaba
 * en tablet con `.ds-sr-only` para no perder su texto; en el cajón el sidebar
 * conserva sus 280 px y la marca se ve entera en las dos bandas, así que no
 * hay nada que ocultar ni, por tanto, nombre accesible que rescatar. Un
 * componente menos suscrito al viewport es también un punto menos donde dos
 * lecturas del mismo ancho pueden discrepar.
 */
</script>

<template>
  <div class="sidebar-header">
    <div class="logo">
      <component :is="ICONS.PAW" :size="16" />
    </div>
    <div class="brand-text">
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
</style>
