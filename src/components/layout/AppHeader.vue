<script setup lang="ts">
import { useAuth } from '@/features/auth/composables/useAuth'
import AppButton from '@/components/ui/AppButton.vue'

const { logout } = useAuth()
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
    <slot />
    <AppButton variant="secondary" @click="logout">Cerrar sesión</AppButton>
  </header>
</template>
