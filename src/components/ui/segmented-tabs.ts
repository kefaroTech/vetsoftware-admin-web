/**
 * Contrato de identificadores de `AppSegmentedTabs.vue`.
 *
 * Vive fuera del SFC porque lo necesitan **los dos lados** del patrón APG Tabs
 * y esos dos lados no están en el mismo componente: el `role="tablist"` lo
 * pinta `AppSegmentedTabs`, pero el `role="tabpanel"` lo pinta la vista, más
 * abajo en la página y con el buscador en medio (ver el javadoc del
 * componente). Cada tab necesita `aria-controls` apuntando al panel, y el panel
 * necesita `aria-labelledby` apuntando a su tab: sin una fórmula compartida,
 * uno de los dos extremos tendría que leer un `id` que el otro genera en tiempo
 * de montaje, y quedaría vacío en el primer render.
 *
 * El `id` del panel lo genera la VISTA con `useId()` y se lo pasa al componente
 * como prop. Los `id` de los tabs se derivan de él con `segmentedTabId`, así
 * que los dos extremos los pueden calcular sin hablarse.
 */

export interface SegmentedTabOption {
  /** Valor que viaja en el `v-model` y, normalmente, en la query string. */
  value: string
  /** Rótulo visible. Sin contadores: ver el javadoc del componente. */
  label: string
}

/** `id` del `role="tab"` de una opción, derivado del `id` de su `tabpanel`. */
export function segmentedTabId(panelId: string, value: string): string {
  return `${panelId}-tab-${value}`
}
