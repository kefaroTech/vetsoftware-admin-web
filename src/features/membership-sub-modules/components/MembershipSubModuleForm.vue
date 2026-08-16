<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { membershipsApi } from '@/features/memberships/api/memberships.api'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { MembershipResponse } from '@/features/memberships/types/memberships.types'
import type { SubModuleResponse } from '@/features/submodules/types/submodules.types'
import type {
  MembershipSubModuleResponse,
  CreateMembershipSubModuleRequest,
} from '../types/membership-sub-modules.types'

const props = defineProps<{
  initial?: MembershipSubModuleResponse | null
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipSubModuleRequest]
  cancel: []
}>()

const form = ref<CreateMembershipSubModuleRequest>({ membershipId: 0, subModuleId: 0 })
const submitted = ref(false)
const memberships = ref<MembershipResponse[]>([])
const submodules = ref<SubModuleResponse[]>([])

const membershipOptions = computed(() =>
  memberships.value.map((m) => ({ value: m.id, label: m.name })),
)
const submoduleOptions = computed(() =>
  submodules.value.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
)

const errors = computed(() => ({
  membershipId: form.value.membershipId ? '' : 'Campo requerido',
  subModuleId: form.value.subModuleId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const [membresias, submodulos] = await Promise.all([
    membershipsApi.listAll(),
    submodulesApi.listAll(),
  ])
  memberships.value = membresias
  submodules.value = submodulos
  if (!props.initial) {
    const firstMembership = membresias[0]
    const firstSubmodule = submodulos[0]
    if (firstMembership) form.value.membershipId = firstMembership.id
    if (firstSubmodule) form.value.subModuleId = firstSubmodule.id
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val)
      form.value = {
        membershipId: val.membership?.id ?? 0,
        subModuleId: val.subModule?.id ?? 0,
      }
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
    <AppSelect
      v-model="form.membershipId"
      label="Membresía"
      required
      :options="membershipOptions"
      :error="submitted ? errors.membershipId : ''"
    />
    <AppSelect
      v-model="form.subModuleId"
      label="Submódulo"
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
