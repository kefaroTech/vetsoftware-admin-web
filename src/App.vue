<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastStack from '@/components/feedback/ToastStack.vue'
import AppConfirmDialog from '@/components/feedback/AppConfirmDialog.vue'
import PageLoader from '@/components/feedback/PageLoader.vue'
</script>

<template>
  <v-app>
    <RouterView />
    <ToastStack />
    <AppConfirmDialog />
    <PageLoader />
  </v-app>
</template>
