import { ref } from 'vue'
import { adminPermissionPublishApi } from '../api/admin-permission-publish.api'
import { useNotification } from '@/composables/useNotification'
import type { PublishAdminPermissionsResponse } from '../types/admin-permission-publish.types'

export function useAdminPermissionPublish() {
  const isPublishing = ref(false)
  const lastResult = ref<PublishAdminPermissionsResponse | null>(null)
  const { notify, notifyError } = useNotification()

  async function publish() {
    isPublishing.value = true
    try {
      const data = await adminPermissionPublishApi.publish()
      lastResult.value = data
      notify(
        `Publicado: ${data.companiesUpdated} de ${data.companiesProcessed} companies actualizadas, ` +
          `${data.permissionsCreated} permisos creados, ${data.rolePermissionsCreated} vínculos creados.`,
        'success',
      )
      return data
    } catch (e) {
      notifyError('Error al publicar los permisos a los ADMIN', e)
      return null
    } finally {
      isPublishing.value = false
    }
  }

  return { publish, isPublishing, lastResult }
}
