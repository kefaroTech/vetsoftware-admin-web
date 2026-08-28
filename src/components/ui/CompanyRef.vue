<script setup lang="ts">
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * La empresa de una fila: un número, pero **navegable y con nombre accesible**.
 *
 * <p><b>Vive en `components/ui/` y no en una feature</b> desde que dejó de ser
 * cosa de cobranza. Nació en `features/billing-operations/components/` para las
 * tres tablas de allí; hoy lo consume también todo lo que lista filas de varias
 * empresas a la vez. Una pieza compartida por varias features no puede vivir
 * dentro de una de ellas: obligaría a cada pantalla nueva a importar desde el
 * directorio de otro equipo, que es exactamente la colisión que la mudanza
 * evita. Los tres importadores originales —`BillingDocumentsTable`,
 * `DunningEventsTable`, `PaymentsTable`— apuntan ya aquí.
 *
 * <p>⚠️ Mitigación de un hueco del contrato, no una decisión de diseño.
 * `BillingDocumentResponse`, `SubscriptionPaymentResponse` y `DunningEventResponse`
 * exponen `companyId: integer` y nada más, mientras `QuoteSummaryResponse` sí
 * trae `company: CompanySummary {id, name, identifier}`. El contrato es
 * inconsistente consigo mismo y convierte la lista de trabajo del cierre de mes
 * en una columna de números opacos (issue B-1).
 *
 * <p><b>No se resuelve el nombre con una llamada por fila</b>: 20 peticiones por
 * página es peor que el problema. Lo que sí se hace es que el número lleve a
 * algún sitio y que el lector de pantalla anuncie «Empresa 42» en vez de
 * «almohadilla cuarenta y dos» (R04 · WCAG 2.2 §4.1.2).
 */
defineProps<{ companyId: number }>()
</script>

<template>
  <RouterLink
    class="enlace"
    :to="{ name: ROUTE_NAMES.COMPANY_DETAIL, params: { id: companyId } }"
    :aria-label="`Empresa ${companyId}`"
  >
    #{{ companyId }}
  </RouterLink>
</template>

<style scoped>
.enlace {
  font-variant-numeric: tabular-nums;
}
</style>
