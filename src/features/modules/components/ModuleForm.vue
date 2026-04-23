<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { AppModule, CreateModuleCommand } from '../types/modules.types'

const props = defineProps<{
  initial?: AppModule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateModuleCommand]
  cancel: []
}>()

const form = ref<CreateModuleCommand>({ name: '', code: '' })

watch(
  () => props.initial,
  (val) => { if (val) form.value = { name: val.name, code: val.code } },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Gestión de citas" />
    <AppInput v-model="form.code" label="Código" placeholder="APPOINTMENTS" />
    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
