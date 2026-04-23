<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

const route = useRoute()

const navItems = [
  { name: ROUTE_NAMES.DASHBOARD, label: 'Dashboard', path: '/dashboard' },
  { name: ROUTE_NAMES.COMPANIES_LIST, label: 'Empresas', path: '/empresas' },
  { name: ROUTE_NAMES.EMPLOYEES_LIST, label: 'Empleados', path: '/empleados' },
  { name: ROUTE_NAMES.MEMBERSHIPS_LIST, label: 'Membresías', path: '/membresias' },
  { name: ROUTE_NAMES.MODULES_LIST, label: 'Módulos', path: '/modulos' },
]
</script>

<template>
  <aside class="flex h-full w-60 flex-col border-r border-gray-200 bg-white px-3 py-4">
    <div class="mb-6 px-3">
      <h1 class="text-lg font-bold text-indigo-600">VetSoftware</h1>
    </div>
    <nav class="flex flex-col gap-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        :class="[
          'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          route.name === item.name
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
