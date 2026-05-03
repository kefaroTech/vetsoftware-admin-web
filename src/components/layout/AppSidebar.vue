<script setup lang="ts">
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const navItems = [
  { name: ROUTE_NAMES.DASHBOARD, label: 'Dashboard', path: '/dashboard', icon: ICONS.DASHBOARD },
  { name: ROUTE_NAMES.COMPANIES_LIST, label: 'Empresas', path: '/empresas', icon: ICONS.COMPANY },
  { name: ROUTE_NAMES.MEMBERSHIPS_LIST, label: 'Membresías', path: '/membresias', icon: ICONS.MEMBERSHIP },
  { name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST, label: 'Membresías - Submódulos', path: '/membresias-submodulos', icon: ICONS.MEMBERSHIP_SUBMODULE },
  { name: ROUTE_NAMES.MODULES_LIST, label: 'Módulos', path: '/modulos', icon: ICONS.MODULE },
  { name: ROUTE_NAMES.SUBMODULES_LIST, label: 'Submódulos', path: '/submodulos', icon: ICONS.SUBMODULE },
  { name: ROUTE_NAMES.BASE_PERMISSIONS_LIST, label: 'Permisos base', path: '/permisos-base', icon: ICONS.BASE_PERMISSION },
  { name: ROUTE_NAMES.BASE_ROLES_LIST, label: 'Roles base', path: '/roles-base', icon: ICONS.BASE_ROLE },
  { name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST, label: 'Permisos de roles base', path: '/permisos-roles-base', icon: ICONS.BASE_ROLE_PERMISSION },
]
</script>

<template>
  <v-navigation-drawer permanent width="260" color="surface">
    <div class="pa-4">
      <h1 class="text-h6 font-weight-bold text-primary">VetSoftware</h1>
    </div>
    <v-divider />
    <v-list density="comfortable" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        :prepend-icon="item.icon"
        :title="item.label"
        color="primary"
        rounded="lg"
      />
    </v-list>
  </v-navigation-drawer>
</template>
