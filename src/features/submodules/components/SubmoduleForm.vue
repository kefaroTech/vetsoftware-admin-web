<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { modulesApi } from '@/features/modules/api/modules.api'
import type { AppModule } from '@/features/modules/types/modules.types'
import type { Submodule, CreateSubmoduleCommand } from '../types/submodules.types'

const props = defineProps<{
  initial?: Submodule | null
}>()

const emit = defineEmits<{
  submit: [data: CreateSubmoduleCommand]
  cancel: []
}>()

const form = ref<CreateSubmoduleCommand>({ name: '', code: '', moduleId: 0 })
const submitted = ref(false)
const availableModules = ref<AppModule[]>([])

const moduleOptions = computed(() =>
  availableModules.value.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  code: form.value.code.trim() ? '' : 'Campo requerido',
  moduleId: form.value.moduleId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const { data } = await modulesApi.list()
  availableModules.value = data
  if (!props.initial && data.length > 0) form.value.moduleId = data[0].id
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, moduleId: val.module?.id ?? 0 }
  },
  { immediate: true },
)

function submit() {
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
}
</script>

<template>
  <form class="app-form" novalidate @submit.prevent="submit">
    <AppInput
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Gestión de citas"
      :error="submitted ? errors.name : ''"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="APPOINTMENTS_MANAGE"
      :error="submitted ? errors.code : ''"
    />
    <AppSelect
      v-model="form.moduleId"
      label="Módulo padre"
      required
      :options="moduleOptions"
      :error="submitted ? errors.moduleId : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
