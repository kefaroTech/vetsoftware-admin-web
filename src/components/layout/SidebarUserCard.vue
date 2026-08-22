<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useViewport } from '@/composables/useViewport'

/**
 * Pie del sidebar: identidad de la sesión y salida. Se extrajo de
 * `AppSidebar.vue` (auditoría FE-08) porque no comparte ninguna regla con la
 * navegación y era la mitad del CSS restante del archivo.
 *
 * El `margin-top: auto` vive aquí: la raíz de este componente ES el último
 * hijo flex de `.sidebar`, así que el empuje al fondo se conserva.
 *
 * EST-10: al colapsar, el nombre y el rol se ocultan con `.ds-sr-only` y no con
 * `display: none`, por el mismo motivo que los rótulos de navegación — ver la
 * cabecera de `viewport.store.ts`.
 */
const { logout } = useAuth()
const { isCompact } = useViewport()
</script>

<template>
  <div class="sidebar-footer">
    <div class="avatar">AD</div>
    <div class="ds-flex-fill" :class="{ 'ds-sr-only': isCompact }">
      <div class="user-name">Admin</div>
      <div class="user-role">Super administrador</div>
    </div>
    <button class="logout-btn ds-hover-accent" aria-label="Cerrar sesión" @click="logout">
      <component :is="ICONS.LOGOUT" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.sidebar-footer {
  margin-top: auto;
  padding: var(--space-10) var(--space-12);
  display: flex;
  align-items: center;
  gap: var(--space-10);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--warm-800);
  color: var(--warm-50);
  display: grid;
  place-items: center;
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  flex-shrink: 0;
}

.user-name {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: 1.1;
  color: var(--text);
}

.user-role {
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-top: var(--space-2);
}

.logout-btn {
  background: transparent;
  border: none;
  padding: var(--space-4);
  cursor: pointer;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  transition:
    color var(--transition-base),
    background var(--transition-base);
}

/* EST-10 · Con el sidebar a 72 px la tarjeta ya no puede repartir tres piezas
   en una fila: se centra y solo queda el avatar junto a la salida. */
@media (width <= 1024px) {
  .sidebar-footer {
    justify-content: center;
    padding: var(--space-8);
    gap: var(--space-6);
  }
}
</style>
