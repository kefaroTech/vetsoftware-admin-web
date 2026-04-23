<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberships } from '../composables/useMemberships'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { UpdateMembershipCommand } from '../types/memberships.types'
import type { MembershipStatus } from '@/types/common.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useMemberships()
const saving = ref(false)
const form = ref<UpdateMembershipCommand>({ name: '', status: 'ACTIVE' })

onMounted(async () => {
  await fetchById(Number(props.id))
  if (selected.value) form.value = { name: selected.value.name, status: selected.value.status }
})

async function handleSave() {
  saving.value = true
  try {
    await update(Number(props.id), form.value)
    router.push({ name: ROUTE_NAMES.MEMBERSHIPS_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center gap-4">
      <AppButton variant="secondary" @click="router.back()">← Volver</AppButton>
      <h1 class="text-2xl font-bold text-gray-900">Editar membresía</h1>
    </div>

    <AppSpinner v-if="loading" />
    <form v-else-if="selected" class="flex max-w-lg flex-col gap-4 rounded-xl bg-white p-6 shadow-sm" @submit.prevent="handleSave">
      <AppInput v-model="form.name" label="Nombre" />
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Estado</label>
        <select v-model="form.status" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
          <option value="DEPRECATED">Deprecada</option>
        </select>
      </div>
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="router.back()">Cancelar</AppButton>
        <AppButton type="submit" :loading="saving">Guardar</AppButton>
      </div>
    </form>
  </AppLayout>
</template>
