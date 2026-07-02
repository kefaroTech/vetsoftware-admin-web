<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SpaType, CreateSpaTypeCommand } from '../types/spa-types.types'

const props = defineProps<{
  initial?: SpaType | null
}>()

const emit = defineEmits<{
  submit: [data: CreateSpaTypeCommand]
  cancel: []
}>()

const form = ref<CreateSpaTypeCommand>({ name: '', description: '' })
const formValid = ref(false)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, description: val.description }
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
        placeholder="Baño completo"
        :rules="[requiredRule]"
      />
      <v-textarea
        v-model="form.description"
        label="Descripción *"
        placeholder="Baño con shampoo, secado y cepillado"
        rows="3"
        auto-grow
        :rules="[requiredRule]"
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
