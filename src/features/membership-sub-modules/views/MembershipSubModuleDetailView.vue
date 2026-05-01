<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMembershipSubModules } from '../composables/useMembershipSubModules'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import MembershipSubModuleForm from '../components/MembershipSubModuleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CreateMembershipSubModuleCommand } from '../types/membership-sub-modules.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useMembershipSubModules()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateMembershipSubModuleCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar asociación membresía-submódulo</h1>
    </div>

    <AppSpinner v-if="loading" />
    <v-card v-else-if="selected" max-width="640" class="pa-6">
      <MembershipSubModuleForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </v-card>
  </AppLayout>
</template>
