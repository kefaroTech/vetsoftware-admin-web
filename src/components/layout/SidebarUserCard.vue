<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { useAuth } from '@/features/auth/composables/useAuth'

/**
 * Pie del sidebar: identidad de la sesión y salida. Se extrajo de
 * `AppSidebar.vue` (auditoría FE-08) porque no comparte ninguna regla con la
 * navegación y era la mitad del CSS restante del archivo.
 *
 * El `margin-top: auto` vive aquí: la raíz de este componente ES el último
 * hijo flex de `.sidebar`, así que el empuje al fondo se conserva.
 *
 * Ya no lee el viewport. Con el raíl de iconos de EST-10 la identidad se
 * ocultaba en tablet con `.ds-sr-only` para conservar su texto; en el cajón la
 * tarjeta cabe entera en las dos bandas, así que no hay nada que ocultar. Lo
 * que sí cambia con la banda es el objetivo táctil de la salida — ver el
 * `@media` del final.
 */
const { logout } = useAuth()
</script>

<template>
  <div class="sidebar-footer">
    <div class="avatar">AD</div>
    <div class="ds-flex-fill">
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
  cursor: pointer;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition:
    color var(--transition-base),
    background var(--transition-base);

  /* Era `padding: var(--space-4)` alrededor de un icono de 14 px: 22×22 px, por
     debajo del suelo de 24×24 de §2.5.8 Target Size (Minimum). Puede que lo
     salvara la excepción de espaciado —no hay otro objetivo lo bastante cerca
     como para que los círculos de 24 px se crucen— pero es el control de
     CERRAR SESIÓN, y dejarlo a 22 px pegado a una tarjeta en una pantalla
     táctil no se sostiene por un tecnicismo. */
  width: 32px;
  height: 32px;
}

/* En la banda de cajón la salida es un objetivo de dedo, no de ratón: 44×44,
   la misma cifra de comodidad que la hamburguesa, la campana y toda fila de
   navegación. */
@media (width <= 1024px) {
  .logout-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
