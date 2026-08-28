<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import { companyRecordTabTarget } from '@/router/routes/companies.routes'
import { useCompanyTrial } from '@/features/trials/composables/useCompanyTrial'
import TrialWindowCard from '@/features/trials/components/TrialWindowCard.vue'
import TrialGrantsTable from '@/features/trials/components/TrialGrantsTable.vue'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'

/**
 * `/prueba` — <b>la prueba dentro del contrato</b> (§C2).
 *
 * <p>Responde a la única pregunta sobre la prueba que se hace mirando un
 * contrato: <b>«¿esto ya se factura o todavía es gratis, y hasta cuándo?»</b>.
 * Sin esta pestaña había que salir del expediente del contrato, entrar al de la
 * empresa y volver — y en el camino se pierde de vista la línea que se estaba
 * mirando.
 *
 * <p><b>Es de solo lectura, y es una decisión.</b> Abrir y cerrar la ventana se
 * hacen en la pestaña «Prueba» del expediente de <i>empresa</i>, que es donde la
 * ventana vive: es de la empresa, no del contrato, y una empresa puede tener
 * varios contratos. Dos pantallas que escriben lo mismo acaban discrepando —una
 * refresca y la otra no—, así que aquí solo se lee, y el enlace lleva al sitio
 * donde sí se escribe. Es el mismo criterio con el que «Acceso» no edita nada y
 * manda a «Lo contratado».
 *
 * <p>El armazón ya cargó el contrato y garantiza `companyId`; esta sub-vista no
 * lo recarga. Lo que sí hace es <b>recargar la prueba siempre al abrirse</b>: una
 * ventana de prueba cambia sola con el paso de los días, así que una caché de
 * hace un rato puede estar diciendo «quedan 3 días» cuando ya venció.
 */
const { companyId, companyName } = useSubscriptionRecord()
const {
  window,
  windowMissing,
  windowState,
  grantRows,
  awaitingOutcomeCount,
  loading,
  error,
  errorTraceId,
  openTrial,
  closeTrial,
} = useCompanyTrial()

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que el contrato cargó—, pero el tipo sí lo admite.
 */
const recordCompanyId = computed(() => companyId.value ?? 0)

/** A dónde se va a abrir o cerrar la ventana. Si la pestaña no existiera, no hay enlace. */
const companyTrialTarget = computed(() => companyRecordTabTarget('prueba', recordCompanyId.value))

const pendingOutcomeNotice = computed(() => {
  const count = awaitingOutcomeCount.value
  if (count === 0) return ''
  return count === 1
    ? 'Una concesión ya terminó y todavía no tiene desenlace escrito: no se sabe si pasó a facturarse o se perdió.'
    : `${count} concesiones ya terminaron y todavía no tienen desenlace escrito: no se sabe si pasaron a facturarse o se perdieron.`
})

onMounted(() => void openTrial(recordCompanyId.value))
onUnmounted(closeTrial)
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="record-trial-title">
    <div class="ds-block-head">
      <h2 id="record-trial-title" class="ds-title">Prueba</h2>
      <RouterLink
        v-if="companyTrialTarget"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :to="companyTrialTarget"
        :aria-label="`Abrir la prueba de ${companyName} en el expediente de la empresa`"
      >
        <component :is="ICONS.ARROW_UP_RIGHT" :size="14" />
        Gestionarla en el expediente de la empresa
      </RouterLink>
    </div>

    <!-- Lo primero que hay que entender para no leer mal la pantalla. -->
    <div class="ds-banner ds-banner--info ds-banner--flush" role="note">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        La ventana de prueba es de la empresa, no de este contrato: una empresa con dos contratos
        tiene una sola ventana. Aquí se lee; se abre y se cierra en el expediente de la empresa.
      </span>
    </div>

    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando la prueba…' : '' }}</p>

    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openTrial(recordCompanyId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <template v-else>
      <TrialWindowCard v-if="window && windowState" :window="window" :state="windowState" />

      <div v-else-if="windowMissing && !loading" class="ds-card">
        <AppEmptyState
          title="Esta empresa no está en prueba"
          description="Nada de este contrato se está probando: todo lo que tiene contratado se factura desde el primer día."
        />
      </div>

      <div v-if="pendingOutcomeNotice" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ pendingOutcomeNotice }}</span>
      </div>

      <div v-if="window || grantRows.length > 0" class="ds-stack ds-stack--10">
        <h3 class="ds-title">Concesiones y desenlaces</h3>
        <TrialGrantsTable
          :rows="grantRows"
          :loading="loading"
          :error="null"
          :error-trace-id="null"
          @retry="openTrial(recordCompanyId)"
        />
      </div>
    </template>
  </section>
</template>
