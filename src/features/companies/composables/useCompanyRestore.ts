import axios from 'axios'
import { ref } from 'vue'
import { companiesApi } from '../api/companies.api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import type { CompanyResponse } from '../types/companies.types'

/**
 * 404 de la restauración. El backend lo lanza cuando el `UPDATE` nativo no tocó
 * ninguna fila, y eso ocurre por dos motivos indistinguibles desde fuera: el id
 * no existe, o la empresa ya estaba activa. Se nombra el estado, no la causa.
 */
function esNadaQueRestaurar(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

/**
 * Restaurar una empresa archivada — `PATCH /companies/{id}/enable`.
 *
 * ── Por qué un composable propio y no un método más en `useCompanies` ──────
 *
 * `useCompanies` monta un `useServerPaged` sobre `GET /companies`, y ese listado
 * **no puede contener nunca** una empresa archivada: `@SQLRestriction("enabled
 * = true")` sobre `CompanyJpaEntity` la borra de toda consulta JPA. Colgar aquí
 * el `reload()` de esa lista sería trabajo inútil en el mejor caso y, en el
 * peor, invitaría a montar el botón en una pantalla donde la fila no existe.
 * Este composable no lista nada: recibe un id, pregunta y actúa.
 *
 * ── Se confirma, al contrario que la reactivación de un medicamento ────────
 *
 * `useMedicaments.reactivar` no confirma a propósito («confirmar lo inocuo
 * entrena a confirmar sin leer»), y es correcto ahí: un medicamento vuelve a
 * una lista interna. Restaurar una empresa NO es inocuo ni invisible: el tenant
 * vuelve a existir para todo el mundo con sus datos, sus sedes y sus empleados,
 * y sus usuarios pueden volver a entrar. La consecuencia la ven terceros, así
 * que se nombra antes de pulsar (WCAG 2.2 §3.3.4).
 *
 * ── Estado ────────────────────────────────────────────────────────────────
 *
 * `restoring` es un `ref` **dentro de la función**: es estado por instancia del
 * botón que la usa, no estado compartido. No hay ningún `ref` a nivel de módulo
 * y por eso este archivo no necesita store (regla obligatoria de Pinia,
 * `CLAUDE.md` §«Manejo de estado»).
 */
export function useCompanyRestore() {
  const { confirm } = useConfirmDialog()
  const { success, errorFrom } = useToast()

  /** Petición en vuelo de ESTA instancia. Deshabilita su botón, no los demás. */
  const restoring = ref(false)

  /**
   * Pregunta y restaura. Devuelve la ficha restaurada, o `null` si el operador
   * canceló o si falló — el aviso del fallo ya salió con su traza.
   *
   * No relanza el error a propósito: el único consumidor previsto es un botón
   * que solo necesita saber si hubo ficha nueva, y un `throw` obligaría a cada
   * llamador a un `catch` vacío para nada.
   */
  async function restore(id: number, name: string): Promise<CompanyResponse | null> {
    if (restoring.value) return null

    const confirmed = await confirm({
      message: `¿Restaurar la empresa "${name}"?`,
      consequence:
        'Volverá a existir en la plataforma con sus sedes, sus empleados y su historia, ' +
        'y sus usuarios podrán entrar de nuevo. Podrás volver a archivarla desde el listado.',
      confirmLabel: 'Restaurar empresa',
    })
    if (!confirmed) return null

    restoring.value = true
    try {
      const data = await companiesApi.enable(id)
      success('Empresa restaurada', `«${data.name}» vuelve a estar activa.`)
      return data
    } catch (e) {
      // NUNCA se escribe el texto del error a mano: `errorFrom` saca el mensaje
      // del `ProblemDetail` y conserva el `X-Trace-Id`. Lo que cambia entre las
      // dos ramas es solo el TÍTULO, porque «no hay nada que restaurar» no es
      // un fallo del sistema y decirle «Error al restaurar» mandaría al
      // operador a buscar una avería que no existe.
      if (esNadaQueRestaurar(e)) {
        errorFrom(
          'No hay nada que restaurar',
          e,
          'Esa empresa no existe o ya estaba activa. Búscala en el listado.',
        )
      } else {
        errorFrom('Error al restaurar la empresa', e, 'No se pudo restaurar la empresa.')
      }
      return null
    } finally {
      // AQUÍ y no dentro del `try` (FORM-09): en el camino de error, un
      // `restoring = false` tras el `await` no se ejecuta nunca y el botón se
      // queda deshabilitado para siempre.
      restoring.value = false
    }
  }

  return { restoring, restore }
}
