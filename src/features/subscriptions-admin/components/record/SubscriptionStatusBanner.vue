<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'

/**
 * El aviso de una cuenta vencida o en solo lectura: <b>vive en el expediente y en
 * las seis sub-vistas, no en un toast</b> (§3.4.3).
 *
 * <p>Es una condición permanente de la cuenta, no un suceso, así que va con
 * `role="status"` —educado— y no con `role="alert"`, que interrumpe. Es la regla
 * ya fijada en `docs/ux/patron-de-mensajes.md` §4: un toast desaparece y esto
 * tiene que seguir ahí mientras la cuenta lo esté.
 *
 * <p><b>Ni el color ni el icono comunican solos.</b> El texto de apoyo dice la
 * situación completa —desde cuándo debe, cuántos días de cortesía le quedan, o
 * que conserva la consulta y la impresión— porque un fondo ámbar no se puede leer
 * por teléfono a un cliente (§5.2).
 *
 * <p>La salida primaria es «Registrar pago», que vive en `/dinero` (W2-E). Si esa
 * sub-vista todavía no está registrada, <b>el botón no se pinta</b>: un enlace a
 * una ruta que no existe es peor que no ofrecer la salida, y pintarlo
 * deshabilitado sería prometer una pantalla que no hay.
 */
const props = defineProps<{
  tone: 'warning' | 'error'
  text: string
  companyId: number
  subscriptionId: number
}>()

const moneyTab = computed(() => subscriptionRecordTabs.find((tab) => tab.segment === 'dinero'))

const bannerClass = computed(() =>
  props.tone === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)

const icon = computed(() => (props.tone === 'error' ? ICONS.ERROR : ICONS.WARNING))
</script>

<template>
  <div class="ds-banner" :class="bannerClass" role="status">
    <component :is="icon" :size="16" class="ds-banner-icon" />
    <span class="ds-flex-fill">{{ text }}</span>
    <RouterLink
      v-if="moneyTab"
      class="ds-btn ds-btn--ghost ds-btn--sm"
      :to="{
        name: moneyTab.routeName,
        params: { companyId: String(companyId), id: String(subscriptionId) },
      }"
    >
      <component :is="ICONS.RECEIPT" :size="14" />
      Registrar pago
    </RouterLink>
  </div>
</template>
