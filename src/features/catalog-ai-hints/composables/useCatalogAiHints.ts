import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { emptyPage } from '@/types/pagination'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getProblemDetailCode,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import { catalogItemsApi } from '@/features/commercial-catalog/api/commercial-catalog.api'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import { catalogAiHintsApi } from '../api/catalog-ai-hints.api'
import { MISSING_PAGE_SIZE, useCatalogAiHintsStore } from '../stores/catalog-ai-hints.store'
import { hintServerError, sujetoCorto } from './hintText'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/** Un fallo del servidor que el operador arregla en el propio formulario. */
export interface HintFormError {
  /** El `code` del `ProblemDetail`, que es lo que distingue los dos 409. */
  code: string
  message: string
  traceId: string | null
}

/** Revisiones por página en la ficha del artículo. */
export const REVISIONS_PAGE_SIZE = 20

/**
 * La API de las pistas del asistente: llamadas, avisos y recargas.
 *
 * <p>`catalogItemId` solo lo pasa la ficha del artículo; el listado lo omite y
 * `revisions` se queda inerte con una página vacía, igual que `catalogPrices`
 * en `useCommercialCatalog` cuando no hay lista seleccionada.
 */
export function useCatalogAiHints(catalogItemId?: Ref<number | null>) {
  const store = useCatalogAiHintsStore()
  const { missingItems, missingLoading, missingError, missingTraceId } = storeToRefs(store)
  const auth = useAuthStore()
  const { success, errorFrom } = useToast()

  /** Quién está operando, para escribir «tú (usuario #id)» donde sea cierto. */
  const meId = computed<number | null>(() => auth.me?.id ?? auth.userId ?? null)

  const hints = useServerPaged<CatalogItemAiHintResponse>(
    (page, pageSize, _query, signal) => catalogAiHintsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )

  const revisions = useServerPaged<CatalogItemAiHintResponse>(
    (page, pageSize, _query, signal) => {
      const id = catalogItemId?.value
      return id
        ? catalogAiHintsApi.listByCatalogItem(id, page, pageSize, signal)
        : Promise.resolve(emptyPage<CatalogItemAiHintResponse>(pageSize))
    },
    { pageSize: REVISIONS_PAGE_SIZE, debounceMs: 0 },
  )

  /**
   * Reparte un fallo del servidor según la regla de §11: lo que se arregla
   * editando el formulario vuelve para pintarse en su `ErrorSummary`; todo lo
   * demás sale por `errorFrom`, que conserva el `X-Trace-Id`. Devolver `null`
   * significa «ya avisé yo».
   */
  function formErrorFrom(title: string, error: unknown): HintFormError | null {
    const code = getProblemDetailCode(error)
    const message = hintServerError(code)
    if (code === null || message === null) {
      errorFrom(title, error)
      return null
    }
    return { code, message, traceId: getTraceId(error) ?? null }
  }

  /** Recorre todas las páginas de una colección paginada del backend. */
  async function fetchAll<T>(
    loader: (page: number, pageSize: number) => Promise<{ content: T[]; totalPages: number }>,
  ): Promise<T[]> {
    const items: T[] = []
    let page = 0
    let totalPages = 1
    while (page < totalPages) {
      const result = await loader(page, MISSING_PAGE_SIZE)
      items.push(...result.content)
      totalPages = result.totalPages
      page += 1
    }
    return items
  }

  /**
   * Los artículos a la venta que el asistente NO puede proponer.
   *
   * <p>Se filtra por `enabled && status === 'ACTIVE'` porque ese es exactamente
   * el criterio de la guarda de publicación del backend: listar aquí un artículo
   * en borrador ofrecería un botón que el servidor rechaza con un 404.
   */
  async function deriveMissing(): Promise<CatalogItemResponse[]> {
    const [items, publicadas] = await Promise.all([
      fetchAll((page, pageSize) => catalogItemsApi.listAll(page, pageSize)),
      fetchAll((page, pageSize) => catalogAiHintsApi.listAll(page, pageSize)),
    ])
    const conPista = new Set(publicadas.map((hint) => hint.catalogItemId))
    return items.filter(
      (item) => item.enabled && item.status === 'ACTIVE' && !conPista.has(item.id),
    )
  }

  async function loadMissing(force = false) {
    try {
      await store.loadMissing(deriveMissing, force)
      store.setMissingError(null)
    } catch (error) {
      store.setMissingError(
        getProblemDetailMessage(error, 'No se pudo calcular qué artículos no tienen pista'),
        getTraceId(error) ?? null,
      )
    }
  }

  /** Tras publicar o retirar cambian las dos colecciones, así que se recargan las dos. */
  async function refreshAll() {
    store.invalidateMissing()
    await hints.reload()
    if (store.missingLoaded) await loadMissing(true)
  }

  async function publishHint(
    catalogItem: number,
    hintText: string,
    codigo: string,
  ): Promise<HintFormError | null> {
    try {
      await catalogAiHintsApi.create({ catalogItemId: catalogItem, hintText })
      success(`Pista publicada. El asistente ya puede proponer ${codigo}.`)
      await refreshAll()
      return null
    } catch (error) {
      return formErrorFrom('No se pudo publicar la pista', error)
    }
  }

  async function reviseHint(catalogItem: number, hintText: string): Promise<HintFormError | null> {
    try {
      const revision = await catalogAiHintsApi.update(catalogItem, { hintText })
      success(`Revisión ${revision.hintRevision} publicada. Rige desde ahora.`)
      await refreshAll()
      return null
    } catch (error) {
      return formErrorFrom('No se pudo publicar la revisión', error)
    }
  }

  async function retireHint(hint: CatalogItemAiHintResponse): Promise<HintFormError | null> {
    try {
      await catalogAiHintsApi.remove(hint.catalogItemId)
      success(`Pista retirada. El asistente deja de proponer ${sujetoCorto(hint)}.`)
      await refreshAll()
      return null
    } catch (error) {
      return formErrorFrom('No se pudo retirar la pista', error)
    }
  }

  /** La pista vigente de un artículo, o `null` si el servidor dice que no tiene. */
  async function findCurrentHint(id: number): Promise<CatalogItemAiHintResponse | null> {
    try {
      return await catalogAiHintsApi.findById(id)
    } catch {
      return null
    }
  }

  /**
   * El artículo, cuando su historial viene vacío y no hay de dónde sacar el
   * código ni el nombre. Es una llamada de respaldo, no del camino feliz.
   */
  async function findCatalogItem(id: number): Promise<CatalogItemResponse | null> {
    try {
      return await catalogItemsApi.findById(id)
    } catch {
      return null
    }
  }

  return {
    hints,
    revisions,
    meId,
    missingItems,
    missingLoading,
    missingError,
    missingTraceId,
    loadMissing,
    refreshAll,
    publishHint,
    reviseHint,
    retireHint,
    findCatalogItem,
    findCurrentHint,
  }
}
