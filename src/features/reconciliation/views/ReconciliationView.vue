<script setup lang="ts">
import { computed, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import { segmentedTabId } from '@/components/ui/segmented-tabs'
import BankReceiptsPanel from '../components/BankReceiptsPanel.vue'
import ExternalReconciliationsPanel from '../components/ExternalReconciliationsPanel.vue'
import SettlementsPanel from '../components/SettlementsPanel.vue'

/**
 * Conciliación — `/conciliacion`.
 *
 * ── Tres pestañas y una sola pantalla ─────────────────────────────────────
 *
 * <p>El cuadre con el facturador externo, las liquidaciones de la pasarela y los
 * extractos bancarios son tres tablas distintas, pero <b>una sola tarea</b>: al
 * cerrar el mes se recorren las tres seguidas, y lo que no cuadra en una se
 * explica mirando otra. Tres entradas de menú separadas obligarían a memorizar el
 * modelo de datos para hacer una sola cosa.
 *
 * <p>La pestaña activa viaja en la query string (`?vista=`) para que un cierre a
 * medias se pueda pegar en un ticket y se pueda volver a él con el botón atrás.
 *
 * ── El aviso de aislamiento, en la cabecera y permanente ──────────────────
 *
 * <p>Una liquidación agrupa los cobros de <b>muchas clínicas</b> en una fila. Esta
 * consola es de plataforma y aquí sí se ve el agregado — pero la pantalla no
 * construye ningún camino que lleve del pago de un cliente a su lote: la
 * referencia de la liquidación es una etiqueta que se lee, nunca una llave que se
 * usa. El aviso es una condición permanente, así que va con `role="status"` y no
 * `role="alert"` (`docs/ux/patron-de-mensajes.md` §4).
 */
const route = useRoute()
const router = useRouter()

const panelId = useId()

const TABS = [
  { value: 'externo', label: 'Facturador externo' },
  { value: 'liquidaciones', label: 'Liquidaciones de la pasarela' },
  { value: 'extracto', label: 'Extracto bancario' },
] as const

type TabValue = (typeof TABS)[number]['value']

const active = computed<TabValue>(() => {
  const raw = route.query.vista
  const value = typeof raw === 'string' ? raw : ''
  return TABS.some((tab) => tab.value === value) ? (value as TabValue) : 'externo'
})

const activeModel = computed({
  get: () => active.value as string,
  set: (value: string) => {
    void router.replace({ query: { ...route.query, vista: value } })
  },
})

const activeTabId = computed(() => segmentedTabId(panelId, active.value))
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <div class="ds-stack ds-stack--8">
        <h1 class="ds-title">Conciliación</h1>
        <p class="ds-subtitle">
          Lo que dijimos que cobramos, lo que el facturador declaró, lo que la pasarela liquidó y lo
          que el banco abonó. El mes está cerrado cuando los cuatro dicen lo mismo.
        </p>
      </div>

      <p class="ds-banner ds-banner--warning" role="status">
        <ShieldAlert :size="16" class="ds-banner-icon" />
        <span>
          <strong>Una liquidación agrupa los cobros de muchas clínicas.</strong> Aquí se lee el
          agregado —cuánto trajo el lote y cuántos cobros declara— y nunca la lista de pagos de
          nadie. La referencia de la liquidación es una etiqueta para copiar contra el portal de la
          pasarela: no lleva al pago de ningún cliente, y desde el detalle de un cliente no se llega
          a este lote.
        </span>
      </p>

      <AppSegmentedTabs
        v-model="activeModel"
        :options="TABS"
        label="Áreas de la conciliación"
        :panel-id="panelId"
      />

      <div :id="panelId" role="tabpanel" :aria-labelledby="activeTabId">
        <!-- `v-if` y no `v-show`: cada panel recarga al montarse, que es la regla
             de recargar al abrir. Con `v-show` los tres se montarían a la vez y
             se pedirían tres listados que nadie está mirando. -->
        <ExternalReconciliationsPanel v-if="active === 'externo'" />
        <SettlementsPanel v-else-if="active === 'liquidaciones'" />
        <BankReceiptsPanel v-else />
      </div>
    </div>
  </AppLayout>
</template>
