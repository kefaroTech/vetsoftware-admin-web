<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToast from '@/components/feedback/AppToast.vue'
import AppConfirmDialog from '@/components/feedback/AppConfirmDialog.vue'
</script>

<template>
  <v-app>
    <RouterView />
    <AppToast />
    <AppConfirmDialog />
  </v-app>
</template>
