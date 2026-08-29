<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import {
  SUBSCRIPTION_RECORD_ROUTE_NAMES,
  subscriptionRecordTabs,
} from '@/router/routes/subscriptions-admin.routes'
import {
  capacityUnitLabel,
  itemTypeLabel,
  originLabel,
  taxLabel,
} from '../../composables/subscriptionItemLifecycle'
import { RECORD_LINK_PARAMS, recordLinkQuery } from '../../composables/useRecordLink'
import type { SubscriptionItemRow } from '../../composables/useSubscriptionItems'
import type { SubscriptionItemResponse } from '../../types/subscription-items.types'
import MoneyCaption from '@/components/ui/MoneyCaption.vue'

/**
 * <b>El expediente de líneas.</b> Chasis de documento (§3.2): estos registros no se
 * editan, se corrigen abriendo otros.
 *
 * <p><b>Las cerradas se muestran.</b> No se ocultan y no se tachan, y su fila no se
 * atenúa al 40 %: son la historia de lo que se contrató y siguen siendo información
 * que alguien va a leer por teléfono. Lo único que las distingue es el rótulo
 * textual del estado y la frase que dice entre qué fechas estuvieron.
 *
 * <p><b>«Editar» no está en el marcado.</b> Ni deshabilitado ni oculto: la operación
 * no existe. `unitAmount`, `includedQuantity` y `taxRate` van congelados desde el
 * día que se firmó la línea, y cambiar de precio es cerrar ésta y abrir otra. Las
 * dos únicas acciones son verbos que <i>añaden</i> —«Cambiar cantidad», que abre una
 * línea sucesora, y «Dar de baja», que escribe la fecha de fin—, y solo aparecen en
 * las filas donde tienen sentido.
 *
 * <p><b>El artículo del núcleo no ofrece la baja.</b> El backend la rechaza, y
 * ofrecerla es prometer algo que no existe. Mientras el catálogo no haya cargado no
 * se sabe cuál es el núcleo, así que tampoco se ofrece: es preferible una acción de
 * menos a una acción que va a fallar sobre el contrato de un tercero.
 *
 * <p>Todo importe lleva `.ds-num` (alineado a la derecha, cifras tabulares), y la
 * tabla se desplaza dentro de `.ds-table-scroll` en vez de recortarse (§1.4.10).
 */
const props = defineProps<{
  rows: SubscriptionItemRow[]
  /** El id del contrato y la empresa, para los enlaces al otrosí que abrió o cerró la línea. */
  companyId: number
  subscriptionId: number
  /** ¿Cargó ya el catálogo? Sin él no se sabe qué artículo es del núcleo. */
  coreKnown: boolean
  isCore: (catalogItemId: number) => boolean
  /**
   * Las líneas desde las que se ha llegado, si se entró por un enlace de «Acceso»
   * (`?item=`) o de «Historia» (`?otrosi=`). Se señalan <b>con texto</b>, no con un
   * color de fila: un contrato con quince líneas es exactamente el caso en que
   * «resaltada en un tono más claro» no sirve de nada por teléfono ni con un lector
   * de pantalla.
   */
  highlightedIds: Set<number>
  busy?: boolean
}>()

const emit = defineEmits<{
  quantity: [item: SubscriptionItemResponse]
  remove: [item: SubscriptionItemResponse]
}>()

/**
 * Las tres sub-vistas a las que salta una línea. Si alguna no está registrada, se
 * pinta el texto sin enlace: un enlace a una ruta que no existe es peor que no
 * ofrecer el salto. Mismo criterio que ya usa `SubscriptionStatusBanner` con la
 * pestaña «Dinero».
 */
const historyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'historia'))
const accessTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'acceso'))
const moneyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'dinero'))

const routeParams = computed(() => ({
  companyId: String(props.companyId),
  id: String(props.subscriptionId),
}))

/**
 * Solo se invoca bajo `v-if="historyTab"`; el `??` es el valor imposible que evita
 * una aserción de no-nulo y deja el enlace apuntando, en el peor caso, al propio
 * expediente en vez de a una ruta inexistente.
 *
 * <p><b>`?otrosi=` y no un ancla `#otrosi-…`.</b> «Historia» (W2-C) ya enlaza hacia
 * aquí con ese mismo parámetro —`AmendmentEntry.vue:97`— para señalar las líneas que
 * el otrosí abrió o cerró. Emitir un ancla en el sentido contrario habría dejado los
 * dos extremos de la misma cadena hablando idiomas distintos, y además un `#id` que
 * nadie renderiza no hace nada. Desde W3-D el nombre sale de `recordLinkQuery()` y
 * no de una cadena escrita a mano en cada extremo.
 */
function amendmentRoute(amendmentId: number): RouteLocationRaw {
  return {
    name: historyTab.value?.routeName ?? SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
    params: routeParams.value,
    query: recordLinkQuery(RECORD_LINK_PARAMS.AMENDMENT, amendmentId),
  }
}

/**
 * <b>Qué salió de esta línea</b>: la vuelta que pedía el issue #161 y que hasta
 * ahora no existía en ningún sentido.
 *
 * <p>Una línea de contrato es la causa de dos cosas que el operador mira por
 * teléfono: los <b>permisos</b> que abrió —«¿por qué esta clínica ve Historia
 * clínica?»— y los <b>cargos</b> que generó —«¿por qué se le cobró esto?»—. Las dos
 * viven en otras sub-vistas y las dos saben leer `?item=`; sin estos dos enlaces
 * hay que ir a la pestaña, cambiar el alcance y buscar el número a ojo, que es la
 * arqueología que el expediente existe para evitar.
 *
 * <p>Se ofrecen <b>siempre</b>, no solo cuando se sabe que hay algo al otro lado:
 * el front no puede saberlo —los permisos son derivados y los cargos se cruzan en
 * cliente sobre una página—, y un enlace que a veces está y a veces no es peor que
 * uno que lleva a una pantalla que dice honestamente «esta línea no aparece aquí».
 * Los dos destinos lo dicen con esas palabras.
 */
const SALIDAS = [
  { segment: 'acceso', titular: 'Los permisos que abrió', verbo: 'los permisos que abrió' },
  { segment: 'dinero', titular: 'Los cargos que generó', verbo: 'los cargos que generó' },
] as const

/**
 * Los saltos que ofrece una línea, ya resueltos: se calculan <b>una vez por fila</b>
 * y no cuatro veces —dos por enlace, entre el `v-if` y el `:to`—, que es lo que
 * costaba escribirlos sueltos en la plantilla.
 */
function salidas(row: SubscriptionItemRow) {
  return SALIDAS.map((salida) => {
    const tab = salida.segment === 'acceso' ? accessTab.value : moneyTab.value
    return {
      ...salida,
      to: tab
        ? {
            name: tab.routeName,
            params: routeParams.value,
            query: recordLinkQuery(RECORD_LINK_PARAMS.ITEM, row.item.id),
          }
        : null,
    }
  }).filter((salida): salida is typeof salida & { to: RouteLocationRaw } => salida.to !== null)
}

/** «Dar de baja» solo donde la operación existe de verdad. */
function canRemove(row: SubscriptionItemRow): boolean {
  return row.operable && props.coreKnown && !props.isCore(row.item.catalogItemId)
}
</script>

<template>
  <div class="ds-table-scroll">
    <table class="ds-table">
      <MoneyCaption
        >Líneas del contrato con su vigencia y su precio congelado. Las líneas cerradas se muestran:
        dar de baja no borra, escribe la fecha de fin.</MoneyCaption
      >
      <thead>
        <tr>
          <th scope="col">Artículo</th>
          <th scope="col">Estado</th>
          <th scope="col">Vigencia</th>
          <th scope="col" class="ds-num">Cantidad</th>
          <th scope="col" class="ds-num">Precio unitario</th>
          <th scope="col">Impuesto</th>
          <th scope="col">Origen</th>
          <th scope="col" class="ds-col-actions">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <!-- El `id` de fila es también el ancla estable a la que puede saltar quien
             llegue desde otra sub-vista, y lo usa la propia vista para hacer scroll.
             El `tabindex="-1"` es lo que hace que además pueda recibir el foco al
             llegar: sin él, `focus()` sobre un `<tr>` no hace absolutamente nada y
             quien navega con teclado aterriza en `<body>`. No entra en el orden de
             tabulación —es negativo—, así que no añade una parada por fila. -->
        <tr
          v-for="row in rows"
          :id="`linea-${row.item.id}`"
          :key="row.item.id"
          tabindex="-1"
          class="ds-focus-ring"
        >
          <td>
            <span class="ds-text-strong">{{ row.item.itemName }}</span>
            <p v-if="highlightedIds.has(row.item.id)" class="ds-pill ds-tone--accent enlazada">
              <component :is="ICONS.ARROW_RIGHT" :size="12" />
              La línea desde la que llegaste
            </p>
            <p class="ds-meta linea-meta">
              {{ row.item.itemCode }} · {{ itemTypeLabel(row.item.itemType) }}
              <template v-if="row.item.capacityUnit">
                · {{ capacityUnitLabel(row.item.capacityUnit) }}
              </template>
            </p>
          </td>

          <!-- Rótulo textual SIEMPRE, y la frase de apoyo debajo: ningún estado de
               esta consola se comunica solo con un color (§5.2). -->
          <td>
            <AppBadge :label="row.label" :variant="row.variant" />
            <p class="ds-meta linea-meta">{{ row.support }}</p>
          </td>

          <td>
            {{ formatDate(row.item.effectiveFrom) }} →
            {{ formatDate(row.item.effectiveTo, 'sin fecha de fin') }}
          </td>

          <td class="ds-num">
            {{ row.item.quantity }}
            <p v-if="row.item.includedQuantity > 0" class="ds-meta linea-meta">
              {{ row.item.includedQuantity }} incluidas · se cobran
              {{ row.item.billableQuantity }}
            </p>
          </td>

          <td class="ds-num">{{ formatAmount(row.item.unitAmount) }}</td>

          <td>{{ taxLabel(row.item) }}</td>

          <!-- La cadena hacia atrás: de dónde salió esta línea y qué la cerró. Es lo
               que hace navegable «por qué se le facturaron 179.000» en vez de dejarlo
               como arqueología. -->
          <td>
            {{ originLabel(row.item.origin) }}
            <p v-if="row.item.createdAmendmentId" class="ds-meta linea-meta">
              La abrió
              <RouterLink v-if="historyTab" :to="amendmentRoute(row.item.createdAmendmentId)">
                el otrosí #{{ row.item.createdAmendmentId }}
              </RouterLink>
              <template v-else>el otrosí #{{ row.item.createdAmendmentId }}</template>
            </p>
            <p v-if="row.item.endedAmendmentId" class="ds-meta linea-meta">
              La cerró
              <RouterLink v-if="historyTab" :to="amendmentRoute(row.item.endedAmendmentId)">
                el otrosí #{{ row.item.endedAmendmentId }}
              </RouterLink>
              <template v-else>el otrosí #{{ row.item.endedAmendmentId }}</template>
            </p>

            <!-- Y la cadena hacia adelante: qué provocó esta línea. Es la vuelta
                 que pedía el #161 —«desde una línea no se llega a los permisos que
                 abrió»— y su equivalente en el dinero. Los dos destinos leen
                 `?item=` y los dos dicen con palabras si la línea no aparece. -->
            <p v-for="salida in salidas(row)" :key="salida.segment" class="ds-meta linea-meta">
              <RouterLink
                :to="salida.to"
                :aria-label="`Ver ${salida.verbo} la línea ${row.item.itemName}`"
              >
                {{ salida.titular }}
                <component :is="ICONS.ARROW_UP_RIGHT" :size="12" aria-hidden="true" />
              </RouterLink>
            </p>
          </td>

          <td class="ds-col-actions">
            <div v-if="row.operable" class="acciones">
              <button
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--sm"
                :disabled="busy"
                @click="emit('quantity', row.item)"
              >
                <component :is="ICONS.SUBSCRIPTION" :size="14" />
                Cambiar cantidad
              </button>
              <!-- Sin icono a propósito: los dos que el repertorio de la consola
                   tiene para esto —la papelera y la equis— dicen «borrar», y aquí no
                   se borra nada. La palabra sola es más exacta que un icono que
                   miente. -->
              <button
                v-if="canRemove(row)"
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--sm"
                :disabled="busy"
                @click="emit('remove', row.item)"
              >
                Dar de baja
              </button>
            </div>
            <!-- Nada de un botón gris cuando la operación no existe: se dice por qué
                 no hay acciones, que es lo que el operador necesita saber. -->
            <p v-else class="ds-meta">Cerrada: se conserva como está.</p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.linea-meta {
  margin: var(--space-2) 0 0;
}

.enlazada {
  margin: var(--space-4) 0 0;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  justify-content: flex-end;
}
</style>
