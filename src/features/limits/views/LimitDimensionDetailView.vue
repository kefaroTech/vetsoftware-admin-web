<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import RecordSkeleton from '@/components/ui/RecordSkeleton.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { formatDateTime } from '@/features/quotes/composables/quoteDateTime'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { LIMITS_ROUTE_NAMES } from '@/router/routes/limits.routes'
import LimitDimensionForm from '../components/LimitDimensionForm.vue'
import { MEASURE_KIND_MEANING, measureKindLabel } from '../composables/limitText'
import { useLimitDimensionRecord } from '../composables/useLimitDimensionRecord'
import type { UpdateLimitDimensionRequest } from '../types/limits.types'

/**
 * **El expediente de un eje de cupo**, con su edición.
 *
 * <p><b>Tres de sus seis datos no se editan, y la pantalla lo dice con el motivo
 * delante en vez de esconderlos.</b> El código está copiado en cada cupo ya
 * contratado; el tipo de medida gobierna cómo se contó el consumo que ya existe;
 * la fecha de disponibilidad tiene contratos colgando. `UpdateLimitDimensionRequest`
 * no admite ninguno de los tres, así que dejarlos escribir habría producido la
 * peor variante posible: una pantalla que dice «guardado» sobre un cambio que el
 * servidor descartó.
 *
 * <p><b>Se recarga siempre al abrir</b> aunque la lista ya tuviera el eje: aquí se
 * toman decisiones sobre el submódulo y sobre la gracia, y un dato de hace media
 * hora no vale para eso.
 */
const props = defineProps<{ id: string }>()

const router = useRouter()
const { dimension, loading, error, saving, load, update, clear } = useLimitDimensionRecord()
const formRef = ref<InstanceType<typeof LimitDimensionForm> | null>(null)

const numericId = computed(() => Number(props.id))

onMounted(() => void load(numericId.value))

// Navegar entre dos ejes sin desmontar la vista tiene que recargar: si no, el
// segundo enseñaría el expediente del primero.
watch(numericId, (id) => {
  clear()
  void load(id)
})

// FORM-08: esto es una ruta completa; pulsar el menú con la edición a medias se
// llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleSave(payload: UpdateLimitDimensionRequest) {
  try {
    await update(numericId.value, payload)
    await router.push({ name: LIMITS_ROUTE_NAMES.DIMENSIONS })
  } catch {
    // El composable ya avisó con el mensaje del servidor y su traza. No se
    // navega: perdería lo editado.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-detail-head">
      <RouterLink class="ds-btn ds-btn--ghost" :to="{ name: LIMITS_ROUTE_NAMES.DIMENSIONS }">
        <component :is="ICONS.BACK" :size="15" />
        Volver a los ejes
      </RouterLink>
      <h1 class="ds-title">{{ dimension ? dimension.name : 'Eje de cupo' }}</h1>
    </div>

    <RecordSkeleton v-if="loading && !dimension" :lines="4" />

    <!-- El fallo se pinta ANTES que el vacío: si no, un 500 se disfraza de
         «este eje no existe» (R05). -->
    <div v-else-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ error }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="load(numericId)">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>

    <template v-else-if="dimension">
      <section class="ds-card ficha ds-stack ds-stack--10">
        <p class="ds-kicker">Qué mide</p>
        <p class="ds-text-strong--md linea">{{ measureKindLabel(dimension.measureKind) }}</p>
        <p class="ds-meta linea">{{ MEASURE_KIND_MEANING[dimension.measureKind] }}</p>
        <dl class="ds-detail-grid">
          <dt class="ds-meta">Código</dt>
          <dd class="ds-text-strong codigo">{{ dimension.code }}</dd>
          <dt class="ds-meta">Disponible desde</dt>
          <dd class="ds-text-strong">{{ formatDate(dimension.availableFrom) }}</dd>
          <dt class="ds-meta">Creado</dt>
          <dd class="ds-text-strong">{{ formatDateTime(dimension.createdDate) }}</dd>
        </dl>
      </section>

      <section class="ds-card ficha">
        <LimitDimensionForm
          ref="formRef"
          mode="edit"
          :dimension="dimension"
          :saving="saving"
          @update-submit="handleSave"
          @cancel="router.back()"
        />
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
/* El ancho de una ficha de registro. No sube a `primitives.css`: esa hoja es
   gemela TR-02 y solo `front-parity` puede escribirla. */
.ficha {
  max-width: 640px;
}

.linea {
  margin: 0;
}

.codigo {
  font-family: var(--font-mono);
}
</style>
