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
    <button class="logout-btn" aria-label="Cerrar sesión" @click="logout">
      <component :is="ICONS.LOGOUT" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.sidebar-footer {
  margin-top: auto;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #ece5f4;
  border-radius: 8px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3d2e57;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.1;
  color: #1a1325;
}

.user-role {
  font-size: 10px;
  color: #6b5b80;
  margin-top: 2px;
}

.logout-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b5b80;
  display: grid;
  place-items: center;
  border-radius: 4px;
  transition:
    color 0.12s,
    background 0.12s;
}

.logout-btn:hover {
  color: #7e22ce;
  background: #faf5ff;
}
</style>
