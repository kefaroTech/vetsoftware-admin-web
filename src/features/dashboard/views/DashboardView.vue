<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { ROUTE_NAMES } from '@/constants/routes'

const modules = [
  { name: 'Empresas', route: ROUTE_NAMES.COMPANIES_LIST, path: '/empresas', color: 'bg-blue-50 text-blue-700' },
  { name: 'Empleados', route: ROUTE_NAMES.EMPLOYEES_LIST, path: '/empleados', color: 'bg-green-50 text-green-700' },
  { name: 'Membresías', route: ROUTE_NAMES.MEMBERSHIPS_LIST, path: '/membresias', color: 'bg-purple-50 text-purple-700' },
  { name: 'Módulos', route: ROUTE_NAMES.MODULES_LIST, path: '/modulos', color: 'bg-orange-50 text-orange-700' },
]
</script>

<template>
  <AppLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500">Bienvenido a VetSoftware</p>
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <RouterLink
        v-for="m in modules"
        :key="m.name"
        :to="m.path"
        :class="['rounded-xl p-6 text-center font-medium transition-opacity hover:opacity-80', m.color]"
      >
        {{ m.name }}
      </RouterLink>
    </div>
  </AppLayout>
</template>
