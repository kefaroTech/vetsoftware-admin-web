<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import type { SubscriptionChargeResponse } from '@/features/subscriptions-admin/types/subscription-money.types'
import type { IssueCreditNoteRequest } from '../types/billing-documents.types'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'

/**
 * <b>Emitir la nota crédito que corrige a este documento.</b>
 *
 * <p><b>Un documento no se edita para corregirlo.</b> Se emite una nota crédito y
 * se encadena al original; los dos quedan. Si el original se tocara, lo que dice
 * VetSoftware dejaría de coincidir con lo que tiene la DIAN y no habría forma de
 * saber cuál de los dos miente. Por eso esta pantalla no ofrece —ni puede
 * ofrecer— un campo de «importe a corregir».
 *
 * <p><b>Se eligen cargos, no un importe.</b> Es lo que declara el contrato
 * (`IssueCreditNoteRequest { chargeIds }`, `minItems: 1`): el servidor deriva el
 * importe de los cargos elegidos. Un campo de importe libre aquí produciría notas
 * crédito que no cuadran con ningún renglón.
 *
 * <p><b>Si el cruce de renglones no está probado completo, no se puede emitir.</b>
 * Los cargos de un documento no se pueden pedir al servidor —`GET
 * /subscription-billing/charges` filtra por contrato y por estado, no por
 * documento—, así que la lista de abajo es un cruce hecho en el cliente. Cuando la
 * suma de los renglones encontrados <b>no</b> da el subtotal del documento, faltan
 * filas: acreditar sobre una lista incompleta emitiría una nota crédito por menos
 * de lo que se quería corregir, y esa diferencia se descubre un trimestre después.
 * Se dice y se cierra la puerta, en vez de dejar elegir sobre datos a medias.
 *
 * <p><b>Los importes van en positivo.</b> Una nota crédito de 40.000 se guarda
 * como 40.000, no como −40.000: el signo lo da el tipo del documento. Lo que sí es
 * negativo es el <i>cargo</i> que anula a otro, y por eso esos cargos —los que ya
 * tienen `voidsChargeId`— aparecen marcados: acreditar dos veces la misma
 * anulación es el error caro de esta pantalla.
 */
const props = defineProps<{
  open: boolean
  documentId: number
  documentNumber: string | null
  /** Los renglones cruzados. `null` mientras el documento no ha cargado. */
  charges: SubscriptionChargeResponse[]
  /**
   * `true` solo si la suma de los renglones da el subtotal del documento. Sin esa
   * prueba no se emite: ver el bloque de arriba.
   */
  chargesComplete: boolean
  saving: boolean
  returnFocusTo?: string
}>()

const emit = defineEmits<{ close: []; submit: [payload: IssueCreditNoteRequest] }>()

const selected = ref<number[]>([])

/** Cada apertura empieza sin nada elegido: una nota crédito nunca hereda la selección anterior. */
watch(
  () => props.open,
  (open) => {
    if (open) selected.value = []
  },
)

function toggle(chargeId: number, checked: boolean) {
  selected.value = checked
    ? [...selected.value, chargeId]
    : selected.value.filter((id) => id !== chargeId)
}

const total = computed(() =>
  props.charges
    .filter((charge) => selected.value.includes(charge.id))
    .reduce((sum, charge) => sum + charge.subtotalAmount, 0),
)

const canSubmit = computed(() => props.chargesComplete && selected.value.length > 0)

const subtitle = computed(() => props.documentNumber ?? 'Documento #' + props.documentId)

function submit() {
  if (!canSubmit.value) return
  emit('submit', { chargeIds: [...selected.value] })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Emitir una nota crédito contra este documento"
    :subtitle="subtitle"
    :icon="ICONS.RECEIPT"
    accent="warn"
    compact
    :width="640"
    :return-focus-to="returnFocusTo"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--16">
        <MoneyScopeNote />

        <div class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            El documento original <strong>no se toca</strong>. La corrección es un documento nuevo
            que queda encadenado a este, y los dos siguen existiendo.
          </span>
        </div>

        <!-- La puerta cerrada, con su motivo. No es un fallo: el contrato no
             publica los renglones de un documento y el cruce no se pudo probar. -->
        <div v-if="!chargesComplete" class="ds-banner ds-banner--warning" role="alert">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            No se puede emitir desde aquí:
            <strong>los renglones de este documento no se pudieron reconstruir completos</strong>.
            La nota crédito se compone de cargos, y elegir sobre una lista a la que le faltan filas
            emitiría una corrección por menos de lo debido.
          </span>
        </div>

        <fieldset v-else class="cargos ds-stack ds-stack--10">
          <legend class="ds-label">Cargos a acreditar</legend>
          <p class="ds-meta nota">
            Elige los renglones que se corrigen. El importe lo calcula el servidor a partir de
            ellos: aquí no hay campo de importe, y no es un olvido.
          </p>

          <div v-for="charge in charges" :key="charge.id" class="cargo">
            <AppCheckbox
              :model-value="selected.includes(charge.id)"
              :label="charge.description"
              @update:model-value="toggle(charge.id, $event)"
            />
            <p class="ds-meta nota">
              {{ formatDate(charge.servicePeriodStart) }} –
              {{ formatDate(charge.servicePeriodEnd) }} ·
              {{ formatAmount(charge.subtotalAmount) }}
              <span v-if="charge.voidsChargeId">
                · ya anula al cargo #{{ charge.voidsChargeId }}: acreditarlo otra vez duplicaría la
                corrección.
              </span>
            </p>
          </div>

          <p v-if="charges.length === 0" class="ds-meta nota">
            Este documento no tiene ningún renglón que acreditar.
          </p>
        </fieldset>

        <p v-if="canSubmit" class="ds-text-strong">
          Se acreditarán {{ selected.length }} {{ selected.length === 1 ? 'cargo' : 'cargos' }} por
          {{ formatAmount(total) }}.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="saving || !canSubmit"
        @click="submit"
      >
        {{ saving ? 'Emitiendo…' : 'Emitir la nota crédito' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El `fieldset` del sistema de diseño no trae marco: el grupo se lee por su
   `legend`, no por una caja que compita con la del modal. */
.cargos {
  border: 0;
  padding: 0;
}

.nota {
  margin: 0;
}

/* Cada cargo es la casilla y su detalle, uno debajo de otro y sangrado para que
   el detalle se lea como parte de la opción y no como una fila más. */
.cargo {
  padding-block: var(--space-6);
}
</style>
