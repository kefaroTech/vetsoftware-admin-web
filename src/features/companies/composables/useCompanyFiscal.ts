import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { companyFiscalApi } from '../api/company-fiscal.api'
import { useCompanyFiscalStore } from '../stores/company-fiscal.store'
import { resolutionUsage, resolutionWarnings, type ResolutionUsage } from './companyFiscalText'
import type { NumberingResolutionResponse } from '../types/company-fiscal.types'

/** Una resolución con su cuenta y sus avisos ya hechos, para que el SFC no calcule nada. */
export interface ResolutionRow {
  resolution: NumberingResolutionResponse
  usage: ResolutionUsage
  warnings: string[]
}

/**
 * <b>La API estable de la pestaña «Fiscal» del expediente de empresa (§I7).</b>
 *
 * <p>Carga las tres cosas que el contrato de hoy sí sabe decir de la facturación
 * de una clínica —su perfil fiscal, sus resoluciones de numeración y sus tarifas
 * de retención— y expone las resoluciones <b>ya ordenadas por urgencia y con sus
 * avisos calculados</b>, para que los SFC no tengan lógica y quepan holgadamente
 * bajo el techo de 500 líneas.
 *
 * <p><b>Las tres peticiones van en paralelo y cada una lleva su propio error.</b>
 * Encadenarlas triplicaría la espera; un error compartido convertiría el fallo de
 * una sección en una pantalla vacía.
 *
 * <p><b>Sin toast.</b> Los tres fallos se pintan dentro de la sección que se queda
 * sin datos, que es donde se entienden. Un toast que dice «no se pudo cargar» sin
 * decir qué, sobre una pantalla con cuatro bloques, no informa de nada — y se va,
 * mientras el hueco sigue ahí. El mensaje sale siempre del `ProblemDetail`
 * (`getProblemDetailMessage`) y nunca se escribe a mano: hacerlo tira la traza.
 *
 * <p><b>Este composable no escribe.</b> No es un olvido: ver
 * `TAX_PROFILE_HISTORY_GAP` en `companyFiscalText.ts`.
 *
 * <p>Nada de `ref()` a nivel de módulo: el estado compartido vive en
 * `company-fiscal.store.ts` y aquí solo hay referencias locales a esta llamada de
 * la función —los tres `AbortController`—, que es estado por instancia y no
 * singleton.
 */
export function useCompanyFiscal() {
  const store = useCompanyFiscalStore()
  const {
    profile,
    profileLoaded,
    loadingProfile,
    profileError,
    resolutions,
    loadingResolutions,
    resolutionsError,
    withholding,
    withholdingLoaded,
    loadingWithholding,
    withholdingError,
  } = storeToRefs(store)

  // Por instancia del composable, no singletons de módulo.
  let profileRequest: AbortController | null = null
  let resolutionsRequest: AbortController | null = null
  let withholdingRequest: AbortController | null = null

  /** `true` solo cuando el servidor ya dijo que no hay perfil. Ver el store. */
  const hasNoProfile = computed(() => profileLoaded.value && profile.value === null)
  const hasNoWithholding = computed(() => withholdingLoaded.value && withholding.value === null)

  /**
   * Las resoluciones con su cuenta hecha y <b>ordenadas por urgencia</b>: primero
   * las que tienen algo que avisar, y dentro de ésas la que caduca antes.
   *
   * <p>El orden no es cosmético. Una clínica puede tener cuatro resoluciones y la
   * que importa es la que se va a agotar el jueves; dejarla la tercera porque el
   * backend devolvió por `id` es esconderla. Una resolución sin `validTo`
   * parseable se va al final en vez de colarse la primera con un cero.
   */
  const resolutionRows = computed<ResolutionRow[]>(() => {
    const hoy = new Date()
    return resolutions.value
      .map((resolution) => {
        const usage = resolutionUsage(resolution, hoy)
        return { resolution, usage, warnings: resolutionWarnings(usage) }
      })
      .sort((a, b) => {
        if (a.warnings.length !== b.warnings.length) return b.warnings.length - a.warnings.length
        const diasA = a.usage.daysLeft ?? Number.POSITIVE_INFINITY
        const diasB = b.usage.daysLeft ?? Number.POSITIVE_INFINITY
        return diasA - diasB
      })
  })

  /** Cuántas piden atención. Es el número del titular de la sección. */
  const resolutionsNeedingAttention = computed(
    () => resolutionRows.value.filter((row) => row.warnings.length > 0).length,
  )

  /** <b>Recarga siempre al abrir la pestaña.</b> Regla dura del proyecto. */
  async function load(companyId: number) {
    store.reset()
    await Promise.all([
      loadProfile(companyId),
      loadResolutions(companyId),
      loadWithholding(companyId),
    ])
  }

  async function loadProfile(companyId: number) {
    profileRequest?.abort()
    const controller = new AbortController()
    profileRequest = controller
    store.setLoadingProfile(true)
    store.setProfileError(null)
    try {
      const result = await companyFiscalApi.findTaxProfile(companyId, controller.signal)
      if (!controller.signal.aborted) store.setProfile(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setProfileError(getProblemDetailMessage(err, 'No se pudo leer el perfil fiscal'))
    } finally {
      if (profileRequest === controller) {
        store.setLoadingProfile(false)
        profileRequest = null
      }
    }
  }

  async function loadResolutions(companyId: number) {
    resolutionsRequest?.abort()
    const controller = new AbortController()
    resolutionsRequest = controller
    store.setLoadingResolutions(true)
    store.setResolutionsError(null)
    try {
      const result = await companyFiscalApi.listNumberingResolutions(companyId, controller.signal)
      if (!controller.signal.aborted) store.setResolutions(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setResolutionsError(
        getProblemDetailMessage(err, 'No se pudieron leer las resoluciones de numeración'),
      )
    } finally {
      if (resolutionsRequest === controller) {
        store.setLoadingResolutions(false)
        resolutionsRequest = null
      }
    }
  }

  async function loadWithholding(companyId: number) {
    withholdingRequest?.abort()
    const controller = new AbortController()
    withholdingRequest = controller
    store.setLoadingWithholding(true)
    store.setWithholdingError(null)
    try {
      const result = await companyFiscalApi.findWithholdingConfig(companyId, controller.signal)
      if (!controller.signal.aborted) store.setWithholding(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setWithholdingError(
        getProblemDetailMessage(err, 'No se pudieron leer las tarifas de retención'),
      )
    } finally {
      if (withholdingRequest === controller) {
        store.setLoadingWithholding(false)
        withholdingRequest = null
      }
    }
  }

  onUnmounted(() => {
    profileRequest?.abort()
    resolutionsRequest?.abort()
    withholdingRequest?.abort()
  })

  return {
    profile,
    hasNoProfile,
    loadingProfile,
    profileError,
    resolutionRows,
    resolutionsNeedingAttention,
    loadingResolutions,
    resolutionsError,
    withholding,
    hasNoWithholding,
    loadingWithholding,
    withholdingError,
    load,
  }
}
