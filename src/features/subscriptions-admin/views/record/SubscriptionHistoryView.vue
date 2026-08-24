<script setup lang="ts">
import { computed, watch } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'
import { useSubscriptionHistory } from '../../composables/useSubscriptionHistory'
import {
  RECORD_LINK_PARAMS,
  useRecordLinkId,
  useSignaledArrival,
} from '../../composables/useRecordLink'
import AmendmentEntry from '../../components/record/AmendmentEntry.vue'
import StatusChangeEntry from '../../components/record/StatusChangeEntry.vue'

/**
 * `/historia` — <b>la película del contrato</b> (§3.3 y §4.4.2, tarea W2-C).
 *
 * <p>El documento de diseño dice por qué existen las dos tablas que esta pantalla
 * fusiona: <i>«sin ellas no hay auditoría posible: se vería el estado final pero
 * no la película de cómo se llegó ahí»</i>. Esta pantalla <b>es</b> esa película,
 * y la mitad de la bitácora responde en un segundo la pregunta que si no hay que
 * deducir de los pagos: <i>«¿por qué esta cuenta está en solo lectura?»</i>.
 *
 * <p><b>Todo lo que se pinta aquí es inmutable</b>, y eso gobierna el marcado
 * entero: los datos van en `&lt;dl&gt;` sobre `.ds-detail-grid` y nunca en
 * `&lt;input disabled&gt;`, cada entrada lleva su sello textual, y <b>«Editar» no
 * está en el marcado</b> — ni gris ni oculto. En toda la pantalla hay un solo
 * `&lt;button&gt;` y es «Reintentar» sobre un fallo de red; lo demás son enlaces
 * que llevan a ver más, nunca a cambiar algo.
 *
 * <p><b>Una `&lt;ol&gt;` con `ds-stack`, no un componente de línea de tiempo.</b>
 * §6.2 lo decidió y lo dejó escrito en la lista de «lo que se decidió NO crear»:
 * la lista ordenada ya expresa la secuencia, y una barra sin nombre accesible es
 * un problema nuevo. §5 tampoco asigna ningún componente nuevo a esta tarea.
 *
 * <p><b>No recarga el contrato.</b> `useSubscriptionRecord()` garantiza que
 * `companyId` y `subscriptionId` están puestos cuando esta sub-vista se monta:
 * de ahí salen y se pasan al cliente propio para que la cabecera `X-Company-Id`
 * viaje también en estas dos llamadas. La cabecera con la identidad de la empresa
 * la pinta el armazón y aquí no se repite.
 *
 * <p><b>Recarga siempre al abrir</b>, y también al navegar de un contrato a otro
 * sin desmontar: el `watch` mira los dos identificadores.
 */
const { companyId, subscriptionId } = useSubscriptionRecord()
const { entries, loading, error, errorTraceId, isEmpty, announcement, truncationNotice, load } =
  useSubscriptionHistory()

watch(
  [companyId, subscriptionId],
  ([nextCompanyId, nextSubscriptionId]) => {
    if (nextCompanyId == null || nextSubscriptionId == null) return
    void load(nextCompanyId, nextSubscriptionId)
  },
  { immediate: true },
)

function retry() {
  if (companyId.value == null || subscriptionId.value == null) return
  void load(companyId.value, subscriptionId.value)
}

/**
 * El par (empresa, contrato) ya resuelto a números.
 *
 * <p>El armazón garantiza que no es `null` mientras esta sub-vista está pintada
 * —no monta el `RouterView` hasta que el contrato ha cargado—, pero el tipo sigue
 * admitiéndolo y **no se tapa con un `?? 0`**: un cero silencioso construiría
 * enlaces a `/suscripciones/0/0/contratado`, que es una URL que resuelve y lleva
 * a ninguna parte. Si algún día deja de cumplirse la garantía, los enlaces de la
 * cadena no se pintan y se nota, en vez de llevar al expediente de nadie.
 */
const scope = computed(() =>
  companyId.value != null && subscriptionId.value != null
    ? { companyId: companyId.value, subscriptionId: subscriptionId.value }
    : null,
)

/**
 * <b>El extremo que faltaba de la cadena</b> (W3-D, issue #164).
 *
 * <p>Esta pantalla llevaba desde W2-C siendo el <b>destino</b> de dos enlaces que
 * ya existían —cada línea de «Lo contratado» dice «la abrió el otrosí #42», y cada
 * cargo de «Dinero» enlaza a su otrosí— y era <b>sorda</b> a lo que le mandaban:
 * el `?otrosi=` llegaba, la ruta resolvía, y el operador aterrizaba en una lista de
 * veinte fichas idénticas para buscar a ojo la que el enlace le había prometido.
 * Un enlace que lleva a la pantalla correcta pero no al eslabón correcto cumple la
 * letra de §3.3 y falla su propósito.
 */
const linkedAmendmentId = useRecordLinkId(RECORD_LINK_PARAMS.AMENDMENT)

/** ¿Está en la película cargada el otrosí que se vino a ver? */
const signaledFound = computed(
  () =>
    linkedAmendmentId.value != null &&
    entries.value.some(
      (entry) => entry.kind === 'amendment' && entry.amendment.id === linkedAmendmentId.value,
    ),
)

/**
 * Qué se dice del enlace. <b>Cuando no se encuentra, se dice</b>, y aquí la causa
 * más probable es una que la pantalla ya conoce: la película puede venir
 * <b>truncada</b> —tope de 5 páginas por fuente— y el otrosí buscado ser
 * justamente uno de los que se quedaron fuera. Decir «no existe» cuando lo que
 * pasa es «no cabe» sería una conclusión sobre el contrato, no sobre la interfaz.
 */
const linkNotice = computed(() => {
  const target = linkedAmendmentId.value
  if (target == null || loading.value || error.value) return ''
  if (signaledFound.value) return 'Se señala el otrosí desde el que llegaste.'
  return truncationNotice.value
    ? `El otrosí #${target} no está entre los movimientos que se muestran, y esta consulta viene incompleta: es probable que se haya quedado fuera por el tope, no que no exista.`
    : `El otrosí #${target} no está en la historia de este contrato. Comprueba que el enlace venía de este expediente y no del de otro contrato de la misma empresa.`
})

/**
 * El foco y el desplazamiento van a la ficha del otrosí, que lleva `tabindex="-1"`.
 * Una sola vez por llegada: recargar la historia con el mismo enlace puesto no
 * vuelve a mover el foco.
 */
useSignaledArrival({
  linkedId: linkedAmendmentId,
  anchors: computed(() =>
    signaledFound.value && linkedAmendmentId.value != null
      ? [`otrosi-${linkedAmendmentId.value}`]
      : [],
  ),
  settled: computed(() => !loading.value && !error.value),
})
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="record-history-title">
    <div class="ds-card ds-stack ds-stack--10">
      <h2 id="record-history-title" class="ds-title">Historia</h2>
      <p class="ds-dialog-body">
        Todo lo que cambió el contrato y todo lo que movió el estado de la cuenta, de lo más
        reciente a lo más antiguo. Nada de esto se edita: un otrosí no se corrige, se emite otro, y
        una fila de bitácora solo se inserta.
      </p>

      <!-- §5.3: el resultado de una consulta se anuncia en una región educada,
           no interrumpe. El texto del error NO se repite aquí: ya lo anuncia el
           banner de abajo con `role="alert"`. -->
      <p class="ds-sr-only" role="status">{{ announcement }}</p>

      <!-- El aviso del enlace de vuelta se ve Y se anuncia. Mismo patrón, mismas
           palabras de encabezado que «Lo contratado», «Acceso» y «Dinero». -->
      <div v-if="linkNotice" class="ds-banner ds-banner--info" role="status">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ linkNotice }}</span>
      </div>
    </div>

    <!-- El error se pinta antes que el vacío (R05): un fallo del servidor no
         puede disfrazarse de «este contrato no ha cambiado nunca». -->
    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="retry">
          <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <!-- El esqueleto tiene la forma de lo que va a llegar: dos fichas de entrada,
         no la cabecera de una tarjeta. Y no lleva regla propia: dentro de un
         `.ds-stack` —que es `flex-direction: column`— un `<span>` ya es un
         elemento flex que ocupa el ancho, así que el `{display: block; width: …}`
         con el que lo rematan el armazón y `QuoteDetailView` sobra. Ese cuerpo va
         camino del techo de `css:budget` y es una primitiva que falta; queda como
         issue en vez de sumarle una copia. -->
    <div v-else-if="loading" class="ds-stack ds-stack--14" aria-hidden="true">
      <div v-for="ficha in 2" :key="ficha" class="ds-card ds-stack ds-stack--10">
        <span class="ds-skeleton ds-skeleton--text" />
        <span class="ds-skeleton ds-skeleton--text" />
        <span class="ds-skeleton ds-skeleton--text" />
      </div>
    </div>

    <!-- Vacío de verdad, y está bien: un contrato firmado que no ha cambiado. No
         es un hueco ni un fallo, así que no se ofrece ninguna salida —desde aquí
         no se crea nada: los otrosíes nacen de operar en «Lo contratado»—. -->
    <AppEmptyState
      v-else-if="isEmpty"
      title="El contrato no ha cambiado desde que se firmó"
      description="Ningún otrosí y ningún movimiento de estado. En cuanto se añada, se cambie o se dé de baja una línea, el otrosí aparecerá aquí."
      :icon="ICONS.HISTORY"
    />

    <template v-else>
      <!-- El techo de páginas se tocó: lo que se ve no es la película completa y
           hay que decirlo con números, no con un «hay más». Es una condición del
           dato, no una interrupción: región educada. -->
      <div v-if="truncationNotice" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">{{ truncationNotice }}</span>
      </div>

      <ol v-if="scope" class="ds-list-reset ds-stack ds-stack--14">
        <li v-for="entry in entries" :key="entry.key">
          <AmendmentEntry
            v-if="entry.kind === 'amendment'"
            :amendment="entry.amendment"
            :company-id="scope.companyId"
            :subscription-id="scope.subscriptionId"
            :highlighted="entry.amendment.id === linkedAmendmentId"
          />
          <StatusChangeEntry v-else :change="entry.change" />
        </li>
      </ol>
    </template>
  </section>
</template>
