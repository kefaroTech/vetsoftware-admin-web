import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProposalSuppressionOutcome } from '../types/proposal-suppression.types'

/**
 * El estado de la supresión a petición del titular.
 *
 * <p>Store de Pinia y no `ref()` sueltos en el composable: es la regla del repo
 * para todo estado que no sea por-instancia, y aquí además hace falta de verdad
 * — el acuse tiene que sobrevivir a que se abra y se cierre el modal de
 * confirmación, que desmonta su propio árbol.
 *
 * <p><b>La regla que justifica que el correo viva aquí junto al acuse.</b> La
 * respuesta del servidor NO devuelve la dirección (`ProposalSuppressionResponse`
 * la omite a propósito: devolverla la metería en el cuerpo de una respuesta que
 * puede acabar en un log de acceso). Así que el único sitio donde consta a quién
 * se le borró es este. Y como el operador puede seguir escribiendo en el cuadro
 * después de recibir el acuse, <b>el acuse se descarta en cuanto el correo del
 * cuadro deja de ser el suyo</b>: un panel que dice «se suprimieron 7 filas»
 * encima de una dirección distinta de la que se suprimió es una constancia falsa
 * sobre un derecho fundamental, y se lee exactamente igual que una verdadera.
 */
export const useProposalSuppressionStore = defineStore('proposal-suppression', () => {
  /** Lo que hay escrito en el cuadro. Sin recortar: es literalmente lo tecleado. */
  const email = ref('')

  /** El acuse de la última supresión ejecutada, o `null` si no hay ninguno vigente. */
  const outcome = ref<ProposalSuppressionOutcome | null>(null)

  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /**
   * Escribe el correo y, si con eso el acuse deja de pertenecer a lo que está en
   * el cuadro, lo tira. El error también: el operador que corrige el texto está
   * respondiendo al aviso, y dejarlo puesto lo convierte en ruido permanente.
   */
  function setEmail(value: string) {
    email.value = value
    if (outcome.value !== null && outcome.value.email !== value.trim()) outcome.value = null
    error.value = null
    errorTraceId.value = null
  }

  function setOutcome(value: ProposalSuppressionOutcome) {
    outcome.value = value
  }

  function setSaving(value: boolean) {
    saving.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  return {
    email,
    outcome,
    saving,
    error,
    errorTraceId,
    setEmail,
    setOutcome,
    setSaving,
    setError,
  }
})
