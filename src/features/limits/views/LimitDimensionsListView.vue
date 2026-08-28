<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { coincide } from '@/composables/text'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { limitDimensionTarget } from '@/router/routes/limits.routes'
import LimitDimensionsTable from '../components/LimitDimensionsTable.vue'
import LimitDimensionForm from '../components/LimitDimensionForm.vue'
import { useLimitDimensions } from '../composables/useLimitDimensions'
import type { CreateLimitDimensionRequest } from '../types/limits.types'

/**
 * **Ejes de cupo.** El catálogo de lo que la plataforma sabe contar.
 *
 * <p>Son globales: un eje no pertenece a ninguna empresa, y por eso esta pantalla
 * es la única de la sección que no pide un `companyId`.
 *
 * <p><b>La búsqueda es en cliente, y es honesta</b> porque `GET /limit-dimensions`
 * devuelve el conjunto entero sin paginar: el navegador ya tiene todos los ejes
 * antes de que nadie teclee, así que filtrar en memoria es exhaustivo por
 * construcción. Busca por nombre **y por código**, que es lo que alguien pega
 * desde un contrato.
 */
const { dimensions, loading, error, errorTraceId, refresh, create } = useLimitDimensions()

const q = ref('')
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof LimitDimensionForm> | null>(null)

const filtradas = computed(() =>
  dimensions.value.filter((d) => coincide(q.value, d.name) || coincide(q.value, d.code)),
)

/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : filtradas.value.length))

// Recarga al abrir la pantalla, que es la regla del proyecto: servir de caché
// dejaría ver la lista de antes justo después de crear un eje.
onMounted(() => void refresh())

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

function limpiarBusqueda() {
  q.value = ''
}

function handleClose() {
  if (saving.value) return
  showModal.value = false
}

/**
 * El formulario ya se valida a sí mismo antes de emitir: aquí no se vuelve a
 * comprobar, porque una segunda comprobación que nunca puede fallar es código
 * muerto que aparenta seguridad.
 */
async function handleCreate(payload: CreateLimitDimensionRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await create(payload)
    showModal.value = false
  } catch {
    // El composable ya avisó con el mensaje del servidor y su traza; el modal
    // sigue abierto con lo escrito.
  } finally {
    // Aquí y no dentro del `try`: tras el `await` el camino de error nunca lo
    // ejecutaría y el botón quedaría deshabilitado para siempre (FORM-09).
    saving.value = false
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="ejes-titulo">
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="ejes-titulo" class="ds-display--sm titular" tabindex="-1">Ejes de cupo</h2>
        <p class="ds-meta">
          Lo que la plataforma sabe contar. Cada eje fija <strong>qué</strong> se mide y
          <strong>cómo</strong>: si el consumo puede bajar al dar de baja registros, si solo sube, o
          si se reinicia cada periodo.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo eje
      </button>
    </div>

    <AppListSearch
      v-model="q"
      label="Buscar ejes de cupo"
      placeholder="Nombre o código…"
      :result-count="recuento"
    />

    <LimitDimensionsTable
      :dimensions="filtradas"
      :loading="loading"
      :error="error"
      :error-trace-id="errorTraceId"
      :detail-to="(d) => limitDimensionTarget(d.id)"
      @retry="refresh"
    >
      <template #empty>
        <!-- La búsqueda que no casó y el catálogo vacío son estados DISTINTOS.
             Quien busca quiere encontrar, no dar de alta. -->
        <AppEmptyState
          v-if="q.trim()"
          :title="`Sin resultados para «${q.trim()}»`"
          description="Revisa la escritura o prueba con el código del eje."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="limpiarBusqueda">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <AppEmptyState
          v-else
          title="Todavía no hay ningún eje de cupo"
          description="Sin ejes no hay nada que limitar: ni el plan, ni el contrato, ni una excepción negociada tienen sobre qué fijar un techo."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nuevo eje
          </button>
        </AppEmptyState>
      </template>
    </LimitDimensionsTable>

    <AppModal :open="showModal" title="Nuevo eje de cupo" :max-width="620" @close="handleClose">
      <LimitDimensionForm
        ref="formRef"
        mode="create"
        :saving="saving"
        @create-submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
