<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { SubModuleResponse } from '@/features/submodules/types/submodules.types'
import type {
  BasePermissionResponse,
  CreateBasePermissionRequest,
} from '../types/base-permissions.types'

const props = defineProps<{
  initial?: BasePermissionResponse | null
}>()

const emit = defineEmits<{
  submit: [data: CreateBasePermissionRequest]
  cancel: []
}>()

const form = ref<CreateBasePermissionRequest>({ name: '', code: '', subModuleId: 0 })
const submitted = ref(false)
const availableSubmodules = ref<SubModuleResponse[]>([])

const submoduleOptions = computed(() =>
  availableSubmodules.value.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  code: form.value.code.trim() ? '' : 'Campo requerido',
  subModuleId: form.value.subModuleId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const data = await submodulesApi.listAll()
  availableSubmodules.value = data
  const first = data[0]
  if (!props.initial && first) form.value.subModuleId = first.id
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, subModuleId: val.subModule?.id ?? 0 }
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
      placeholder="Ver citas"
      :error="submitted ? errors.name : ''"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="APPOINTMENTS_VIEW"
      :error="submitted ? errors.code : ''"
    />
    <AppSelect
      v-model="form.subModuleId"
      label="Submódulo padre"
      required
      :options="submoduleOptions"
      :error="submitted ? errors.subModuleId : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
