<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { membershipsApi } from '@/features/memberships/api/memberships.api'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { Membership } from '@/features/memberships/types/memberships.types'
import type { Submodule } from '@/features/submodules/types/submodules.types'
import type {
  MembershipSubModule,
  CreateMembershipSubModuleCommand,
} from '../types/membership-sub-modules.types'

const props = defineProps<{
  initial?: MembershipSubModule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipSubModuleCommand]
  cancel: []
}>()

const form = ref<CreateMembershipSubModuleCommand>({ membershipId: 0, subModuleId: 0 })
const formValid = ref(false)
const memberships = ref<Membership[]>([])
const submodules = ref<Submodule[]>([])
const loadingData = ref(false)

onMounted(async () => {
  loadingData.value = true
  try {
    const [membershipsRes, submodulesRes] = await Promise.all([
      membershipsApi.list(),
      submodulesApi.list(),
    ])
    memberships.value = membershipsRes.data
    submodules.value = submodulesRes.data
    if (!props.initial) {
      if (membershipsRes.data.length > 0) form.value.membershipId = membershipsRes.data[0].id
      if (submodulesRes.data.length > 0) form.value.subModuleId = submodulesRes.data[0].id
    }
  } finally {
    loadingData.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { membershipId: val.membershipId, subModuleId: val.subModuleId }
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
      <v-select
        v-model="form.membershipId"
        label="Membresía"
        :items="memberships"
        item-title="name"
        item-value="id"
        :loading="loadingData"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <v-select
        v-model="form.subModuleId"
        label="Submódulo"
        :items="submodules"
        :item-title="(s: Submodule) => `${s.name} (${s.code})`"
        item-value="id"
        :loading="loadingData"
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
