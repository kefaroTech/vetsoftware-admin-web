<script setup lang="ts">
import { ROUTE_NAMES } from '@/constants/routes'

const navItems = [
  { name: ROUTE_NAMES.DASHBOARD, label: 'Dashboard', path: '/dashboard', icon: 'mdi-view-dashboard' },
  { name: ROUTE_NAMES.COMPANIES_LIST, label: 'Empresas', path: '/empresas', icon: 'mdi-domain' },
  { name: ROUTE_NAMES.EMPLOYEES_LIST, label: 'Empleados', path: '/empleados', icon: 'mdi-account-group' },
  { name: ROUTE_NAMES.MEMBERSHIPS_LIST, label: 'Membresías', path: '/membresias', icon: 'mdi-card-account-details' },
  { name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST, label: 'Membresías - Submódulos', path: '/membresias-submodulos', icon: 'mdi-link-variant' },
  { name: ROUTE_NAMES.MODULES_LIST, label: 'Módulos', path: '/modulos', icon: 'mdi-view-module' },
  { name: ROUTE_NAMES.SUBMODULES_LIST, label: 'Submódulos', path: '/submodulos', icon: 'mdi-view-grid' },
  { name: ROUTE_NAMES.PERMISSIONS_LIST, label: 'Permisos', path: '/permisos', icon: 'mdi-key-variant' },
  { name: ROUTE_NAMES.BASE_PERMISSIONS_LIST, label: 'Permisos base', path: '/permisos-base', icon: 'mdi-key' },
  { name: ROUTE_NAMES.BASE_ROLES_LIST, label: 'Roles base', path: '/roles-base', icon: 'mdi-shield-account' },
  { name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST, label: 'Permisos de roles base', path: '/permisos-roles-base', icon: 'mdi-shield-key' },
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
