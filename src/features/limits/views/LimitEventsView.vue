<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import EventScopeForm from '../components/EventScopeForm.vue'
import LimitEventsTable from '../components/LimitEventsTable.vue'
import { useLimitDimensions } from '../composables/useLimitDimensions'
import { useLimitEvents } from '../composables/useLimitEvents'

/**
 * **Bitácora de cupo**: avisos y portazos, uno a uno.
 *
 * <p><b>Para qué existe.</b> Para lo mismo que la de mora: <i>demostrar que se
 * avisó antes de frenar</i>. Cuando un cliente llama diciendo «me habéis
 * bloqueado sin previo aviso», esta es la respuesta — o la prueba de que tiene
 * razón. Es un rastro, así que cada hecho se cuenta entero y no se resume.
 *
 * <p><b>El feed no es global, por mucho que la sección sea de plataforma.</b> El
 * contrato solo expone `/system/company-limit-events/companies/{companyId}`: la
 * ruta sin `/system` es la del tenant y resuelve la empresa con la cabecera
 * `X-Company-Id`, que un operador de esta consola —un `SystemUserContext`— no
 * lleva. Por eso la pantalla pide empresa y ventana en vez de abrir con un
 * listado que no puede existir. Queda anotado como hueco del contrato en el
 * informe de la tarea.
 *
 * <p>De solo consulta. Corregir un contador a mano es
 * `POST /system/company-limit-events/companies/{companyId}/usage-adjustments`, y
 * su sitio es el expediente de la empresa, donde se ve sobre quién se actúa.
 */
const { nameOf, ensureLoaded } = useLimitDimensions()
const { companyId, range, events, loading, error, errorTraceId, loaded, applyQuery, reload } =
  useLimitEvents('ledger')

onMounted(() => void ensureLoaded())

const titular = computed(() => {
  if (companyId.value === null) return 'Elige una empresa y una ventana'
  const n = events.value.length
  const cuantos = n === 1 ? '1 hecho de cupo' : `${n} hechos de cupo`
  return `${cuantos} de la empresa #${companyId.value}`
})
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="bitacora-titulo">
    <div class="ds-stack ds-stack--8">
      <h2 id="bitacora-titulo" class="ds-display--sm titular" tabindex="-1">{{ titular }}</h2>
      <p class="ds-sr-only" role="status">{{ loading ? '' : titular }}</p>
      <p class="ds-meta">
        El rastro de lo que se avisó, lo que se bloqueó y lo que se amplió, con quién lo hizo y
        cuándo. El techo de cada fila es <strong>el del momento del hecho</strong>, no el de ahora.
      </p>
    </div>

    <EventScopeForm
      :company-id="companyId"
      :from="range.from"
      :to="range.to"
      items-label="la bitácora"
      @apply="applyQuery"
    />

    <AppEmptyState
      v-if="companyId === null"
      title="Elige una empresa"
      description="La bitácora se consulta por empresa: la plataforma no sirve un feed de todas a la vez."
      :icon="ICONS.COMPANY"
    />

    <LimitEventsTable
      v-else
      :events="events"
      :dimension-name="nameOf"
      :loading="loading"
      :error="error"
      :error-trace-id="errorTraceId"
      @retry="reload"
    >
      <template #empty>
        <!-- NO lleva icono de éxito. Sobre una empresa recién dada de alta,
             «no le ha pasado nada» es vacío, no un logro, y celebrarlo sería
             afirmar algo que no se sabe. Aquí se enuncia el hecho y ya. -->
        <AppEmptyState
          :title="`Ningún hecho de cupo entre el ${formatDate(range.from)} y el ${formatDate(range.to)}`"
          description="Ni avisos, ni bloqueos, ni ampliaciones, ni correcciones de contador. Prueba con una ventana más ancha antes de concluir que nunca pasó nada."
        />
      </template>
    </LimitEventsTable>

    <p v-if="loaded && events.length > 0" class="ds-meta">
      Del {{ formatDate(range.from) }} al {{ formatDate(range.to) }}. Fuera de esa ventana puede
      haber más hechos: la consulta no los trae.
    </p>
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
