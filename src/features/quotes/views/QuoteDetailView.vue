<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import RecordSkeleton from '@/components/ui/RecordSkeleton.vue'
import { ICONS } from '@/constants/icons'
import { useToast } from '@/composables/useToast'
import { useQuoteDetail } from '../composables/useQuoteDetail'
import { useQuoteCatalog } from '../composables/useQuoteCatalog'
import QuoteDocument from '../components/QuoteDocument.vue'
import QuoteDraftPanel from '../components/QuoteDraftPanel.vue'
import AcceptQuoteModal from '../components/AcceptQuoteModal.vue'
import { isDecidableQuote, isEmittedQuote } from '../types/quotes.types'
import { QUOTE_ROUTE_NAMES } from '@/router/routes/quotes.routes'

/**
 * **La pantalla que decide el chasis.**
 *
 * <p>No hay un solo `disabled` gobernando el aspecto de esta vista. Hay dos componentes distintos
 * y un `v-if` que elige cuál se monta: `QuoteDraftPanel` mientras la cotización es un borrador,
 * `QuoteDocument` en cuanto se emite. Al pulsar «Enviar», el servidor devuelve el documento ya en
 * `SENT`, el `v-if` cambia de rama y **la pantalla se vuelve a pintar con otra forma**: otra
 * superficie, otro titular, sello de documento, otro repertorio de acciones. Ese cambio de forma
 * es la enseñanza de la §3.2 de la especificación, y es lo que un botón que se pone gris no dice.
 *
 * <p>Por eso «Editar» no aparece en ninguna de las dos ramas, ni deshabilitado ni oculto: el
 * contrato no expone ninguna operación de edición sobre una cotización, en ningún estado.
 *
 * <p>Tras cada transición el foco va al titular del chasis nuevo (`tabindex="-1"`), que es el
 * mecanismo que ya usa `ErrorSummary`: sin él, quien navega con teclado se queda con el foco en un
 * botón que acaba de desaparecer del árbol.
 */
const props = defineProps<{ id: string }>()

const router = useRouter()
const { info } = useToast()
const {
  quote,
  loadingQuote,
  quoteError,
  quoteErrorTraceId,
  savingQuote,
  loadQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
  removeQuote,
} = useQuoteDetail()

/**
 * El catálogo vivo, solo para delatar un renombrado en las líneas congeladas. Es una ayuda: si
 * falla, la pantalla no lo menciona y el documento se pinta igual.
 */
const { findItemById } = useQuoteCatalog()

function currentName(catalogItemId: number): string | undefined {
  return findItemById(catalogItemId)?.name
}

const acceptOpen = ref(false)
const quoteId = computed(() => Number(props.id))

/** Recarga siempre al abrir la pantalla, y también si se navega de una cotización a otra. */
watch(quoteId, (id) => void loadQuote(id), { immediate: true })

/** Devuelve el foco al titular del chasis recién montado, sea el de borrador o el de documento. */
async function focusChassis() {
  await nextTick()
  document.getElementById('quote-document-title')?.focus()
}

async function onSend() {
  if (!quote.value) return
  if (await sendQuote(quote.value)) await focusChassis()
}

async function onAccept(acceptedByEmail: string) {
  if (!quote.value) return
  if (await acceptQuote(quote.value, acceptedByEmail)) {
    acceptOpen.value = false
    await focusChassis()
  }
}

async function onReject() {
  if (!quote.value) return
  if (await rejectQuote(quote.value)) await focusChassis()
}

async function onRemove() {
  if (!quote.value) return
  if (await removeQuote(quote.value)) {
    await router.push({ name: QUOTE_ROUTE_NAMES.QUOTES_LIST })
  }
}

/**
 * «Se corrige emitiendo otra». Lleva los datos de la original al formulario de alta por la query
 * string; el vínculo entre las dos **no se guarda** porque el contrato no tiene dónde, y eso está
 * abierto como issue. El aviso lo dice para que nadie cuente con una trazabilidad que no existe.
 */
function onReissue() {
  if (!quote.value) return
  info(
    'Se abre una cotización nueva',
    'El vínculo con la original no se guarda: el contrato todavía no tiene un campo para él.',
  )
  void router.push({
    name: QUOTE_ROUTE_NAMES.QUOTE_NEW,
    query: { desde: String(quote.value.id) },
  })
}
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <RouterLink
        class="ds-btn ds-btn--plain ds-btn--sm volver"
        :to="{ name: QUOTE_ROUTE_NAMES.QUOTES_LIST }"
      >
        <component :is="ICONS.BACK" :size="14" />
        Cotizaciones
      </RouterLink>

      <p class="ds-sr-only" role="status">
        {{ loadingQuote ? 'Cargando la cotización…' : '' }}
      </p>

      <div v-if="quoteError" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ quoteError }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="loadQuote(quoteId)">
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="quoteError && quoteErrorTraceId" class="ds-meta">Traza: {{ quoteErrorTraceId }}</p>

      <!-- El anuncio de «Cargando…» lo lleva la región `role="status"` de arriba; el
           esqueleto es solo la silueta y va `aria-hidden` desde dentro. -->
      <RecordSkeleton v-else-if="loadingQuote && !quote" />

      <!--
        Documento. Sus acciones son SOLO verbos de añadir; «Eliminar» no aparece aunque
        `DELETE /quotes/{id}` exista para cualquier estado: borrar una oferta enviada es borrar el
        embudo comercial.
      -->
      <QuoteDocument
        v-else-if="quote && isEmittedQuote(quote.status)"
        :quote="quote"
        :current-name="currentName"
        @reissue="onReissue"
      >
        <template v-if="isDecidableQuote(quote.status)" #actions>
          <button
            type="button"
            class="ds-btn ds-btn--primary"
            :disabled="savingQuote"
            @click="acceptOpen = true"
          >
            <component :is="ICONS.CHECK" :size="15" />
            Marcar aceptada
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--ghost"
            :disabled="savingQuote"
            @click="onReject"
          >
            Marcar rechazada
          </button>
        </template>
      </QuoteDocument>

      <!-- Borrador: la puerta de un solo sentido y la única eliminación que existe. -->
      <QuoteDraftPanel v-else-if="quote" :quote="quote" :current-name="currentName">
        <template #actions>
          <button
            type="button"
            class="ds-btn ds-btn--primary"
            :disabled="savingQuote"
            @click="onSend"
          >
            <component :is="ICONS.ARROW_RIGHT" :size="15" />
            Enviar
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--danger"
            :disabled="savingQuote"
            @click="onRemove"
          >
            <component :is="ICONS.DELETE" :size="15" />
            Eliminar borrador
          </button>
        </template>
      </QuoteDraftPanel>

      <AcceptQuoteModal
        v-if="quote"
        :open="acceptOpen"
        :quote="quote"
        :saving="savingQuote"
        @close="acceptOpen = false"
        @submit="onAccept"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
.volver {
  align-self: flex-start;
}
</style>
