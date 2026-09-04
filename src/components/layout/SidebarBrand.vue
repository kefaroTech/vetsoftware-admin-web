<script setup lang="ts">
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
 *
 * Sin isotipo: por debajo de 48 px la ilustración de marca es una mancha sin
 * figura reconocible, así que en este tramo la identidad la carga el nombre.
 */
</script>

<template>
  <div class="sidebar-header">
    <div class="brand">Lumbre</div>
    <div class="brand-sub">Panel de plataforma</div>
  </div>
</template>

<style scoped>
.sidebar-header {
  padding: 0 var(--space-12) var(--space-22);
  border-bottom: 1px solid var(--border);
}

.brand {
  font-family: var(--font-display);
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
