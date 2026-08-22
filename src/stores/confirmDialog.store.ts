import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Lo que se le puede decir al usuario antes de una acción irreversible.
 *
 * Hasta H2 el diálogo aceptaba UN string y lo pintaba tal cual, con el botón
 * llamado «Confirmar». La llamada real de la consola era
 * `confirm('¿Eliminar la empresa "X"?')`: no decía qué se lleva por delante —una
 * empresa es un tenant entero, con sus empleados, sus sedes y su historia
 * clínica—, no decía si era reversible, y «Confirmar» no nombra la acción, así
 * que el nombre accesible del botón no describe su resultado (APG, patrón
 * *Alert Dialog*). WCAG 2.2 §3.3.4 Error Prevention (AA) pide precisamente eso
 * para datos con consecuencia legal, financiera o de pérdida de información.
 *
 * El alcance no es Empresas: las 17 vistas de listado de la consola llaman a
 * este mismo `confirm`, así que el defecto era del patrón.
 */
export interface ConfirmOptions {
  /** La pregunta. Es el único campo obligatorio. */
  message: string
  /**
   * Qué se lleva por delante la acción y si es reversible. Se pinta en un
   * banner de aviso bajo la pregunta.
   */
  consequence?: string
  /**
   * Rótulo del botón destructivo, con la acción NOMBRADA («Eliminar empresa»).
   * Por defecto «Confirmar», que es lo que había.
   */
  confirmLabel?: string
}

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
  const isOpen = ref(false)
  const message = ref('')
  const consequence = ref<string | null>(null)
  const confirmLabel = ref('Confirmar')
  let resolver: ((confirmed: boolean) => void) | null = null

  /**
   * `confirm('texto')` sigue funcionando: la forma de string es la que usan las
   * 16 vistas de catálogo y no hay motivo para reescribirlas todas de golpe
   * para poder describir la consecuencia en una.
   */
  function confirm(input: string | ConfirmOptions): Promise<boolean> {
    // Si ya hay una pregunta abierta sin responder, se cancela antes de
    // sustituirla: su promesa se resuelve con `false`, que es la respuesta
    // segura cuando el usuario nunca llegó a decidir. Sin esto, reasignar
    // `resolver` perdería el anterior y quien esperaba esa primera respuesta
    // se quedaría colgado para siempre, sin un solo error que lo delate.
    resolver?.(false)
    const options = typeof input === 'string' ? { message: input } : input
    message.value = options.message
    consequence.value = options.consequence ?? null
    confirmLabel.value = options.confirmLabel ?? 'Confirmar'
    isOpen.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function accept() {
    isOpen.value = false
    resolver?.(true)
    resolver = null
  }

  function cancel() {
    isOpen.value = false
    resolver?.(false)
    resolver = null
  }

  return { isOpen, message, consequence, confirmLabel, confirm, accept, cancel }
})
