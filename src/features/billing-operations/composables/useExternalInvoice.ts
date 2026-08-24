import { ref } from 'vue'
import { isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { billingOperationsApi } from '../api/billing-operations.api'
import type {
  BillingDocumentResponse,
  RegisterExternalInvoiceRequest,
} from '../types/billing-operations.types'

/**
 * Registrar la referencia de la factura fiscal externa: la acción que **saca el
 * documento de la lista de pendientes**.
 *
 * <p>El estado de aquí (`saving`, `registered`) es por instancia del modal, no
 * compartido entre pantallas: vive en `ref()` dentro de la función, que es lo
 * que la regla del proyecto permite. Lo prohibido —y aquí no hay nada de eso— es
 * el singleton a nivel de módulo.
 *
 * <p><b>`registered` es lo que cambia la forma de la pantalla.</b> Cuando el
 * servidor devuelve el documento ya en `EXTERNAL_REGISTERED`, el modal deja de
 * montar el formulario y monta el chasis de documento. No es un `disabled`
 * gobernando el aspecto: son dos componentes y un `v-if`. Un botón que se pone
 * gris dice «ahora no te dejan»; cambiar de forma dice «esto ya es un hecho».
 */
export function useExternalInvoiceRegistration() {
  const saving = ref(false)
  const registered = ref<BillingDocumentResponse | null>(null)
  const { success, errorFrom, warnFrom } = useToast()

  async function register(
    document: BillingDocumentResponse,
    payload: RegisterExternalInvoiceRequest,
  ): Promise<BillingDocumentResponse | null> {
    saving.value = true
    try {
      const updated = await billingOperationsApi.registerExternalInvoice(
        document.companyId,
        document.id,
        payload,
      )
      registered.value = updated
      success(
        'Referencia externa registrada',
        `${document.documentNumber} sale de la lista de pendientes.`,
      )
      return updated
    } catch (error: unknown) {
      // Un 409 no es un fallo: es que alguien registró la factura primero. Decirlo
      // en tono de error manda a soporte a buscar una avería que no existe.
      // `warnFrom`/`errorFrom` conservan el `X-Trace-Id`; escribir el texto a
      // mano en el `catch` lo tiraría.
      if (isConcurrencyConflict(error)) {
        warnFrom('Ese documento ya lo tocó alguien más', error)
      } else {
        errorFrom('No se pudo registrar la factura externa', error)
      }
      return null
    } finally {
      saving.value = false
    }
  }

  /** Vuelve al estado inicial al cerrar el modal, para que el siguiente abra en el formulario. */
  function reset() {
    registered.value = null
  }

  return { saving, registered, register, reset }
}
