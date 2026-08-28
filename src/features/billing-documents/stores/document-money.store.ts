import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * El estado de <b>las cuatro escrituras</b> del dinero de un documento: aplicar,
 * contra-aplicar, registrar retención y emitir nota crédito.
 *
 * <p><b>Por qué un store y no `ref()` dentro del composable.</b> Las cuatro se
 * disparan desde sitios distintos de la misma pantalla —una desde la tabla de
 * aplicaciones, dos desde la cabecera, otra desde el bloque de renglones— y la
 * pantalla entera se relee al terminar cualquiera de ellas. Con estado por
 * instancia, cada disparador tendría su propio «guardando» y el bloque de al lado
 * no se enteraría de que hay una escritura en vuelo, que es como se acaban
 * mandando dos contra-aplicaciones de la misma fila. Por la regla obligatoria del
 * proyecto vive en Pinia. <b>Aquí no hay ningún `ref()` a nivel de módulo</b> — el
 * patrón híbrido está prohibido.
 *
 * <p>`lastCreditNoteId` no es un detalle de presentación: emitir una nota crédito
 * crea un <b>documento nuevo</b> y el contrato <b>no</b> deja llegar del original a
 * su corrección (`BillingDocumentResponse` expone `correctsDocumentId`, la ida, y
 * no la vuelta). Guardar aquí el identificador que devolvió la escritura es la
 * única forma de que quien acaba de emitirla pueda abrirla; si se pierde, hay que
 * buscarla a mano en el listado de la empresa.
 */
export type DocumentMoneyAction = 'apply' | 'reversal' | 'withholding' | 'creditNote'

function initialSaving(): Record<DocumentMoneyAction, boolean> {
  return { apply: false, reversal: false, withholding: false, creditNote: false }
}

export const useDocumentMoneyStore = defineStore('document-money', () => {
  const saving = ref(initialSaving())

  /**
   * La aplicación que se está contra-aplicando ahora mismo, para que la fila —y
   * solo ella— diga que está en curso. Un «guardando» global sobre una tabla de
   * doce filas no dice cuál.
   */
  const reversingApplicationId = ref<number | null>(null)

  /** La nota crédito recién emitida desde esta pantalla, para poder abrirla. */
  const lastCreditNoteId = ref<number | null>(null)

  function setSaving(action: DocumentMoneyAction, value: boolean) {
    saving.value[action] = value
  }

  function setReversing(applicationId: number | null) {
    reversingApplicationId.value = applicationId
    saving.value.reversal = applicationId !== null
  }

  function setLastCreditNote(id: number | null) {
    lastCreditNoteId.value = id
  }

  /** Al cambiar de documento no se hereda nada: ni el «guardando», ni la nota del anterior. */
  function reset() {
    saving.value = initialSaving()
    reversingApplicationId.value = null
    lastCreditNoteId.value = null
  }

  return {
    saving,
    reversingApplicationId,
    lastCreditNoteId,
    setSaving,
    setReversing,
    setLastCreditNote,
    reset,
  }
})
