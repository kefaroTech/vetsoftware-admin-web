<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SurgeryType } from '../types/surgery-types.types'
import type { SurgeryTypeFormData } from '../composables/useSurgeryTypes'

const props = defineProps<{
  initial?: SurgeryType | null
}>()

const emit = defineEmits<{
  submit: [data: SurgeryTypeFormData]
  cancel: []
}>()

const form = ref<SurgeryTypeFormData>({ name: '', description: '' })
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
        placeholder="Esterilización"
        :rules="[requiredRule]"
      />
      <v-textarea
        v-model="form.description"
        label="Descripción *"
        placeholder="Procedimiento quirúrgico de esterilización"
        rows="3"
        auto-grow
        :rules="[requiredRule]"
      />
      <v-alert type="info" variant="tonal" density="compact" class="mt-1">
        Este catálogo crea tipos globales disponibles para todas las empresas.
      </v-alert>
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
