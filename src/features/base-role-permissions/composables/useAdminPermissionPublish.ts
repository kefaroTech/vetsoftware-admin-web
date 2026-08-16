import { ref } from 'vue'
import { adminPermissionPublishApi } from '../api/admin-permission-publish.api'
import { useToast } from '@/composables/useToast'
import type { PublishAdminPermissionsResponse } from '../types/admin-permission-publish.types'

export function useAdminPermissionPublish() {
  const isPublishing = ref(false)
  const lastResult = ref<PublishAdminPermissionsResponse | null>(null)
  const { success, errorFrom } = useToast()

  async function publish() {
    isPublishing.value = true
    try {
      const data = await adminPermissionPublishApi.publish()
      lastResult.value = data
      success(
        'Permisos publicados',
        `${data.companiesUpdated} de ${data.companiesProcessed} empresas actualizadas, ` +
          `${data.permissionsCreated} permisos creados, ${data.rolePermissionsCreated} vínculos creados.`,
      )
      return data
    } catch (e) {
      errorFrom('Error al publicar los permisos a los ADMIN', e)
      return null
    } finally {
      isPublishing.value = false
    }
  }

  return { publish, isPublishing, lastResult }
}
