import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useServerPaged } from '@/composables/useServerPaged'
import { billingDocumentSequencesApi } from '../api/platform-billing.api'
import type { BillingDocumentSequenceResponse } from '../types/platform-billing.types'

/**
 * Las series de numeración de las cuentas de cobro: consultar y dar de alta.
 *
 * <p><b>No hay estado compartido que llevar a Pinia.</b> Lo que vive aquí es la
 * página que un componente concreto está mirando —índice, filas, error de esa
 * carga—, y eso es estado **por instancia**, que la regla del proyecto deja
 * explícitamente en `ref()` dentro del composable. Lo prohibido es el singleton a
 * nivel de módulo, y aquí no hay ninguno: los `ref` los crea `useServerPaged` en
 * cada llamada. La configuración de la fila única sí es estado de pantalla y por
 * eso esa sí vive en el store.
 *
 * <p>`useServerPaged` es el paginador servido del repositorio y traduce él solo
 * entre el `page` desde 0 del backend y el desde 1 que ve el usuario.
 */
export function useBillingDocumentSequences() {
  const { success, errorFrom } = useToast()
  const creating = ref(false)

  const paged = useServerPaged<BillingDocumentSequenceResponse>((page, pageSize, _query, signal) =>
    billingDocumentSequencesApi.listAll(page, pageSize, signal),
  )

  /**
   * Alta de una serie. Devuelve `true` si se creó.
   *
   * <p>Tras crearla se recarga la **primera** página y no la actual: la lista
   * viene ordenada por la base y una serie recién creada no tiene por qué caer en
   * la página que el operador estuviera mirando. Dejarlo sin recargar sería peor:
   * el aviso diría «creada» y la tabla no la enseñaría por ningún lado.
   */
  async function create(prefix: string): Promise<boolean> {
    creating.value = true
    try {
      const created = await billingDocumentSequencesApi.create({ prefix })
      success(`Serie ${created.prefix} creada`)
      await paged.reload()
      return true
    } catch (e: unknown) {
      errorFrom('No se pudo crear la serie de numeración', e)
      return false
    } finally {
      creating.value = false
    }
  }

  return { ...paged, creating, create }
}
