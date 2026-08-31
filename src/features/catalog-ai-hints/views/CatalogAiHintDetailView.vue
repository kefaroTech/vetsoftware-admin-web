<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import HintRevisionList from '../components/HintRevisionList.vue'
import HintComposerModal from '../components/HintComposerModal.vue'
import RetireHintModal from '../components/RetireHintModal.vue'
import { useCatalogAiHints, type HintFormError } from '../composables/useCatalogAiHints'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/**
 * El historial de revisiones de la pista de un artículo.
 *
 * <p><b>Ruta propia y no modal.</b> Leer el historial no es un modo: es una
 * tarea de lectura a la que se vuelve, que se enlaza en un correo («mira la
 * revisión 2 de GROOMING») y que se consulta mientras se mira otra cosa. Un
 * modal no se puede enlazar ni dejar abierto, y abrir el compositor desde dentro
 * serían modales anidados. Mismo precedente que el detalle por artículo del
 * catálogo comercial.
 *
 * <p><b>El parámetro es `catalogItemId`, no `id`.</b> El recurso es «la pista
 * vigente de este artículo» y su identidad es el artículo; un parámetro llamado
 * `id` invitaría a pasarle el `id` de una revisión y a cargar otra cosa.
 *
 * <p><b>Una sola llamada: `/revisions`.</b> No se pide `GET /{catalogItemId}`,
 * que responde <b>404 cuando el artículo no tiene pista vigente</b> — y ese 404
 * es el estado normal de todo artículo de la pestaña «Sin pista». Una ficha que
 * enrutara ese 404 al banner de error se rompería justo para los artículos que
 * más necesitan esta pantalla. `/revisions` responde 200 con página vacía
 * (verificado en `ListCatalogItemAiHintRevisionsService`).
 *
 * <p><b>No hay «revertir».</b> El índice único sobre `(catalog_item_id,
 * hint_hash)` cubre todas las filas, así que republicar un texto anterior
 * responde 409: deshacer es imposible por construcción. Lo que sí se ofrece es
 * «Usar como base», que nombra lo que de verdad ocurre.
 */
const route = useRoute()
const catalogItemId = computed<number | null>(() => {
  const raw = Number(route.params.catalogItemId)
  return Number.isFinite(raw) && raw > 0 ? raw : null
})

const { revisions, meId, publishHint, reviseHint, retireHint, findCatalogItem } =
  useCatalogAiHints(catalogItemId)

/** Código y nombre cuando el historial viene vacío: respaldo, no camino feliz. */
const codigoRespaldo = ref<string | null>(null)
const nombreRespaldo = ref<string | null>(null)

const composerOpen = ref(false)
const composerMode = ref<'publish' | 'revise'>('revise')
const composerBase = ref<CatalogItemAiHintResponse | null>(null)
const composerRef = ref<InstanceType<typeof HintComposerModal> | null>(null)
const saving = ref(false)
const composerError = ref<HintFormError | null>(null)

const retireOpen = ref(false)
const retireSaving = ref(false)
const retireError = ref<HintFormError | null>(null)

useUnsavedChangesGuard(() => composerOpen.value && (composerRef.value?.isDirty() ?? false))

/** La de arriba del todo: el endpoint sirve de la más nueva a la más vieja. */
const arriba = computed<CatalogItemAiHintResponse | null>(() => revisions.items.value[0] ?? null)
const vigente = computed(() => (arriba.value?.current ? arriba.value : null))

const codigo = computed(
  () => arriba.value?.catalogItemCode ?? codigoRespaldo.value ?? `#${catalogItemId.value ?? 0}`,
)
const nombre = computed(() => arriba.value?.catalogItemName ?? nombreRespaldo.value ?? null)

/**
 * El estado en una frase, y la frase dice la <b>consecuencia comercial</b>, no
 * el estado de la fila: «superseded» y «vigente» son vocabulario de la tabla, y
 * «el asistente no lo propone» es lo que el operador vino a saber.
 */
const estado = computed(() => {
  if (vigente.value) {
    return `El asistente propone este artículo con la revisión ${vigente.value.hintRevision}, publicada el ${formatDate(vigente.value.publishedAt)}.`
  }
  if (arriba.value) {
    return `Este artículo no se propone. Su última pista se retiró el ${formatDate(arriba.value.supersededAt)}.`
  }
  return 'Este artículo nunca ha tenido pista, así que el asistente no lo propone.'
})

async function cargar() {
  await revisions.reload()
  if (revisions.items.value.length === 0 && catalogItemId.value !== null) {
    const item = await findCatalogItem(catalogItemId.value)
    codigoRespaldo.value = item?.code ?? null
    nombreRespaldo.value = item?.name ?? null
  }
}

onMounted(() => {
  void cargar()
})

function abrirCompositor(base: CatalogItemAiHintResponse | null) {
  composerBase.value = base
  composerMode.value = vigente.value ? 'revise' : 'publish'
  composerError.value = null
  composerOpen.value = true
}

async function publicar(hintText: string) {
  const id = catalogItemId.value
  if (id === null || saving.value) return
  saving.value = true
  const fallo =
    composerMode.value === 'publish'
      ? await publishHint(id, hintText, codigo.value)
      : await reviseHint(id, hintText)
  saving.value = false
  composerError.value = fallo
  if (fallo === null) {
    composerOpen.value = false
    await cargar()
  }
}

async function confirmarRetirada() {
  const hint = vigente.value
  if (!hint || retireSaving.value) return
  retireSaving.value = true
  const fallo = await retireHint(hint)
  retireSaving.value = false
  retireError.value = fallo
  if (fallo === null) {
    retireOpen.value = false
    await cargar()
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div>
        <RouterLink to="/asistente/pistas" class="ds-btn ds-btn--plain ds-btn--sm">
          <component :is="ICONS.BACK" :size="14" aria-hidden="true" />
          Pistas del asistente
        </RouterLink>
        <h1 class="ds-title titulo">
          {{ codigo }}<template v-if="nombre"> · {{ nombre }}</template>
        </h1>
        <!-- `data-testid` y no un ancla por rol: esta frase es LO QUE se
             verifica en las pruebas de los tres estados de cabecera, así que no
             puede ser además el localizador que la encuentra — un texto
             equivocado fallaría diciendo «no lo encuentro». Y es un `<p>` sin
             rol ni nombre accesible propio, así que no hay ancla estructural. -->
        <p class="ds-meta estado" data-testid="estado-pista">
          {{ estado }}
          <AppBadge v-if="!vigente && arriba" variant="warning" label="Sin pista" />
        </p>
      </div>
      <div class="ds-actions ds-actions--start">
        <template v-if="vigente">
          <button type="button" class="ds-btn ds-btn--primary" @click="abrirCompositor(null)">
            Corregir la pista
          </button>
          <button type="button" class="ds-btn ds-btn--danger" @click="retireOpen = true">
            Retirar
          </button>
        </template>
        <button v-else type="button" class="ds-btn ds-btn--primary" @click="abrirCompositor(null)">
          Escribir la pista
        </button>
      </div>
    </div>

    <!-- R05 · el fallo de red va ANTES que el vacío: si no, un 500 se disfraza de
         «este artículo nunca tuvo pista», que es exactamente lo contrario. -->
    <div v-if="revisions.error.value" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ revisions.error.value }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="cargar">
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>
    <p v-if="revisions.error.value && revisions.errorTraceId.value" class="ds-meta">
      Traza: {{ revisions.errorTraceId.value }}
    </p>

    <section v-else class="ds-stack ds-stack--14 historial">
      <h2 class="ds-kicker">Historial de revisiones</h2>

      <p v-if="revisions.loading.value" class="ds-meta" role="status">Cargando el historial…</p>

      <p v-else-if="revisions.items.value.length === 0" class="ds-meta">
        Este artículo no tiene ninguna revisión publicada.
      </p>

      <HintRevisionList
        v-else
        :revisions="revisions.items.value"
        :me-id="meId"
        @base="abrirCompositor"
      />

      <AppPagination
        v-if="revisions.total.value > revisions.pageSize"
        :page="revisions.page.value"
        :page-size="revisions.pageSize"
        :total="revisions.total.value"
        :page-count="revisions.pageCount.value"
        @update:page="revisions.goTo"
      />
    </section>

    <HintComposerModal
      ref="composerRef"
      :open="composerOpen"
      :saving="saving"
      :mode="composerMode"
      :codigo="codigo"
      :current-text="vigente?.hintText ?? null"
      :current-revision="vigente?.hintRevision ?? arriba?.hintRevision ?? null"
      :base-text="composerBase?.hintText ?? null"
      :base-revision="composerBase?.hintRevision ?? null"
      :server-error="composerError"
      @close="composerOpen = false"
      @submit="publicar"
    />

    <RetireHintModal
      :open="retireOpen"
      :saving="retireSaving"
      :hint="vigente"
      :me-id="meId"
      :server-error="retireError"
      @close="retireOpen = false"
      @confirm="confirmarRetirada"
    />
  </AppLayout>
</template>

<style scoped>
.titulo {
  margin: var(--space-6) 0 0;
}

.estado {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
  margin: var(--space-6) 0 0;
  max-width: 72ch;
}

.historial {
  min-width: 0;
}

.historial h2 {
  margin: 0;
}
</style>
