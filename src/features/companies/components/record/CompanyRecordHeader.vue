<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { formatDate } from '@/composables/format'
import type { CompanyResponse } from '../../types/companies.types'

/**
 * <b>La identidad de la empresa, permanente y en las diez sub-vistas.</b>
 *
 * <p>No es decoración. Las sub-vistas del expediente leen y escriben datos de
 * <i>una</i> empresa mandando la cabecera `X-Company-Id`, que es invisible en la
 * petición; la respuesta de diseño a esa cabecera invisible es esta cabecera
 * visible. Mientras el expediente esté abierto, en pantalla pone sobre qué
 * empresa se está trabajando, y por eso vive en el armazón —encima del
 * `RouterView`— y no dentro de ninguna sub-vista.
 *
 * <p>El `<h1>` es el nombre de la empresa porque es lo que identifica el
 * expediente; cada sub-vista abre con su `<h2>`. Lleva `tabindex="-1"` para poder
 * recibir el foco tras una escritura que repinta la cabecera.
 *
 * <p><b>Ni una cifra que no venga del servidor</b> (R14). La ciudad, el
 * identificador fiscal y la fecha de alta salen de `CompanyResponse`; el
 * identificador y la dirección son nulables en el contrato, así que cada uno se
 * pinta solo si está.
 */
defineProps<{ company: CompanyResponse }>()
</script>

<template>
  <header class="ds-stack ds-stack--10">
    <RouterLink
      class="ds-btn ds-btn--plain ds-btn--sm volver"
      :to="{ name: ROUTE_NAMES.COMPANIES_LIST }"
    >
      <component :is="ICONS.BACK" :size="14" />
      Empresas
    </RouterLink>

    <div class="titular ds-flex-row">
      <h1 id="company-record-title" class="ds-display--xs nombre" tabindex="-1">
        {{ company.name }}
      </h1>
      <AppBadge
        :label="company.enabled ? 'Habilitada' : 'Deshabilitada'"
        :variant="company.enabled ? 'success' : 'danger'"
      />
    </div>

    <p class="ds-meta identidad">
      <span class="ds-text-strong">NIT {{ company.identifier }}</span>
      · {{ company.city.name }} · empresa #{{ company.id }} · alta el
      {{ formatDate(company.createdDate) }}
    </p>
  </header>
</template>

<style scoped>
.volver {
  align-self: flex-start;
}

/* `.ds-flex-row` ya pone `display/align-items/gap`: aquí solo lo que le falta,
   que es poder partirse en pantalla estrecha sin recortar el distintivo. */
.titular {
  flex-wrap: wrap;
}

.nombre {
  margin: 0;
}

.identidad {
  margin: 0;
}
</style>
