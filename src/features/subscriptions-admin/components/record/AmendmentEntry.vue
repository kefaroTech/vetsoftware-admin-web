<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import DocumentSeal from '@/components/ui/DocumentSeal.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { QUOTE_ROUTE_NAMES } from '@/router/routes/quotes.routes'
import {
  AMENDMENT_TYPE_LABEL,
  AMENDMENT_TYPE_SUMMARY,
  amendmentSignature,
  formatDateTime,
  isScheduled,
  monthlyDeltaReading,
  prorationReading,
} from '../../composables/subscriptionHistoryText'
import { RECORD_LINK_PARAMS, recordLinkQuery } from '../../composables/useRecordLink'
import type { SubscriptionAmendmentResponse } from '../../types/subscription-history.types'

/**
 * <b>Un otrosí, pintado como lo que es: un documento inmutable.</b>
 *
 * <p>Corregir un otrosí es emitir otro; este no se edita nunca. Las cuatro
 * señales de §3.2 —las mismas que ya aplicaron `QuoteDocument` y
 * `SubscriptionSummaryView`, para que la consola no acabe con cuatro formas de
 * decir lo mismo—:
 *
 * <ol>
 *   <li><b>Chasis de documento</b>: regla superior, el número como titular y los
 *       datos en un `&lt;dl&gt;` sobre `.ds-detail-grid`. <b>Nunca</b>
 *       `&lt;input disabled&gt;`: un input gris dice «editable, pero ahora no».</li>
 *   <li><b>Sello textual</b> con icono, no un `title`.</li>
 *   <li><b>«Editar» no está en el marcado.</b> Ni gris ni oculto: no existe. En
 *       esta ficha no hay un solo `&lt;button&gt;`; lo único pulsable son enlaces
 *       que llevan a ver más, nunca a cambiar algo.</li>
 *   <li><b>La cadena se ve y es navegable</b>: desde el otrosí a las líneas que
 *       abrió o cerró, y al dinero que generó.</li>
 * </ol>
 *
 * <h3>Las dos cosas que esta ficha tiene que dejar leer sin esfuerzo</h3>
 *
 * <p><b>Quién lo pidió</b>, con palabras. `requestedByEmployeeId` y
 * `requestedBySystemUserId` son excluyentes y significan cosas distintas —la
 * clínica pidiendo sobre lo suyo, o la plataforma actuando sobre el contrato de
 * un tercero—, así que la ficha lo dice con una frase y no con un icono que haya
 * que interpretar. Ver `amendmentSignature`.
 *
 * <p><b>Los dos importes, separados y con nombre propio.</b>
 * `monthlyDeltaAmount` es cuánto sube o baja la factura recurrente a partir de
 * ahora; `prorationAmount` es lo que se cobró o acreditó una sola vez por el
 * periodo en curso. Van en dos `&lt;dt&gt;` distintos, cada uno con su frase, y
 * jamás bajo un rótulo común de «importe»: fundirlos hace inexplicable la factura
 * del mes siguiente, que es la mitad de la pregunta que este expediente existe
 * para responder.
 */
const props = defineProps<{
  amendment: SubscriptionAmendmentResponse
  companyId: number
  subscriptionId: number
  /**
   * ¿Es el otrosí desde el que se llegó (`?otrosi=`)? Lo señala <b>con texto</b>,
   * como el resto de la cadena: una ficha «resaltada en un tono más claro» no se
   * puede leer por teléfono ni la anuncia un lector de pantalla, y esta es
   * exactamente la ficha que alguien vino a buscar entre veinte.
   */
  highlighted?: boolean
}>()

const signature = computed(() => amendmentSignature(props.amendment))
const monthlyDelta = computed(() => monthlyDeltaReading(props.amendment.monthlyDeltaAmount))
const proration = computed(() => prorationReading(props.amendment.prorationAmount))
const scheduled = computed(() => isScheduled(props.amendment))

/**
 * Las sub-vistas del expediente se auto-descubren, así que las de las otras
 * tareas de la onda 2 pueden no estar registradas todavía. Si la pestaña no
 * existe, <b>el enlace no se pinta</b> — un enlace a una ruta sin registrar
 * revienta en `router.resolve`, y pintarlo desactivado sería prometer una
 * pantalla que no hay. Es el mismo criterio que ya usa `SubscriptionStatusBanner`
 * con «Registrar pago».
 */
const contractedTab = computed(() =>
  subscriptionRecordTabs.find((tab) => tab.segment === 'contratado'),
)
const moneyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'dinero'))

/**
 * Los <b>dos</b> parámetros. La ruta del expediente es
 * `/suscripciones/:companyId/:id/…` y no `/suscripciones/:id/…` como decía la
 * especificación antes de corregirse: con `params: { id }` a secas,
 * `router.resolve` falla.
 *
 * <p>`?otrosi=` es la mitad de ida de la cadena bidireccional del modelo: desde
 * aquí a las líneas que este otrosí abrió (`createdAmendmentId`) o cerró
 * (`endedAmendmentId`). Desde W3-D los dos destinos lo leen de verdad, y el nombre
 * del parámetro sale de `recordLinkQuery()` y no de una cadena escrita a mano en
 * cada extremo: si algún día cambia, o cambia en los seis sitios o no compila.
 */
const contractedLink = computed(() =>
  contractedTab.value
    ? {
        name: contractedTab.value.routeName,
        params: { companyId: String(props.companyId), id: String(props.subscriptionId) },
        query: recordLinkQuery(RECORD_LINK_PARAMS.AMENDMENT, props.amendment.id),
      }
    : null,
)

const moneyLink = computed(() =>
  moneyTab.value
    ? {
        name: moneyTab.value.routeName,
        params: { companyId: String(props.companyId), id: String(props.subscriptionId) },
        query: recordLinkQuery(RECORD_LINK_PARAMS.AMENDMENT, props.amendment.id),
      }
    : null,
)
</script>

<template>
  <!-- `id` estable: es el ancla a la que salta quien llega desde «Lo contratado»
       («la abrió el otrosí #42») o desde un cargo de «Dinero». El `tabindex="-1"`
       permite que además reciba el foco al llegar, sin añadir una parada de
       tabulación. -->
  <article
    :id="`otrosi-${amendment.id}`"
    class="ds-card documento ds-stack ds-stack--14 ds-focus-ring"
    tabindex="-1"
  >
    <header class="ds-stack ds-stack--8">
      <p class="ds-kicker">Otrosí</p>
      <div v-if="highlighted">
        <span class="ds-pill ds-tone--accent">
          <component :is="ICONS.ARROW_RIGHT" :size="13" aria-hidden="true" />
          El otrosí desde el que llegaste
        </span>
      </div>
      <div class="ds-flex-row ds-flex-row--12 titular">
        <h3 class="ds-title numero">{{ amendment.amendmentNumber }}</h3>
        <AppBadge :label="AMENDMENT_TYPE_LABEL[amendment.amendmentType]" variant="neutral" />
        <AppBadge v-if="scheduled" label="Programado" variant="neutral" />
      </div>
      <p class="ds-meta">Registrado el {{ formatDateTime(amendment.createdDate) }}</p>
      <!-- El sello, ya como componente: el remate por marcado que esta ficha
           estrenó para esquivar `css:budget` es justo el que `DocumentSeal`
           canoniza (issue #163 cerrado). -->
      <DocumentSeal text="Documento · no se corrige, se emite otro" />
    </header>

    <p class="resumen">{{ AMENDMENT_TYPE_SUMMARY[amendment.amendmentType] }}</p>

    <!-- Hechos, no campos. Ni un solo control de formulario en este bloque. -->
    <dl class="ds-detail-grid">
      <div>
        <dt class="ds-label">Quién lo pidió</dt>
        <dd class="valor">
          <AppBadge v-if="signature.broken" label="Firma ambigua" variant="warning" />
          <span v-else class="firma">{{ signature.text }}</span>
          <span class="ds-meta detalle">{{ signature.detail }}</span>
        </dd>
      </div>

      <div>
        <dt class="ds-label">Surte efecto</dt>
        <dd class="valor">
          {{ formatDate(amendment.effectiveDate) }}
          <span v-if="scheduled" class="ds-meta detalle">
            Todavía no ha llegado: queda registrado ahora y se aplica ese día.
          </span>
        </dd>
      </div>

      <!-- Los dos importes, separados a propósito. El rótulo de cada uno dice
           qué mide, y la frase de apoyo dice qué significa para el cliente. -->
      <div>
        <dt class="ds-label">Cambio en la factura mensual</dt>
        <dd class="valor">
          <span class="ds-num">{{ monthlyDelta.amount }}</span>
          <span class="ds-meta detalle">{{ monthlyDelta.sentence }}</span>
        </dd>
      </div>

      <div>
        <dt class="ds-label">Cobro puntual (prorrateo)</dt>
        <dd class="valor">
          <span class="ds-num">{{ proration.amount }}</span>
          <span class="ds-meta detalle">{{ proration.sentence }}</span>
        </dd>
      </div>

      <div class="ds-grid-span">
        <dt class="ds-label">Motivo</dt>
        <dd class="valor">
          {{ amendment.reason || 'El otrosí no dejó escrito el motivo.' }}
        </dd>
      </div>
    </dl>

    <!-- La cadena, en los dos sentidos. Solo verbos de ver: desde un documento
         inmutable no se llega a ninguna operación de edición. -->
    <section
      class="ds-stack ds-stack--8"
      :aria-label="`Cadena del otrosí ${amendment.amendmentNumber}`"
    >
      <ul class="ds-list-reset ds-stack ds-stack--8">
        <li v-if="contractedLink" class="eslabon">
          <component :is="ICONS.ARROW_RIGHT" :size="15" class="ds-icon-muted" aria-hidden="true" />
          <RouterLink class="enlace" :to="contractedLink">
            Ver las líneas que abrió y cerró
          </RouterLink>
        </li>
        <li v-if="moneyLink" class="eslabon">
          <component :is="ICONS.RECEIPT" :size="15" class="ds-icon-muted" aria-hidden="true" />
          <span>
            <RouterLink class="enlace" :to="moneyLink">Ver los cargos que generó</RouterLink>
            <span class="ds-meta"> · ahí está el detalle del prorrateo, con sus días</span>
          </span>
        </li>
        <li v-if="amendment.quoteId != null" class="eslabon">
          <component :is="ICONS.QUOTE" :size="15" class="ds-icon-muted" aria-hidden="true" />
          <span>
            Nació de la
            <RouterLink
              class="enlace"
              :to="{ name: QUOTE_ROUTE_NAMES.QUOTE_DETAIL, params: { id: amendment.quoteId } }"
            >
              cotización #{{ amendment.quoteId }}
            </RouterLink>
          </span>
        </li>
      </ul>

      <p v-if="amendment.clientRequestId" class="ds-meta">
        Llave antiduplicados: {{ amendment.clientRequestId }}
      </p>
    </section>
  </article>
</template>

<style scoped>
/* La regla superior es la señal de chasis de documento, y no depende del color:
   el mismo borde en escala de grises sigue leyéndose como documento. Es la que
   ya usa `QuoteDocument`. */
.documento {
  border-top: 3px solid var(--amatista-500);
}

.titular {
  flex-wrap: wrap;
}

.numero {
  margin: 0;
}

.resumen {
  margin: 0;
}

.valor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  align-items: flex-start;
}

.firma {
  font-weight: var(--weight-semibold);
}

.detalle {
  text-wrap: pretty;
}

.eslabon {
  display: flex;
  align-items: flex-start;
  gap: var(--space-8);
}

.enlace {
  font-weight: var(--weight-semibold);
}
</style>
