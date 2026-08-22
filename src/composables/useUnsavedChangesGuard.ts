import { onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

/**
 * Avisa antes de perder un formulario a medio llenar (FORM-08).
 *
 * En esta consola no existía nada parecido: salir de la ficha de una empresa
 * con el formulario relleno —pulsando el sidebar, o cerrando la pestaña— se
 * llevaba el trabajo sin decir una palabra.
 *
 * Portado del front del tenant con UNA divergencia deliberada: la salida por
 * ruta se confirma con `useConfirmDialog`, el diálogo canónico de esta consola,
 * y no con `window.confirm()`. El original usa el nativo porque el tenant
 * todavía no tiene el canónico portado; aquí sí lo hay, y un `window.confirm`
 * sería reintroducir el peor caso del censo de DS-03 en el repo que es su
 * donante.
 *
 * Cubre las dos salidas que el usuario no controla del todo:
 *
 *  - Cerrar o recargar la pestaña (`beforeunload`). Aquí no hay elección: el
 *    navegador ignora el texto que se le pase y muestra el suyo, y ningún
 *    diálogo propio puede bloquear la descarga. Lo único que se puede hacer es
 *    pedir la confirmación, y solo si de verdad hay algo que perder — pedirla
 *    siempre es la forma más rápida de que se ignore.
 *  - Navegar a otra ruta con el formulario sucio.
 *
 * NO cubre cerrar el propio modal ni pulsar «Cancelar»: son acciones explícitas
 * y con intención, y cada pantalla decide si las confirma.
 *
 * `isDirty` es una función y no un `computed` para que quien la use pueda
 * incluir el estado de apertura del modal: estos modales viven siempre montados
 * y se controlan con `:open`, así que uno cerrado nunca debe avisar de nada.
 */
export function useUnsavedChangesGuard(
  isDirty: () => boolean,
  message = 'Hay datos sin guardar en este formulario. Si sales ahora se perderán.',
) {
  const { confirm } = useConfirmDialog()

  function warnOnUnload(event: BeforeUnloadEvent) {
    if (!isDirty()) return
    event.preventDefault()
    // Los navegadores modernos no muestran este texto, pero algunos aún exigen
    // que `returnValue` quede asignado para considerar el aviso solicitado.
    event.returnValue = ''
  }

  onMounted(() => {
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', warnOnUnload)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', warnOnUnload)
  })

  onBeforeRouteLeave(async () => {
    if (!isDirty()) return true
    return await confirm(message)
  })
}
