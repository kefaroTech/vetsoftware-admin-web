<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { ICONS } from '@/constants/icons'

const modules = [
  { name: 'Empresas', path: '/empresas', icon: ICONS.COMPANY, color: 'blue' },
  { name: 'Empleados', path: '/empleados', icon: 'tabler:users-group', color: 'green' },
  { name: 'Membresías', path: '/membresias', icon: ICONS.MEMBERSHIP, color: 'purple' },
  { name: 'Módulos', path: '/modulos', icon: ICONS.MODULE, color: 'orange' },
  { name: 'Submódulos', path: '/submodulos', icon: ICONS.SUBMODULE, color: 'teal' },
  { name: 'Permisos', path: '/permisos', icon: 'tabler:key-variant', color: 'indigo' },
  { name: 'Permisos base', path: '/permisos-base', icon: ICONS.BASE_PERMISSION, color: 'cyan' },
  { name: 'Roles base', path: '/roles-base', icon: ICONS.BASE_ROLE, color: 'pink' },
]
</script>

<template>
  <AppLayout>
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Dashboard</h1>
      <p class="text-body-2 text-medium-emphasis">Bienvenido a VetSoftware</p>
    </div>

    <v-row>
      <v-col v-for="m in modules" :key="m.name" cols="12" sm="6" md="4" lg="3">
        <v-card
          :to="m.path"
          rounded="lg"
          variant="flat"
          color="surface"
          hover
          class="pa-4 d-flex align-center ga-3"
        >
          <v-avatar :color="m.color" variant="tonal" rounded="lg" size="48">
            <v-icon :icon="m.icon" />
          </v-avatar>
          <span class="text-body-1 font-weight-medium">{{ m.name }}</span>
        </v-card>
      </v-col>
    </v-row>
  </AppLayout>
</template>
