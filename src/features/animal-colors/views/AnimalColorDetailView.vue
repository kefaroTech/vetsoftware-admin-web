<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimalColors } from '../composables/useAnimalColors'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AnimalColorForm from '../components/AnimalColorForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateAnimalColorRequest } from '../types/animal-colors.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, error, errorTraceId, fetchById, update } = useAnimalColors()
const saving = ref(false)
const formRef = ref<InstanceType<typeof AnimalColorForm> | null>(null)

// El `RouterView` de `App.vue` no lleva `:key`, así que una navegación
// ficha→ficha reutiliza el componente y `onMounted` no volvería a dispararse.
watch(
  () => props.id,
  (id) => fetchById(Number(id)),
  { immediate: true },
)

// FORM-08: esto es una ruta completa; pulsar el sidebar con la edición a medias
// se llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleSave(data: CreateAnimalColorRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.ANIMAL_COLORS_LIST })
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
      <h1 class="ds-title">Editar color</h1>
    </div>

    <!-- EST-01: el error va ANTES que el vacío. Un fallo de carga no puede dejar
         en pantalla la ficha anterior, que es lo que «Guardar» escribiría en el
         identificador de la ruta. -->
    <p v-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ error }}</span>
      <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="fetchById(Number(id))">
        <component :is="ICONS.RETRY" :size="13" />
        Reintentar
      </button>
    </p>

    <section v-else-if="selected" class="ds-card ds-detail-card">
      <AnimalColorForm
        ref="formRef"
        :initial="selected"
        :saving="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </section>

    <AppEmptyState
      v-else-if="!loading"
      title="Ese color ya no está"
      description="Puede haberse eliminado desde otra sesión, o el enlace apunta a un identificador que ya no existe."
    >
      <RouterLink :to="{ name: ROUTE_NAMES.ANIMAL_COLORS_LIST }" class="ds-btn ds-btn--primary">
        Volver al listado
      </RouterLink>
    </AppEmptyState>
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
