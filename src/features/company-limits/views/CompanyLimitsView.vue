<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { useCompanyRecord } from '@/features/companies/composables/useCompanyRecord'
import { formatDateTime } from '@/features/subscriptions-admin/composables/entitlementText'
import { useCompanyLimits } from '../composables/useCompanyLimits'
import {
  DEFAULT_EVENT_WINDOW_DAYS,
  LIMIT_EVENT_TYPE_LABEL,
  LIMIT_EVENT_TYPE_MEANING,
  SNAPSHOT_TRIGGER_LABEL,
} from '../composables/companyLimitsText'
import CompanyLimitCard from '../components/CompanyLimitCard.vue'
import LimitEventsTable from '../components/LimitEventsTable.vue'
import AdjustUsageModal from '../components/AdjustUsageModal.vue'
import type { AdjustCompanyUsageRequest, CompanyLimitRow } from '../types/company-limits.types'

/**
 * `/empresas/:id/cupos` — <b>los cupos de la empresa con su techo, su consumo, de
 * dónde sale cada límite y qué pasa al agotarlo</b> (§I4, la misma pantalla que
 * §B8).
 *
 * <p><b>Este SFC es un armazón delgado y eso es deliberado.</b> La pantalla venía
 * marcada como candidata a pasar del techo de 500 líneas por fichero, así que se
 * parte desde el primer commit: los textos y las dos aritméticas en
 * `companyLimitsText.ts`, cada cupo en `CompanyLimitCard.vue`, la bitácora en
 * `LimitEventsTable.vue` y la corrección en `AdjustUsageModal.vue`. Aquí solo
 * quedan el orden de los bloques y los tres estados.
 *
 * <p>El armazón del expediente ya cargó la empresa y garantiza `companyId`: esta
 * sub-vista no la recarga, y sí <b>recarga lo suyo siempre al abrirse</b>. Un
 * contador en caché es exactamente el dato sobre el que no se puede decidir una
 * corrección.
 *
 * <p><b>El orden responde a las cuatro preguntas, en el orden en que se hacen:</b>
 * ¿está sano el cálculo? → ¿cuánto lleva usado de cada cosa y de dónde sale ese
 * techo? → ¿qué le ha pasado? → y solo entonces, ¿hay que corregir algo?
 */
const { companyId, title } = useCompanyRecord()
const {
  rows,
  eventRows,
  blockedCount,
  recalculatedAt,
  snapshot,
  loading,
  adjusting,
  error,
  errorTraceId,
  openLimits,
  adjustUsage,
  closeLimits,
} = useCompanyLimits()

const adjustTarget = ref<CompanyLimitRow | null>(null)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que la empresa cargó—, pero el tipo sí lo admite.
 */
const recordCompanyId = computed(() => companyId.value ?? 0)

/**
 * Rótulo por eje, para que la bitácora no tenga que pintar números. Solo se
 * conocen los ejes con contador vivo; los demás se quedan con su número, que es
 * mejor que un nombre equivocado.
 */
const dimensionTitles = computed(() =>
  Object.fromEntries(rows.value.map((row) => [row.capacity.limitDimensionId, row.title])),
)

const blockedNotice = computed(() => {
  if (blockedCount.value === 0) return ''
  return blockedCount.value === 1
    ? `Hubo 1 portazo en los últimos ${DEFAULT_EVENT_WINDOW_DAYS} días: alguien intentó crear algo y no se le dejó.`
    : `Hubo ${blockedCount.value} portazos en los últimos ${DEFAULT_EVENT_WINDOW_DAYS} días: son intentos de crear algo que no se pudieron completar.`
})

/** <b>Recarga siempre al abrir la pantalla.</b> */
onMounted(() => void openLimits(recordCompanyId.value))

/** Nada de los contadores de una empresa ajena esperando a que se abra la siguiente. */
onUnmounted(closeLimits)

async function onAdjust(payload: AdjustCompanyUsageRequest) {
  if (await adjustUsage(recordCompanyId.value, payload)) adjustTarget.value = null
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="cupos-title">
    <div class="ds-block-head">
      <h1 id="cupos-title" class="ds-title">Cupos</h1>
    </div>

    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando los cupos…' : '' }}</p>

    <!-- 1 · Fallo del servidor, antes que el vacío: un 500 no puede disfrazarse
         de «esta empresa no tiene cupos» (R05). -->
    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openLimits(recordCompanyId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <template v-else>
      <!-- 2 · ¿Está sano el cálculo? Va arriba, no en un pie de tabla. -->
      <div class="ds-card ds-stack ds-stack--10">
        <h2 class="ds-title">Cuándo se calculó esto</h2>
        <dl class="ds-detail-grid">
          <div>
            <dt class="ds-label">Último cálculo del acceso</dt>
            <dd class="valor">{{ formatDateTime(recalculatedAt) }}</dd>
          </div>
          <div v-if="snapshot">
            <dt class="ds-label">Última foto guardada</dt>
            <dd class="valor">{{ formatDateTime(snapshot.recalculatedAt) }}</dd>
          </div>
          <div v-if="snapshot">
            <dt class="ds-label">Por qué se recalculó</dt>
            <dd class="valor">{{ SNAPSHOT_TRIGGER_LABEL[snapshot.triggerReason] }}</dd>
          </div>
        </dl>
        <p v-if="!snapshot && !loading" class="ds-meta">
          No hay ninguna foto guardada del cálculo de esta empresa. No es un fallo: hay empresas a
          las que todavía no se les ha recalculado nada.
        </p>
      </div>

      <!-- 3 · Los cupos. -->
      <div class="ds-stack ds-stack--10">
        <h2 class="ds-title">Lo que puede usar, y de dónde sale su techo</h2>

        <div v-if="rows.length > 0" class="rejilla">
          <CompanyLimitCard
            v-for="row in rows"
            :key="row.capacity.limitDimensionId"
            :row="row"
            :busy="adjusting"
            @adjust="adjustTarget = $event"
          />
        </div>

        <div v-else-if="!loading" class="ds-card">
          <AppEmptyState
            title="Esta empresa no tiene ningún contador de cupo"
            description="Sin contadores no hay techo que enseñar. Suele significar que todavía no se le ha calculado el acceso desde su contrato."
          />
        </div>
      </div>

      <!-- 4 · Qué le ha pasado. -->
      <div class="ds-stack ds-stack--10">
        <h2 class="ds-title">Qué le ha pasado a sus cupos</h2>

        <div v-if="blockedNotice" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ blockedNotice }}</span>
        </div>

        <LimitEventsTable
          :rows="eventRows"
          :dimension-titles="dimensionTitles"
          :window-days="DEFAULT_EVENT_WINDOW_DAYS"
          :loading="loading"
          :error="null"
          :error-trace-id="null"
          @retry="openLimits(recordCompanyId)"
        />

        <!-- Qué significa cada hecho: una vez, aquí, y no repetido en cada fila. -->
        <details class="leyenda">
          <summary class="ds-label">Qué significa cada hecho</summary>
          <dl class="ds-detail-grid">
            <div v-for="(meaning, type) in LIMIT_EVENT_TYPE_MEANING" :key="type">
              <dt class="ds-label">{{ LIMIT_EVENT_TYPE_LABEL[type] }}</dt>
              <dd class="valor">{{ meaning }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </template>

    <AdjustUsageModal
      v-if="adjustTarget"
      :open="adjustTarget !== null"
      :row="adjustTarget"
      :company-name="title"
      :saving="adjusting"
      @close="adjustTarget = null"
      @submit="onAdjust"
    />
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

/* Los cupos en rejilla fluida: caben tres en escritorio y bajan a uno en móvil
   sin `@media`, que es lo que evita que la tarjeta se recorte (WCAG 2.2 §1.4.10). */
.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-14);
}

/* El `<details>` nativo trae el triángulo y el cursor; solo hace falta separar el
   cuerpo del resumen. */
.leyenda summary {
  cursor: pointer;
}
</style>
