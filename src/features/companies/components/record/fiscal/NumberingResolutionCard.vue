<script setup lang="ts">
import { computed } from 'vue'
import CapacityMeter from '@/components/ui/CapacityMeter.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import FiscalFact from './FiscalFact.vue'
import {
  ELECTRONIC_DOCUMENT_TYPE_LABEL,
  formatResolutionRange,
} from '../../../composables/companyFiscalText'
import type { ResolutionRow } from '../../../composables/useCompanyFiscal'

/**
 * <b>Una resolución de numeración</b>, con sus dos relojes: el que caduca y el que
 * se agota (§I7).
 *
 * <p><b>Por qué una tarjeta y no una fila de tabla.</b> Una clínica tiene entre una
 * y cuatro resoluciones, y de cada una no hay que ver un valor sino un estado
 * compuesto —rango, consumo, vigencia y hasta dos avisos—. En una tabla eso son
 * siete columnas de las que cinco van vacías la mayor parte del tiempo, y la barra
 * de consumo se queda sin sitio. Con tan pocas filas, la tarjeta gana.
 *
 * <p><b>La barra la pone `CapacityMeter`</b>, que ya sabe lo difícil: acotar el
 * valor al máximo, no pintar barra cuando no hay techo declarado y llevar SIEMPRE
 * el texto al lado, porque un 94 % no se puede leer por teléfono.
 *
 * <p><b>Aquí no se calcula nada.</b> Los emitidos, los que quedan, los días y los
 * avisos llegan ya hechos desde `useCompanyFiscal`, que a su vez usa las funciones
 * puras de `companyFiscalText` —que son las que la prueba barre—. Un SFC no es
 * sitio para una cuenta cuyo signo decide si una clínica se entera de que se está
 * quedando sin números.
 *
 * <p><b>No hay columna de estado.</b> El listado del backend solo devuelve las
 * resoluciones no retiradas (`@SQLRestriction("enabled = true")`), así que un
 * distintivo «Activa» diría siempre lo mismo: un dato inventado con cara de dato
 * (R14).
 */
const props = defineProps<{ row: ResolutionRow }>()

const resolution = computed(() => props.row.resolution)
const usage = computed(() => props.row.usage)

/**
 * Rojo cuando ya no se puede emitir —caducada o rango agotado— y ámbar cuando
 * todavía se puede pero queda poco. Son dos situaciones distintas: una es un
 * bloqueo presente, la otra es tiempo para reaccionar. El texto lo dice igual; el
 * tono solo acompaña (§5.2 · nada se comunica solo por forma o color).
 */
const bloqueada = computed(() => usage.value.expired || usage.value.remaining === 0)

const vigencia = computed(
  () => `${formatDate(resolution.value.validFrom)} → ${formatDate(resolution.value.validTo)}`,
)
</script>

<template>
  <article class="ds-card ds-stack ds-stack--10">
    <header class="ds-stack ds-stack--8">
      <h4 class="ds-item-label ds-item-label--lg titulo">
        {{ ELECTRONIC_DOCUMENT_TYPE_LABEL[resolution.documentType] }}
      </h4>
      <p class="ds-meta parrafo">
        Resolución <span class="ds-num">{{ resolution.resolutionNumber }}</span> del
        {{ formatDate(resolution.resolutionDate) }}
      </p>
    </header>

    <dl class="ds-detail-grid lista">
      <FiscalFact label="Rango">
        <span class="ds-num">{{ formatResolutionRange(resolution) }}</span>
      </FiscalFact>

      <FiscalFact label="Vigencia">{{ vigencia }}</FiscalFact>

      <!-- La sede solo se nombra cuando la resolución es de una sede concreta.
           `branchId` nulo significa «de la empresa, para todas las sedes», y ese
           caso se dice con palabras en vez de dejarlo en blanco. El nombre de la
           sede no viaja en este contrato, así que se pinta el número — el mismo
           criterio de `CompanyRef`. -->
      <FiscalFact label="Alcance" wide>
        <span v-if="resolution.branchId === null">Toda la empresa</span>
        <span v-else
          >Sede <span class="ds-num">#{{ resolution.branchId }}</span></span
        >
      </FiscalFact>
    </dl>

    <CapacityMeter
      label="Números emitidos"
      unit="números"
      :used="usage.issued"
      :limit="usage.capacity"
    />

    <p class="ds-meta parrafo">
      Quedan <span class="ds-num">{{ usage.remaining }}</span> por emitir. El próximo será el
      <span class="ds-num">{{ resolution.currentNumber }}</span
      >.
    </p>

    <p
      v-for="aviso in row.warnings"
      :key="aviso"
      class="ds-banner ds-banner--sm ds-banner--flush"
      :class="bloqueada ? 'ds-banner--error' : 'ds-banner--warning'"
      role="status"
    >
      <component
        :is="bloqueada ? ICONS.ERROR : ICONS.WARNING"
        :size="15"
        class="ds-banner-icon"
        aria-hidden="true"
      />
      <span class="ds-flex-fill">{{ aviso }}</span>
    </p>
  </article>
</template>

<style scoped>
.titulo {
  margin: 0;
}

.parrafo {
  margin: 0;
}

.lista {
  margin: 0;
}
</style>
