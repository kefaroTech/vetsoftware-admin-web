<script setup lang="ts">
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useToast } from '@/composables/useToast'
import { prettyWompiBody } from '../composables/wompiEventFormat'
import type { WompiWebhookEventResponse } from '../types/wompi-events.types'

/**
 * El cuerpo crudo del webhook, con copia al portapapeles — mismo patrón
 * Que el `X-Trace-Id` de los toasts de error: es la evidencia que hace falta
 * ante una disputa con el banco o con Wompi.
 */
const props = defineProps<{ open: boolean; event: WompiWebhookEventResponse | null }>()

const emit = defineEmits<{ close: [] }>()

const { success } = useToast()

async function copyBody() {
  if (!props.event?.rawBody) return
  await navigator.clipboard.writeText(props.event.rawBody)
  success('Cuerpo del evento copiado')
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Detalle del evento de Wompi"
    :subtitle="event ? `${event.eventType} · ${formatDate(event.receivedAt)}` : ''"
    :icon="ICONS.WEBHOOK_EVENT"
    compact
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <dl v-if="event" class="ds-detail-grid">
        <div>
          <dt class="ds-label">Referencia de la pasarela</dt>
          <dd>{{ event.gatewayReference ?? '—' }}</dd>
        </div>
        <div>
          <dt class="ds-label">Resultado del procesamiento</dt>
          <dd>{{ event.processingOutcome ?? '—' }}</dd>
        </div>
        <div>
          <dt class="ds-label">Procesado</dt>
          <dd>{{ event.processedAt ? formatDate(event.processedAt) : 'Todavía no' }}</dd>
        </div>
        <div>
          <dt class="ds-label">Checksum</dt>
          <dd class="checksum">{{ event.eventChecksum }}</dd>
        </div>
      </dl>

      <div class="ds-block-head">
        <h3 class="ds-title cuerpo-titulo">Cuerpo crudo</h3>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="copyBody">
          <component :is="ICONS.COPY" :size="14" />
          Copiar
        </button>
      </div>
      <pre class="cuerpo">{{ prettyWompiBody(event?.rawBody ?? null) }}</pre>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--primary" @click="emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.cuerpo-titulo {
  margin: 0;
}

.checksum {
  word-break: break-all;
  font-family: var(--font-mono), monospace;
}

.cuerpo {
  max-height: 320px;
  overflow: auto;
  padding: var(--space-12);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  font-family: var(--font-mono), monospace;
  font-size: var(--text-caption);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
