<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useCompanyNames } from '@/features/companies/composables/useCompanyNames'

/**
 * La empresa de una fila: un número, **navegable, con nombre accesible y —cuando
 * se puede— con el nombre de verdad**.
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
 * ── El nombre, resuelto en cliente ────────────────────────────────────────
 *
 * <p>Aquí decía: «no se resuelve el nombre con una llamada por fila: 20
 * peticiones por página es peor que el problema». Seguía siendo verdad
 * <b>sin caché</b>. `useCompanyNames` (store de Pinia, cacheado por sesión y con
 * deduplicación de peticiones en vuelo) quita esa objeción: la primera página
 * paga una petición por empresa <i>distinta</i>, y la página 2 y las otras nueve
 * pantallas del bloque pagan <b>cero</b>, porque las mismas clínicas se repiten.
 *
 * <p><b>Este es el fichero que cambia y son catorce pantallas las que mejoran</b>:
 * los 14 sitios que ya montaban `CompanyRef` no se tocan.
 *
 * <p><b>Los dos huecos se pintan igual y ninguno inventa nada</b> (R14):
 * mientras el nombre viaja, y también si no se pudo resolver (403/404/red), la
 * celda dice `#42` — lo mismo que decía antes de todo esto. Sin esqueleto, sin
 * «(desconocida)» que parezca dato, y si el endpoint se cae la pantalla queda
 * exactamente como estaba.
 *
 * <p><b>Por qué `watch` y no solo `onMounted`.</b> Estas filas viven en `v-for`
 * con clave por id de la fila, no por empresa: al pasar de página Vue reutiliza
 * la instancia y solo cambia el prop. Con `onMounted` a secas, la página 2
 * enseñaría los nombres de la 1.
 */
const props = defineProps<{ companyId: number }>()

const { nameOf, ensure } = useCompanyNames()

const name = computed(() => nameOf(props.companyId))

/**
 * El nombre accesible. Con nombre resuelto dice «Clínica Norte, empresa 42» —el
 * nombre primero, porque es lo que el operador busca—; sin él, el «Empresa 42»
 * de siempre, que ya evitaba que el lector de pantalla anunciara «almohadilla
 * cuarenta y dos» (R04 · WCAG 2.2 §4.1.2).
 */
const etiqueta = computed(() =>
  name.value ? `${name.value}, empresa ${props.companyId}` : `Empresa ${props.companyId}`,
)

watch(() => props.companyId, resolver)
onMounted(resolver)

function resolver() {
  void ensure([props.companyId])
}
</script>

<template>
  <RouterLink
    class="enlace"
    :to="{ name: ROUTE_NAMES.COMPANY_DETAIL, params: { id: companyId } }"
    :aria-label="etiqueta"
  >
    <template v-if="name">
      <span>{{ name }}</span>
      <span class="ds-meta numero">#{{ companyId }}</span>
    </template>
    <span v-else class="numero">#{{ companyId }}</span>
  </RouterLink>
</template>

<style scoped>
.enlace {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-6);
}

.numero {
  font-variant-numeric: tabular-nums;
}
</style>
