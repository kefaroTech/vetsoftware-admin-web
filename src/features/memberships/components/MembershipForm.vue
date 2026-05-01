<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { Membership, CreateMembershipCommand } from '../types/memberships.types'

const props = defineProps<{
  initial?: Membership | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipCommand]
  cancel: []
}>()

const form = ref<CreateMembershipCommand>({ name: '', status: 'ACTIVE' })

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, status: val.status }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Plan básico" />

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Estado</label>
      <select
        v-model="form.status"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="ACTIVE">Activa</option>
        <option value="INACTIVE">Inactiva</option>
        <option value="DEPRECATED">Deprecada</option>
      </select>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
