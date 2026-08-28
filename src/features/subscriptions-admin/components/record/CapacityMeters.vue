<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { capacityText, capacityTitle } from '../../composables/entitlementText'
import type { CompanyCapacityResponse } from '../../types/entitlements.types'

/**
 * Las capacidades: lo que no es una pantalla sino una cantidad — «7 de 10
 * usuarios».
 *
 * <p><b>`<progress>` nativo con su `<label>`, y ni una sola ARIA.</b> Lo dice
 * §4.4.2 y es literal: un `<progress>` con etiqueta ya expone rol, valor, mínimo
 * y máximo al lector de pantalla. Un `<div>` con `role="progressbar"` y tres
 * `aria-value*` a mano es más marcado para conseguir menos.
 *
 * <p><b>Y la barra nunca va sola.</b> El texto «7 de 10 usuarios» está siempre,
 * porque una barra al 70 % no se puede leer por teléfono ni contar en un correo
 * (§5.2: nada se comunica solo por forma o color).
 *
 * <p><b>Un límite nulo no es un límite de cero.</b> Cuando el contrato no declara
 * techo, la barra no se pinta —pintarla al 100 % sería inventar un límite— y el
 * texto dice «sin límite declarado».
 *
 * <p>Al agotarse, el aviso lleva la salida a mano: ampliar es añadir un artículo
 * al contrato, y eso vive en «Lo contratado». Si esa sub-vista aún no está
 * registrada, el aviso se pinta igual sin el enlace.
 */
const props = defineProps<{
  capacities: CompanyCapacityResponse[]
  companyId: number
  subscriptionId: number
}>()

const contractedTab = computed(() =>
  subscriptionRecordTabs.find((tab) => tab.segment === 'contratado'),
)

const contractedTarget = computed(() =>
  contractedTab.value
    ? {
        name: contractedTab.value.routeName,
        params: { companyId: String(props.companyId), id: String(props.subscriptionId) },
      }
    : null,
)

/** `null` cuando no hay techo declarado: es lo que decide si hay barra o no. */
function limitOf(capacity: CompanyCapacityResponse): number | null {
  return capacity.limitQuantity != null && capacity.limitQuantity > 0
    ? capacity.limitQuantity
    : null
}
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="capacidades-titulo">
    <h2 id="capacidades-titulo" class="ds-title">Capacidades</h2>

    <p v-if="capacities.length === 0" class="ds-meta">
      Esta empresa no tiene ninguna capacidad calculada: lo que tiene contratado no incluye
      contadores de usuarios, sedes ni terminales.
    </p>

    <ul v-else class="ds-list-reset ds-stack ds-stack--14">
      <li v-for="capacity in capacities" :key="capacity.id" class="ds-stack ds-stack--8">
        <label class="ds-label" :for="`capacidad-${capacity.id}`">
          {{ capacityTitle(capacity.dimensionCode) }}
        </label>

        <progress
          v-if="limitOf(capacity) !== null"
          :id="`capacidad-${capacity.id}`"
          class="medidor"
          :max="limitOf(capacity)!"
          :value="capacity.usedQuantity ?? 0"
        />

        <p class="ds-meta">{{ capacityText(capacity) }}</p>

        <div
          v-if="capacity.exhausted"
          class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush"
          role="status"
        >
          <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Se agotó. La empresa no puede añadir más
            {{ capacityTitle(capacity.dimensionCode).toLowerCase() }} hasta que se amplíe la
            cantidad contratada. Lo que ya tiene sigue funcionando.
          </span>
          <RouterLink
            v-if="contractedTarget"
            class="ds-btn ds-btn--ghost ds-btn--sm"
            :to="contractedTarget"
          >
            <component :is="ICONS.ADD" :size="14" />
            Ampliar en «Lo contratado»
          </RouterLink>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.medidor {
  width: 100%;
  height: var(--space-8);
}
</style>
