<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BaseRole, CreateBaseRoleCommand } from '../types/base-roles.types'

const props = defineProps<{
  initial?: BaseRole | null
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRoleCommand]
  cancel: []
}>()

const form = ref<CreateBaseRoleCommand>({ name: '', code: '', mandatory: false })
const formValid = ref(false)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, mandatory: val.mandatory }
  },
  { immediate: true },
)

async function submit() {
  const { valid } = (await formRef.value?.validate()) ?? { valid: false }
  if (valid) emit('submit', form.value)
}
</script>

<template>
  <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-text-field
        v-model="form.name"
        label="Nombre *"
        placeholder="Administrador"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.code"
        label="Código *"
        placeholder="ADMIN"
        :rules="[requiredRule]"
      />
      <v-checkbox
        v-model="form.mandatory"
        label="Obligatorio"
        hide-details
      />
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
