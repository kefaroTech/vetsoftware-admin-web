<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { ICONS } from '@/constants/icons'
import BillingDocumentSequencesPanel from '../components/BillingDocumentSequencesPanel.vue'
import PlatformBillingNotConfigured from '../components/PlatformBillingNotConfigured.vue'
import PlatformBillingPoliciesForm from '../components/PlatformBillingPoliciesForm.vue'
import { usePlatformBillingConfig } from '../composables/usePlatformBillingConfig'
import type { UpdatePlatformBillingConfigRequest } from '../types/platform-billing.types'

/**
 * Facturación de plataforma — `/configuracion/facturacion` (§4.6).
 *
 * <p><b>Recurso singular.</b> No hay listado, ni ficha, ni «nuevo»: la tabla
 * tiene una fila garantizada por el esquema, así que la pantalla se lee como un
 * ajuste y no como un CRUD. Los dos bloques son los de §4.6 —las políticas y la
 * numeración— y ninguna de sus cuatro rutas necesita `X-Company-Id`, que es lo
 * que hace esta pantalla implementable sin esperar a nadie (§1.1).
 *
 * ── Las tres ramas, en este orden ───────────────────────────────────────────
 *
 * 1. <b>La fila no existe</b> (503, `PLATFORM_BILLING_CONFIG_NOT_CONFIGURED`).
 *    Es un despliegue incompleto, no un caso de negocio, y el mensaje del
 *    servidor trae el remedio: se pinta entero con `PlatformBillingNotConfigured`
 *    y no se ofrece el formulario, porque guardar tampoco funcionaría (el
 *    servidor no hace upsert, lanza la misma excepción).
 * 2. <b>Cualquier otro fallo</b> — un 500, la red caída, un 403. Banner de error
 *    con su traza y «Reintentar». El error se pinta ANTES que el vacío (R05).
 * 3. <b>Todo bien</b>: la lista compacta de puesta en marcha (que se esconde sola
 *    si no falta nada), las políticas y la numeración.
 *
 * ── Por qué la lista de puesta en marcha aparece aquí, pero no en la rama 1 ──
 *
 * `PlatformSetupChecklist` (§3.7, W1-B) responde «qué falta para poder operar», y
 * su forma compacta no pinta nada cuando no falta nada: es exactamente el aviso
 * que corresponde a una pantalla de configuración con el catálogo a medio
 * sembrar. En la rama 1 <b>no</b> se pinta, y por dos razones: su paso 5 enlaza a
 * esta misma pantalla —mandaría al operador a donde ya está— y lo rotula
 * «Pendiente», que promete una acción que aquí no existe. Ver la cabecera de
 * `PlatformBillingNotConfigured.vue` para el argumento completo.
 */
const billing = usePlatformBillingConfig()

/** Cambia a `true` tras un guardado correcto; el formulario lo usa para el foco. */
const saved = ref(false)

onMounted(() => {
  void reload()
})

/** Recarga siempre al abrir la pantalla: nada de servir una fila de hace un rato. */
async function reload() {
  saved.value = false
  await Promise.all([billing.load(), billing.loadPriceLists()])
}

async function save(payload: UpdatePlatformBillingConfigRequest) {
  saved.value = false
  saved.value = await billing.save(payload)
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <p class="ds-kicker">Sistema</p>
        <h1 class="ds-title">Facturación de plataforma</h1>
        <p class="ds-view-subtitle">
          Las políticas del negocio, en un sitio: cortesía, prueba, día de emisión, plazo de pago,
          tarifa por defecto y proveedor de facturación externa. Cambiarlas es editar este
          formulario, no desplegar una versión.
        </p>
      </div>
    </div>

    <PlatformBillingNotConfigured
      v-if="billing.notConfigured.value"
      :detail="billing.failure.value?.message ?? ''"
      :trace-id="billing.failure.value?.traceId ?? null"
      :retrying="billing.loading.value"
      @retry="reload"
    />

    <div v-else class="ds-page--stack">
      <div v-if="billing.failure.value" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          {{ billing.failure.value.message }}
          <span v-if="billing.failure.value.traceId" class="ds-meta">
            Traza: {{ billing.failure.value.traceId }}
          </span>
        </span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="reload">
          <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
          Reintentar
        </button>
      </div>

      <PlatformSetupChecklist variant="compact" purpose="dar de alta una empresa" />

      <section class="ds-stack ds-stack--12" aria-labelledby="politicas-titulo">
        <h2 id="politicas-titulo" class="ds-title">Políticas</h2>

        <PlatformBillingPoliciesForm
          v-if="billing.config.value"
          :initial="billing.config.value"
          :saving="billing.saving.value"
          :price-list-options="billing.priceListOptions.value"
          :price-lists-loading="billing.priceListsLoading.value"
          :price-lists-error="billing.priceListsError.value"
          :saved="saved"
          @submit="save"
          @retry-price-lists="billing.loadPriceLists"
        />

        <div v-else-if="billing.loading.value" class="ds-card ds-stack ds-stack--12">
          <p class="ds-sr-only" role="status">Cargando la configuración de facturación…</p>
          <span
            v-for="fila in 4"
            :key="fila"
            class="ds-skeleton ds-skeleton--text"
            aria-hidden="true"
          />
        </div>
      </section>

      <section class="ds-stack ds-stack--12" aria-labelledby="numeracion-titulo">
        <h2 id="numeracion-titulo" class="ds-title">Numeración de documentos</h2>
        <BillingDocumentSequencesPanel />
      </section>
    </div>
  </AppLayout>
</template>
