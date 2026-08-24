<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { RECORD_LINK_PARAMS, recordLinkQuery } from '../../composables/useRecordLink'
import { prorationFraction, prorationGap } from '../../composables/subscriptionMoneyText'
import type { SubscriptionChargeResponse } from '../../types/subscription-money.types'

/**
 * <b>La cadena de §3.3, recorrible, en una celda.</b>
 *
 * <p>La pregunta que vertebra el modelo —«¿por qué se le facturaron 179.000?»— se
 * responde bajando por `documento → cargos → prorrateo → otrosí → la línea que lo
 * abrió`, y el requisito de la especificación es duro: <b>cada eslabón es un
 * enlace, y cada uno tiene su vuelta</b>. Los tres saltos de un cargo viven aquí:
 *
 * <ul>
 *   <li><b>la cuenta de cobro</b> en la que entró (`billingDocumentId`) — el
 *       eslabón de arriba, el que cierra el círculo con la cifra por la que
 *       preguntó el cliente;</li>
 *   <li><b>el otrosí</b> que lo abrió (`amendmentId`) → «Historia», con
 *       `?otrosi=`;</li>
 *   <li><b>la línea del contrato</b> que lo paga (`subscriptionItemId`) → «Lo
 *       contratado», con `?item=`.</li>
 * </ul>
 *
 * <p><b>El prorrateo va con su fracción, siempre.</b> «18 de 31 días», no dos
 * columnas numéricas sueltas: el modelo avisa de que sin `prorationDays` y
 * `periodDays` «un prorrateo no se puede reconstruir: se ve el importe pero no de
 * dónde salió, y explicárselo a un cliente que reclama pasa a ser un ejercicio de
 * arqueología». Cuando el cargo no los trae y <b>debería</b> traerlos, se dice —
 * `prorationGap`—; cuando el hueco es legítimo (un recurrente cubre el periodo
 * entero) no se pinta nada, porque ahí no falta nada.
 *
 * <p><b>Los nombres de los parámetros no se inventan.</b> `?otrosi=` y `?item=`
 * los fijaron las sub-vistas que los leen (W2-B y W2-C) y desde W3-D salen de
 * `recordLinkQuery()`, que es donde viven para los seis extremos de la cadena;
 * elegir un tercero habría dejado los dos extremos hablando idiomas distintos. Y si una
 * pestaña destino no estuviera registrada, el eslabón se pinta como <b>texto sin
 * enlace</b>: un `RouterLink` a una ruta que no existe revienta en
 * `router.resolve`, y pintarlo desactivado sería prometer una pantalla que no hay.
 *
 * <p>Los enlaces llevan los <b>dos</b> parámetros de ruta. La ruta del expediente
 * es `/suscripciones/:companyId/:id/…`: con `params: { id }` a secas no resuelve.
 */
const props = defineProps<{
  charge: SubscriptionChargeResponse
  companyId: number
  subscriptionId: number
  /** El número del documento en el que entró, cuando se conoce. Si no, se pinta su id. */
  documentNumber?: string | null
}>()

const emit = defineEmits<{ focusDocument: [documentId: number] }>()

const fraction = computed(() => prorationFraction(props.charge))
const gap = computed(() => prorationGap(props.charge))

const historyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'historia'))
const contractedTab = computed(() =>
  subscriptionRecordTabs.find((tab) => tab.segment === 'contratado'),
)

const routeParams = computed(() => ({
  companyId: String(props.companyId),
  id: String(props.subscriptionId),
}))

const amendmentTarget = computed(() => {
  const tab = historyTab.value
  if (!tab || props.charge.amendmentId == null) return null
  return {
    name: tab.routeName,
    params: routeParams.value,
    query: recordLinkQuery(RECORD_LINK_PARAMS.AMENDMENT, props.charge.amendmentId),
  }
})

const itemTarget = computed(() => {
  const tab = contractedTab.value
  if (!tab || props.charge.subscriptionItemId == null) return null
  return {
    name: tab.routeName,
    params: routeParams.value,
    query: recordLinkQuery(RECORD_LINK_PARAMS.ITEM, props.charge.subscriptionItemId),
  }
})

/** El rótulo del documento: su número si se conoce, y si no su identificador. */
const documentLabel = computed(() =>
  props.documentNumber ? props.documentNumber : `documento #${props.charge.billingDocumentId}`,
)
</script>

<template>
  <div class="ds-stack ds-stack--6 cadena">
    <!-- 1 · El prorrateo, con su fracción. El eslabón que hace reconstruible el importe. -->
    <p v-if="fraction" class="fraccion" :title="fraction.sentence">
      <strong>{{ fraction.fraction }}</strong>
      <span class="ds-meta">· el {{ fraction.percent }} % de la cuota completa</span>
    </p>
    <p v-else-if="gap" class="ds-meta hueco">{{ gap }}</p>

    <!-- 2 · Arriba: en qué cuenta de cobro entró. Es la vuelta hacia la cifra
         por la que preguntó el cliente. Un cargo sin documento NO se deja en
         blanco: «sin facturar» es información, no un hueco. -->
    <p v-if="charge.billingDocumentId != null" class="eslabon">
      <button
        type="button"
        class="ds-btn ds-btn--plain ds-btn--sm"
        :aria-label="`Ver los cargos que componen ${documentLabel}`"
        @click="emit('focusDocument', charge.billingDocumentId)"
      >
        <component :is="ICONS.RECEIPT" :size="13" />
        En {{ documentLabel }}
      </button>
    </p>
    <p v-else class="ds-meta">Todavía no está en ninguna cuenta de cobro.</p>

    <!-- 3 · Abajo: el otrosí que lo abrió y la línea que lo paga. -->
    <p v-if="charge.amendmentId != null" class="eslabon">
      <RouterLink
        v-if="amendmentTarget"
        class="enlace"
        :to="amendmentTarget"
        :aria-label="`Ver el otrosí ${charge.amendmentId} en la historia del contrato`"
      >
        Otrosí #{{ charge.amendmentId }}
        <component :is="ICONS.ARROW_UP_RIGHT" :size="13" />
      </RouterLink>
      <span v-else>Otrosí #{{ charge.amendmentId }}</span>
    </p>

    <p v-if="charge.subscriptionItemId != null" class="eslabon">
      <RouterLink
        v-if="itemTarget"
        class="enlace"
        :to="itemTarget"
        :aria-label="`Ver la línea ${charge.subscriptionItemId} en lo contratado`"
      >
        Línea #{{ charge.subscriptionItemId }}
        <component :is="ICONS.ARROW_UP_RIGHT" :size="13" />
      </RouterLink>
      <span v-else>Línea #{{ charge.subscriptionItemId }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Solo geometría. El color viaja en las primitivas y en los tonos del sistema
   de diseño, nunca en una regla base de `scoped`: pesaría (0,2,0) y le ganaría
   a la primitiva global, que pesa (0,1,0). */
.cadena {
  min-width: 15rem;
}

.fraccion,
.eslabon,
.hueco {
  margin: 0;
}

.fraccion > .ds-meta {
  margin-left: var(--space-4);
}

.enlace {
  display: inline-flex;
  gap: var(--space-4);
  align-items: center;
  font-weight: var(--weight-semibold);
}
</style>
