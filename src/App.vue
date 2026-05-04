<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToast from '@/components/feedback/AppToast.vue'
import AppConfirmDialog from '@/components/feedback/AppConfirmDialog.vue'
import PageLoader from '@/components/feedback/PageLoader.vue'
</script>

<template>
  <v-app>
    <RouterView />
    <AppToast />
    <AppConfirmDialog />
    <PageLoader />
  </v-app>
</template>
