<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { LIMITS_ROUTE_NAMES } from '@/router/routes/limits.routes'
import EventScopeForm from '../components/EventScopeForm.vue'
import OverLimitAccountsTable from '../components/OverLimitAccountsTable.vue'
import { useLimitDimensions } from '../composables/useLimitDimensions'
import { useLimitEvents } from '../composables/useLimitEvents'
import { needsAttention } from '../composables/overLimitAccounts'

/**
 * **Cuentas desbordadas**: quién está por encima de su techo, y quién cerca.
 *
 * <p><b>Que el consumo supere el techo está permitido a propósito.</b> Una clínica
 * con 400 mascotas y un techo de 100 no es una avería: es un cliente
 * <i>desbordado y congelado</i>. Conserva todo lo suyo, lo sigue consultando e
 * imprimiendo, y lo único que no puede es crear más. Ocurre siempre que se baja
 * un plan sin retirar antes lo que ya había. Esta pantalla lo dice así, y no como
 * un fallo del sistema.
 *
 * <p><b>Es un «último estado conocido», no una medición en vivo, y por eso pide una
 * empresa y una ventana.</b> El contrato no expone el consumo actual por eje:
 * `EffectiveLimitResponse` da el techo pero no el consumo, y el único sitio donde
 * las dos cifras viajan juntas es la bitácora, donde cada hecho las congela en su
 * instante. Presentar esto como un barrido de plataforma en tiempo real sería
 * inventar una precisión y un alcance que el servidor no da — está anotado como
 * hueco del contrato en el informe de la tarea.
 */
const { nameOf, ensureLoaded } = useLimitDimensions()
const {
  companyId,
  range,
  overLimitRows,
  headline,
  loading,
  error,
  errorTraceId,
  loaded,
  applyQuery,
  reload,
} = useLimitEvents('overLimit')

/** Por defecto solo se enseña lo que pide atención: lo holgado no es trabajo. */
const soloAtencion = ref(true)

onMounted(() => void ensureLoaded())

const filas = computed(() =>
  soloAtencion.value
    ? overLimitRows.value.filter((r) => needsAttention(r.state))
    : overLimitRows.value,
)

const ocultas = computed(() => overLimitRows.value.length - filas.value.length)

const titular = computed(() =>
  companyId.value === null ? 'Elige una empresa y una ventana' : headline.value,
)
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="desbordadas-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="desbordadas-titulo" class="ds-display--sm titular" tabindex="-1">{{ titular }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : titular }}</p>
      <p class="ds-meta">
        Estar por encima del techo <strong>no es un error</strong>: la cuenta queda congelada,
        conserva todo lo suyo y deja de poder crear. Pasa al bajar un plan sin retirar antes lo que
        ya había. Lo que se ve aquí es el <strong>último estado registrado</strong> de cada eje
        dentro de la ventana, con su fecha — no una medición de ahora mismo.
      </p>
    </div>

    <EventScopeForm
      :company-id="companyId"
      :from="range.from"
      :to="range.to"
      items-label="el estado"
      @apply="applyQuery"
    />

    <AppEmptyState
      v-if="companyId === null"
      title="Elige una empresa"
      description="El estado de cupo se consulta por empresa: la plataforma no ofrece un barrido de todas a la vez."
      :icon="ICONS.COMPANY"
    />

    <template v-else>
      <AppCheckbox v-model="soloAtencion" label="Ver solo los ejes que piden atención" />

      <OverLimitAccountsTable
        :rows="filas"
        :dimension-name="nameOf"
        :loading="loading"
        :error="error"
        :error-trace-id="errorTraceId"
        @retry="reload"
      >
        <template #empty>
          <!-- Filtrado y de verdad vacío son estados distintos: el primero
               tiene salida, el segundo es una afirmación sobre la ventana. -->
          <AppEmptyState
            v-if="soloAtencion && overLimitRows.length > 0"
            title="Ningún eje pide atención en esta ventana"
            description="Hay ejes con actividad, pero todos con holgura o sin techo declarado."
          >
            <button type="button" class="ds-btn ds-btn--ghost" @click="soloAtencion = false">
              Ver todos los ejes con actividad
            </button>
          </AppEmptyState>
          <AppEmptyState
            v-else
            :title="`Ningún hecho de cupo entre el ${formatDate(range.from)} y el ${formatDate(range.to)}`"
            description="Nadie ha registrado consumo, avisos ni bloqueos de esta empresa en esa ventana. No se dibuja ningún medidor: sin hechos no hay consumo que enseñar, y un cero sería inventado."
          />
        </template>
      </OverLimitAccountsTable>

      <p v-if="loaded && ocultas > 0" class="ds-meta">
        {{ ocultas }} {{ ocultas === 1 ? 'eje más con actividad' : 'ejes más con actividad' }} en la
        ventana, con holgura o sin techo declarado.
      </p>

      <p v-if="loaded" class="ds-meta">
        <RouterLink :to="{ name: LIMITS_ROUTE_NAMES.EVENTS }">
          Ver la bitácora completa de esta ventana
        </RouterLink>
      </p>
    </template>
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
