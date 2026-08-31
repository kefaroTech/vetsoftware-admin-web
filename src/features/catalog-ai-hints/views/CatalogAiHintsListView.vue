<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import { segmentedTabId, type SegmentedTabOption } from '@/components/ui/segmented-tabs'
import { useQuerySync } from '@/composables/useQuerySync'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import HintsWithHintTable from '../components/HintsWithHintTable.vue'
import HintsMissingTable from '../components/HintsMissingTable.vue'
import HintComposerModal from '../components/HintComposerModal.vue'
import RetireHintModal from '../components/RetireHintModal.vue'
import { sujetoCorto } from '../composables/hintText'
import { useCatalogAiHints, type HintFormError } from '../composables/useCatalogAiHints'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * <b>Pistas del asistente</b> — lo que el modelo lee para decidir qué artículo
 * proponerle a un prospecto que escribe en texto libre lo que necesita.
 *
 * <p><b>Editar aquí cambia lo que se le ofrece a desconocidos, al instante.</b>
 * No hay entorno intermedio, ni bandera de despliegue, ni revisión de nadie: el
 * siguiente prospecto que escriba en la landing recibirá una propuesta calculada
 * con este texto. Y el efecto <b>no se ve desde esta pantalla</b> —el bucle de
 * realimentación vive en las cotizaciones que se generen después—, así que lo
 * único honesto que puede hacer es decir que el cambio rige ya, dejar el texto
 * anterior a la vista mientras se escribe el nuevo y conservar el historial.
 *
 * <p><b>La segunda pestaña es el hallazgo de fondo.</b> El backend solo sabe
 * listar las pistas vigentes; nada contesta «¿qué artículo está a la venta y el
 * asistente no puede proponer?». Se deriva aquí, en el cliente, y solo al
 * activar la pestaña.
 *
 * <p><b>Sin buscador, a propósito.</b> `GET /catalog-item-ai-hints` no acepta
 * término de búsqueda. Filtrar en el cliente la página cargada haría que
 * `AppListSearch` anunciara «3 resultados» sobre un total de sesenta, que es
 * mentir en el canal de accesibilidad.
 */
const TABS: SegmentedTabOption[] = [
  { value: 'con', label: 'Con pista' },
  { value: 'sin', label: 'Sin pista' },
]

const panelId = useId()
const { state } = useQuerySync({ tab: 'con' })

const {
  hints,
  meId,
  missingItems,
  missingLoading,
  missingError,
  missingTraceId,
  loadMissing,
  publishHint,
  reviseHint,
  retireHint,
  findCurrentHint,
} = useCatalogAiHints()

const composerOpen = ref(false)
const composerMode = ref<'publish' | 'revise'>('publish')
const composerItemId = ref<number | null>(null)
const composerCodigo = ref('')
const composerCurrent = ref<CatalogItemAiHintResponse | null>(null)
const composerRef = ref<InstanceType<typeof HintComposerModal> | null>(null)
const saving = ref(false)
const composerError = ref<HintFormError | null>(null)

const retireOpen = ref(false)
const retireTarget = ref<CatalogItemAiHintResponse | null>(null)
const retireSaving = ref(false)
const retireError = ref<HintFormError | null>(null)
/** El cierre que viene, ¿es el de una retirada ya ejecutada? */
const retirado = ref(false)

useUnsavedChangesGuard(() => composerOpen.value && (composerRef.value?.isDirty() ?? false))

onMounted(() => {
  void hints.goTo(1)
})

// La derivación de «Sin pista» es perezosa: recorre TODAS las páginas de dos
// colecciones y el camino por defecto tiene que seguir siendo una petición.
watch(
  () => state.tab,
  (tab) => {
    if (tab === 'sin') void loadMissing()
  },
  { immediate: true },
)

// Con el listado vacío hay que distinguir «la plataforma no está sembrada» de
// «hay artículos y ninguno tiene pista», y eso solo lo sabe la otra colección.
watch(
  () => hints.isEmpty.value,
  (vacio) => {
    if (vacio && state.tab === 'con') void loadMissing()
  },
)

const sinArticulosALaVenta = computed(
  () => !missingLoading.value && missingItems.value.length === 0,
)

/**
 * A11Y-08 · dónde dejar el foco cuando el diálogo de retirada se cierra.
 *
 * <p>Al retirar desde el listado <b>la fila desaparece</b> y con ella el botón
 * que abrió el diálogo: sin esto el foco cae al `body`. Se devuelve a la pestaña
 * activa, que es el ancla estable del panel donde acaba de aparecer el listado
 * ya sin la fila. Se pasa como FUNCIÓN para que se resuelva en el instante del
 * cierre: cancelar o pulsar Escape no ha borrado nada y debe usar la cadena de
 * respaldo de `ModalShell` —el disparador, que ahí sí sigue existiendo—.
 */
function focoAlCerrarRetirada(): HTMLElement | null {
  if (!retirado.value) return null
  return document.getElementById(segmentedTabId(panelId, state.tab))
}

function abrirCorreccion(hint: CatalogItemAiHintResponse) {
  composerMode.value = 'revise'
  composerItemId.value = hint.catalogItemId
  composerCodigo.value = sujetoCorto(hint)
  composerCurrent.value = hint
  composerError.value = null
  composerOpen.value = true
}

function abrirEscritura(item: CatalogItemResponse) {
  composerMode.value = 'publish'
  composerItemId.value = item.id
  composerCodigo.value = item.code
  composerCurrent.value = null
  composerError.value = null
  composerOpen.value = true
}

function abrirRetirada(hint: CatalogItemAiHintResponse) {
  retireTarget.value = hint
  retireError.value = null
  retirado.value = false
  retireOpen.value = true
}

/**
 * El modal NO se cierra cuando el envío falla: el texto se queda escrito y el
 * error se pinta dentro. Cerrarlo tiraría mil caracteres redactados.
 */
async function publicar(hintText: string) {
  const id = composerItemId.value
  if (id === null || saving.value) return
  saving.value = true
  const fallo =
    composerMode.value === 'publish'
      ? await publishHint(id, hintText, composerCodigo.value)
      : await reviseHint(id, hintText)
  saving.value = false
  composerError.value = fallo
  if (fallo === null) {
    composerOpen.value = false
    return
  }
  // Alguien publicó la primera pista mientras este operador escribía. Se carga
  // la que hay y el compositor pasa a corregir, que es lo que ahora procede.
  if (fallo.code === 'CATALOG_ITEM_AI_HINT_ALREADY_PUBLISHED') {
    const vigente = await findCurrentHint(id)
    if (vigente) {
      composerCurrent.value = vigente
      composerMode.value = 'revise'
    }
  }
}

async function confirmarRetirada() {
  const hint = retireTarget.value
  if (!hint || retireSaving.value) return
  retireSaving.value = true
  const fallo = await retireHint(hint)
  retireSaving.value = false
  retireError.value = fallo
  if (fallo === null) {
    retirado.value = true
    retireOpen.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div>
        <p class="eyebrow ds-meta">Suscripciones · El asistente</p>
        <h1 class="ds-title">Pistas del asistente</h1>
        <p class="ds-meta aviso">
          Lo que se escriba aquí rige desde la siguiente propuesta del asistente. No hay despliegue.
        </p>
      </div>
      <button
        v-if="state.tab === 'con'"
        type="button"
        class="ds-btn ds-btn--primary"
        @click="state.tab = 'sin'"
      >
        Ver artículos sin pista
      </button>
    </div>

    <div class="pestanas">
      <AppSegmentedTabs
        v-model="state.tab"
        :options="TABS"
        label="Estado de la pista"
        :panel-id="panelId"
      />
    </div>

    <section
      :id="panelId"
      role="tabpanel"
      :aria-labelledby="segmentedTabId(panelId, state.tab)"
      class="panel ds-stack ds-stack--14"
    >
      <template v-if="state.tab === 'con'">
        <HintsWithHintTable
          :hints="hints.items.value"
          :loading="hints.loading.value"
          :error="hints.error.value"
          :trace-id="hints.errorTraceId.value"
          :empty="hints.items.value.length === 0"
          :me-id="meId"
          @retry="hints.reload"
          @revise="abrirCorreccion"
          @retire="abrirRetirada"
        >
          <template #empty>
            <PlatformSetupChecklist v-if="sinArticulosALaVenta" />
            <AppEmptyState
              v-else
              title="Ningún artículo tiene pista"
              description="El asistente todavía no puede proponer nada."
            >
              <button type="button" class="ds-btn ds-btn--primary" @click="state.tab = 'sin'">
                Ver artículos sin pista
              </button>
            </AppEmptyState>
          </template>
        </HintsWithHintTable>
        <AppPagination
          v-if="!hints.error.value && hints.total.value > 0"
          :page="hints.page.value"
          :page-size="hints.pageSize"
          :total="hints.total.value"
          :page-count="hints.pageCount.value"
          @update:page="hints.goTo"
        />
      </template>

      <HintsMissingTable
        v-else
        :items="missingItems"
        :loading="missingLoading"
        :error="missingError"
        :trace-id="missingTraceId"
        @retry="loadMissing(true)"
        @write="abrirEscritura"
      />
    </section>

    <HintComposerModal
      ref="composerRef"
      :open="composerOpen"
      :saving="saving"
      :mode="composerMode"
      :codigo="composerCodigo"
      :current-text="composerCurrent?.hintText ?? null"
      :current-revision="composerCurrent?.hintRevision ?? null"
      :base-text="null"
      :base-revision="null"
      :server-error="composerError"
      @close="composerOpen = false"
      @submit="publicar"
    />

    <RetireHintModal
      :open="retireOpen"
      :saving="retireSaving"
      :hint="retireTarget"
      :me-id="meId"
      :server-error="retireError"
      :return-focus-to="focoAlCerrarRetirada"
      @close="retireOpen = false"
      @confirm="confirmarRetirada"
    />
  </AppLayout>
</template>

<style scoped>
.eyebrow {
  margin: 0 0 var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.aviso {
  margin: var(--space-6) 0 0;
  max-width: 62ch;
}

.pestanas {
  margin-bottom: var(--space-20);
}

.panel {
  min-width: 0;
}
</style>
