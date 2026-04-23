<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployees } from '../composables/useEmployees'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { UpdateEmployeeCommand } from '../types/employees.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useEmployees()
const saving = ref(false)
const form = ref<UpdateEmployeeCommand>({ name: '', email: '', status: 'ACTIVE' })

onMounted(async () => {
  await fetchById(Number(props.id))
  if (selected.value) {
    form.value = { name: selected.value.name, email: selected.value.email, status: selected.value.status }
  }
})

async function handleSave() {
  saving.value = true
  try {
    await update(Number(props.id), form.value)
    router.push({ name: ROUTE_NAMES.EMPLOYEES_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center gap-4">
      <AppButton variant="secondary" @click="router.back()">← Volver</AppButton>
      <h1 class="text-2xl font-bold text-gray-900">Editar empleado</h1>
    </div>

    <AppSpinner v-if="loading" />
    <form v-else-if="selected" class="flex max-w-lg flex-col gap-4 rounded-xl bg-white p-6 shadow-sm" @submit.prevent="handleSave">
      <AppInput v-model="form.name" label="Nombre" />
      <AppInput v-model="form.email" label="Email" type="email" />
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="router.back()">Cancelar</AppButton>
        <AppButton type="submit" :loading="saving">Guardar</AppButton>
      </div>
    </form>
  </AppLayout>
</template>
