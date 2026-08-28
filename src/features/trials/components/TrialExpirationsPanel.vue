<script setup lang="ts">
import { onMounted, watch } from 'vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useTrialExpirations } from '../composables/useTrialExpirations'
import { TRIAL_POLICY_OUTCOME_LABEL } from '../composables/trialWindowText'

/**
 * <b>El barrido de vencimientos</b> — `GET /system/company-trial-grants/
 * expirations?day=`.
 *
 * <p>Responde a la pregunta que ninguna pantalla de una sola empresa puede
 * contestar: <b>«¿a quién hay que llamar hoy?»</b>. Lista concesiones de todas
 * las empresas, así que cada fila lleva su `CompanyRef` y desde ahí se salta al
 * expediente de esa empresa.
 *
 * <p><b>Por qué es un componente y no una vista con ruta propia.</b> Este lote no
 * puede escribir en `src/router/`: el módulo de rutas y la barra lateral son
 * puntos de colisión de la campaña. Empaquetado así, el barrido está vivo —lo
 * monta la pestaña «Prueba» del expediente, arrancado en el último día de la
 * ventana que se está mirando, que es justo cuando la pregunta se hace— y el día
 * que exista la pantalla de plataforma se monta ahí sin tocar nada.
 *
 * <p><b>El día por defecto lo elige el anfitrión</b>, no este componente: desde
 * el expediente de una empresa, la pregunta útil es «qué más vence el día que
 * vence lo de esta empresa», y desde una pantalla de plataforma sería hoy. Es un
 * dato distinto en cada sitio, así que entra por prop en vez de decidirse aquí.
 */
const props = defineProps<{
  /** `yyyy-MM-dd` en la zona del negocio. Lo resuelve el anfitrión. */
  initialDay: string
  /** Qué empresa está mirando el anfitrión, para no repetirla como novedad. */
  currentCompanyId?: number | null
}>()

const { day, rows, companyCount, loading, error, errorTraceId, loadDay, shiftDay } =
  useTrialExpirations()

/** Recarga siempre al abrir la pantalla, y también si el día del anfitrión cambia. */
onMounted(() => void loadDay(props.initialDay))
watch(
  () => props.initialDay,
  (next) => void loadDay(next),
)

const HEADERS = ['Empresa', 'Artículo', 'Último día', 'Debía terminar en', 'Estado']
</script>

<template>
  <section class="ds-card ds-stack ds-stack--10" aria-labelledby="vencimientos-title">
    <div class="ds-block-head">
      <h2 id="vencimientos-title" class="ds-title">Qué vence ese día en toda la plataforma</h2>
    </div>

    <p class="ds-dialog-body">
      Las concesiones de prueba de <strong>todas</strong> las empresas cuyo último día es el
      elegido. Es la lista de a quién hay que llamar.
    </p>

    <div class="controles">
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="shiftDay(-1)">
        <component :is="ICONS.CHEVRON_LEFT" :size="14" />
        Día anterior
      </button>

      <AppInput
        :model-value="day ?? ''"
        label="Día"
        type="date"
        @update:model-value="loadDay(String($event))"
      />

      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="shiftDay(1)">
        Día siguiente
        <component :is="ICONS.CHEVRON_RIGHT" :size="14" />
      </button>
    </div>

    <!-- Cambio de consulta, no de datos: quien no ve la tabla necesita oír que
         lo de debajo ya no es lo mismo (WCAG 2.2 §4.1.3). -->
    <p class="ds-sr-only" role="status">
      {{
        loading
          ? 'Cargando los vencimientos…'
          : `${rows.length} concesiones de ${companyCount} empresas vencen el ${day ?? ''}.`
      }}
    </p>

    <AppTable
      :headers="HEADERS"
      :empty="rows.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="loadDay(day ?? initialDay)"
    >
      <template #empty>
        <AppEmptyState
          title="Ese día no vence ninguna prueba"
          :description="`Nada termina el ${day ? formatDate(day) : 'día elegido'}. Prueba con otro día.`"
        />
      </template>

      <tr v-for="row in rows" :key="row.grant.id" class="ds-row-hover">
        <td>
          <CompanyRef :company-id="row.grant.companyId" />
          <span v-if="row.grant.companyId === currentCompanyId" class="ds-meta esta">
            la que estás mirando
          </span>
        </td>
        <td>
          <span class="num" :aria-label="`Artículo de catálogo ${row.grant.catalogItemId}`">
            #{{ row.grant.catalogItemId }}
          </span>
        </td>
        <td>{{ formatDate(row.grant.trialEndDate) }}</td>
        <td>{{ TRIAL_POLICY_OUTCOME_LABEL[row.grant.policyTrialOutcome] }}</td>
        <td><AppBadge :variant="row.state.variant" :label="row.state.label" /></td>
      </tr>
    </AppTable>
  </section>
</template>

<style scoped>
/* Los tres controles del día en una fila que envuelve: en pantalla estrecha el
   campo de fecha baja solo en vez de recortar los botones (WCAG 2.2 §1.4.10). */
.controles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-10);
  align-items: flex-end;
}

.num {
  font-variant-numeric: tabular-nums;
}

.esta {
  display: block;
}
</style>
