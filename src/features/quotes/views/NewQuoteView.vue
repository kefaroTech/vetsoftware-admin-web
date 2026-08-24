<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import QuoteForm from '../components/QuoteForm.vue'
import { ICONS } from '@/constants/icons'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { useQuoteCatalog } from '../composables/useQuoteCatalog'
import { useQuoteCreation } from '../composables/useQuoteCreation'
import { quotesApi } from '../api/quotes.api'
import { QUOTE_ROUTE_NAMES } from '@/router/routes/quotes.routes'
import type { CreateQuoteRequest, QuoteResponse } from '../types/quotes.types'

/**
 * Alta de un borrador — el lado «formulario» de la decisión §3.2.
 *
 * <p>Lo que se crea aquí **no** es todavía un documento: es un borrador que nadie ha visto. Por
 * eso esta pantalla sí tiene campos, validación y un botón de guardar, y por eso la siguiente
 * —el detalle— ya no los tiene.
 *
 * <p>`?desde=<id>` precarga la oferta de una cotización rechazada o vencida. Es la forma que el
 * modelo permite de «corregir» una cotización: emitir otra. El vínculo entre las dos no se
 * persiste porque el contrato no tiene campo para él, y eso está declarado como issue en vez de
 * fingir una trazabilidad que no existe.
 */
const route = useRoute()
const router = useRouter()
const form = ref<InstanceType<typeof QuoteForm> | null>(null)

const { itemOptions, priceListOptions, loading, error, refresh } = useQuoteCatalog()
const { savingQuote, createQuote } = useQuoteCreation()

const reissuedFrom = ref<QuoteResponse | null>(null)

/**
 * El aviso de cambios sin guardar cubre las dos salidas que el usuario no controla del todo:
 * cerrar la pestaña y navegar a otra ruta. No cubre «Cancelar», que es una acción con intención.
 */
useUnsavedChangesGuard(
  () => form.value?.isDirty() === true,
  'Hay una cotización a medio escribir. Si sales ahora se pierde y no queda ningún borrador.',
)

onMounted(async () => {
  const desde = route.query.desde
  const id = Number(Array.isArray(desde) ? desde[0] : desde)
  if (!Number.isInteger(id) || id <= 0) return
  try {
    reissuedFrom.value = await quotesApi.findById(id)
  } catch {
    // Que no se pueda leer la original no impide cotizar de cero: el formulario sigue en pie y
    // simplemente no se precarga. El fallo ya lo anunció el interceptor.
    reissuedFrom.value = null
  }
})

async function onSubmit(payload: Omit<CreateQuoteRequest, 'clientRequestId'>) {
  const created = await createQuote(payload)
  if (!created) return
  await router.push({ name: QUOTE_ROUTE_NAMES.QUOTE_DETAIL, params: { id: created.id } })
}

function onCancel() {
  void router.push({ name: QUOTE_ROUTE_NAMES.QUOTES_LIST })
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

      <div class="ds-head">
        <div>
          <h1 class="ds-title">Nueva cotización</h1>
          <p class="ds-subtitle">
            Se crea como borrador. Nadie la ve hasta que la envíes, y al enviarla deja de poder
            editarse o eliminarse.
          </p>
        </div>
      </div>

      <QuoteForm
        ref="form"
        :item-options="itemOptions"
        :price-list-options="priceListOptions"
        :options-loading="loading"
        :options-error="error"
        :saving="savingQuote"
        :reissued-from="reissuedFrom"
        @submit="onSubmit"
        @cancel="onCancel"
        @retry-options="refresh"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
.volver {
  align-self: flex-start;
}
</style>
