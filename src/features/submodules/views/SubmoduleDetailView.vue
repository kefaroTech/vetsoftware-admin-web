<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSubmodules } from '../composables/useSubmodules'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import SubmoduleForm from '../components/SubmoduleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CreateSubmoduleCommand } from '../types/submodules.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useSubmodules()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateSubmoduleCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.SUBMODULES_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center gap-4">
      <AppButton variant="secondary" @click="router.back()">← Volver</AppButton>
      <h1 class="text-2xl font-bold text-gray-900">Editar submódulo</h1>
    </div>

    <AppSpinner v-if="loading" />
    <div v-else-if="selected" class="max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <SubmoduleForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </div>
  </AppLayout>
</template>
