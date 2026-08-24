<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import RecordSkeleton from '@/components/ui/RecordSkeleton.vue'
import { ICONS } from '@/constants/icons'
import { useSubscriptionRecord } from '../composables/useSubscriptionRecord'
import SubscriptionRecordHeader from '../components/record/SubscriptionRecordHeader.vue'
import SubscriptionRecordNav from '../components/record/SubscriptionRecordNav.vue'
import SubscriptionStatusBanner from '../components/record/SubscriptionStatusBanner.vue'

/**
 * <b>El armazón del expediente del contrato</b> (§4.4.2, tarea W2-A). Es común a
 * las seis sub-vistas y es el único que carga el contrato.
 *
 * <p>Un contrato es un expediente que crece, no un registro con campos: dar de
 * baja un módulo no borra la línea, le pone fecha de fin. Las seis sub-vistas
 * responden juntas la pregunta que guía todo el modelo —«¿qué tenía contratado
 * Ana el 3 de marzo, y por qué se le facturaron 179.000?»—; este armazón es lo
 * que las mantiene en el mismo expediente y sobre la misma empresa.
 *
 * <p><b>Tres cosas viven aquí y no en las sub-vistas, a propósito:</b>
 *
 * <ol>
 *   <li>La <b>cabecera con la identidad de la empresa</b>, que es la respuesta de
 *       diseño a la cabecera `X-Company-Id` (§2): si lo que decide a quién se le
 *       cancela el contrato es invisible en la petición, tiene que ser visible y
 *       permanente en la pantalla.</li>
 *   <li>El <b>banner de estado</b> de una cuenta vencida o en solo lectura, que
 *       por eso se ve en las seis sub-vistas y no solo al entrar.</li>
 *   <li>La <b>carga del contrato</b>. Una sola llamada a `GET /subscriptions/{id}`
 *       y una sola a `GET /companies/{companyId}` por expediente abierto, no por
 *       sub-vista.</li>
 * </ol>
 *
 * <p>El `RouterView` no se monta hasta que el contrato ha cargado. Es lo que
 * permite a W2-B … W2-F dar por hecho que `companyId` y `subscription` ya están
 * puestos cuando su sub-vista se monta, sin repetir la carga ni defenderse de un
 * `null` que no puede darse.
 *
 * <p><b>Recarga siempre al abrir</b>, y también al navegar de un contrato a otro
 * sin desmontar la vista: el `watch` mira los dos parámetros de la ruta.
 */
const props = defineProps<{ companyId: string; id: string }>()

const {
  subscription,
  company,
  companyError,
  loading,
  error,
  errorTraceId,
  bannerTone,
  supportText,
  openRecord,
  closeRecord,
} = useSubscriptionRecord()

// La ruta declara los dos parámetros como `(\d+)`, así que una URL con letras no
// llega hasta aquí: no hay `NaN` que defender.
const companyIdNumber = computed(() => Number(props.companyId))
const subscriptionIdNumber = computed(() => Number(props.id))

watch(
  [companyIdNumber, subscriptionIdNumber],
  ([nextCompanyId, nextSubscriptionId]) => void openRecord(nextCompanyId, nextSubscriptionId),
  { immediate: true },
)

/** Nada de un contrato ajeno esperando en el store a que se abra el siguiente. */
onUnmounted(closeRecord)
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <p class="ds-sr-only" role="status">{{ loading ? 'Cargando el contrato…' : '' }}</p>

      <div v-if="error" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openRecord(companyIdNumber, subscriptionIdNumber)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

      <RecordSkeleton v-else-if="loading" />

      <template v-else-if="subscription">
        <SubscriptionRecordHeader
          :subscription="subscription"
          :company="company"
          :company-error="companyError"
          :company-id="companyIdNumber"
        />

        <SubscriptionStatusBanner
          v-if="bannerTone"
          :tone="bannerTone"
          :text="supportText"
          :company-id="companyIdNumber"
          :subscription-id="subscriptionIdNumber"
        />

        <SubscriptionRecordNav
          :company-id="companyIdNumber"
          :subscription-id="subscriptionIdNumber"
        />

        <RouterView />
      </template>
    </div>
  </AppLayout>
</template>
