<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
const formValid = ref(false)
const availableSubmodules = ref<Submodule[]>([])
const loadingSubmodules = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'

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
    if (val) form.value = { name: val.name, code: val.code, subModuleId: val.subModule?.id ?? 0 }
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
        placeholder="Ver citas"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.code"
        label="Código"
        placeholder="APPOINTMENTS_VIEW"
        :rules="[requiredRule]"
      />
      <v-select
        v-model="form.subModuleId"
        label="Submódulo padre"
        :items="availableSubmodules"
        :item-title="(s: Submodule) => `${s.name} (${s.code})`"
        item-value="id"
        :loading="loadingSubmodules"
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
