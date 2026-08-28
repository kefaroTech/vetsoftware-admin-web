<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { ICONS } from '@/constants/icons'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTable from '@/components/ui/AppTable.vue'
import BridgeSection from './BridgeSection.vue'
import { useTierSimulator } from '../composables/useTierSimulator'
import { tierRangeLabel } from '../composables/tierPricing'
import { BILLING_CYCLE_OPTIONS } from '../types/commercial-catalog.types'
import type { PriceListResponse } from '../types/commercial-catalog.types'

/**
 * Simulador de tramos acumulativos (D-66, épica E5).
 *
 * ── Qué enseña, y por qué las dos cosas a la vez ──────────────────────────
 *
 * El reparto **y** el total. Nunca uno sin el otro: el defecto que esta
 * pantalla hace visible —cobrar quince usuarios a 117.000 en vez de a
 * 141.000— es exactamente lo que se cuela cuando solo se enseña el total, y el
 * reparto sin total no le sirve al comercial que está cerrando la venta.
 *
 * La tabla dice, tramo a tramo, **cuántas unidades caen ahí** y **a qué
 * precio**; debajo va la cuenta: lo incluido, lo facturable, el recurrente y
 * —aparte, porque no es lo mismo— el pago único de puesta en marcha.
 *
 * ── Cuando la escalera está rota, se dice; no se completa con ceros ───────
 *
 * Un hueco entre tramos, dos tramos que se pisan o `includedQuantity`
 * distinto en cada fila hacen que el total **no sea el precio**. En ese caso
 * el aviso lo dice con las unidades concretas que nadie cubre y el total se
 * marca como incompleto, en vez de imprimir una cifra que se leería igual que
 * una buena (R14 de `docs/ux/reglas-de-interfaz.md`).
 *
 * ── Todo es front: ni un endpoint nuevo ───────────────────────────────────
 *
 * Las filas salen de `/catalog-prices`, que esta pantalla ya consume. Ver
 * `useTierSimulator.ts` para por qué se descargan todas las páginas de la
 * tarifa y no solo la visible.
 *
 * ── El chasis es `BridgeSection`, y no por casualidad ─────────────────────
 *
 * Pintar aquí la cabecera a mano —`{margin:0; color:var(--text);
 * font-size:var(--text-h3)}`— hacía que ese cuerpo apareciera en un CUARTO
 * componente y `npm run css:budget` lo rechazaba en el acto (techo: más de
 * tres componentes con el mismo cuerpo es una primitiva que falta). La
 * primitiva no se puede añadir a `primitives.css`, que es un fichero gemelo
 * TR-02; el chasis de la feature ya existía y ya declaraba exactamente esta
 * cabecera, así que este bloque es el cuarto que lo usa en vez de la cuarta
 * copia de su CSS.
 */
const props = defineProps<{ priceList: PriceListResponse }>()

const {
  loading,
  error,
  errorTraceId,
  catalogItemId,
  billingCycle,
  quantity,
  itemOptions,
  tiers,
  simulation,
  loadPrices,
  setCatalogItemId,
  setBillingCycle,
  setQuantity,
} = useTierSimulator()

const itemSelectOptions = computed(() =>
  itemOptions.value.map((option) => ({ value: option.id, label: option.label })),
)

const currency = computed(
  () =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: props.priceList.currency,
      maximumFractionDigits: 2,
    }),
)

function money(value: number) {
  return currency.value.format(value)
}

/** El aviso de escalera rota, con las unidades concretas. Vacío si está sana. */
const ladderProblems = computed(() => {
  const sim = simulation.value
  const problems: string[] = []
  for (const gap of sim.gaps) {
    problems.push(
      gap.from === gap.to
        ? `Ningún tramo cubre la unidad ${gap.from}.`
        : `Ningún tramo cubre las unidades ${gap.from} a ${gap.to}.`,
    )
  }
  if (sim.overlappingTiers) {
    problems.push('Dos tramos se pisan: hay unidades contadas dos veces en el total.')
  }
  if (sim.inconsistentIncluded) {
    problems.push(
      'Los tramos declaran cantidades incluidas distintas; se usa la del tramo más bajo.',
    )
  }
  if (sim.inconsistentSetup) {
    problems.push(
      'Los tramos declaran pagos de puesta en marcha distintos; se usa el del tramo más bajo.',
    )
  }
  return problems
})

async function reload(force = true) {
  try {
    await loadPrices(props.priceList.id, force)
  } catch {
    // El banner conserva el mensaje del servidor y su traza, con reintento.
  }
}

onMounted(reload)
watch(
  () => props.priceList.id,
  () => reload(),
)

// Al cambiar de tarifa, el artículo elegido puede no existir en la nueva.
watch(itemOptions, (options) => {
  const first = options[0]
  if (!first) {
    setCatalogItemId(null)
    return
  }
  if (!options.some((option) => option.id === catalogItemId.value)) {
    setCatalogItemId(first.id)
  }
})
</script>

<template>
  <BridgeSection
    title="Simulador de tramos"
    help="Cada unidad se cobra al precio del tramo en el que cae, no al del tramo que cubre el total. Escribe una cantidad y mira el reparto."
  >
    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill ds-stack ds-stack--8">
        <span>{{ error }}</span>
        <span v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="reload()">
        Reintentar
      </button>
    </div>

    <p v-else-if="loading" class="ds-meta">Cargando los precios de la tarifa…</p>

    <p v-else-if="itemSelectOptions.length === 0" class="ds-empty ds-empty--boxed">
      <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" aria-hidden="true" />
      Esta tarifa todavía no tiene precios, así que no hay ninguna escalera que simular.
    </p>

    <template v-else>
      <div class="controles">
        <AppSelect
          :model-value="catalogItemId"
          :options="itemSelectOptions"
          label="Artículo"
          placeholder="Elige un artículo"
          @update:model-value="setCatalogItemId($event)"
        />
        <AppSelect
          :model-value="billingCycle"
          :options="BILLING_CYCLE_OPTIONS"
          label="Ciclo"
          @update:model-value="setBillingCycle($event)"
        />
        <AppInput
          :model-value="quantity"
          label="Cantidad"
          type="number"
          inputmode="numeric"
          hint="Unidades contratadas, incluidas las que van de regalo."
          @update:model-value="setQuantity(Number($event))"
        />
      </div>

      <p v-if="tiers.length === 0" class="ds-empty ds-empty--boxed">
        <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" aria-hidden="true" />
        Este artículo no tiene precios para el ciclo
        {{ billingCycle === 'MONTHLY' ? 'mensual' : 'anual' }} en esta tarifa.
      </p>

      <template v-else>
        <div v-if="ladderProblems.length > 0" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill ds-stack ds-stack--8">
            <span class="ds-text-strong">
              La escalera de este artículo está incompleta: el total de abajo no es el precio.
            </span>
            <span v-for="problem in ladderProblems" :key="problem">{{ problem }}</span>
          </span>
        </div>

        <AppTable
          :headers="['Tramo', 'Unidades', 'Precio por unidad', 'Subtotal']"
          :empty="simulation.lines.length === 0"
        >
          <template #empty>
            <p class="ds-empty ds-empty--boxed">
              <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" aria-hidden="true" />
              Con esta cantidad no se factura ninguna unidad: las
              {{ simulation.includedQuantity }} primeras van incluidas.
            </p>
          </template>

          <tr v-for="line in simulation.lines" :key="line.tierMin" class="ds-row-hover">
            <td class="ds-text-strong">{{ tierRangeLabel(line.tierMin, line.tierMax) }}</td>
            <td class="ds-num">{{ line.units }}</td>
            <td class="ds-num">{{ money(line.unitAmount) }}</td>
            <td class="ds-num ds-text-strong">{{ money(line.subtotal) }}</td>
          </tr>
        </AppTable>

        <dl class="cuenta">
          <div class="linea">
            <dt>Cantidad pedida</dt>
            <dd class="ds-num">{{ simulation.quantity }}</dd>
          </div>
          <div class="linea">
            <dt>Incluidas sin cargo</dt>
            <dd class="ds-num">{{ simulation.includedQuantity }}</dd>
          </div>
          <div class="linea">
            <dt>Unidades facturables</dt>
            <dd class="ds-num">{{ simulation.billableQuantity }}</dd>
          </div>
          <div class="linea linea--total">
            <dt>Total {{ billingCycle === 'MONTHLY' ? 'mensual' : 'anual' }}</dt>
            <dd class="ds-num">{{ money(simulation.recurringTotal) }}</dd>
          </div>
          <div v-if="simulation.setupTotal > 0" class="linea">
            <dt>Puesta en marcha (pago único, aparte del recurrente)</dt>
            <dd class="ds-num">{{ money(simulation.setupTotal) }}</dd>
          </div>
        </dl>

        <p v-if="!simulation.complete" class="ds-meta">
          Ese total no cubre {{ simulation.uncoveredUnits }} de las
          {{ simulation.billableQuantity }} unidades facturables: es una suma parcial, no el precio.
        </p>
      </template>
    </template>
  </BridgeSection>
</template>

<style scoped>
.controles {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-12);
}

.cuenta {
  margin: 0;
}

.linea {
  display: flex;
  justify-content: space-between;
  gap: var(--space-16);
  padding: var(--space-6) 0;
}

.linea--total {
  border-top: 1px solid var(--border);
  font-weight: var(--weight-medium);
}

.linea dt,
.linea dd {
  margin: 0;
}

@media (width <= 680px) {
  .controles {
    grid-template-columns: 1fr;
  }
}
</style>
