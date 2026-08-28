<script setup lang="ts">
import { computed, watch } from 'vue'
import { ICONS } from '@/constants/icons'
import { useCompanyRecord } from '../../composables/useCompanyRecord'
import { useCompanyFiscal } from '../../composables/useCompanyFiscal'
import MissingDataNote from '../../components/record/MissingDataNote.vue'
import CardState from '../../components/record/summary/CardState.vue'
import TaxProfileCard from '../../components/record/fiscal/TaxProfileCard.vue'
import NumberingResolutionCard from '../../components/record/fiscal/NumberingResolutionCard.vue'
import WithholdingRatesCard from '../../components/record/fiscal/WithholdingRatesCard.vue'
import {
  FISCAL_MISSING_DATA_TITLE,
  NO_RESOLUTIONS_TEXT,
  PAYMENT_MANDATE_GAP,
  resolutionsSummaryText,
} from '../../composables/companyFiscalText'

/**
 * <b>I7 · `/empresas/:id/fiscal` — con qué datos factura esta clínica, y hasta
 * cuándo puede hacerlo.</b>
 *
 * <p>Cuatro bloques, y solo tres tienen datos detrás:
 *
 * <ol>
 *   <li><b>Perfil de facturación</b> — `GET /company-tax-profile`. De solo
 *       lectura, a propósito: ver `TaxProfileCard.vue`.</li>
 *   <li><b>Resoluciones de numeración</b> — `GET /numbering-resolutions`, con los
 *       dos relojes que deciden si mañana sale una factura: la caducidad y el
 *       rango.</li>
 *   <li><b>Retenciones esperadas</b> — `GET /withholding-configs`, tres tarifas
 *       cuyas unidades no coinciden entre sí.</li>
 *   <li><b>Medio de pago y mandato</b> — <b>no existe</b> en el contrato, y por eso
 *       es un hueco que habla en vez de un bloque en blanco.</li>
 * </ol>
 *
 * <p><b>Esta vista no tiene lógica.</b> Las tres peticiones, las cuentas de cada
 * resolución y su orden por urgencia están en `useCompanyFiscal`, y cada bloque es
 * su propio SFC — el techo de 500 líneas por componente se respeta partiendo desde
 * el primer commit, que cuesta cuatro ficheros cortos, y no después, que cuesta
 * reescribirla.
 *
 * <p><b>No recarga la empresa</b>: la tiene el armazón, que no monta esta vista
 * hasta haberla cargado. Sí recarga lo suyo cada vez que se abre, y también al
 * saltar de una empresa a otra sin desmontar —de ahí el `watch` sobre
 * `companyId`—, que es la regla obligatoria de recarga al abrir pantalla. Aquí eso
 * importa más que en otras pestañas: un NIT ajeno pintado medio segundo es el dato
 * que alguien copia en un correo.
 *
 * <p>La región `role="status"` es la que tiene las palabras mientras los bloques
 * enseñan sus barras grises: un esqueleto no significa nada leído en voz alta.
 */
const { companyId } = useCompanyRecord()
const {
  profile,
  hasNoProfile,
  loadingProfile,
  profileError,
  resolutionRows,
  resolutionsNeedingAttention,
  loadingResolutions,
  resolutionsError,
  withholding,
  hasNoWithholding,
  loadingWithholding,
  withholdingError,
  load,
} = useCompanyFiscal()

const cargando = computed(
  () => loadingProfile.value || loadingResolutions.value || loadingWithholding.value,
)

/**
 * El titular de la sección de numeración. Se pinta como aviso en tono ámbar solo
 * cuando hay algo que avisar; si no, es una línea de contexto. El detalle de qué
 * le pasa a cuál lo lleva cada tarjeta, que es donde se puede actuar.
 */
const resumenResoluciones = computed(() =>
  resolutionsSummaryText(resolutionRows.value.length, resolutionsNeedingAttention.value),
)

watch(
  companyId,
  (next) => {
    if (next != null) void load(next)
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="companyId != null" class="ds-stack ds-stack--18">
    <h2 class="ds-title">Fiscal</h2>

    <p class="ds-sr-only" role="status">
      {{ cargando ? 'Cargando el perfil fiscal de la empresa…' : '' }}
    </p>

    <TaxProfileCard
      :profile="profile"
      :has-no-profile="hasNoProfile"
      :loading="loadingProfile"
      :error="profileError"
    />

    <section class="ds-card ds-stack ds-stack--14">
      <h3 class="ds-item-label ds-item-label--lg titulo">Resolución de numeración</h3>

      <CardState :loading="loadingResolutions" :error="resolutionsError">
        <p
          v-if="resolutionsNeedingAttention > 0"
          class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush"
          role="status"
        >
          <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            {{ resumenResoluciones }} Una resolución nueva se pide a la DIAN: enterarse el día en
            que una factura no sale es enterarse tarde.
          </span>
        </p>
        <p v-else class="ds-meta parrafo">{{ resumenResoluciones }}</p>

        <p v-if="resolutionRows.length === 0" class="parrafo">{{ NO_RESOLUTIONS_TEXT }}</p>

        <div v-else class="resoluciones">
          <NumberingResolutionCard
            v-for="row in resolutionRows"
            :key="row.resolution.id"
            :row="row"
          />
        </div>
      </CardState>
    </section>

    <WithholdingRatesCard
      :withholding="withholding"
      :has-no-withholding="hasNoWithholding"
      :loading="loadingWithholding"
      :error="withholdingError"
    />

    <section class="ds-card ds-stack ds-stack--14">
      <h3 class="ds-item-label ds-item-label--lg titulo">Medio de pago</h3>
      <MissingDataNote
        :title="FISCAL_MISSING_DATA_TITLE"
        :what="PAYMENT_MANDATE_GAP.what"
        :why="PAYMENT_MANDATE_GAP.why"
        :blocked-by="PAYMENT_MANDATE_GAP.blockedBy"
      />
    </section>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
}

.parrafo {
  margin: 0;
}

/* Dos columnas en escritorio y una en móvil sin escribir media queries: el ancho
   mínimo de tarjeta decide cuántas caben. Son pocas y anchas —cada una lleva una
   barra de consumo— así que el mínimo es mayor que el de las tarjetas del
   resumen. */
.resoluciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-14);
}
</style>
