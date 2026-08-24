<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'
import type { SubscriptionPaymentResponse } from '@/features/billing-operations/types/billing-operations.types'
import PaymentForm from './PaymentForm.vue'
import PaymentRecord from './PaymentRecord.vue'
import type { RegisterSubscriptionPaymentRequest } from '../../types/subscription-money.types'

/**
 * <b>Registrar un pago</b>, y la demostración de la diferencia entre documento y
 * formulario (§3.2).
 *
 * <p><b>No hay un solo `disabled` gobernando el aspecto de este modal.</b> Hay dos
 * componentes y un `v-if` que elige cuál se monta: `PaymentForm` mientras el pago
 * no existe, `PaymentRecord` en cuanto el servidor lo devuelve. Al guardar, el
 * `v-if` cambia de rama y <b>el modal se vuelve a pintar con otra forma</b>: otro
 * titular, sello de documento y ninguna acción de escritura. Un botón que se pone
 * gris diría «ahora no te dejan»; el cambio de forma dice «esto ya es un hecho».
 *
 * <p>El foco va al titular del chasis nuevo (`tabindex="-1"`), que es el mismo
 * mecanismo de `ErrorSummary.vue`: sin él, quien navega con teclado se queda con
 * el foco en un botón que acaba de desaparecer del árbol (A11Y-08).
 *
 * <p><b>Por qué la empresa está en el subtítulo y no se da por sabida.</b> Esta es
 * la única escritura de dinero de la consola cuya empresa la resuelve una cabecera
 * invisible (`X-Company-Id`, §1.1). Repetir el nombre de la empresa dentro del
 * modal es la contrapartida de diseño: lo que va a viajar en la cabecera se lee
 * antes de confirmar, en vez de confiarse a que el operador recuerde en qué
 * expediente estaba.
 *
 * <p>⚠️ <b>`ModalShell` se monta siempre, y NO con un `v-if` sobre el pago.</b>
 * Cerrar limpiaría el pago en el mismo tick que `open`, y con un `v-if` sobre el
 * mismo dato Vue desmontaría `ModalShell` antes de que corriera su watcher de
 * `open` —que es justo quien devuelve el foco—. Quien lleva el `v-if` es el
 * contenido del cuerpo, nunca el contenedor. Es la trampa que W1-E dejó
 * documentada en `RegisterExternalInvoiceModal`.
 */
const props = defineProps<{
  open: boolean
  companyName: string
  subscriptionNumber: string
  saving?: boolean
  /** Selector del `<h2>` al que devolver el foco al cerrar. */
  returnFocusTo?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: RegisterSubscriptionPaymentRequest]
}>()

/** El pago que devolvió el servidor. `null` mientras se está escribiendo. */
const registered = ref<SubscriptionPaymentResponse | null>(null)
const form = ref<InstanceType<typeof PaymentForm> | null>(null)

/** Cada apertura empieza limpia: el pago anterior ya no es el de esta vez. */
watch(
  () => props.open,
  (open) => {
    if (open) registered.value = null
  },
)

/**
 * La llama el padre cuando el servidor confirma. Cambia la rama del `v-if` y
 * lleva el foco al titular del hecho consumado.
 */
async function showRecord(payment: SubscriptionPaymentResponse) {
  registered.value = payment
  await nextTick()
  document.getElementById('payment-record-title')?.focus()
}

/** Solo pregunta si hay algo escrito y todavía no se registró: confirmar en vacío es ruido. */
function confirmCloseWhen(): boolean {
  return !registered.value && (form.value?.isDirty() ?? false)
}

defineExpose({ showRecord })
</script>

<template>
  <ModalShell
    :open="open"
    :title="registered ? 'Pago registrado' : 'Registrar un pago'"
    :subtitle="`${subscriptionNumber} · ${companyName}`"
    :icon="registered ? ICONS.SUCCESS : ICONS.RECEIPT"
    compact
    :width="560"
    :return-focus-to="returnFocusTo"
    :confirm-close-when="confirmCloseWhen"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="El pago no se ha registrado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <!-- El hecho consumado. Sin «Editar»: la operación no existe en el contrato. -->
      <PaymentRecord v-if="registered" :payment="registered" />

      <PaymentForm
        v-else
        ref="form"
        :open="open"
        :company-name="companyName"
        @submit="emit('submit', $event)"
      />
    </template>

    <template #footer-actions>
      <button v-if="registered" type="button" class="ds-btn ds-btn--primary" @click="emit('close')">
        Cerrar
      </button>
      <template v-else>
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--primary"
          :disabled="saving"
          @click="form?.submit()"
        >
          {{ saving ? 'Registrando…' : 'Registrar el pago' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>
