<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import { RECORD_LINK_PARAMS, recordLinkQuery } from '../../composables/useRecordLink'
import {
  accessLevelPresentation,
  entitlementJustification,
  justificationLinkLabel,
  sourcePresentation,
} from '../../composables/entitlementText'
import type { CompanyEntitlementResponse, EntitlementScope } from '../../types/entitlements.types'

/**
 * La tabla derivada de `/acceso`: un submódulo por fila, con el nivel que tiene
 * hoy, de dónde sale y <b>qué línea del contrato lo justifica</b>.
 *
 * <p><b>Ni una sola celda editable.</b> No hay «Editar» ni deshabilitado ni
 * oculto: la operación no existe, así que no está en el marcado (§3.2). El nivel
 * de acceso no es un campo, es un resultado — y `<input disabled>` diría
 * «editable, pero ahora no», que es mentira dos veces.
 *
 * <p><b>Ningún nivel se comunica solo por color</b> (§5.2). Los tres llevan
 * rótulo textual dentro del badge, y su significado completo vive en la leyenda
 * que la vista pinta encima: repetir «consulta e impresión activas, no puede
 * crear ni modificar» en cada una de treinta filas es ruido, pero no decirlo en
 * ninguna parte es dejar que alguien lo cuente mal por teléfono.
 *
 * <p><b>El puente de vuelta al dinero, recorrible.</b> Cada fila que sale de una
 * línea de contrato enlaza a «Lo contratado» del contrato que la paga —el suyo,
 * no el del expediente abierto: los permisos son de la empresa y una empresa
 * puede tener varios contratos— y lleva `?item=` para que esa sub-vista pueda
 * señalar la línea. Si «Lo contratado» todavía no está registrada, la celda pinta
 * el mismo texto <b>sin enlace</b>: un enlace a una ruta que no existe es peor
 * que no ofrecer la salida. Es la misma disciplina que ya usa
 * `SubscriptionStatusBanner` con «Registrar pago».
 *
 * <p>`CORE` y `MANUAL_GRANT` no tienen línea detrás —`chk_company_entitlements_origin`
 * solo se la exige a `SUBSCRIPTION` y `TRIAL`— y por eso su celda es una frase y
 * no un enlace muerto.
 */
defineProps<{
  rows: CompanyEntitlementResponse[]
  scope: EntitlementScope
  loading: boolean
  error: string | null
  errorTraceId: string | null
  /**
   * La línea del contrato desde la que se llegó (`?item=`), si se llegó por un
   * enlace de «Lo contratado». Se señalan <b>con texto</b> las filas que esa línea
   * justifica —una línea puede abrir varios submódulos—, nunca con un tono de
   * fondo: aquí lo señalado es justo lo que se vino a ver, y un matiz de color no
   * tiene nombre accesible ni se puede leer por teléfono.
   */
  highlightedItemId: number | null
}>()

defineEmits<{ retry: [] }>()

const contractedTab = computed(() =>
  subscriptionRecordTabs.find((tab) => tab.segment === 'contratado'),
)

/**
 * Destino del puente. Devuelve `null` cuando no se puede construir un enlace
 * honesto: sin la sub-vista registrada, o sin contrato al que apuntar.
 */
function lineTarget(row: CompanyEntitlementResponse) {
  const tab = contractedTab.value
  if (!tab || row.subscriptionId == null || row.subscriptionItemId == null) return null
  return {
    name: tab.routeName,
    params: { companyId: String(row.companyId), id: String(row.subscriptionId) },
    query: recordLinkQuery(RECORD_LINK_PARAMS.ITEM, row.subscriptionItemId),
  }
}
</script>

<template>
  <AppTable
    caption="Permisos que concede el contrato"
    :headers="['Submódulo', 'Nivel de acceso', 'Origen', 'Vigencia', 'Qué lo justifica']"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <p v-if="scope === 'current'">
        Esta empresa no tiene ningún permiso vigente. Si eso no cuadra con lo que tiene contratado,
        el recálculo es la reparación.
      </p>
      <p v-else>No hay ninguna fila calculada para esta empresa, ni vigente ni caducada.</p>
    </template>

    <!-- `id` estable como ancla de llegada y `tabindex="-1"` para poder recibir el
         foco: sin él `focus()` sobre un `<tr>` no hace nada. Negativo, así que no
         añade una parada de tabulación por fila. -->
    <tr
      v-for="row in rows"
      :id="`permiso-${row.id}`"
      :key="row.id"
      tabindex="-1"
      class="ds-row-hover ds-focus-ring"
    >
      <td>
        <span class="ds-text-strong">{{ row.subModule.name }}</span>
        <span class="ds-meta codigo">{{ row.subModule.code }}</span>
        <p
          v-if="highlightedItemId != null && row.subscriptionItemId === highlightedItemId"
          class="ds-pill ds-tone--accent senalada"
        >
          <component :is="ICONS.ARROW_RIGHT" :size="12" aria-hidden="true" />
          Lo abrió la línea desde la que llegaste
        </p>
      </td>

      <td>
        <AppBadge
          :variant="accessLevelPresentation(row.accessLevel).variant"
          :label="accessLevelPresentation(row.accessLevel).label"
        />
      </td>

      <td>
        <AppBadge
          :variant="sourcePresentation(row.source).variant"
          :label="sourcePresentation(row.source).label"
        />
        <!-- `MANUAL_GRANT` es lo único de esta tabla que NO se deriva del
             contrato, y el recálculo lo preserva a propósito. El badge ámbar lo
             separa del resto y esta frase dice por qué, sin que haya que ir a la
             leyenda a buscarlo. -->
        <span v-if="row.source === 'MANUAL_GRANT'" class="ds-meta codigo">
          No se deriva del contrato.
        </span>
      </td>

      <td>
        {{ formatDate(row.validFrom) }} →
        {{ row.validUntil ? formatDate(row.validUntil) : 'sin fecha de fin' }}
      </td>

      <td>
        <RouterLink
          v-if="lineTarget(row)"
          class="enlace"
          :to="lineTarget(row)!"
          :aria-label="justificationLinkLabel(row)"
        >
          {{ entitlementJustification(row).text }}
          <component :is="ICONS.ARROW_UP_RIGHT" :size="13" />
        </RouterLink>
        <span v-else>{{ entitlementJustification(row).text }}</span>

        <span
          v-if="row.subscriptionId != null && row.subscriptionItemId != null"
          class="ds-meta codigo"
        >
          Contrato #{{ row.subscriptionId }}
        </span>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.codigo {
  display: block;
}

.senalada {
  margin: var(--space-4) 0 0;
}

.enlace {
  display: inline-flex;
  gap: var(--space-4);
  align-items: center;
  font-weight: var(--weight-semibold);
}
</style>
