<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLaboratoryTestTypes } from '../composables/useLaboratoryTestTypes'
import type { LaboratoryTestTypeFormData } from '../composables/useLaboratoryTestTypes'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import AppLayout from '@/components/layout/AppLayout.vue'
import LaboratoryTestTypeForm from '../components/LaboratoryTestTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useLaboratoryTestTypes()
const saving = ref(false)
const formRef = ref<InstanceType<typeof LaboratoryTestTypeForm> | null>(null)

onMounted(() => fetchById(Number(props.id)))

// FORM-08: esto es una ruta completa; pulsar el sidebar con la edición a medias
// se llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleSave(data: LaboratoryTestTypeFormData) {
  if (saving.value) return
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.LABORATORY_TEST_TYPES_LIST })
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
      <h1 class="ds-title">Editar tipo de laboratorio</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <LaboratoryTestTypeForm
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
