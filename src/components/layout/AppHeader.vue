<script setup lang="ts">
import { useAuth } from '@/features/auth/composables/useAuth'
import { ICONS } from '@/constants/icons'

const { logout } = useAuth()
</script>

<template>
  <v-app-bar color="surface" elevation="1" density="comfortable">
    <v-app-bar-title>
      <slot>
        <span class="text-subtitle-1 font-weight-medium">Panel administrativo</span>
      </slot>
    </v-app-bar-title>
    <v-spacer />
    <v-btn variant="text" :prepend-icon="ICONS.LOGOUT" @click="logout">
      Cerrar sesión
    </v-btn>
  </v-app-bar>
</template>
