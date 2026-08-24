<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useSubscriptionItems } from '../../composables/useSubscriptionItems'
import { useSubscriptionItemCatalog } from '../../composables/useSubscriptionItemCatalog'
import SubscriptionItemsQuery from '../../components/record/SubscriptionItemsQuery.vue'
import SubscriptionItemsTable from '../../components/record/SubscriptionItemsTable.vue'
import AddSubscriptionItemModal from '../../components/record/AddSubscriptionItemModal.vue'
import ChangeItemQuantityModal from '../../components/record/ChangeItemQuantityModal.vue'
import RemoveSubscriptionItemModal from '../../components/record/RemoveSubscriptionItemModal.vue'
import type { SubscriptionItemResponse } from '../../types/subscription-items.types'
import {
  RECORD_LINK_PARAMS,
  useRecordLinkId,
  useSignaledArrival,
} from '../../composables/useRecordLink'

/**
 * `/suscripciones/:companyId/:id/contratado` — <b>«Lo contratado»</b> (§3.3, tarea
 * W2-B).
 *
 * <p>Es la mitad de la pregunta que vertebra el modelo: <b>«¿qué tenía contratado
 * Ana el 3 de marzo?»</b>. La otra mitad —«¿y por qué se le facturaron 179.000?»— la
 * responden «Historia» y «Dinero»; desde aquí se salta a ellas por el otrosí que
 * abrió o cerró cada línea.
 *
 * <p><b>Tres decisiones que esta pantalla implementa y que no son negociables:</b>
 *
 * <ol>
 *   <li><b>`onDate` es el control principal</b>, arriba y visible, no un filtro
 *       plegado. Es lo que convierte una tabla en una respuesta.</li>
 *   <li><b>Tres estados de línea</b>: Vigente, Programada y Cerrada. «Vigente» no es
 *       «sin fecha de fin», es «ya empezó y todavía no ha terminado», y el criterio
 *       equivocado es invisible hasta que un cliente reclama. El criterio vive en un
 *       solo sitio: `composables/subscriptionItemLifecycle.ts`.</li>
 *   <li><b>Las cerradas se muestran.</b> No se ocultan ni se tachan: son la historia
 *       de lo que se contrató.</li>
 * </ol>
 *
 * <p><b>No se pinta la cabecera de empresa</b>: vive en el armazón y está en las seis
 * sub-vistas. Y no se recarga el contrato: `useSubscriptionItems` lee `companyId` y
 * `subscriptionId` del expediente ya abierto y solo carga lo suyo.
 */
const {
  subscription,
  companyName,
  rows,
  counts,
  openCatalogItemIds,
  referenceDate,
  scope,
  loading,
  saving,
  error,
  errorTraceId,
  announcement,
  truncated,
  totalElements,
  setReferenceDate,
  setScope,
  reload,
  addItem,
  changeQuantity,
  removeItem,
} = useSubscriptionItems()

const {
  ready: catalogReady,
  isCore,
  error: catalogError,
  refresh: refreshCatalog,
} = useSubscriptionItemCatalog()

/**
 * <b>La vuelta de la cadena de §3.3.</b> «Acceso» enlaza aquí con `?item=<idLínea>`
 * (`EntitlementsTable.vue:60-71`) e «Historia» con `?otrosi=<idOtrosí>`
 * (`AmendmentEntry.vue:97`). Las dos son la mitad de ida de la misma frase del
 * modelo —«cada eslabón es un enlace, y cada uno tiene su vuelta»— y sin que esta
 * pantalla las lea, el operador aterriza en una tabla de quince líneas, cerradas
 * incluidas, y busca la suya a ojo mientras el cliente espera.
 *
 * <p>Se leen los dos parámetros y no se inventa un tercero: los nombres los fijaron
 * las sub-vistas que enlazan, y elegir otro habría dejado los dos extremos de la
 * cadena hablando idiomas distintos. Desde W3-D esos nombres ya no son un acuerdo
 * tácito leído del código ajeno: viven en `useRecordLink.ts`, que es lo que
 * pidieron los issues #161 y #164.
 */
const linkedItemId = useRecordLinkId(RECORD_LINK_PARAMS.ITEM)
const linkedAmendmentId = useRecordLinkId(RECORD_LINK_PARAMS.AMENDMENT)

/** Las líneas que hay que señalar: la enlazada, o las que abrió o cerró ese otrosí. */
const highlightedIds = computed(() => {
  const ids = new Set<number>()
  const item = linkedItemId.value
  const amendment = linkedAmendmentId.value
  for (const row of rows.value) {
    if (item !== null && row.item.id === item) ids.add(row.item.id)
    if (
      amendment !== null &&
      (row.item.createdAmendmentId === amendment || row.item.endedAmendmentId === amendment)
    ) {
      ids.add(row.item.id)
    }
  }
  return ids
})

/**
 * Qué se dice de ese enlace. <b>Cuando no se encuentra la línea, se dice</b>: la
 * consulta puede estar en «Solo lo vigente» o en otra fecha, y quedarse callado
 * dejaría al operador creyendo que la línea no existe.
 */
const linkNotice = computed(() => {
  if (loading.value || error.value) return ''
  const item = linkedItemId.value
  const amendment = linkedAmendmentId.value
  if (item === null && amendment === null) return ''
  const found = highlightedIds.value.size
  if (found === 0) {
    const que = item !== null ? `La línea #${item}` : `Ninguna línea del otrosí #${amendment}`
    return `${que} no está entre las que se muestran. Prueba con «Expediente completo» o mueve la fecha de consulta.`
  }
  return found === 1
    ? 'Se señala la línea desde la que llegaste.'
    : `Se señalan las ${found} líneas desde las que llegaste.`
})

/**
 * Los anclas de las líneas señaladas, <b>en el orden en que se pintan</b>: un
 * otrosí puede haber cerrado una línea y abierto su sucesora, y se salta a la
 * primera de las dos que aparece en la tabla, no a la de id más bajo.
 */
const signaledAnchors = computed(() =>
  rows.value
    .filter((row) => highlightedIds.value.has(row.item.id))
    .map((row) => `linea-${row.item.id}`),
)

/**
 * Llevar la línea a la vista <b>y al foco</b>, una sola vez por llegada.
 *
 * <p>W2-B escribió aquí un `scrollIntoView` sin foco, y el motivo que dejó escrito
 * sigue siendo válido: mover el foco mientras el operador cambia la fecha de
 * consulta sería robárselo. El mecanismo compartido conserva esa garantía —solo
 * actúa cuando <i>cambia</i> el identificador enlazado, no en cada repintado— y
 * añade lo que faltaba para el caso de llegada: se viene de pulsar un enlace en
 * «Acceso», «Historia» o «Dinero», el enlace se desmontó y el foco está en
 * `&lt;body&gt;`. Sin esto, quien navega con teclado tiene que recorrer la pantalla
 * entera hasta la fila que el enlace le prometió.
 */
useSignaledArrival({
  linkedId: computed(() => linkedItemId.value ?? linkedAmendmentId.value),
  anchors: signaledAnchors,
  settled: computed(() => !loading.value && !error.value),
})

const addOpen = ref(false)
const quantityTarget = ref<SubscriptionItemResponse | null>(null)
const removeTarget = ref<SubscriptionItemResponse | null>(null)

const hasRows = computed(() => rows.value.length > 0)

/**
 * Tras una escritura la tabla se repinta entera y el botón que se pulsó puede haber
 * desaparecido del árbol —una línea recién cerrada pierde sus acciones—. El foco va
 * al titular de la sección, que lleva `tabindex="-1"`: es el mismo mecanismo de
 * `SubscriptionSummaryView` y de `QuoteDetailView`, y evita que el foco caiga al
 * `<body>` y quien navegue con teclado tenga que volver a empezar.
 */
async function focusSectionTitle() {
  await nextTick()
  document.getElementById('record-items-title')?.focus()
}

async function onAddSubmit(payload: Parameters<typeof addItem>[0]) {
  if (await addItem(payload)) {
    addOpen.value = false
    await focusSectionTitle()
  }
}

async function onQuantitySubmit(payload: Parameters<typeof changeQuantity>[0]) {
  if (await changeQuantity(payload)) {
    quantityTarget.value = null
    await focusSectionTitle()
  }
}

async function onRemoveSubmit(payload: Parameters<typeof removeItem>[0]) {
  if (await removeItem(payload)) {
    removeTarget.value = null
    await focusSectionTitle()
  }
}
</script>

<template>
  <section v-if="subscription" class="ds-stack ds-stack--18" aria-labelledby="record-items-title">
    <div class="ds-block-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="record-items-title" class="ds-title" tabindex="-1">Lo contratado</h2>
        <!-- El sello textual de §3.2, con icono Y con texto: nunca solo un `title`. -->
        <DocumentSeal text="Documento · solo se agrega" />
      </div>
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="saving"
        @click="addOpen = true"
      >
        <component :is="ICONS.ADD" :size="15" />
        Añadir artículo
      </button>
    </div>

    <p class="ds-meta">
      Estos registros no se editan; se corrigen abriendo otros. Dar de baja no borra la línea: le
      escribe la fecha de fin, y la línea se queda aquí.
    </p>

    <SubscriptionItemsQuery
      :date="referenceDate"
      :scope="scope"
      @update:date="setReferenceDate"
      @update:scope="setScope"
    />

    <!-- §5.3: un cambio de consulta repinta la tabla y no mueve el foco. Se anuncia
         el RESULTADO —«5 vigentes, 1 programada, 2 cerradas»—, que es la respuesta,
         y no un «cargando» que no dice nada. -->
    <p class="ds-sr-only" role="status">{{ announcement }}</p>

    <!-- El aviso del enlace de vuelta se ve Y se anuncia: es la respuesta a por qué
         esta pantalla se abrió sola en una línea concreta. -->
    <div v-if="linkNotice" class="ds-banner ds-banner--info ds-banner--sm" role="status">
      <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
      <span>{{ linkNotice }}</span>
    </div>

    <div v-if="catalogError" class="ds-banner ds-banner--warning" role="status">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        {{ catalogError }} Mientras tanto no se puede añadir ni dar de baja: sin el catálogo no se
        sabe qué artículo es del núcleo, y ofrecer una baja que el servidor rechaza sería peor.
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="refreshCatalog">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>

    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ error }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="reload">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>
    <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

    <div v-else-if="loading" class="ds-card ds-stack ds-stack--14" aria-hidden="true">
      <!-- Barras a ancho completo, sin clases locales de anchura: el par
           `{display:block;width:60%}` / `{height:var(--space-24);width:32%}` ya
           vive en tres componentes y una cuarta copia rompe `css:budget`. La
           primitiva `ds-skeleton--text` basta, y dentro de un `ds-stack` —que es
           `flex-direction: column`— los `<span>` se estiran solos. -->
      <span class="ds-skeleton ds-skeleton--text" />
      <span class="ds-skeleton ds-skeleton--text" />
      <span class="ds-skeleton ds-skeleton--text" />
    </div>

    <template v-else>
      <div v-if="hasRows" class="ds-card ds-stack ds-stack--10 expediente">
        <p class="ds-meta">
          Al {{ formatDate(referenceDate) }}: {{ counts.current }} vigentes,
          {{ counts.scheduled }} programadas y {{ counts.closed }} cerradas.
        </p>

        <SubscriptionItemsTable
          :rows="rows"
          :company-id="subscription.companyId"
          :subscription-id="subscription.id"
          :core-known="catalogReady"
          :is-core="isCore"
          :highlighted-ids="highlightedIds"
          :busy="saving"
          @quantity="quantityTarget = $event"
          @remove="removeTarget = $event"
        />

        <p v-if="truncated" class="ds-meta">
          Se muestran {{ rows.length }} de {{ totalElements }} líneas. El expediente está truncado
          por paginación: revísalo con el equipo antes de dar por completa la respuesta.
        </p>
      </div>

      <!-- Dos vacíos distintos, porque significan cosas distintas: un contrato sin
           ninguna línea es un problema, y «ese día no tenía nada vigente» es una
           respuesta legítima a la pregunta que se hizo. -->
      <AppEmptyState
        v-else-if="scope === 'on-date'"
        :icon="ICONS.EMPTY"
        title="Ese día no tenía nada vigente"
        :description="`El ${formatDate(referenceDate)} no había ninguna línea en vigor. Cambia a «Expediente completo» para ver lo que se contrató antes o después.`"
      />
      <AppEmptyState
        v-else
        :icon="ICONS.EMPTY"
        title="Este contrato no tiene ninguna línea"
        description="Ni vigentes, ni programadas, ni cerradas. Un contrato sin líneas no factura nada: revísalo antes de darlo por bueno."
      />
    </template>

    <AddSubscriptionItemModal
      :open="addOpen"
      :subscription="subscription"
      :company-name="companyName"
      :open-catalog-item-ids="openCatalogItemIds"
      :saving="saving"
      @close="addOpen = false"
      @submit="onAddSubmit"
    />

    <ChangeItemQuantityModal
      v-if="quantityTarget"
      :open="!!quantityTarget"
      :item="quantityTarget"
      :subscription="subscription"
      :company-name="companyName"
      :saving="saving"
      @close="quantityTarget = null"
      @submit="onQuantitySubmit"
    />

    <RemoveSubscriptionItemModal
      v-if="removeTarget"
      :open="!!removeTarget"
      :item="removeTarget"
      :subscription="subscription"
      :company-name="companyName"
      :saving="saving"
      @close="removeTarget = null"
      @submit="onRemoveSubmit"
    />
  </section>
</template>

<style scoped>
/* La regla superior es la señal de chasis de documento: separa un expediente de una
   tarjeta de trabajo sin depender del color. Misma decisión que
   `ExternalInvoiceRecord.vue`. */
.expediente {
  border-top: 3px solid var(--amatista-500);
}
</style>
