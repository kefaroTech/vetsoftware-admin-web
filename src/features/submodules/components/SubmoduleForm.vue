<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import { modulesApi } from '@/features/modules/api/modules.api'
import type { AppModule } from '@/features/modules/types/modules.types'
import type { Submodule, CreateSubmoduleCommand } from '../types/submodules.types'

const props = defineProps<{
  initial?: Submodule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateSubmoduleCommand]
  cancel: []
}>()

const form = ref<CreateSubmoduleCommand>({ name: '', code: '', moduleId: 0 })
const availableModules = ref<AppModule[]>([])
const loadingModules = ref(false)

onMounted(async () => {
  loadingModules.value = true
  try {
    const { data } = await modulesApi.list()
    availableModules.value = data
    if (!props.initial && data.length > 0) form.value.moduleId = data[0].id
  } finally {
    loadingModules.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, moduleId: val.moduleId }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Gestión de citas" />
    <AppInput v-model="form.code" label="Código" placeholder="APPOINTMENTS_MANAGE" />

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Módulo padre</label>
      <AppSpinner v-if="loadingModules" />
      <select
        v-else
        v-model="form.moduleId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="mod in availableModules" :key="mod.id" :value="mod.id">
          {{ mod.name }} ({{ mod.code }})
        </option>
      </select>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
