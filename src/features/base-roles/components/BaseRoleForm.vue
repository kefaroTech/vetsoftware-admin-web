<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { BaseRole, CreateBaseRoleCommand } from '../types/base-roles.types'

const props = defineProps<{
  initial?: BaseRole | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRoleCommand]
  cancel: []
}>()

const form = ref<CreateBaseRoleCommand>({ name: '', code: '', mandatory: false })

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, mandatory: val.mandatory }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Administrador" />
    <AppInput v-model="form.code" label="Código" placeholder="ADMIN" />

    <div class="flex items-center gap-2">
      <input
        id="mandatory"
        v-model="form.mandatory"
        type="checkbox"
        class="rounded text-indigo-600"
      />
      <label for="mandatory" class="text-sm font-medium text-gray-700">Obligatorio</label>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
