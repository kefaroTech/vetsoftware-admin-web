<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { companiesApi } from '@/features/companies/api/companies.api'
import type { Company } from '@/features/companies/types/companies.types'
import type {
  Employee,
  CreateEmployeeCommand,
  UpdateEmployeeCommand,
} from '../types/employees.types'

const props = defineProps<{
  initial?: Employee | null
  loading?: boolean
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  submit: [data: CreateEmployeeCommand | UpdateEmployeeCommand]
  cancel: []
}>()

const isEdit = computed(() => props.mode === 'edit' || !!props.initial)

const form = ref({
  employeeCode: '',
  name: '',
  email: '',
  password: '',
  companyId: 0,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
})

const formValid = ref(false)
const companies = ref<Company[]>([])
const loadingCompanies = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'
const emailRule = (v: string) => /.+@.+\..+/.test(v) || 'Email inválido'

onMounted(async () => {
  if (!isEdit.value) {
    loadingCompanies.value = true
    try {
      const { data } = await companiesApi.list()
      companies.value = data
      if (data.length > 0) form.value.companyId = data[0].id
    } finally {
      loadingCompanies.value = false
    }
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = {
        employeeCode: val.employeeCode,
        name: val.name,
        email: val.email,
        password: '',
        companyId: val.companyId,
        status: val.status,
      }
    }
  },
  { immediate: true },
)

function submit() {
  if (!formValid.value) return
  if (isEdit.value) {
    emit('submit', { name: form.value.name, email: form.value.email, status: form.value.status })
  } else {
    emit('submit', {
      employeeCode: form.value.employeeCode,
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      companyId: form.value.companyId,
    })
  }
}
</script>

<template>
  <v-form v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-text-field
        v-if="!isEdit"
        v-model="form.employeeCode"
        label="Código de empleado"
        placeholder="EMP001"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.name"
        label="Nombre"
        placeholder="Juan Pérez"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="juan@empresa.com"
        :rules="[requiredRule, emailRule]"
      />
      <v-text-field
        v-if="!isEdit"
        v-model="form.password"
        label="Contraseña"
        type="password"
        :rules="[requiredRule]"
      />
      <v-select
        v-if="!isEdit"
        v-model="form.companyId"
        label="Empresa"
        :items="companies"
        item-title="name"
        item-value="id"
        :loading="loadingCompanies"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <v-select
        v-if="isEdit"
        v-model="form.status"
        label="Estado"
        :items="[
          { title: 'Activo', value: 'ACTIVE' },
          { title: 'Inactivo', value: 'INACTIVE' },
        ]"
      />

      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="loading">
          {{ isEdit ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
