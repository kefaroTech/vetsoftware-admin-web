<script setup lang="ts">
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * El contrato de una fila: un número, pero <b>navegable y con nombre accesible</b>.
 *
 * <p>Hermana de `CompanyRef` y con el mismo criterio: la fila trae `companyId` y
 * `subscriptionId`, que es justo el par que pide `/suscripciones/:companyId/:id`,
 * y sin embargo el identificador se pintaba como texto plano. La pregunta que
 * vertebra el bloque del dinero —«¿por qué se le facturaron 179.000?»— se
 * responde en el expediente del contrato; desde la fila que muestra esos 179.000
 * no había camino, así que el operador copiaba el número, iba al listado de
 * contratos, filtraba y volvía.
 *
 * <p><b>Nace en «Vigilancia de solapes»</b>, que es la pantalla que detecta
 * artículos cobrados dos veces y la que peor se podía permitir un identificador
 * muerto. Los otros cuatro sitios que pintan `#{{ subscriptionId }}` a mano
 * —`DocumentIdentityCard`, `BillingDocumentsTable`, `PaymentAttemptsTable`
 * (ahí es `billingDocumentId`, otra ruta) y `EntitlementsTable`— siguen sin
 * migrar: son de la tanda de D-05 y no de esta.
 *
 * <p><b>Sin CSS nuevo.</b> `.enlace` es local y solo fija `font-variant-numeric`,
 * igual que en `CompanyRef`: son tres declaraciones de geometría tipográfica, no
 * una primitiva reescrita.
 */
defineProps<{ companyId: number; subscriptionId: number }>()
</script>

<template>
  <RouterLink
    class="enlace"
    :to="{
      name: ROUTE_NAMES.SUBSCRIPTION_RECORD,
      params: { companyId, id: subscriptionId },
    }"
    :aria-label="`Contrato ${subscriptionId} de la empresa ${companyId}`"
  >
    #{{ subscriptionId }}
  </RouterLink>
</template>

<style scoped>
.enlace {
  font-variant-numeric: tabular-nums;
}
</style>
