<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { formatMoney, formatDate } from '@/composables/format'
import { useQuotes } from '../composables/useQuotes'
import { useQuotePriceLists } from '../composables/useQuotePriceLists'
import QuoteStatusBadge from '../components/QuoteStatusBadge.vue'
import QuoteValidity from '../components/QuoteValidity.vue'
import { QUOTE_ROUTE_NAMES } from '@/router/routes/quotes.routes'
import type { QuoteSummaryResponse } from '../types/quotes.types'

/**
 * El embudo comercial — `GET /quotes/platform`.
 *
 * <p>Es la ruta de **plataforma**, no `GET /quotes`: aquella es `listMine` y resuelve la empresa
 * con `currentCompanyId()`, que para un usuario de sistema exige `X-Company-Id`. `/quotes/platform`
 * es el embudo completo, sin filtro de empresa.
 *
 * <p>La columna de cliente resuelve empresa y prospecto en una sola: si el DTO trae `company` se
 * pinta el nombre —esta es la única familia de las pantallas de suscripciones cuyo DTO lo trae—;
 * si no, el nombre del prospecto con la marca «Prospecto».
 */
const router = useRouter()
const {
  quotes,
  page,
  pageSize,
  total,
  pageCount,
  loadingQuotes,
  quotesError,
  quotesErrorTraceId,
  loadQuotes,
} = useQuotes()

function goToDetail(quote: QuoteSummaryResponse) {
  void router.push({ name: QUOTE_ROUTE_NAMES.QUOTE_DETAIL, params: { id: quote.id } })
}

/**
 * <b>Aquí la divisa es de la fila, no de la tabla.</b> Cada cotización apunta a su propia tarifa
 * (`priceListId`) y dos filas de esta lista pueden estar en divisas distintas, así que un rótulo
 * de tabla sería falso en cuanto conviviera una tarifa en dólares con una en pesos. Se resuelve
 * `PriceListResponse.currency` por fila y se rotula la celda con `formatMoney` — que es la regla
 * de `format.ts` en su forma fuerte: si la respuesta lleva divisa, esa es la respuesta.
 */
const { currencyOf } = useQuotePriceLists()

/** Cuántas filas de la página no han podido resolver su divisa. Se dice, no se rellena. */
const sinDivisa = computed(
  () => quotes.value.filter((quote) => currencyOf(quote.priceListId) === null).length,
)

/** Recarga siempre al abrir la pantalla: el embudo lo mueven otros operadores y el cron. */
onMounted(() => void loadQuotes(1))
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Cotizaciones</h1>
          <p class="ds-subtitle">
            El embudo comercial: quién pidió precio, qué se le ofreció y quién no volvió.
          </p>
        </div>
        <div class="ds-flex-row">
          <button
            type="button"
            class="ds-btn ds-btn--ghost"
            :disabled="loadingQuotes"
            @click="loadQuotes(page)"
          >
            <component :is="ICONS.RETRY" :size="15" />
            Actualizar
          </button>
          <RouterLink class="ds-btn ds-btn--primary" :to="{ name: QUOTE_ROUTE_NAMES.QUOTE_NEW }">
            <component :is="ICONS.ADD" :size="15" />
            Nueva cotización
          </RouterLink>
        </div>
      </div>

      <section class="ds-stack ds-stack--10" aria-labelledby="embudo-titulo">
        <div class="ds-block-head">
          <div class="ds-stack ds-stack--8">
            <h2 id="embudo-titulo" class="ds-title">Embudo</h2>
            <p class="ds-meta">{{ total }} cotizaciones registradas</p>
            <p v-if="sinDivisa > 0" class="ds-meta">
              {{ sinDivisa }}
              {{ sinDivisa === 1 ? 'fila va' : 'filas van' }} sin símbolo de divisa: su tarifa no se
              pudo resolver, y esta consola no supone una.
            </p>
          </div>
        </div>

        <AppTable
          :headers="[
            'Cotización',
            'Cliente',
            'Estado',
            { label: 'Total', align: 'num' },
            'Vigencia',
            'Emitida',
          ]"
          :empty="quotes.length === 0"
          :loading="loadingQuotes"
          :error="quotesError"
          :trace-id="quotesErrorTraceId"
          @retry="loadQuotes(page)"
        >
          <!--
            Vacío de arranque, no «sin resultados»: esta pantalla no tiene buscador, así que si
            está vacía es porque no se ha cotizado nunca. Cuando W1-B entregue
            `PlatformSetupChecklist`, su variante compacta sustituye a este bloque y enlaza a los
            pasos de la puesta en marcha que faltan para poder cotizar.
          -->
          <template #empty>
            <AppEmptyState
              title="Todavía no se ha cotizado a nadie"
              description="Para cotizar hace falta el catálogo sembrado y una tarifa publicada. Si el desplegable de tarifas sale vacío, empieza por el catálogo comercial."
            >
              <RouterLink
                class="ds-btn ds-btn--primary"
                :to="{ name: QUOTE_ROUTE_NAMES.QUOTE_NEW }"
              >
                <component :is="ICONS.ADD" :size="15" />
                Nueva cotización
              </RouterLink>
            </AppEmptyState>
          </template>

          <tr
            v-for="quote in quotes"
            :key="quote.id"
            class="ds-row-clickable"
            @click="goToDetail(quote)"
          >
            <td>
              <!-- La fila es clicable, pero el enlace real vive aquí: una fila clicable sin un
                   enlace dentro no es alcanzable por teclado. -->
              <RouterLink
                class="ds-text-strong"
                :to="{ name: QUOTE_ROUTE_NAMES.QUOTE_DETAIL, params: { id: quote.id } }"
                @click.stop
              >
                {{ quote.quoteNumber }}
              </RouterLink>
            </td>
            <td>
              <RouterLink
                v-if="quote.company"
                :to="{ name: ROUTE_NAMES.COMPANY_DETAIL, params: { id: quote.company.id } }"
                @click.stop
              >
                {{ quote.company.name }}
              </RouterLink>
              <template v-else>
                <span class="ds-text-strong">{{ quote.prospectName ?? '—' }}</span>
                <span class="ds-meta"> · Prospecto</span>
              </template>
            </td>
            <td><QuoteStatusBadge :status="quote.status" /></td>
            <td class="ds-num">
              {{ formatMoney(quote.totalAmount, currencyOf(quote.priceListId)) }}
            </td>
            <td>
              <QuoteValidity
                :valid-until="quote.validUntil"
                :expired="quote.status === 'EXPIRED'"
                show-date
              />
            </td>
            <td>{{ formatDate(quote.createdDate) }}</td>
          </tr>
        </AppTable>

        <AppPagination
          v-if="!quotesError && total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          :page-count="pageCount"
          @update:page="loadQuotes"
        />
      </section>
    </div>
  </AppLayout>
</template>
