<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import { companiesApi } from '@/features/companies/api/companies.api'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { Company } from '@/features/companies/types/companies.types'
import type { Submodule } from '@/features/submodules/types/submodules.types'
import type { Permission, CreatePermissionCommand } from '../types/permissions.types'

const props = defineProps<{
  initial?: Permission | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreatePermissionCommand]
  cancel: []
}>()

const form = ref<CreatePermissionCommand>({ name: '', code: '', companyId: 0, subModuleId: 0 })
const companies = ref<Company[]>([])
const submodules = ref<Submodule[]>([])
const loadingData = ref(false)

onMounted(async () => {
  loadingData.value = true
  try {
    const [companiesRes, submodulesRes] = await Promise.all([
      companiesApi.list(),
      submodulesApi.list(),
    ])
    companies.value = companiesRes.data
    submodules.value = submodulesRes.data
    if (!props.initial) {
      if (companiesRes.data.length > 0) form.value.companyId = companiesRes.data[0].id
      if (submodulesRes.data.length > 0) form.value.subModuleId = submodulesRes.data[0].id
    }
  } finally {
    loadingData.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = { name: val.name, code: val.code, companyId: val.companyId, subModuleId: val.subModuleId }
    }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Gestionar pacientes" />
    <AppInput v-model="form.code" label="Código" placeholder="PATIENTS_MANAGE" />

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Empresa</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.companyId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Submódulo</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.subModuleId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="s in submodules" :key="s.id" :value="s.id">
          {{ s.name }} ({{ s.code }})
        </option>
      </select>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
