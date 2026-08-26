import { storeToRefs } from 'pinia'
import { useMedicamentsStore } from '../stores/medicaments.store'
import { medicamentsApi } from '../api/medicaments.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailCode, isConcurrencyConflict } from '@/services/http/http.client'
import { NAME_ALREADY_EXISTS, type MedicamentFormData } from './useMedicaments'
import type { UpdateGlobalMedicamentRequest } from '../types/medicaments.types'

/**
 * La ficha de edición, que en esta consola es una **ruta completa** y no un
 * modal — igual que en los nueve catálogos maestros que ya existen.
 *
 * Va aparte de `useMedicaments` a propósito: la ficha no necesita ni el listado
 * paginado, ni la pestaña de pausados, ni las mutaciones de alta y pausa.
 * Montarlas para editar dos campos crearía un `AbortController` y un `watch`
 * del término que nadie mira.
 *
 * `selected` sale del store porque **se comparte entre dos pantallas**: el
 * contrato no tiene `GET /admin/medicaments/{id}`, así que el listado es quien
 * pone la fila antes de navegar. Ver el porqué —y el límite— en
 * `stores/medicaments.store.ts`.
 */
export function useMedicamentEditor() {
  const store = useMedicamentsStore()
  const { selected } = storeToRefs(store)
  const { success, errorFrom, warnFrom } = useToast()

  /**
   * Edición. El `PUT` global lleva `.filter(Medicament::isGeneral)` en el
   * backend y devuelve **404, no 403**, si el id resulta ser de una fila
   * privada; su javadoc lo llama «LA barrera», porque sin ella un `PUT` con el
   * id de un medicamento privado le pondría `company = null, general = true` y
   * la fila de una clínica pasaría en silencio al catálogo global.
   */
  async function update(id: number, form: MedicamentFormData) {
    const payload: UpdateGlobalMedicamentRequest = {
      name: form.name.trim(),
      description: form.description.trim(),
    }
    try {
      const data = await medicamentsApi.update(id, payload)
      store.setSelected(data)
      success('Medicamento actualizado')
      return data
    } catch (e) {
      // El 409 del índice único lo pinta el formulario en línea sobre el campo
      // `name`: dos mensajes para el mismo fallo es ruido, y el que importa es
      // el que está junto al campo que hay que corregir.
      if (getProblemDetailCode(e) === NAME_ALREADY_EXISTS) throw e
      if (isConcurrencyConflict(e)) {
        // Tono `warn`, no `error`: no es un fallo, es que alguien llegó antes.
        warnFrom('Otro operador editó primero', e)
      } else {
        errorFrom('Error al actualizar el medicamento', e, 'No se pudo actualizar el medicamento.')
      }
      throw e
    }
  }

  return { selected, select: store.setSelected, update }
}
