<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberships } from '../composables/useMemberships'
import AppLayout from '@/components/layout/AppLayout.vue'
import MembershipForm from '../components/MembershipForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateMembershipCommand } from '../types/memberships.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useMemberships()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateMembershipCommand) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.MEMBERSHIPS_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar membresía</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <MembershipForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
