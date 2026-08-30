import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { proposalSuppressionApi } from '../api/proposal-suppression.api'
import { useProposalSuppressionStore } from '../stores/proposal-suppression.store'
import { formatSuppressionInstant, suppressionStatusOf } from './suppressionRules'
import type { ProposalSuppressionStatus } from '../types/proposal-suppression.types'

/**
 * La fachada de la supresión a petición del titular.
 *
 * <p>Concentra las tres decisiones que no pueden vivir en la plantilla:
 *
 * <ol>
 *   <li><b>Se envía el correo RECORTADO</b>, y el acuse se guarda con ese mismo
 *       valor. Un espacio delante hace fallar el `@Email` del servidor con un
 *       400 que el operador no sabría explicar.</li>
 *   <li><b>`total === 0` NO es éxito.</b> El servidor responde 200 con ceros
 *       cuando no encuentra nada y lo hace a propósito —un 404 convertiría el
 *       endpoint en un oráculo de existencia—, así que la traducción de ese 200
 *       a lenguaje de operador la tiene que hacer el front. Aquí se hace una
 *       vez: `status` sale `'not-found'` y el aviso es `warn`, no `success`.</li>
 *   <li><b>El error se cuenta con el mensaje del servidor y su traza.</b>
 *       `errorFrom` es lo que conserva el `X-Trace-Id`; escribir el texto a mano
 *       en el `catch` lo tiraría, y esta es precisamente la operación sobre la
 *       que después hay que poder responder ante la SIC.</li>
 * </ol>
 */
export function useProposalSuppression() {
  const store = useProposalSuppressionStore()
  const { email, outcome, saving, error, errorTraceId } = storeToRefs(store)
  const { success, warn, errorFrom } = useToast()

  /**
   * Cómo hay que leer el acuse vigente.
   *
   * <p>Deriva de `total`, que es la suma de los tres contadores
   * (`SuppressionResult.total()`), y no de la suma recalculada aquí: el contrato
   * lo declara obligatorio y recalcularlo escondería una discrepancia entre lo
   * que el servidor cuenta y lo que la pantalla muestra.
   */
  const status = computed<ProposalSuppressionStatus>(() => {
    if (outcome.value === null) return 'idle'
    return suppressionStatusOf(outcome.value.counters)
  })

  /**
   * Ejecuta la supresión. Devuelve `true` solo si el servidor respondió — con
   * hallazgo o sin él—; `false` si la llamada falló.
   *
   * <p>Devolver `true` en el caso de cero coincidencias es deliberado: la
   * petición se atendió, y la vista necesita cerrar el modal de confirmación
   * igual. Lo que cambia es CÓMO se pinta el resultado, no si hubo respuesta.
   */
  async function suppress(): Promise<boolean> {
    const contactEmail = email.value.trim()
    if (contactEmail === '') return false

    store.setSaving(true)
    store.setError(null, null)
    try {
      const counters = await proposalSuppressionApi.suppress({ contactEmail })
      // La fecha del acuse es `counters.suppressedAt`: el reloj del SERVIDOR.
      // Ya no se fabrica con `Date.now()` — es la evidencia que hay que poder
      // exhibir ante la SIC, y la del equipo del operador no prueba nada.
      store.setOutcome({ email: contactEmail, counters })

      if (suppressionStatusOf(counters) === 'not-found') {
        // Los dos ceros dejaron de ser el mismo caso, y `previouslySuppressedAt`
        // es lo único que los separa. Mandar a «probar otra dirección» a un
        // titular al que ya se le borró todo es hacerle perder el tiempo sobre
        // un derecho que, de hecho, ya se ejerció.
        const anterior = formatSuppressionInstant(counters.previouslySuppressedAt)
        warn(
          'No se encontró nada que suprimir',
          anterior === null
            ? 'Ese correo no tiene datos del asistente, o ya se habían borrado. Revisa si el titular pudo escribir desde otra dirección.'
            : `Ese correo ya se había suprimido el ${anterior}, así que no quedaba nada por borrar. La petición está atendida.`,
        )
      } else {
        success('Datos suprimidos', `Se borraron ${counters.total} filas asociadas al correo.`)
      }
      return true
    } catch (e) {
      store.setError(
        getProblemDetailMessage(e, 'No se pudo completar la supresión'),
        getTraceId(e) ?? null,
      )
      errorFrom('No se pudo completar la supresión', e)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  return {
    email,
    outcome,
    status,
    saving,
    error,
    errorTraceId,
    setEmail: store.setEmail,
    suppress,
  }
}
