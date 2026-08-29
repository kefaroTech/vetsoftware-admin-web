import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { companiesApi } from '../api/companies.api'

/**
 * <b>El nombre de una empresa, resuelto en cliente y cacheado por sesión.</b>
 *
 * ── El problema ───────────────────────────────────────────────────────────
 *
 * Todo el bloque del dinero identifica a los clientes por número.
 * `BillingDocumentResponse`, `SubscriptionPaymentResponse`,
 * `DunningEventResponse` y otros nueve exponen `companyId: integer` y nada más,
 * mientras `QuoteSummaryResponse` sí trae `company: CompanySummary`. El contrato
 * es inconsistente consigo mismo y convierte la lista de trabajo del cierre de
 * mes en una columna de números opacos: el operador trabaja con `#42`, `#117`,
 * `#3` y tiene que memorizar o abrir una segunda pestaña por cada fila que
 * quiera entender. Es el mayor coste diario de estas pantallas.
 *
 * ── Por qué ahora sí se resuelve, si antes se descartó ────────────────────
 *
 * `CompanyRef` documentaba la objeción: «no se resuelve el nombre con una
 * llamada por fila: 20 peticiones por página es peor que el problema». Es cierto
 * <b>sin caché</b>. Con caché no: una página son ≤20 filas y normalmente muchas
 * menos empresas distintas que filas, y <b>las mismas clínicas se repiten en las
 * diez pantallas del bloque</b>, así que la página 2 y las otras nueve pantallas
 * cuestan cero peticiones. El coste es una ráfaga acotada la primera vez y nada
 * después.
 *
 * ── El ciclo de vida, que es lo delicado ──────────────────────────────────
 *
 * Esto es una caché de datos de <b>otras</b> empresas dentro de una consola de
 * plataforma, así que la pregunta no es cuánto dura sino <b>de quién es</b>.
 *
 * <ul>
 *   <li><b>Es de la sesión, no de la aplicación.</b> `sessionUserId` guarda quién
 *       llenó la caché. Si `ensure()` se llama con otro usuario en sesión —un
 *       relevo de turno que entra sin recargar la pestaña— la caché se tira
 *       entera antes de resolver nada. No basta con confiar en que el logout
 *       recargue: `redirectToLogin()` hace `location.href` y sí recarga, pero
 *       solo cuando la ruta actual no es ya `/login`, y la corrección no debe
 *       depender de esa esquina.</li>
 *   <li><b>No se persiste.</b> Nada de `localStorage`: vive en la instancia de
 *       Pinia y muere con la pestaña. Además, solo `storageService` toca el
 *       almacenamiento del navegador.</li>
 *   <li><b>Sin sesión no se resuelve nada.</b> Con `userId` a `null` `ensure()`
 *       vuelve sin pedir: la pantalla de login no dispara peticiones.</li>
 *   <li><b>Un fallo se recuerda.</b> Un 403/404/red guarda `null` para ese id y
 *       no se reintenta en toda la sesión: sin eso, una empresa a la que este
 *       operador no tiene acceso generaría una petición fallida por cada fila y
 *       por cada página. `refresh()` está para forzar el reintento cuando de
 *       verdad haga falta.</li>
 * </ul>
 *
 * ── R14: hueco honesto, nunca un nombre inventado ─────────────────────────
 *
 * `null` significa «se intentó y no se pudo», y `CompanyRef` lo pinta como el
 * `#42` de siempre — no como «(desconocida)», que parece un dato. Un id ausente
 * del mapa significa «todavía no se ha intentado». Los dos casos se ven igual en
 * pantalla, y esa es justamente la propiedad que hace la mejora barata: si el
 * endpoint falla, la pantalla queda <b>exactamente como estaba antes</b>.
 *
 * ── Lo que esto NO sustituye ──────────────────────────────────────────────
 *
 * El arreglo de raíz es del contrato: `CompanySummary` embebido en los DTO del
 * dinero, como ya hace `QuoteSummaryResponse`. Esta caché mitiga la lectura;
 * <b>no</b> permite buscar por nombre en el servidor, que es lo que los dos
 * selectores de alcance necesitan.
 *
 * <p><b>No se prellena con `GET /companies` paginado.</b> Ese listado tiene el
 * sesgo conocido de no devolver empresas deshabilitadas, y prellenar con él
 * dejaría a las deshabilitadas como «no resueltas» de forma permanente,
 * indistinguibles de un fallo de red. `GET /companies/{id}` una a una, cacheado,
 * es la vía segura.
 */
export const useCompanyNamesStore = defineStore('companyNames', () => {
  /**
   * `id → nombre`. `null` = se intentó y no se pudo, y no se reintenta. Un id
   * ausente = todavía no se ha intentado.
   */
  const names = ref<Record<number, string | null>>({})

  /** Quién llenó la caché. Cambiar de operador la invalida entera. */
  const sessionUserId = ref<number | null>(null)

  /**
   * Peticiones en vuelo, por id. Es un `Map` normal y no un `ref`: nadie lo
   * pinta, y hacerlo reactivo solo añadiría invalidaciones. Vive <b>dentro</b>
   * del setup store, no a nivel de módulo, así que no es el singleton de módulo
   * que la regla de Pinia prohíbe: se crea y se destruye con la instancia del
   * store igual que `names`.
   */
  const inflight = new Map<number, Promise<void>>()

  /** Tira la caché entera. La llama el cambio de sesión; expuesta para los tests. */
  function reset() {
    names.value = {}
    sessionUserId.value = null
    inflight.clear()
  }

  async function resolve(id: number): Promise<void> {
    try {
      const company = await companiesApi.findById(id, { silent: true })
      names.value = { ...names.value, [id]: company.name }
    } catch {
      // Se intentó y no se pudo. Se recuerda el intento —para no repetirlo por
      // cada fila— y NO se inventa un nombre: la fila seguirá diciendo `#42`.
      names.value = { ...names.value, [id]: null }
    } finally {
      inflight.delete(id)
    }
  }

  /**
   * Resuelve solo los que faltan. Idempotente y sin ráfagas duplicadas: veinte
   * filas de la misma empresa comparten una sola petición.
   *
   * <p>No lanza nunca: un nombre que no se pudo resolver no puede tumbar la
   * pantalla que lo pedía de adorno.
   */
  async function ensure(ids: readonly number[]): Promise<void> {
    const userId = useAuthStore().userId
    if (userId === null) return
    if (sessionUserId.value !== userId) {
      reset()
      sessionUserId.value = userId
    }

    const pending: Promise<void>[] = []
    for (const id of new Set(ids)) {
      if (!Number.isInteger(id) || id <= 0) continue
      if (id in names.value) continue
      const already = inflight.get(id)
      if (already) {
        pending.push(already)
        continue
      }
      const request = resolve(id)
      inflight.set(id, request)
      pending.push(request)
    }
    await Promise.all(pending)
  }

  /** Olvida lo que se sabe de esos ids y vuelve a pedirlo. Para tras un renombrado. */
  async function refresh(ids: readonly number[]): Promise<void> {
    const olvidar = new Set<number>(ids)
    names.value = Object.fromEntries(
      Object.entries(names.value).filter(([id]) => !olvidar.has(Number(id))),
    )
    await ensure(ids)
  }

  return { names, sessionUserId, ensure, refresh, reset }
})
