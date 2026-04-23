<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { EmployeeStatus } from '@/types/common.types'

const props = defineProps<{ status: EmployeeStatus }>()
const label = props.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
const variant = props.status === 'ACTIVE' ? 'success' : 'neutral'
</script>

<template>
  <AppBadge :label="label" :variant="variant" />
</template>
