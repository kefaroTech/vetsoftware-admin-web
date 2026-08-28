import { ref, type Ref } from 'vue'
import { usePriceListCoverage } from './usePriceListCoverage'
import { readNotEffectiveWindow, type NotEffectiveWindow } from './priceListValidity'
import type { CatalogItemResponse, PriceListResponse } from '../types/commercial-catalog.types'

/**
 * Todo lo que rodea a «publicar una tarifa», en un sitio.
 *
 * <p><b>Por qué es un composable y no código en el panel.</b>
 * `PriceListsPanel.vue` estaba en 466 líneas de las 500 que fija `css:budget`, y
 * publicar dejó de ser una llamada: ahora comprueba la cobertura, la enseña, pide
 * un reconocimiento explícito si hay huecos y conserva el rechazo por vigencia.
 * Meterlo allí lo habría pasado de largo, y partir un fichero por el sitio
 * equivocado es peor que no partirlo. La costura natural es esta: el panel sigue
 * siendo dueño de la tabla y del ciclo de vida de la tarifa, y aquí vive el
 * <b>acto de publicar</b> con su comprobación.
 *
 * <p>El estado compartido —los precios completos de la lista— sigue en el store de
 * cobertura. Lo que hay aquí es estado <b>por instancia de la pantalla</b>: qué
 * tarifa se está publicando y si el modal está abierto. Eso es `ref` local dentro
 * de la función, que es lo que `CLAUDE.md` permite; no hay ningún `ref` a nivel de
 * módulo.
 */
export function usePriceListPublishing(options: {
  /** El catálogo ya cargado por `useCommercialCatalog`. No se vuelve a pedir. */
  catalogItems: () => CatalogItemResponse[]
  /** La acción real, la del composable de la feature. Aquí no se llama a la API. */
  publish: (id: number) => Promise<void>
  /** El día de hoy en la zona del negocio. Lo mantiene la pantalla. */
  today: Ref<string>
}) {
  const coverage = usePriceListCoverage(options.catalogItems)

  const target = ref<PriceListResponse | null>(null)
  const open = ref(false)
  const saving = ref(false)

  /** La ventana de un 409 `PRICE_LIST_NOT_EFFECTIVE`. Estado de la pantalla, no del dominio. */
  const notEffective = ref<NotEffectiveWindow | null>(null)

  /**
   * Abre el diálogo y pide la cobertura **en ese momento**, siempre.
   *
   * <p>No se reutiliza lo cacheado sin refrescar: entre abrir la pantalla y
   * pulsar «publicar» pudo añadirse un precio, y publicar contra una cobertura
   * vieja es el mismo defecto con un aviso encima.
   */
  async function start(priceList: PriceListResponse) {
    target.value = priceList
    open.value = true
    try {
      await coverage.load(priceList.id, true)
    } catch {
      // `usePriceListCoverage` ya dejó el mensaje del ProblemDetail y su traza en
      // el store; el modal los pinta y bloquea la publicación hasta que se sepa
      // qué falta.
    }
  }

  function close() {
    if (saving.value) return
    open.value = false
    target.value = null
  }

  /** Confirma la publicación. La decisión de si se puede la tomó ya el modal. */
  async function confirm() {
    const priceList = target.value
    if (!priceList || saving.value) return
    saving.value = true
    try {
      await options.publish(priceList.id)
      notEffective.value = null
      open.value = false
      target.value = null
    } catch (error) {
      // El composable de la feature ya avisó con el mensaje del servidor y su
      // traza. Esto solo añade el estado que sobrevive al toast cuando el rechazo
      // es el de D-73: `readNotEffectiveWindow` devuelve `null` para cualquier
      // otro error, y el modal se queda abierto para poder corregir.
      notEffective.value = readNotEffectiveWindow(error)
    } finally {
      saving.value = false
    }
  }

  /** Recarga la cobertura de la tarifa que se está mirando, tras tocar un precio. */
  async function refreshCoverage(priceListId: number) {
    try {
      await coverage.load(priceListId, true)
    } catch {
      // Ídem: el error persistente ya está en el store.
    }
  }

  return {
    coverage: coverage.coverage,
    coverageLoading: coverage.loading,
    coverageError: coverage.error,
    coverageTraceId: coverage.errorTraceId,
    isCoverageLoadedFor: coverage.isLoadedFor,
    clearCoverage: coverage.clear,
    refreshCoverage,
    target,
    open,
    saving,
    notEffective,
    start,
    close,
    confirm,
  }
}
