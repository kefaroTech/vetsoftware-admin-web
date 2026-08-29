import { storeToRefs } from 'pinia'
import { useCompanyNamesStore } from '../stores/company-names.store'

/**
 * La fachada estable de la caché de nombres de empresa.
 *
 * <p>Es el patrón de `useSpecies`/`useBreeds`: el store guarda el estado y este
 * composable es lo que consumen los componentes. Aquí gana además una cosa
 * concreta — `nameOf(id)` resuelve la búsqueda, así que `CompanyRef` no necesita
 * saber que detrás hay un mapa reactivo ni cómo se distingue «no se intentó» de
 * «se intentó y no se pudo»: para él los dos son `null` y se pintan igual, que
 * es exactamente lo que R14 pide.
 *
 * <p><b>`nameOf` devuelve el valor, no un `ComputedRef`.</b> Devolver un
 * `computed` recién creado obligaba a construir uno nuevo en cada evaluación del
 * llamador, y cada uno se registra en el `EffectScope` activo: en una tabla que
 * repinta se acumulan hasta desmontar el componente. Leyendo `names.value` dentro
 * del `computed` del llamador la reactividad es exactamente la misma y no queda
 * nada colgando.
 */
export function useCompanyNames() {
  const store = useCompanyNamesStore()
  const { names } = storeToRefs(store)

  /**
   * El nombre resuelto, o `null` mientras no lo haya. `null` cubre los dos
   * huecos honestos a propósito: pendiente y no resuelto se ven igual en
   * pantalla y ninguno inventa un dato.
   */
  function nameOf(id: number): string | null {
    return names.value[id] ?? null
  }

  return {
    names,
    nameOf,
    ensure: store.ensure,
    refresh: store.refresh,
  }
}
