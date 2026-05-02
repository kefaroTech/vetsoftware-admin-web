<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
const formValid = ref(false)
const availableModules = ref<AppModule[]>([])
const loadingModules = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'

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
    if (val) form.value = { name: val.name, code: val.code, moduleId: val.module?.id ?? 0 }
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
        placeholder="Gestión de citas"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.code"
        label="Código"
        placeholder="APPOINTMENTS_MANAGE"
        :rules="[requiredRule]"
      />
      <v-select
        v-model="form.moduleId"
        label="Módulo padre"
        :items="availableModules"
        :item-title="(m: AppModule) => `${m.name} (${m.code})`"
        item-value="id"
        :loading="loadingModules"
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
