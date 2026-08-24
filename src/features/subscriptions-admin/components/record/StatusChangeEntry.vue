<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'
import DocumentSeal from '@/components/ui/DocumentSeal.vue'
import SubscriptionStatusBadge from '../SubscriptionStatusBadge.vue'
import { READ_ONLY_POLICY_NOTE } from '../../composables/subscriptionStatusText'
import { formatDateTime } from '../../composables/subscriptionHistoryText'
import type { SubscriptionStatusChangeResponse } from '../../types/subscription-history.types'

/**
 * <b>Una fila de la bitácora de estados.</b> Es la entrada que responde en un
 * segundo la pregunta que, si no, hay que deducir de los pagos: <i>«¿por qué esta
 * cuenta está en solo lectura?»</i>.
 *
 * <p>Solo se inserta —el propio adaptador del backend lo dice: «la bitacora no se
 * actualiza ni se borra»—, así que se pinta como hecho: `&lt;dl&gt;` sobre
 * `.ds-detail-grid`, sello textual, y <b>ningún control</b>. No hay «Editar», no
 * hay «Anular» y no hay «Deshacer», porque ninguna de las tres operaciones
 * existe.
 *
 * <p><b>Los rótulos de estado los pinta `SubscriptionStatusBadge`</b> y no un
 * mapa propio. Ese componente ya es correcto y es el que fija §3.4.1 —«Solo
 * lectura», «Pago vencido»— con su texto siempre presente, así que ningún estado
 * de esta pantalla se comunica por color (§5.2). Copiar aquí su mapa sería la
 * forma exacta de que dos pantallas del mismo dato acaben divergiendo.
 *
 * <p><b>Cuando la cuenta cae a solo lectura, la promesa se repite aquí.</b> Es el
 * mismo texto literal, palabra por palabra, que el modal de la transición y el
 * banner del expediente: es una promesa al cliente y decirla con tres redacciones
 * distintas la debilita. Y sobre todo, es donde alguien que audita la cuenta va a
 * leer qué significó el cambio — no existe ni existirá un corte total de acceso,
 * y esta ficha lo dice donde importa.
 */
const props = defineProps<{ change: SubscriptionStatusChangeResponse }>()

const isReadOnly = computed(() => props.change.toStatus === 'READ_ONLY')
</script>

<template>
  <article class="ds-card bitacora ds-stack ds-stack--12">
    <header class="ds-stack ds-stack--8">
      <p class="ds-kicker">Cambio de estado</p>
      <h3 class="ds-title cambio">
        <template v-if="change.fromStatus">
          De <SubscriptionStatusBadge :status="change.fromStatus" /> a
          <SubscriptionStatusBadge :status="change.toStatus" />
        </template>
        <template v-else>
          Alta del contrato en <SubscriptionStatusBadge :status="change.toStatus" />
        </template>
      </h3>
      <!-- El mismo sello que las fichas de documento, ya como componente. La
           frase es distinta porque una bitácora no se corrige con otro asiento:
           solo se le añaden filas. -->
      <DocumentSeal text="Bitácora · solo se inserta" />
    </header>

    <dl class="ds-detail-grid">
      <div>
        <dt class="ds-label">Cuándo ocurrió</dt>
        <dd class="valor">{{ formatDateTime(change.occurredAt) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Quién lo registró</dt>
        <dd class="valor">
          {{ change.actor || 'No quedó registrado quién lo hizo.' }}
        </dd>
      </div>
      <div class="ds-grid-span">
        <dt class="ds-label">Motivo</dt>
        <dd class="valor">
          {{ change.reason || 'No quedó escrito el motivo de este cambio.' }}
        </dd>
      </div>
    </dl>

    <!-- La política, literal, donde alguien la va a leer al auditar la cuenta. -->
    <div v-if="isReadOnly" class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">{{ READ_ONLY_POLICY_NOTE }}</span>
    </div>
  </article>
</template>

<style scoped>
/* La banda lateral distingue una entrada de bitácora de la ficha de un otrosí
   (que lleva regla superior) sin recurrir al color: es geometría, y en escala de
   grises la diferencia se conserva. El significado va en el rótulo, no aquí. */
.bitacora {
  border-left: 3px solid var(--border);
}

.cambio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-6);
  margin: 0;
}

.valor {
  margin: var(--space-4) 0 0;
}
</style>
