import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { entitlementSnapshotsApi } from '../api/entitlement-snapshots.api'
import { useEntitlementSnapshotStore } from '../stores/entitlement-snapshot.store'
import { businessToday } from './trialWindowText'
import { readSnapshotPayload, snapshotAsOfNotice } from './snapshotPayload'

/**
 * <b>«¿Qué veía esta empresa el día X?»</b> — la API estable de la consulta de
 * fotos de permisos.
 *
 * <p>Es la pregunta que llega por soporte cuando una clínica dice que el martes
 * no podía entrar a algo. Hoy se contesta mirando el contrato vigente y
 * suponiendo, que es como se acaba dando la razón a quien no la tiene: los
 * permisos se recalculan, y lo que hay hoy no es lo que había el martes. La foto
 * sí lo sabe.
 *
 * <p><b>El día se cierra al final, no al principio.</b> El endpoint pide un
 * `LocalDateTime` y devuelve la última foto <i>en o antes</i> de ese instante.
 * Preguntar por `2026-03-14T00:00:00` devolvería lo que había en la medianoche
 * del 14 —es decir, lo del 13—, y la pregunta que se hace de verdad es «qué veía
 * <b>durante</b> el 14». Por eso se pregunta por el último instante del día:
 * `T23:59:59`. Es un día entero de diferencia en la respuesta, y es exactamente
 * la misma regla del último día incluido que gobierna las ventanas de prueba.
 *
 * <p><b>La zona es la del negocio.</b> `businessToday` viene de
 * `commercial-catalog/composables/priceListValidity.ts` y se importa, no se
 * copia: la zona del negocio tiene un solo dueño en este repositorio.
 */
export function useEntitlementSnapshot() {
  const store = useEntitlementSnapshotStore()
  const { companyId, day, snapshot, missing, loading, error, errorTraceId } = storeToRefs(store)

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * Lo que se pudo leer del `payload`, sin comprometerse con ningún esquema.
   * `null` mientras no haya foto.
   */
  const reading = computed(() =>
    snapshot.value ? readSnapshotPayload(snapshot.value.payload) : null,
  )

  /**
   * El aviso de que la foto es anterior al día preguntado. Cadena vacía cuando
   * cae en el día, y siempre vacío si no hay foto.
   */
  const asOfNotice = computed(() => {
    const current = snapshot.value
    const asked = day.value
    if (!current || !asked) return ''
    return snapshotAsOfNotice(current.recalculatedAt, asked)
  })

  /**
   * Consulta la foto de una empresa a un día. <b>Recarga siempre</b>: nada de
   * caché en una pantalla que existe para resolver una disputa concreta.
   */
  async function load(nextCompanyId: number, nextDay: string) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setQuery(nextCompanyId, nextDay)
    store.setSnapshot(null)
    store.setMissing(false)
    store.setError(null)
    store.setLoading(true)

    try {
      // El último instante del día: la pregunta es «durante el día X», no «a las
      // cero horas del día X». Ver la cabecera del módulo.
      const result = await entitlementSnapshotsApi.findLatestAsOf(
        nextCompanyId,
        `${nextDay}T23:59:59`,
        controller.signal,
      )
      if (controller.signal.aborted) return
      store.setSnapshot(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // Un 404 aquí no es un fallo: es «a esta empresa nunca se le recalcularon
      // los permisos en o antes de ese día». Es un hecho, y uno fuerte.
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        store.setMissing(true)
        return
      }
      store.setError(
        getProblemDetailMessage(err, 'No se pudo consultar la foto de permisos'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /** La foto de hoy, en la zona del negocio. */
  function loadToday(nextCompanyId: number) {
    return load(nextCompanyId, businessToday())
  }

  onUnmounted(() => request?.abort())

  return {
    companyId,
    day,
    snapshot,
    missing,
    reading,
    asOfNotice,
    loading,
    error,
    errorTraceId,
    load,
    loadToday,
    reset: store.reset,
  }
}
