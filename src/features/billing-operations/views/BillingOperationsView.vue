<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { BILLING_ROUTE_NAMES } from '@/router/routes/billing-operations.routes'

/**
 * El armazón de `/cobranza`: encabezado, las ocho pestañas y poco más.
 *
 * <p><b>Eran cuatro y ahora son ocho</b>: el circuito del dinero añadió intentos de
 * cobro, devoluciones, reversiones y saldo a favor. Van aquí y no en una sección
 * propia porque son el mismo trabajo — quien mira un documento vencido tiene que
 * poder saltar a los intentos que fallaron sobre él sin cambiar de pantalla.
 * «Intentos de cobro» va junto a «Pagos» y antes de «Gestión de mora» a propósito:
 * ese es el orden real de los hechos, y un intento fallido por <b>error nuestro</b>
 * no debería llegar nunca a la pestaña siguiente.
 *
 * <p><b>`/cobranza` abre en «Pendiente de facturar», no en un resumen.</b> El
 * motivo está en el modelo: los documentos atascados esperando la referencia
 * externa son, literalmente, la lista de trabajo de alguien cada mes. Un panel
 * de indicadores no le dice a nadie qué hacer a continuación.
 *
 * <p><b>Las pestañas son RUTAS, no un `role="tablist"`</b> (§2.2). Cuatro
 * razones, todas verificables: no hay que implementar el contrato de teclado del
 * patrón Tabs del APG —un `<nav>` de enlaces ya tiene su semántica—; soporte
 * puede pegar la URL de «Pagos» en un ticket; el presupuesto de SFC
 * (`maxSfcLines: 500`) no aguanta cuatro paneles en un fichero; y cada sub-vista
 * es un fichero propio. El patrón exacto —`RouterLink custom` + `isActive`
 * gobernando a la vez la clase y `aria-current`— se copia de
 * `AppSidebar.vue:224-247` en vez de inventarse otro.
 *
 * <p>La geometría de la pestaña la pone este componente; el ESTADO ACTIVO lo
 * pone `.ds-tab--active` (`primitives.css:1422`), que ya existe. No se inventa
 * una primitiva de pestaña nueva.
 */
const TABS = [
  { name: BILLING_ROUTE_NAMES.AWAITING_EXTERNAL, label: 'Pendiente de facturar' },
  { name: BILLING_ROUTE_NAMES.OVERDUE, label: 'Vencidos' },
  { name: BILLING_ROUTE_NAMES.PAYMENTS, label: 'Pagos' },
  { name: BILLING_ROUTE_NAMES.ATTEMPTS, label: 'Intentos de cobro' },
  { name: BILLING_ROUTE_NAMES.DUNNING, label: 'Gestión de mora' },
  { name: BILLING_ROUTE_NAMES.REFUNDS, label: 'Devoluciones' },
  { name: BILLING_ROUTE_NAMES.REVERSALS, label: 'Reversiones' },
  { name: BILLING_ROUTE_NAMES.CUSTOMER_CREDIT, label: 'Saldo a favor' },
] as const
</script>

<template>
  <AppLayout>
    <div class="ds-page ds-page--stack ds-page--wide">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Cobranza</h1>
          <!--
            Los tres verbos, nombrados. El modelo los separa a propósito y la
            interfaz no los mezcla: quien lea «facturación» a secas acabará
            creyendo que devengar y cobrar son lo mismo.
          -->
          <p class="ds-meta">
            <strong>Devengar</strong> es que el servicio se prestó · <strong>facturar</strong> es
            que se emitió el documento · <strong>cobrar</strong> es que entró la plata. Aquí se
            trabaja lo facturado y lo cobrado; lo devengado se ve en el expediente de cada contrato.
          </p>
        </div>
      </div>

      <nav class="pestanas" aria-label="Secciones de cobranza">
        <RouterLink
          v-for="tab in TABS"
          :key="tab.name"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: tab.name }"
          custom
        >
          <a
            :href="href"
            class="pestana"
            :class="{ 'ds-tab--active': isActive }"
            :aria-current="isActive ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </nav>

      <RouterView />
    </div>
  </AppLayout>
</template>

<style scoped>
.pestanas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  border-bottom: 1px solid var(--border);
}

/* §2.5.8 · 24 px de alto efectivo como mínimo: el padding vertical de 10 px
   sobre una línea de texto lo supera con margen. */
.pestana {
  padding: var(--space-10) var(--space-14);
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: var(--text-body);
  text-decoration: none;
}

.pestana:hover {
  color: var(--text);
}
</style>
