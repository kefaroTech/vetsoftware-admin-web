<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Membership, CreateMembershipCommand } from '../types/memberships.types'

const props = defineProps<{
  initial?: Membership | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipCommand]
  cancel: []
}>()

const form = ref<CreateMembershipCommand>({ name: '', status: 'ACTIVE' })
const formValid = ref(false)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, status: val.status }
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
        placeholder="Plan básico"
        :rules="[requiredRule]"
      />
      <v-select
        v-model="form.status"
        label="Estado"
        :items="[
          { title: 'Activa', value: 'ACTIVE' },
          { title: 'Inactiva', value: 'INACTIVE' },
          { title: 'Deprecada', value: 'DEPRECATED' },
        ]"
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
