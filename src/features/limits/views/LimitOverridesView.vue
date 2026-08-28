<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { LIMITS_ROUTE_NAMES } from '@/router/routes/limits.routes'
import CompanyScopePicker from '../components/CompanyScopePicker.vue'
import EffectiveLimitPanel from '../components/EffectiveLimitPanel.vue'
import GrantOverrideModal from '../components/GrantOverrideModal.vue'
import LimitOverridesTable from '../components/LimitOverridesTable.vue'
import RevokeOverrideModal from '../components/RevokeOverrideModal.vue'
import { useLimitDimensions } from '../composables/useLimitDimensions'
import { useLimitOverrides } from '../composables/useLimitOverrides'
import type {
  CompanyLimitOverrideResponse,
  GrantCompanyLimitOverrideRequest,
  RevokeCompanyLimitOverrideRequest,
} from '../types/limits.types'

/**
 * **Excepciones de techo**: las negociadas cliente a cliente, y el techo efectivo
 * que resultan.
 *
 * <p><b>La empresa se pide primero, y no es un filtro opcional.</b> El contrato no
 * expone ningún barrido de excepciones de toda la plataforma: la única ruta es
 * `/system/company-limit-overrides/companies/{companyId}`. Abrir con una tabla
 * vacía sugeriría «no hay ninguna excepción en la plataforma», que es una
 * afirmación que esta pantalla no puede hacer.
 *
 * <p><b>El techo efectivo se pregunta, no se calcula.</b> Se elige un eje y se
 * pide `/effective-limits/{limitDimensionId}`; el orden de precedencia
 * `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE` lo resuelve el
 * servidor y aquí solo se pinta, con `ProvenanceLine`.
 *
 * <p><b>Negociar y revocar son las dos acciones que se firman</b>, y las dos usan
 * el modal compartido con motivo de lista cerrada. Ninguna se puede confirmar
 * sin motivo: eso lo sujeta `SignedActionModal`, no esta pantalla.
 */
const { dimensions, loading: dimensionsLoading, ensureLoaded, nameOf } = useLimitDimensions()

const {
  companyId,
  overrides,
  alive,
  dimensionsWithAliveOverride,
  effectiveLimits,
  effectiveLoading,
  effectiveErrors,
  loading,
  error,
  errorTraceId,
  saving,
  loadFor,
  reload,
  loadEffectiveLimit,
  grant,
  revoke,
} = useLimitOverrides()

const showGrant = ref(false)
const revoking = ref<CompanyLimitOverrideResponse | null>(null)
/** El eje cuyo techo efectivo se está consultando. */
const inspected = ref<number | null>(null)

onMounted(() => void ensureLoaded())

const dimensionOptions = computed(() =>
  dimensions.value.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
)

const inspectedDimension = computed(() =>
  inspected.value === null
    ? null
    : (dimensions.value.find((d) => d.id === inspected.value) ?? null),
)

const inspectedLimit = computed(() =>
  inspected.value === null ? null : (effectiveLimits.value[inspected.value] ?? null),
)

/** Cambiar de eje vuelve a preguntar: un techo es de un eje concreto. */
watch(inspected, (id) => {
  if (id !== null) void loadEffectiveLimit(id)
})

/** Cambiar de empresa invalida el techo que estuviera a la vista. */
watch(companyId, () => {
  inspected.value = null
})

const inspectedLoading = computed(() =>
  inspected.value === null ? false : (effectiveLoading.value[inspected.value] ?? false),
)

const inspectedError = computed(() =>
  inspected.value === null ? null : (effectiveErrors.value[inspected.value] ?? null),
)

/**
 * `ProvenanceLine` no lleva enlace aquí: la excepción que fija el techo está en
 * la tabla de esta misma pantalla, y un enlace a donde ya estás es ruido. El
 * enlace del consumo sí sale, porque vive en otra ruta.
 */
const usageTo = { name: LIMITS_ROUTE_NAMES.OVER_LIMIT }

const headline = computed(() => {
  if (companyId.value === null) return 'Elige una empresa para ver sus excepciones'
  const vivas = alive.value.length
  const total = overrides.value.length
  if (total === 0) return `La empresa #${companyId.value} no tiene ninguna excepción de techo`
  return `${vivas} ${vivas === 1 ? 'excepción viva' : 'excepciones vivas'} de ${total} registradas en la empresa #${companyId.value}`
})

async function handleGrant(payload: GrantCompanyLimitOverrideRequest) {
  try {
    await grant(payload)
    showGrant.value = false
    // El techo que estuviera a la vista acaba de cambiar.
    if (inspected.value !== null) await loadEffectiveLimit(inspected.value)
  } catch {
    // El composable ya avisó con el mensaje del servidor y su traza; el modal
    // sigue abierto con lo escrito.
  }
}

async function handleRevoke(limitDimensionId: number, payload: RevokeCompanyLimitOverrideRequest) {
  try {
    await revoke(limitDimensionId, payload)
    revoking.value = null
    if (inspected.value !== null) await loadEffectiveLimit(inspected.value)
  } catch {
    // Ídem: el modal se queda abierto.
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="excepciones-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="excepciones-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : headline }}</p>
      <p class="ds-meta">
        Un techo pactado aparte del plan. <strong>Manda sobre el del contrato y el del plan</strong>
        y un recálculo no lo repone: si se revoca, se pierde. Por eso conceder y retirar se firman
        con un motivo de lista cerrada.
      </p>
    </div>

    <CompanyScopePicker :company-id="companyId" items-label="excepciones" @apply="loadFor" />

    <!-- Todavía no se ha elegido empresa. NO es una tabla vacía: no se ha
         preguntado nada, y decir «no hay excepciones» sería falso. -->
    <AppEmptyState
      v-if="companyId === null"
      title="Elige una empresa"
      description="Las excepciones se consultan por empresa: la plataforma no ofrece un listado de todas a la vez."
      :icon="ICONS.COMPANY"
    />

    <template v-else>
      <div class="ds-head">
        <p class="ds-kicker">Excepciones registradas</p>
        <button
          type="button"
          class="ds-btn ds-btn--primary"
          :disabled="dimensionsLoading"
          @click="showGrant = true"
        >
          <component :is="ICONS.ADD" :size="15" />
          Negociar una excepción
        </button>
      </div>

      <LimitOverridesTable
        :overrides="overrides"
        :dimension-name="nameOf"
        :loading="loading"
        :error="error"
        :error-trace-id="errorTraceId"
        @retry="reload"
        @revoke="revoking = $event"
      >
        <template #empty>
          <AppEmptyState
            title="Esta empresa no tiene ninguna excepción de techo"
            description="Sus cupos salen del plan o del contrato. Eso es lo normal: la excepción es la salida cuando lo pactado no encaja."
          >
            <button type="button" class="ds-btn ds-btn--primary" @click="showGrant = true">
              <component :is="ICONS.ADD" :size="15" />
              Negociar una excepción
            </button>
          </AppEmptyState>
        </template>
      </LimitOverridesTable>

      <div class="ds-stack ds-stack--10">
        <p class="ds-kicker">Techo efectivo</p>
        <p class="ds-meta">
          Cuál es el techo que rige de verdad para un eje, y de dónde sale. Lo resuelve el servidor:
          el orden es excepción negociada, después contrato, después plan.
        </p>
        <AppSelect
          v-model="inspected"
          :options="dimensionOptions"
          label="Eje a consultar"
          :placeholder="dimensionsLoading ? 'Cargando…' : 'Elige un eje'"
        />
        <EffectiveLimitPanel
          :dimension="inspectedDimension"
          :limit="inspectedLimit"
          :usage="null"
          :usage-checked="false"
          :loading="inspectedLoading"
          :error="inspectedError"
          :usage-to="usageTo"
        />
      </div>
    </template>

    <GrantOverrideModal
      v-if="companyId !== null"
      :open="showGrant"
      :company-id="companyId"
      :dimensions="dimensions"
      :taken="dimensionsWithAliveOverride"
      :saving="saving"
      @close="showGrant = false"
      @submit="handleGrant"
    />

    <RevokeOverrideModal
      :open="revoking !== null"
      :override="revoking"
      :dimension-name="revoking ? nameOf(revoking.limitDimensionId) : ''"
      :saving="saving"
      @close="revoking = null"
      @submit="handleRevoke"
    />
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
