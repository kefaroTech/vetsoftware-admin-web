import axios from 'axios'
import { computed, ref } from 'vue'
import { medicamentsApi } from '../api/medicaments.api'
import { coincide } from '@/composables/text'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import {
  getProblemDetailCode,
  getProblemDetailMessage,
  getTraceId,
  isConcurrencyConflict,
} from '@/services/http/http.client'
import type { CreateGlobalMedicamentRequest, MedicamentResponse } from '../types/medicaments.types'

/** Lo que el formulario devuelve. Dos campos, como el request del backend. */
export interface MedicamentFormData {
  name: string
  description: string
}

/** Código del 409 del índice único, para pintarlo en línea en el campo `name`. */
export const NAME_ALREADY_EXISTS = 'MEDICAMENT_NAME_ALREADY_EXISTS'

function esNoEncontrado(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

/**
 * El vademécum global de la pantalla principal: las dos pestañas y las cuatro
 * mutaciones.
 *
 * ── Por qué `useServerPaged` y no `createCatalogStore` ─────────────────────
 *
 * `createCatalogStore` guarda la colección entera y no tiene `page`, `total` ni
 * `pageCount`; `useServerPaged` sí, y además aborta la petición en vuelo y
 * gestiona el rebote del término. Es el camino que ya tomaron `useCompanies`,
 * `useQuotes`, `useCommercialCatalog` y `useBillingDocumentSequences` en esta
 * consola: el patrón para lo paginado ya existe, y es este.
 *
 * ── Las dos pestañas no son simétricas, y no por gusto ─────────────────────
 *
 * «Activos» viene de `GET /admin/medicaments`: paginado y con búsqueda servida
 * por `q`. «Pausados» viene de `GET /admin/medicaments/disabled`, que devuelve
 * **la lista completa** y **no acepta `q`** — el contrato regenerado no declara
 * ningún parámetro de consulta para esa ruta.
 *
 * Consecuencia: el término de «Pausados» se aplica **en el navegador**, sobre
 * la lista entera. Aquí eso es exhaustivo por construcción, que es exactamente
 * la condición que `docs/ux/patron-de-busqueda-en-listado.md` §5 exige para
 * permitir el filtro en cliente — no hay página 6 en la que esconderse. Y se
 * usa `coincide`, que pliega acentos y caja en los dos lados, el mismo criterio
 * con el que la base decide un choque de nombre (`utf8mb4_0900_ai_ci`); así el
 * usuario ve una sola semántica de búsqueda en las dos pestañas aunque el
 * mecanismo difiera. Si algún día `/disabled` acepta `q`, esta es la única
 * función que cambia.
 *
 * @param initialQuery término con el que arranca el listado, leído de la URL
 * por la vista. Tiene que llegar ANTES de crear `useServerPaged`: si se
 * asignara después, el `watch` del término dispararía una carga de la página 1
 * que abortaría la de la página que pedía el enlace.
 */
export function useMedicaments(initialQuery = '') {
  const { success, errorFrom, warnFrom } = useToast()

  /** Término vigente. Lo escribe la vista y lo vigila `useServerPaged`. */
  const query = ref(initialQuery)

  /**
   * `debounceMs: 0` porque el rebote de 300 ms ya lo hace `AppListSearch` antes
   * de emitir el término; encadenar los dos daría 600 ms y el usuario notaría
   * el retraso. Es la misma decisión —y por el mismo motivo— que `useCompanies`,
   * el único otro listado servido de esta consola. Lo que sí se aprovecha de
   * `useServerPaged` es el `AbortController` y la vuelta automática a la página
   * 1 al cambiar el término, que se consigue pasándolo como `Ref` y **nunca**
   * llamando a `goTo` a mano.
   */
  const activos = useServerPaged<MedicamentResponse>(
    (page, pageSize, q, signal) => medicamentsApi.listAll(page, pageSize, q, signal),
    { query, debounceMs: 0 },
  )

  /* ── Pausados ───────────────────────────────────────────────────────────── */

  const pausados = ref<MedicamentResponse[]>([])
  const pausadosLoading = ref(false)
  const pausadosError = ref<string | null>(null)
  const pausadosErrorTraceId = ref<string | null>(null)

  /**
   * §5.10 · «Invalidar» es marcar la lista como no vigente y volver a pedirla
   * **al entrar en su pestaña**, no de inmediato: refrescar una lista que nadie
   * está mirando gasta una petición y puede pisar un error.
   *
   * Arrancan las dos en `true` porque ninguna se ha pedido todavía.
   */
  const activosCaducado = ref(true)
  const pausadosCaducado = ref(true)

  /** Filas de «Pausados» que casan con el término. Ver la cabecera del composable. */
  const pausadosFiltrados = computed(() =>
    pausados.value.filter((m) => coincide(query.value.trim(), m.name)),
  )

  async function fetchPausados() {
    pausadosLoading.value = true
    pausadosError.value = null
    pausadosErrorTraceId.value = null
    try {
      pausados.value = await medicamentsApi.listDisabled()
      pausadosCaducado.value = false
    } catch (e) {
      // EST-06: el fallo deja rastro para que la tabla pueda pintar su rama de
      // error en vez de decir «no hay registros» tras un 500. El aviso efímero
      // se mantiene además, con su traza.
      pausados.value = []
      pausadosError.value = getProblemDetailMessage(
        e,
        'No se pudieron cargar los medicamentos pausados',
      )
      pausadosErrorTraceId.value = getTraceId(e) ?? null
      errorFrom('Error al cargar los medicamentos pausados', e)
    } finally {
      pausadosLoading.value = false
    }
  }

  /* ── Entrada en una pestaña ─────────────────────────────────────────────── */

  /**
   * Va a una página de «Activos» y da la lista por vigente. Envuelve al `goTo`
   * de `useServerPaged` en vez de exportarlo crudo para que no exista ninguna
   * forma de recargar la lista sin bajar su marca de caducidad: si la hubiera,
   * volver a la pestaña dispararía una segunda petición idéntica.
   */
  function irAPagina(oneBasedPage: number) {
    activosCaducado.value = false
    return activos.goTo(oneBasedPage)
  }

  /** Recarga «Activos» si una mutación la dejó vieja. Conserva el término vigente. */
  async function ensureActivos() {
    if (!activosCaducado.value) return
    await irAPagina(activos.page.value)
  }

  /** Recarga «Pausados» si una mutación la dejó vieja, o si nunca se pidió. */
  async function ensurePausados() {
    if (!pausadosCaducado.value) return
    await fetchPausados()
  }

  /** Recarga la página de «Activos» que el usuario está mirando. */
  function recargarActivos() {
    return irAPagina(activos.page.value)
  }

  /* ── Mutaciones ─────────────────────────────────────────────────────────── */

  /**
   * Alta.
   *
   * **El alta puede resucitar.** `CreateGlobalMedicamentService` busca por
   * nombre incluyendo pausadas y, si la encuentra, la reactiva con el nombre y
   * la descripción recién escritos en vez de insertar otra. Por eso «Pausados»
   * se invalida SIEMPRE: sin esto el usuario cambia de pestaña, ve una fila que
   * ya no está pausada, pulsa «Reactivar» y recibe un 404 sobre algo que tiene
   * delante.
   *
   * El 409 del índice único **no se avisa por toast**: lo pinta el formulario
   * en línea sobre el campo `name`, con el texto literal del servidor. Dos
   * mensajes para el mismo fallo es ruido, y el que importa es el que está
   * junto al campo que hay que corregir.
   */
  async function create(form: MedicamentFormData) {
    const payload: CreateGlobalMedicamentRequest = {
      name: form.name.trim(),
      description: form.description.trim(),
    }
    try {
      const data = await medicamentsApi.create(payload)
      success('Medicamento creado')
      pausadosCaducado.value = true
      await recargarActivos()
      return data
    } catch (e) {
      if (getProblemDetailCode(e) !== NAME_ALREADY_EXISTS) {
        errorFrom('Error al crear el medicamento', e, 'No se pudo crear el medicamento.')
      }
      throw e
    }
  }

  /**
   * Baja lógica. En la interfaz se llama «pausar».
   *
   * Los tres fallos que el backend puede devolver aquí tienen tratamiento
   * propio porque significan cosas distintas:
   *
   *  - **409 con recetas activas** es de alta probabilidad, no un borde raro:
   *    un global lo receta cualquier tenant, y el servicio comprueba las
   *    recetas **sin acotar por empresa** a propósito. El suelo del mensaje
   *    explica la causa aunque el `ProblemDetail` venga escueto.
   *  - **409 de concurrencia** va en tono `warn`: no es un fallo, es que
   *    alguien llegó antes.
   *  - **404** significa que la fila ya no existe o no es global. No se dice
   *    «no tienes permiso»: el backend devuelve 404 a propósito, para no
   *    revelar de quién es la fila.
   */
  async function pausar(id: number) {
    try {
      await medicamentsApi.remove(id)
      success('Medicamento pausado')
      pausadosCaducado.value = true
      // Si era la última fila de la página, quedarse en ella enseñaría un vacío
      // que no lo es: se retrocede una.
      const seQuedaVacia = activos.items.value.length === 1 && activos.page.value > 1
      await irAPagina(seQuedaVacia ? activos.page.value - 1 : activos.page.value)
    } catch (e) {
      if (isConcurrencyConflict(e)) {
        warnFrom('Otro operador editó primero', e)
        await recargarActivos()
      } else if (esNoEncontrado(e)) {
        errorFrom('El medicamento ya no está disponible', e)
        await recargarActivos()
      } else {
        errorFrom(
          'No se pudo pausar el medicamento',
          e,
          'Alguna clínica lo tiene recetado ahora mismo.',
        )
      }
      throw e
    }
  }

  /** Reactivación. Es constructiva y reversible, así que no se confirma. */
  async function reactivar(id: number) {
    try {
      await medicamentsApi.enable(id)
      success('Medicamento reactivado')
      pausados.value = pausados.value.filter((m) => m.id !== id)
      activosCaducado.value = true
    } catch (e) {
      if (isConcurrencyConflict(e)) {
        warnFrom('Otro operador editó primero', e)
        await fetchPausados()
      } else if (esNoEncontrado(e)) {
        errorFrom('El medicamento ya no está disponible', e)
        await fetchPausados()
      } else {
        errorFrom('No se pudo reactivar el medicamento', e, 'No se pudo reactivar el medicamento.')
      }
      throw e
    }
  }

  return {
    query,
    // Activos
    activos: activos.items,
    page: activos.page,
    pageSize: activos.pageSize,
    total: activos.total,
    pageCount: activos.pageCount,
    activosLoading: activos.loading,
    activosError: activos.error,
    activosErrorTraceId: activos.errorTraceId,
    goTo: irAPagina,
    ensureActivos,
    recargarActivos,
    // Pausados
    pausados: pausadosFiltrados,
    /** Coincidencias con el término vigente. */
    pausadosTotal: computed(() => pausadosFiltrados.value.length),
    /** Pausados que hay en total, para que el pie diga «N de M» sin mentir. */
    pausadosCargados: computed(() => pausados.value.length),
    pausadosLoading,
    pausadosError,
    pausadosErrorTraceId,
    ensurePausados,
    fetchPausados,
    // Mutaciones
    create,
    pausar,
    reactivar,
  }
}
