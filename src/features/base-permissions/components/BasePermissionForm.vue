<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { Submodule } from '@/features/submodules/types/submodules.types'
import type { BasePermission, CreateBasePermissionCommand } from '../types/base-permissions.types'

const props = defineProps<{
  initial?: BasePermission | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBasePermissionCommand]
  cancel: []
}>()

const form = ref<CreateBasePermissionCommand>({ name: '', code: '', subModuleId: 0 })
const availableSubmodules = ref<Submodule[]>([])
const loadingSubmodules = ref(false)

onMounted(async () => {
  loadingSubmodules.value = true
  try {
    const { data } = await submodulesApi.list()
    availableSubmodules.value = data
    if (!props.initial && data.length > 0) form.value.subModuleId = data[0].id
  } finally {
    loadingSubmodules.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, subModuleId: val.subModuleId }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Ver citas" />
    <AppInput v-model="form.code" label="Código" placeholder="APPOINTMENTS_VIEW" />

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Submódulo padre</label>
      <AppSpinner v-if="loadingSubmodules" />
      <select
        v-else
        v-model="form.subModuleId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="sub in availableSubmodules" :key="sub.id" :value="sub.id">
          {{ sub.name }} ({{ sub.code }})
        </option>
      </select>
      <p v-if="!loadingSubmodules && availableSubmodules.length === 0" class="text-sm text-gray-400">
        No hay submódulos disponibles
      </p>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
