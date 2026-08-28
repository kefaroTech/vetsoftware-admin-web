<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import AppPagination from '@/components/ui/AppPagination.vue'
import { formatDate } from '@/composables/format'
import { useCompanyRecord } from '../../composables/useCompanyRecord'
import { useCompanyCession } from '../../composables/useCompanyCession'
import {
  CESSION_DATA_AUTHORIZATIONS_GAP,
  billingProfileName,
  billingProfileTaxId,
} from '../../composables/companyCessionText'
import HolderSeriesTable from '../../components/record/cession/HolderSeriesTable.vue'
import SucceedContractModal from '../../components/record/cession/SucceedContractModal.vue'
import type { SucceedCompanyBillingProfileRequest } from '../../types/company-cession.types'

/**
 * `/empresas/:id/cesion` — <b>la cesión del contrato</b> (§I11, decisión D-62).
 *
 * <p><b>Esta pestaña estaba bloqueada y ha dejado de estarlo.</b> Su `blockedBy`
 * decía «no hay ningún endpoint de cesión de contrato en api/openapi.json», y era
 * cierto cuando se escribió. La regeneración del contrato trajo las tres piezas:
 * el titular vigente (`GET /company-billing-profile`), la serie
 * (`GET /company-billing-profile/history`) y la cesión
 * (`POST /company-billing-profile/succession`).
 *
 * <p><b>Ceder es sustituir al titular, no mover la empresa.</b> El encabezado lo
 * dice con esas palabras porque el nombre engaña y de ahí sale la mitad de las
 * llamadas: las mascotas, la historia clínica y los usuarios no se tocan. Lo que
 * cambia es quién es el contribuyente que factura y paga.
 *
 * <p><b>Archivar y ceder son dos hechos, no un estado.</b> Aquí se ve en la serie:
 * cada titular deja su tramo con `validFrom`/`validTo`, y por eso se puede
 * contestar cuántas veces se cedió el contrato. Ese número se pinta, y cuando es
 * cero es un cero verdadero —un contrato con un solo titular no se ha cedido
 * nunca—, no un relleno.
 *
 * <p><b>Lo que la cesión no arrastra se declara en la pantalla</b>, no solo en el
 * modal: las autorizaciones de tratamiento de datos del titular anterior no se
 * heredan y quedan pendientes de reconfirmar. No se puede listar quiénes son —el
 * contrato no publica las autorizaciones— y por eso se dice con palabras en vez
 * de con un contador en cero, que diría justo lo contrario (R14).
 *
 * <p>El armazón ya cargó la empresa y garantiza `companyId`: esta sub-vista no la
 * recarga, la lee y carga lo suyo.
 */
const { companyId, title } = useCompanyRecord()
const {
  current,
  currentIsInForce,
  missing,
  holderRows,
  cessionCount,
  page,
  pageSize,
  totalElements,
  totalPages,
  loading,
  saving,
  error,
  errorTraceId,
  openCession,
  goToPage,
  succeed,
  closeCession,
} = useCompanyCession()

const cedeModal = ref(false)
const holderRegion = ref<HTMLElement | null>(null)

/**
 * `companyId` no es `null` mientras el expediente esté pintado —el armazón no
 * monta el `RouterView` hasta que la empresa cargó—, pero el tipo sí lo admite.
 */
const recordCompanyId = computed(() => companyId.value ?? 0)

/** Cuántas veces se cedió, dicho en palabras. Cero es cero, y se dice. */
const cessionCountLine = computed(() => {
  if (missing.value) return ''
  const count = cessionCount.value
  if (count === 0) return 'Este contrato no se ha cedido nunca: sigue con su titular original.'
  return count === 1
    ? 'Este contrato se ha cedido una vez.'
    : `Este contrato se ha cedido ${count} veces.`
})

/**
 * Una cesión firmada que todavía no ha entrado en vigor. El titular vigente
 * tiene `validTo` puesto y el entrante aún no responde: hay que decirlo, porque
 * durante esos días la pregunta «¿a quién facturo?» tiene una respuesta que no es
 * la de la fila de arriba.
 */
const pendingHandover = computed(() => {
  const upcoming = holderRows.value.find((row) => row.state.variant === 'warning')
  if (!upcoming) return ''
  return `Hay una cesión firmada que todavía no ha entrado: ${billingProfileName(upcoming.profile)} responde a partir del ${formatDate(upcoming.profile.validFrom)}. Hasta ese día factura el titular actual.`
})

/** <b>Recarga siempre al abrir la pantalla.</b> */
onMounted(() => void openCession(recordCompanyId.value))

/** Nada del contrato de una empresa ajena esperando a que se abra la siguiente. */
onUnmounted(closeCession)

async function onSucceed(payload: SucceedCompanyBillingProfileRequest) {
  if (await succeed(recordCompanyId.value, payload)) {
    cedeModal.value = false
    // El foco va a la tarjeta del titular, que es lo que acaba de cambiar, y no
    // a un botón que quedó detrás del modal.
    await nextTick()
    holderRegion.value?.focus()
  }
}
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="cesion-title">
    <div class="ds-block-head">
      <h1 id="cesion-title" class="ds-title">Cesión</h1>
      <button
        v-if="!missing && !loading"
        type="button"
        class="ds-btn ds-btn--secondary ds-btn--sm"
        @click="cedeModal = true"
      >
        <component :is="ICONS.EDIT" :size="14" />
        Ceder el contrato
      </button>
    </div>

    <p class="ds-meta intro">
      Ceder es <strong>sustituir al titular</strong> que factura y paga, no mover la clínica: las
      mascotas, la historia clínica y los usuarios no se tocan. Cada titular deja su tramo y los
      anteriores no se borran — son lo que explica a quién se facturó en cada momento.
    </p>

    <p class="ds-sr-only" role="status">{{ loading ? 'Cargando la cesión…' : '' }}</p>

    <!-- 1 · Fallo del servidor. Va antes que el vacío: un 500 no puede
         disfrazarse de «esta empresa no tiene titular» (R05). -->
    <template v-if="error">
      <div class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openCession(recordCompanyId)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
    </template>

    <template v-else>
      <!-- 2 · El titular de hoy. -->
      <div ref="holderRegion" tabindex="-1" class="region">
        <div v-if="current" class="ds-card ds-stack ds-stack--10">
          <h2 class="ds-subtitle">{{ billingProfileName(current) }}</h2>
          <dl class="hechos">
            <div>
              <dt>Documento</dt>
              <dd>{{ billingProfileTaxId(current) }}</dd>
            </div>
            <div>
              <dt>Correo de facturación</dt>
              <dd>{{ current.billingEmail }}</dd>
            </div>
            <div>
              <dt>Responde desde</dt>
              <dd>{{ formatDate(current.validFrom) }}</dd>
            </div>
            <div>
              <dt>Agente de retención</dt>
              <dd>{{ current.withholdingAgent ? 'Sí' : 'No' }}</dd>
            </div>
          </dl>

          <!-- Un perfil con `validTo` nulo pero fecha de entrada futura NO es el
               titular de hoy. Decir que lo es adelantaría la responsabilidad. -->
          <p v-if="!currentIsInForce" class="ds-meta">
            Este titular todavía no responde: entra el {{ formatDate(current.validFrom) }}.
          </p>
        </div>

        <!-- 3 · No hay titular, y eso NO es un error. -->
        <div v-else-if="missing && !loading" class="ds-banner ds-banner--info" role="status">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Esta empresa no tiene perfil de facturación: nunca se le abrió uno. Lo que hace falta
            aquí no es una cesión —no hay a quién suceder— sino dar de alta el primer titular, que
            se hace desde el alta del perfil y no desde esta pantalla.
          </span>
        </div>
      </div>

      <!-- 4 · Una cesión firmada que aún no ha entrado. -->
      <div v-if="pendingHandover" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ pendingHandover }}</span>
      </div>

      <!-- 5 · La serie. -->
      <div class="ds-stack ds-stack--10">
        <div class="ds-block-head">
          <h2 class="ds-title">Titulares de este contrato</h2>
        </div>
        <p v-if="cessionCountLine" class="ds-meta">{{ cessionCountLine }}</p>
        <HolderSeriesTable
          :rows="holderRows"
          :loading="loading"
          :error="null"
          :error-trace-id="null"
          @retry="openCession(recordCompanyId)"
        />
        <AppPagination
          v-if="totalPages > 1"
          :page="page"
          :page-size="pageSize"
          :total="totalElements"
          :page-count="totalPages"
          @update:page="goToPage"
        />
      </div>

      <!-- 6 · Lo que una cesión no arrastra, dicho también fuera del modal:
           quien mira esta pestaña después de una cesión tiene que encontrarlo. -->
      <p class="ds-meta hueco">{{ CESSION_DATA_AUTHORIZATIONS_GAP }}</p>
    </template>

    <SucceedContractModal
      :open="cedeModal"
      :company-name="title"
      :current-holder="current"
      :saving="saving"
      @close="cedeModal = false"
      @submit="onSucceed"
    />
  </section>
</template>

<style scoped>
.intro,
.hueco {
  max-width: 70ch;
}

/* La región que recibe el foco tras ceder. Sin caja, el `tabindex="-1"` no
   tendría anillo de foco visible. */
.region {
  display: block;
}

.hechos {
  display: grid;
  gap: var(--space-10);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.hechos dt {
  color: var(--text-muted);
  font-size: var(--text-caption);
}

.hechos dd {
  margin: 0;
}
</style>
