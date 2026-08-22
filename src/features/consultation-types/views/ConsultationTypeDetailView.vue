<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConsultationTypes } from '../composables/useConsultationTypes'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import AppLayout from '@/components/layout/AppLayout.vue'
import ConsultationTypeForm from '../components/ConsultationTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateConsultationTypeRequest } from '../types/consultation-types.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useConsultationTypes()
const saving = ref(false)
const formRef = ref<InstanceType<typeof ConsultationTypeForm> | null>(null)

onMounted(() => fetchById(Number(props.id)))

// FORM-08: esto es una ruta completa; pulsar el sidebar con la edición a medias
// se llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleSave(data: CreateConsultationTypeRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.CONSULTATION_TYPES_LIST })
  } catch {
    // El composable ya avisó del fallo; no navegamos para no perder lo editado.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-detail-head">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar tipo de consulta</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <ConsultationTypeForm
        ref="formRef"
        :initial="selected"
        :saving="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí.
   No sube a `primitives.css` en este cambio: esa hoja es gemela TR-02 y solo
   `front-parity` puede escribirla. El prefijo `ds-` de esta clase induce a
   error mientras tanto — está registrado como issue. */
.ds-detail-card {
  max-width: 640px;
}
</style>
