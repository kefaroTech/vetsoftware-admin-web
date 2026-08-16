import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfigStore } from '../stores/config.store'
import { configApi } from '../api/config.api'
import { UVT_PROPERTY } from '../types/config.types'
import { useNotification } from '@/composables/useNotification'

export function useSystemConfig() {
  const store = useConfigStore()
  const { configs, loading } = storeToRefs(store)
  const { notify } = useNotification()

  /** Fila de configuración del UVT (o null si aún no existe). */
  const uvtConfig = computed(
    () => configs.value.find((c) => c.propertyName === UVT_PROPERTY) ?? null,
  )
  /** Valor numérico del UVT vigente (0 si no hay configuración). */
  const uvtValue = computed(() => Number(uvtConfig.value?.value ?? 0))

  async function fetch() {
    store.setLoading(true)
    try {
      const data = await configApi.listAll()
      store.setConfigs(data ?? [])
    } catch {
      // 404/red: sin configuración; se permite crearla con el primer guardado (upsert).
      store.setConfigs([])
    } finally {
      store.setLoading(false)
    }
  }

  async function saveUvt(value: number) {
    const data = await configApi.set({ propertyName: UVT_PROPERTY, value: String(value) })
    store.upsertConfig(data)
    notify('Valor de la UVT actualizado', 'success')
    return data
  }

  return { configs, uvtConfig, uvtValue, loading, fetch, saveUvt }
}
