<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import { useAuth } from '@/features/auth/composables/useAuth'

const { logout } = useAuth()

type NavItem = {
  name?: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
  label: string
  path: string
  icon: string
  count?: string
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'General',
    items: [
      { name: ROUTE_NAMES.DASHBOARD, label: 'Dashboard', path: '/dashboard', icon: ICONS.DASHBOARD },
      { name: ROUTE_NAMES.COMPANIES_LIST, label: 'Empresas', path: '/empresas', icon: ICONS.COMPANY, count: '128' },
      { label: 'Empleados', path: '/empleados', icon: ICONS.EMPLOYEE, count: '1.8k' },
    ],
  },
  {
    title: 'Suscripciones',
    items: [
      { name: ROUTE_NAMES.MEMBERSHIPS_LIST, label: 'Membresías', path: '/membresias', icon: ICONS.MEMBERSHIP, count: '6' },
      { name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST, label: 'Membresías · Submódulos', path: '/membresias-submodulos', icon: ICONS.MEMBERSHIP_SUBMODULE },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { name: ROUTE_NAMES.MODULES_LIST, label: 'Módulos', path: '/modulos', icon: ICONS.MODULE, count: '14' },
      { name: ROUTE_NAMES.SUBMODULES_LIST, label: 'Submódulos', path: '/submodulos', icon: ICONS.SUBMODULE, count: '52' },
      { name: ROUTE_NAMES.BASE_PERMISSIONS_LIST, label: 'Permisos base', path: '/permisos-base', icon: ICONS.BASE_PERMISSION, count: '38' },
      { name: ROUTE_NAMES.BASE_ROLES_LIST, label: 'Roles base', path: '/roles-base', icon: ICONS.BASE_ROLE, count: '9' },
      { name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST, label: 'Permisos de roles', path: '/permisos-roles-base', icon: ICONS.BASE_ROLE_PERMISSION },
    ],
  },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <Icon :icon="ICONS.PAW" width="16" height="16" />
      </div>
      <div>
        <div class="brand">VetSoftware</div>
        <div class="brand-sub">Panel administrativo</div>
      </div>
    </div>

    <nav class="nav-groups">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <div class="nav-group-title">{{ group.title }}</div>
        <div class="nav-list">
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="is-active"
          >
            <Icon :icon="item.icon" width="15" height="15" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
            <span v-if="item.count" class="nav-count">{{ item.count }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="avatar">AD</div>
      <div class="user-info">
        <div class="user-name">Admin</div>
        <div class="user-role">Super administrador</div>
      </div>
      <button class="logout-btn" aria-label="Cerrar sesión" @click="logout">
        <Icon :icon="ICONS.LOGOUT" width="14" height="14" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: #ffffff;
  border-right: 1px solid #ece5f4;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 22px;
  border-bottom: 1px solid #ece5f4;
}

.logo {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #581c87);
  display: grid;
  place-items: center;
  color: #ffffff;
  box-shadow: 0 2px 6px -1px rgba(126, 34, 206, 0.4);
}

.brand {
  font-size: 14px;
  font-weight: 700;
  color: #1a1325;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.brand-sub {
  font-size: 10px;
  color: #6b5b80;
  letter-spacing: 0.04em;
  margin-top: 1px;
}

.nav-groups {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
}

.nav-group {
  margin-bottom: 18px;
}

.nav-group-title {
  font-size: 10px;
  font-weight: 600;
  color: #a89bbd;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0 12px 6px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #3d2e57;
  text-decoration: none;
  position: relative;
  transition: background 0.12s;
}

.nav-item:hover {
  background: #faf5ff;
}

.nav-item.is-active {
  background: #f3e8ff;
  font-weight: 600;
  color: #1a1325;
}

.nav-item.is-active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #7e22ce;
  border-radius: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  color: #a89bbd;
}

.nav-item.is-active .nav-count {
  color: #7e22ce;
}

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
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
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
  transition: color 0.12s, background 0.12s;
}

.logout-btn:hover {
  color: #7e22ce;
  background: #faf5ff;
}
</style>
