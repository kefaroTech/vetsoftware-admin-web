<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
const formValid = ref(false)
const companies = ref<Company[]>([])
const submodules = ref<Submodule[]>([])
const loadingData = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'

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
      form.value = {
        name: val.name,
        code: val.code,
        companyId: val.companyId,
        subModuleId: val.subModuleId,
      }
    }
  },
  { immediate: true },
)

function submit() {
  if (formValid.value) emit('submit', form.value)
}
</script>

<template>
  <v-form v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-text-field
        v-model="form.name"
        label="Nombre"
        placeholder="Gestionar pacientes"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.code"
        label="Código"
        placeholder="PATIENTS_MANAGE"
        :rules="[requiredRule]"
      />
      <v-select
        v-model="form.companyId"
        label="Empresa"
        :items="companies"
        item-title="name"
        item-value="id"
        :loading="loadingData"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <v-select
        v-model="form.subModuleId"
        label="Submódulo"
        :items="submodules"
        :item-title="(s: Submodule) => `${s.name} (${s.code})`"
        item-value="id"
        :loading="loadingData"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="loading">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
