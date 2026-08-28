import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyEntitlementSnapshotResponse } from '@/features/company-limits/types/company-limits.types'

/**
 * <b>La foto de permisos que se está consultando</b>: de qué empresa, de qué día,
 * y qué devolvió el servidor.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md · «SIEMPRE Pinia»)—, y aquí el
 * store gana además algo concreto: la consulta se hace desde la pantalla de
 * plataforma, pero la pregunta nace casi siempre en el expediente de una empresa
 * («esta clínica dice que el martes no veía hospitalización»). Guardar empresa y
 * día en un store deja que las dos pantallas hablen de la misma foto en vez de
 * cada una de la suya.
 *
 * <p><b>La empresa y el día se guardan junto a la respuesta, no aparte.</b> Lo que
 * se está mirando es «la foto de la empresa 42 el 14 de marzo»; si los tres datos
 * no viajan juntos, una respuesta lenta de la consulta anterior se pinta bajo el
 * rótulo de la nueva y se acaba respondiendo por la empresa equivocada.
 *
 * <p><b>`missing` es un estado, no la ausencia de otro.</b> Una empresa cuyos
 * permisos nunca se han recalculado responde 404, y eso no es un fallo: es la
 * respuesta, y es un dato fuerte —significa que nunca hubo cálculo, no que la
 * consulta se rompiera—. Guardarlo aparte de `error` es lo que permite decirlo
 * con palabras en vez de con un banner rojo y una traza que no lleva a ninguna
 * parte.
 */
export const useEntitlementSnapshotStore = defineStore('entitlementSnapshot', () => {
  const companyId = ref<number | null>(null)
  /** `yyyy-MM-dd` en la zona del negocio. El día por el que se preguntó. */
  const day = ref<string | null>(null)
  const snapshot = ref<CompanyEntitlementSnapshotResponse | null>(null)
  const missing = ref(false)

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setQuery(nextCompanyId: number | null, nextDay: string | null) {
    companyId.value = nextCompanyId
    day.value = nextDay
  }

  function setSnapshot(value: CompanyEntitlementSnapshotResponse | null) {
    snapshot.value = value
    missing.value = value === null
  }

  function setMissing(value: boolean) {
    missing.value = value
    if (value) snapshot.value = null
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /** Deja la consulta en blanco. Se llama al desmontar la pantalla. */
  function reset() {
    companyId.value = null
    day.value = null
    snapshot.value = null
    missing.value = false
    loading.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    day,
    snapshot,
    missing,
    loading,
    error,
    errorTraceId,
    setQuery,
    setSnapshot,
    setMissing,
    setLoading,
    setError,
    reset,
  }
})
