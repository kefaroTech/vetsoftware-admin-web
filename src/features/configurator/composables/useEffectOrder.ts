import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import { useConfiguratorStore } from '../stores/configurator.store'
import { configuratorEffectsApi } from '../api/configurator.api'
import { CONSEQUENCE_LIVE } from './useConfiguratorEditor'
import {
  applicationOrder,
  conflictedEffectIds,
  effectConflicts,
  moveByOne,
  orderChanged,
  toPriorityPayload,
} from './effect-order'
import type { ConfiguratorEffectResponse } from '../types/configurator.types'

/**
 * El bloque reordenable de los efectos.
 *
 * <p><b>Estado en Pinia, como manda el repositorio.</b> El borrador del orden
 * —la lista de ids que el operador está arreglando— vive en
 * `configurator.store.ts`; aquí solo se lee con `storeToRefs` y se concentra la
 * lógica de red y de avisos, que es el patrón de `useSpecies`/`useBreeds`. No
 * hay ni un `ref` a nivel de módulo.
 *
 * <p><b>Guardar es una escritura en vivo, igual que el resto del
 * configurador</b>: no hay borrador en el servidor, así que el nuevo orden lo ve
 * el siguiente prospecto al instante. La confirmación lo repite con
 * {@link CONSEQUENCE_LIVE} en vez de tener su propio texto, porque decir lo mismo
 * de dos maneras es como se deja de leer.
 */
export function useEffectOrder() {
  const store = useConfiguratorStore()
  const { effects, effectOrderDraft, truncated, catalogItemById } = storeToRefs(store)
  const { success, errorFrom } = useToast()
  const { confirm } = useConfirmDialog()

  /** Lo guardado, en el orden en que el backend lo aplica. */
  const savedOrder = computed(() => applicationOrder(effects.value))

  /**
   * Lo que se pinta: el borrador si lo hay, y si no lo guardado.
   *
   * <p>El borrador se reconcilia contra los efectos actuales en vez de creerse a
   * ciegas: si otra pestaña dio de baja un efecto mientras este orden estaba a
   * medias, ese id ya no existe y pintarlo sería inventar una fila. Los efectos
   * nuevos que el borrador no conoce se añaden al final, que es donde el
   * servidor los habría puesto.
   */
  const ordered = computed<ConfiguratorEffectResponse[]>(() => {
    if (effectOrderDraft.value.length === 0) return savedOrder.value
    const byId = new Map(effects.value.map((effect) => [effect.id, effect]))
    const kept: ConfiguratorEffectResponse[] = []
    for (const id of effectOrderDraft.value) {
      const effect = byId.get(id)
      if (effect) {
        kept.push(effect)
        byId.delete(id)
      }
    }
    for (const effect of savedOrder.value) {
      if (byId.has(effect.id)) kept.push(effect)
    }
    return kept
  })

  const conflicts = computed(() => effectConflicts(ordered.value))
  const conflictedIds = computed(() => conflictedEffectIds(conflicts.value))
  /** Las disputas que hoy dejan al prospecto SIN el artículo. Son las urgentes. */
  const losingConflicts = computed(() => conflicts.value.filter((conflict) => conflict.losesIt))

  const dirty = computed(() => orderChanged(ordered.value, effects.value))

  /**
   * Reordenar con la lista recortada renumeraría también lo que no se ve, y lo
   * que no se ve se llevaría prioridades calculadas sobre una lista incompleta.
   * Con el techo alcanzado se mira, no se toca.
   */
  const canReorder = computed(() => !truncated.value && ordered.value.length > 1)

  function move(index: number, delta: -1 | 1) {
    if (!canReorder.value) return
    store.setEffectOrderDraft(moveByOne(ordered.value, index, delta).map((effect) => effect.id))
  }

  function reset() {
    store.clearEffectOrderDraft()
  }

  /** Guarda el orden visible. Devuelve `false` si se canceló o si el servidor lo rechazó. */
  async function save(): Promise<boolean> {
    if (!dirty.value || !canReorder.value) return false
    const accepted = await confirm({
      message: '¿Guardar este orden de aplicación?',
      consequence: `${CONSEQUENCE_LIVE} El orden decide qué efecto manda cuando dos tocan el mismo artículo.`,
      confirmLabel: 'Guardar el orden',
    })
    if (!accepted) return false

    try {
      const updated = await configuratorEffectsApi.reorder({
        priorities: toPriorityPayload(ordered.value),
      })
      store.setEffects(updated)
      store.clearEffectOrderDraft()
      success('Orden de aplicación guardado')
      return true
    } catch (error) {
      // El borrador NO se limpia: si la escritura falló, lo reordenado sigue
      // siendo trabajo del operador y perderlo obligaría a rehacerlo a ciegas.
      errorFrom('Error al guardar el orden de aplicación', error)
      return false
    }
  }

  return {
    ordered,
    savedOrder,
    conflicts,
    conflictedIds,
    losingConflicts,
    dirty,
    canReorder,
    truncated,
    catalogItemById,
    move,
    reset,
    save,
  }
}
