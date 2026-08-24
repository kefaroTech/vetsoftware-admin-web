<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'
import ExternalInvoiceForm from './ExternalInvoiceForm.vue'
import ExternalInvoiceRecord from './ExternalInvoiceRecord.vue'
import { useExternalInvoiceRegistration } from '../composables/useExternalInvoice'
import type {
  BillingDocumentResponse,
  RegisterExternalInvoiceRequest,
} from '../types/billing-operations.types'

/**
 * **La acción primaria que saca la fila de la lista**, y la que enseña la
 * diferencia entre documento y formulario.
 *
 * <p>No hay un solo `disabled` gobernando el aspecto de este modal. Hay dos
 * componentes y un `v-if` que elige cuál se monta: `ExternalInvoiceForm`
 * mientras el documento espera su referencia, `ExternalInvoiceRecord` en cuanto
 * el servidor la devuelve registrada. Al pulsar «Registrar la referencia» el
 * `v-if` cambia de rama y **el modal se vuelve a pintar con otra forma**: otra
 * superficie, otro titular, sello de documento y ninguna acción de escritura.
 * Un botón que se pone gris diría «ahora no te dejan»; el cambio de forma dice
 * «esto ya es un hecho, y no se edita».
 *
 * <p>El foco va al titular del chasis nuevo (`tabindex="-1"`), que es el mismo
 * mecanismo de `ErrorSummary.vue`: sin él, quien navega con teclado se queda con
 * el foco en un botón que acaba de desaparecer del árbol.
 *
 * <p>Al cerrar, el padre recarga la lista y la fila ya no está. Por eso
 * `returnFocusTo` apunta al `<h2>` del recuento de la sección y no al botón de
 * la fila: ese botón se fue con la fila (A11Y-08).
 *
 * <p>⚠️ <b>`ModalShell` se monta siempre, y NO con un `v-if="document"`.</b>
 * Cerrar pone `document` a `null` en el mismo tick que `open` a `false`; con un
 * `v-if` sobre el mismo dato, Vue desmonta `ModalShell` antes de que su watcher
 * de `open` corra, y ese watcher es justamente quien devuelve el foco
 * (`ModalShell.vue:143-160`). El resultado sería el foco perdido en `<body>` tras
 * cada registro — el defecto que A11Y-08 existe para evitar. Quien lleva el
 * `v-if` es el contenido del cuerpo, no el contenedor.
 */
const props = defineProps<{
  open: boolean
  document: BillingDocumentResponse | null
  /** Selector del `<h2>` al que devolver el foco: el botón que abrió esto ya no existirá. */
  returnFocusTo?: string
  /** Proveedor propuesto —el de la configuración de plataforma— cuando se conoce. */
  defaultProvider?: string | null
}>()

const emit = defineEmits<{ close: []; registered: [document: BillingDocumentResponse] }>()

const { saving, registered, register, reset } = useExternalInvoiceRegistration()
const form = ref<InstanceType<typeof ExternalInvoiceForm> | null>(null)

/** Cada apertura empieza limpia: el documento anterior ya no es el de esta fila. */
watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

async function onSubmit(payload: RegisterExternalInvoiceRequest) {
  if (!props.document) return
  const updated = await register(props.document, payload)
  if (!updated) return
  emit('registered', updated)
  await nextTick()
  // `window.document` y no `document` a secas: aquí `document` es el nombre de
  // una prop y leerlo sin prefijo se presta a confusión al mantenerlo.
  window.document.getElementById('external-invoice-record-title')?.focus()
}

/** Solo pregunta si hay algo escrito y todavía no se registró: confirmar en vacío es ruido. */
function confirmCloseWhen() {
  return !registered.value && (form.value?.isDirty() ?? false)
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="
      registered ? 'Referencia externa registrada' : 'Registrar la factura externa del documento'
    "
    :subtitle="document ? `${document.documentNumber} · empresa #${document.companyId}` : ''"
    :icon="registered ? ICONS.SUCCESS : ICONS.RECEIPT"
    compact
    :width="560"
    :return-focus-to="returnFocusTo"
    :confirm-close-when="confirmCloseWhen"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="La referencia de la factura externa no se ha registrado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <!-- El hecho consumado. Sin «Editar»: la operación no existe en el contrato. -->
      <ExternalInvoiceRecord v-if="registered" :document="registered" />

      <ExternalInvoiceForm
        v-else-if="document"
        ref="form"
        :default-provider="defaultProvider"
        @submit="onSubmit"
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
          {{ saving ? 'Registrando…' : 'Registrar la referencia' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>
