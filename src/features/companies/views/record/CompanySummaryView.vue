<script setup lang="ts">
import { watch } from 'vue'
import { useCompanyRecord } from '../../composables/useCompanyRecord'
import { useCompanySummary } from '../../composables/useCompanySummary'
import ContractCard from '../../components/record/summary/ContractCard.vue'
import CommercialStateCard from '../../components/record/summary/CommercialStateCard.vue'
import ReceivablesCard from '../../components/record/summary/ReceivablesCard.vue'
import TrialCard from '../../components/record/summary/TrialCard.vue'
import CapacityCard from '../../components/record/summary/CapacityCard.vue'
import AccessCard from '../../components/record/summary/AccessCard.vue'

/**
 * <b>I2 · `/empresas/:id/resumen` — lo que soporte necesita en cinco segundos.</b>
 *
 * <p>Seis tarjetas: contrato, estado comercial, cartera, ventana de prueba, cupos
 * y acceso. Es la sub-vista por defecto del expediente porque es la que responde
 * la pregunta con la que se abre un ticket —«¿quién es esta clínica y qué le
 * pasa?»— antes de decidir a qué otra pestaña ir.
 *
 * <p><b>Esta vista no tiene lógica.</b> Las dos peticiones y los contadores
 * derivados están en `useCompanySummary`, y cada tarjeta es su propio SFC. La
 * especificación marcaba esta pantalla como candidata a pasarse del techo de 500
 * líneas por SFC: partirla desde el primer commit cuesta seis ficheros de
 * cincuenta líneas; partirla después cuesta reescribirla.
 *
 * <p><b>No recarga la empresa</b>: la tiene el armazón, que no monta esta vista
 * hasta haberla cargado. Sí recarga lo suyo cada vez que se abre, y también al
 * saltar de una empresa a otra sin desmontar —de ahí el `watch` sobre
 * `companyId`—, que es la regla obligatoria de recarga al abrir pantalla.
 *
 * <p>La región `role="status"` es la que tiene las palabras mientras las tarjetas
 * enseñan sus barras grises: un esqueleto no significa nada leído en voz alta.
 */
const { companyId } = useCompanyRecord()
const {
  subscription,
  hasNoContract,
  loadingContract,
  contractError,
  loadingAccess,
  accessError,
  capacities,
  exhaustedCapacities,
  entitlementCount,
  manualGrantCount,
  load,
} = useCompanySummary()

watch(
  companyId,
  (next) => {
    if (next != null) void load(next)
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="companyId != null" class="ds-stack ds-stack--14">
    <h2 class="ds-title">Resumen</h2>

    <p class="ds-sr-only" role="status">
      {{ loadingContract || loadingAccess ? 'Cargando el resumen de la empresa…' : '' }}
    </p>

    <div class="tarjetas">
      <ContractCard
        :subscription="subscription"
        :has-no-contract="hasNoContract"
        :loading="loadingContract"
        :error="contractError"
        :company-id="companyId"
      />
      <CommercialStateCard />
      <ReceivablesCard
        :subscription="subscription"
        :has-no-contract="hasNoContract"
        :loading="loadingContract"
        :error="contractError"
        :company-id="companyId"
      />
      <TrialCard
        :subscription="subscription"
        :has-no-contract="hasNoContract"
        :loading="loadingContract"
        :error="contractError"
        :company-id="companyId"
      />
      <CapacityCard
        :capacities="capacities"
        :exhausted="exhaustedCapacities"
        :loading="loadingAccess"
        :error="accessError"
        :company-id="companyId"
      />
      <AccessCard
        :entitlement-count="entitlementCount"
        :manual-grant-count="manualGrantCount"
        :subscription="subscription"
        :loading="loadingAccess"
        :error="accessError"
        :company-id="companyId"
      />
    </div>
  </section>
</template>

<style scoped>
/* Tres columnas en escritorio, dos en tableta y una en móvil, sin escribir tres
   media queries: el ancho mínimo de tarjeta es el que decide cuántas caben.
   No se usa `.ds-grid-2` porque son seis tarjetas cortas y a dos columnas la
   rejilla queda tres pantallas de alto — el valor de esta vista es que se lee de
   una sola mirada. */
.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-14);
}
</style>
