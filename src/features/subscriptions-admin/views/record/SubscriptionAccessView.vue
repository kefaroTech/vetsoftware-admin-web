<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { ICONS } from '@/constants/icons'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'
import { useEntitlements } from '../../composables/useEntitlements'
import {
  RECORD_LINK_PARAMS,
  useRecordLinkId,
  useSignaledArrival,
} from '../../composables/useRecordLink'
import {
  ACCESS_LEVEL_PRESENTATION,
  ACCESS_POLICY_NOTE,
  DERIVED_NOTE,
  HIDDEN_INSTEAD_OF_BROKEN_NOTE,
  SOURCE_PRESENTATION,
  formatDateTime,
} from '../../composables/entitlementText'
import CapacityMeters from '../../components/record/CapacityMeters.vue'
import EntitlementsTable from '../../components/record/EntitlementsTable.vue'
import type { EntitlementScope } from '../../types/entitlements.types'

/**
 * `/acceso` — <b>lo que la empresa puede usar ahora mismo</b> (§4.4.2, tarea
 * W2-D).
 *
 * <p><b>Es la única sub-vista de datos derivados, y se dice.</b> Ninguna fila de
 * esta pantalla contiene una decisión: todas son el resultado de aplicar el
 * contrato vigente. Por eso no hay ni un «Editar» —la operación no existe, así
 * que no está en el marcado (§3.2)— y por eso la única acción es recalcular, que
 * no es una edición sino una <b>reparación</b>: reconstruye la tabla entera desde
 * los contratos, que son la verdad.
 *
 * <p><b>Por qué no es una pantalla de menú.</b> Nadie navega a «permisos» en
 * abstracto: esto se mira mientras se mira un contrato, y por eso vive dentro del
 * expediente y no en la barra lateral (§2.1).
 *
 * <p><b>`recalculatedAt` va primero y con su lectura escrita.</b> El modelo dice
 * que «si esta fecha se queda vieja, hay un proceso caído — es un indicador de
 * salud, no un adorno», y hoy nadie la mira. Aquí es el primer bloque de la
 * pantalla, no un pie de tabla, y pasadas 24 h lo dice con un badge y con una
 * frase, no solo con un color.
 *
 * <p><b>Los dos endpoints de lectura responden preguntas distintas</b> y por eso
 * se ofrecen como dos modos de la misma tabla, con la forma que §3.3 ya fijó para
 * «Lo contratado»: un `radiogroup` de dos opciones con nombre, no una casilla,
 * porque ninguno de los dos es «lo normal» — «lo que puede usar hoy» es la
 * consulta caliente y «el listado completo» es el de auditoría, con los caducados
 * y los ocultos.
 *
 * <p>El armazón ya cargó el contrato y garantiza `companyId`: esta vista no lo
 * recarga, lo lee y se lo pasa a su cliente de API para que la cabecera
 * `X-Company-Id` viaje en sus tres llamadas.
 */
const { companyId, subscriptionId } = useSubscriptionRecord()
const {
  rows,
  capacities,
  recalculatedAt,
  health,
  manualGrantCount,
  scope,
  loading,
  recalculating,
  error,
  errorTraceId,
  auditPage,
  auditPageSize,
  auditTotal,
  auditPageCount,
  openAccess,
  changeScope,
  goToAuditPage,
  recalculate,
} = useEntitlements()

const healthRegion = ref<HTMLElement | null>(null)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que el contrato ha cargado—, pero el tipo sí lo
 * admite. El `?? 0` no llega a ejecutarse nunca; está para que la plantilla no
 * tenga que defender un caso que el armazón ya cerró.
 */
const scopeCompanyId = computed(() => companyId.value ?? 0)
const recordSubscriptionId = computed(() => subscriptionId.value ?? 0)

const contractedTab = computed(() =>
  subscriptionRecordTabs.find((tab) => tab.segment === 'contratado'),
)

const contractedTarget = computed(() =>
  contractedTab.value
    ? {
        name: contractedTab.value.routeName,
        params: {
          companyId: String(scopeCompanyId.value),
          id: String(recordSubscriptionId.value),
        },
      }
    : null,
)

/**
 * <b>La vuelta que pedía el issue #161.</b> «Lo contratado» enlaza aquí con
 * `?item=<idLínea>` —«los permisos que abrió»— y hasta W3-D esta pantalla era
 * sorda a ese parámetro: el enlace navegaba y el operador aterrizaba en una tabla
 * de treinta submódulos sin saber cuáles venía a ver.
 *
 * <p>Se señalan <b>todas</b> las filas que esa línea justifica, no una: una sola
 * línea de contrato puede abrir varios submódulos, y decir «la fila» en singular
 * habría sido mentir sobre el modelo.
 */
const linkedItemId = useRecordLinkId(RECORD_LINK_PARAMS.ITEM)

const signaledRows = computed(() =>
  linkedItemId.value == null
    ? []
    : rows.value.filter((row) => row.subscriptionItemId === linkedItemId.value),
)

/**
 * Qué se dice de ese enlace. <b>Cuando no se encuentra, se dice, y se dice por
 * qué</b>: el modo por defecto es «lo que puede usar hoy», así que un permiso que
 * la línea abrió y que ya caducó —o que está oculto porque el submódulo se
 * retiró— <b>no está en esta tabla y sí en la otra</b>. Callarse dejaría al
 * operador concluyendo que la línea nunca dio acceso a nada, que es una conclusión
 * sobre el contrato y no un detalle de interfaz.
 */
const linkNotice = computed(() => {
  const target = linkedItemId.value
  if (target == null || loading.value || error.value) return ''
  const found = signaledRows.value.length
  if (found === 0) {
    return scope.value === 'current'
      ? `Vienes de la línea #${target} y ninguno de los permisos vigentes sale de ella. Prueba con «El listado completo»: si el permiso caducó o quedó oculto, está ahí y no aquí.`
      : `Vienes de la línea #${target} y ninguna fila de esta página sale de ella. El listado completo se pagina: puede estar en otra página.`
  }
  return found === 1
    ? 'Se señala el permiso que abrió la línea desde la que llegaste.'
    : `Se señalan los ${found} permisos que abrió la línea desde la que llegaste.`
})

useSignaledArrival({
  linkedId: linkedItemId,
  anchors: computed(() => signaledRows.value.map((row) => `permiso-${row.id}`)),
  settled: computed(() => !loading.value && !error.value),
})

/** Cuántas filas de las que se ven dan uso normal, y cuántas quedan en solo consulta. */
const levelCounts = computed(() => ({
  FULL: rows.value.filter((row) => row.accessLevel === 'FULL').length,
  READ_ONLY: rows.value.filter((row) => row.accessLevel === 'READ_ONLY').length,
  NONE: rows.value.filter((row) => row.accessLevel === 'NONE').length,
}))

/**
 * Lo que se anuncia al cambiar de modo (§5.3). Es un cambio de <b>consulta</b>,
 * no de datos, y sin este anuncio quien no ve la tabla no se entera de que
 * cambió lo que hay debajo.
 */
const scopeAnnouncement = computed(() => {
  if (loading.value) return 'Cargando los permisos…'
  const total = rows.value.length
  return scope.value === 'current'
    ? `Lo que puede usar hoy: ${total} ${total === 1 ? 'permiso' : 'permisos'}.`
    : `Listado completo: ${auditTotal.value} ${auditTotal.value === 1 ? 'fila' : 'filas'}, incluidas las caducadas y las ocultas.`
})

/**
 * <b>Recarga siempre al abrir.</b> Una tabla derivada que se queda en caché es
 * exactamente lo que esta pantalla existe para detectar.
 */
onMounted(() => void openAccess(scopeCompanyId.value))

function onScopeChange(next: EntitlementScope) {
  changeScope(next)
}

/**
 * Tras recalcular, el foco va al indicador de salud —que lleva `tabindex="-1"`—
 * y no se queda en un botón cuyo contexto ya no es el mismo: la fecha nueva es
 * justo lo que hay que leer, y es lo que el operador acaba de cambiar. Mismo
 * mecanismo que `SubscriptionSummaryView` tras una transición.
 */
async function onRecalculate() {
  if (await recalculate(scopeCompanyId.value)) {
    await nextTick()
    healthRegion.value?.focus()
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="record-access-title">
    <!-- Lo primero que hay que entender para no leer mal la pantalla. -->
    <div class="ds-banner ds-banner--info ds-banner--flush" role="note">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ DERIVED_NOTE }}</span>
      <RouterLink
        v-if="contractedTarget"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :to="contractedTarget"
      >
        <component :is="ICONS.ARROW_UP_RIGHT" :size="14" />
        Ir a «Lo contratado»
      </RouterLink>
    </div>

    <!-- 1 · El indicador de salud. Va arriba, no en un pie de tabla. -->
    <div
      ref="healthRegion"
      class="ds-card ds-stack ds-stack--10"
      tabindex="-1"
      aria-labelledby="record-access-title"
    >
      <div class="ds-block-head">
        <h2 id="record-access-title" class="ds-title">Acceso calculado</h2>
        <AppBadge v-if="health.badgeLabel" variant="warning" :label="health.badgeLabel" />
      </div>

      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Último cálculo</dt>
          <dd class="valor">{{ formatDateTime(recalculatedAt) }}</dd>
        </div>
      </dl>

      <p class="ds-dialog-body">{{ health.note }}</p>

      <p class="ds-meta">
        {{ levelCounts.FULL }} en uso normal · {{ levelCounts.READ_ONLY }} en solo consulta ·
        {{ levelCounts.NONE }} no disponibles ·
        <strong>{{ manualGrantCount }} concedidos a mano</strong>
      </p>

      <div class="ds-actions ds-actions--start">
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="recalculating"
          @click="onRecalculate"
        >
          <component :is="ICONS.RETRY" :size="15" />
          Recalcular desde el contrato
        </button>
      </div>
    </div>

    <!-- 2 · Las cantidades. -->
    <CapacityMeters
      :capacities="capacities"
      :company-id="scopeCompanyId"
      :subscription-id="recordSubscriptionId"
    />

    <!-- 3 · Qué significan los tres niveles y los cuatro orígenes. Una vez, aquí,
         y no repetido en cada una de las filas de la tabla. -->
    <div class="ds-card ds-stack ds-stack--10">
      <h2 class="ds-title">Qué significa cada nivel</h2>
      <dl class="ds-detail-grid">
        <div v-for="(presentation, level) in ACCESS_LEVEL_PRESENTATION" :key="level">
          <dt class="ds-label">
            <AppBadge :variant="presentation.variant" :label="presentation.label" />
          </dt>
          <dd class="valor">{{ presentation.meaning }}</dd>
        </div>
      </dl>

      <p class="ds-meta">{{ HIDDEN_INSTEAD_OF_BROKEN_NOTE }}</p>
      <p class="ds-dialog-body">{{ ACCESS_POLICY_NOTE }}</p>

      <h3 class="ds-title">De dónde sale cada permiso</h3>
      <dl class="ds-detail-grid">
        <div v-for="(presentation, source) in SOURCE_PRESENTATION" :key="source">
          <dt class="ds-label">
            <AppBadge :variant="presentation.variant" :label="presentation.label" />
          </dt>
          <dd class="valor">{{ presentation.meaning }}</dd>
        </div>
      </dl>
    </div>

    <!-- 4 · La tabla, con sus dos modos. -->
    <div class="ds-stack ds-stack--10">
      <p class="ds-sr-only" role="status">{{ scopeAnnouncement }}</p>

      <fieldset class="alcance">
        <legend class="ds-label">Qué se lista</legend>
        <label class="opcion">
          <input
            type="radio"
            name="alcance-acceso"
            value="current"
            :checked="scope === 'current'"
            @change="onScopeChange('current')"
          />
          Lo que puede usar hoy
        </label>
        <label class="opcion">
          <input
            type="radio"
            name="alcance-acceso"
            value="audit"
            :checked="scope === 'audit'"
            @change="onScopeChange('audit')"
          />
          El listado completo, con los caducados y los ocultos
        </label>
      </fieldset>

      <!-- El aviso del enlace de vuelta se ve Y se anuncia: es la respuesta a por
           qué esta pantalla se abrió señalando una fila concreta. Mismo patrón que
           «Lo contratado» y «Dinero». -->
      <div v-if="linkNotice" class="ds-banner ds-banner--info" role="status">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ linkNotice }}</span>
      </div>

      <EntitlementsTable
        :rows="rows"
        :scope="scope"
        :highlighted-item-id="linkedItemId"
        :loading="loading"
        :error="error"
        :error-trace-id="errorTraceId"
        @retry="openAccess(scopeCompanyId)"
      />

      <AppPagination
        v-if="scope === 'audit' && !loading && !error && auditTotal > 0"
        :page="auditPage"
        :page-size="auditPageSize"
        :total="auditTotal"
        :page-count="auditPageCount"
        @update:page="goToAuditPage(scopeCompanyId, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

/* `<fieldset>` trae borde y padding del navegador; aquí es solo el agrupador
   semántico de dos radios, que es lo que evita tener que escribir
   `role="radiogroup"` y `aria-labelledby` a mano. */
.alcance {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-14);
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
}

.opcion {
  display: inline-flex;
  gap: var(--space-6);
  align-items: center;
}
</style>
