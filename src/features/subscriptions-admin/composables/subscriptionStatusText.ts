import { formatDate, parseISODate } from '@/composables/format'
import type {
  BillingCycle,
  SubscriptionResponse,
  SubscriptionStatus,
} from '../types/subscriptions-admin.types'
import type {
  SubscriptionStatusChangeReason,
  SubscriptionStatusTransition,
} from '../types/subscription-record.types'

/**
 * El vocabulario del estado de una cuenta, fijado en §3.4 de
 * `docs/ux/suscripciones-consola-especificacion.md`. <b>No se improvisa aquí ni
 * en ninguna pantalla.</b>
 *
 * <p><b>La política que estos textos renderizan es innegociable</b>: no existe,
 * ni existirá, un estado de corte total de acceso. Un moroso baja a solo lectura
 * y <b>nunca</b> pierde la consulta de su propia historia clínica — es riesgo
 * legal, no una preferencia de producto. De ahí que:
 *
 * <ul>
 *   <li>las palabras «bloquear», «suspender el acceso», «cortar», «desactivar la
 *       cuenta» e «inhabilitar» estén prohibidas en toda la consola, y
 *       `tests/unit/subscription-record.spec.ts` lo comprueba sobre todo lo que
 *       exporta este módulo;</li>
 *   <li>`READ_ONLY` se lea «Solo lectura» y venga siempre con su frase de apoyo,
 *       que es la política escrita: «Consulta e impresión activas. Conserva el
 *       acceso a su historia clínica.»;</li>
 *   <li>no exista un desplegable con los seis estados: hay transiciones con
 *       nombre, cada una con su consecuencia y un motivo obligatorio.</li>
 * </ul>
 *
 * <p>Este módulo es puro: funciones y datos, sin estado. El rótulo y el tono del
 * distintivo siguen viviendo en `SubscriptionStatusBadge.vue`, que ya era
 * correcto y no se toca.
 */

/**
 * El ciclo de facturación, en castellano. Vive aquí —con el resto del
 * vocabulario del contrato en pantalla— y no como constante local de cada vista:
 * lo pintan la lista de contratos y la cabecera del expediente, y dos copias del
 * mismo mapa es como acaban divergiendo dos pantallas del mismo dato.
 */
export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

/**
 * El motivo de un cambio de estado, en castellano legible para el operador. El
 * valor que viaja por HTTP es la clave de este mapa —el nombre del enum de
 * `SubscriptionStatusChangeReason` en mayúsculas—; esto es solo lo que se lee
 * en el desplegable de `StatusTransitionModal.vue` (§ vocabulario cerrado,
 * antes texto libre — ver `subscription-record.types.ts`).
 */
export const SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL: Record<
  SubscriptionStatusChangeReason,
  string
> = {
  OVERDUE_BALANCE: 'Saldo vencido',
  PAYMENT_RECEIVED: 'Pago recibido',
  TRIAL_ENDED: 'Fin del periodo de prueba',
  CANCELLATION_EFFECTIVE: 'Fecha efectiva de la baja',
  PERIOD_EXPIRED: 'Periodo vencido sin renovar',
  MANUAL: 'Decisión manual de plataforma',
}

/** Las mismas seis, listas para `AppSelect`. El orden es el del enum de Java. */
export const SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS: {
  value: SubscriptionStatusChangeReason
  label: string
}[] = (
  Object.keys(SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL) as SubscriptionStatusChangeReason[]
).map((value) => ({ value, label: SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL[value] }))

/**
 * Días de cortesía que le quedan a una cuenta vencida.
 *
 * <p>`graceDays` cuenta desde `pastDueSince`. Devuelve `null` si falta alguno de
 * los dos datos —no se inventa un número— y `0` si ya se agotaron: decir «le
 * quedan −3 días» es peor que decir que se acabaron.
 */
export function graceDaysLeft(
  subscription: SubscriptionResponse,
  today = new Date(),
): number | null {
  const since = parseISODate(subscription.pastDueSince)
  if (!since || subscription.graceDays == null) return null
  const deadline = new Date(since.getTime())
  deadline.setDate(deadline.getDate() + subscription.graceDays)
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.ceil((deadline.getTime() - midnight.getTime()) / 86_400_000)
  return Math.max(days, 0)
}

/**
 * La frase de apoyo obligatoria del expediente (§3.4.1). Es la que convierte un
 * rótulo de tres palabras en algo que se puede leer por teléfono a un cliente.
 *
 * <p>Cada rama usa el dato que la hace concreta y, si ese dato no está, la frase
 * se queda en su forma genérica en vez de imprimir un hueco: un «Prueba hasta
 * el —» no informa de nada.
 */
export function statusSupportText(subscription: SubscriptionResponse, now = new Date()): string {
  switch (subscription.status) {
    case 'TRIALING':
      return subscription.trialEndDate
        ? `Prueba hasta el ${formatDate(subscription.trialEndDate)}.`
        : 'En periodo de prueba.'
    case 'ACTIVE':
      return subscription.nextBillingDate
        ? `Al día. Próximo cobro el ${formatDate(subscription.nextBillingDate)}.`
        : 'Al día.'
    case 'PAST_DUE': {
      const left = graceDaysLeft(subscription, now)
      const desde = subscription.pastDueSince
        ? `Debe desde el ${formatDate(subscription.pastDueSince)}. `
        : ''
      const cortesia =
        left == null
          ? ''
          : left === 0
            ? ' Se agotaron los días de cortesía.'
            : ` Le queda${left === 1 ? '' : 'n'} ${left} día${left === 1 ? '' : 's'} de cortesía.`
      return `${desde}Sigue trabajando con normalidad.${cortesia}`
    }
    case 'READ_ONLY':
      return 'Consulta e impresión activas. Conserva el acceso a su historia clínica. No puede crear ni modificar.'
    case 'CANCELLED': {
      const cuando = subscription.cancelEffectiveDate
        ? ` el ${formatDate(subscription.cancelEffectiveDate)}`
        : ''
      const motivo = subscription.cancelReason ? ` Motivo: ${subscription.cancelReason}.` : ''
      return `Cancelada${cuando}.${motivo}`
    }
    case 'EXPIRED':
      return subscription.currentPeriodEnd
        ? `Terminó el ${formatDate(subscription.currentPeriodEnd)} y no se renovó.`
        : 'Terminó y no se renovó.'
  }
}

/**
 * El aviso literal de §3.4.2 que acompaña al paso a solo lectura. Se repite igual
 * en el modal de la transición y en el banner del expediente, porque es la misma
 * promesa y decirla con dos redacciones distintas la debilita.
 */
export const READ_ONLY_POLICY_NOTE =
  'La empresa conserva la consulta y la impresión de toda su información, incluida la historia clínica. Deja de poder crear y modificar hasta que se regularice el pago.'

/**
 * Las transiciones ofrecidas desde cada estado (§3.4.2). `CANCELLED` y `EXPIRED`
 * no ofrecen ninguna: un contrato terminado no se reabre, se firma otro.
 *
 * <p>«Marcar pago vencido» se ofrece con su matiz —normalmente lo hace el
 * sistema— porque es la palanca de cobro y conviene que quien la pulse a mano
 * sepa que está adelantando un proceso automático.
 */
export const SUBSCRIPTION_STATUS_TRANSITIONS: Record<
  SubscriptionStatus,
  SubscriptionStatusTransition[]
> = {
  TRIALING: [
    {
      to: 'ACTIVE',
      label: 'Activar contrato',
      consequence:
        'La prueba termina y el contrato pasa a facturarse con normalidad desde el próximo ciclo.',
      primary: true,
    },
  ],
  ACTIVE: [
    {
      to: 'PAST_DUE',
      label: 'Marcar pago vencido',
      consequence:
        'Normalmente lo hace el sistema al vencer una cuenta de cobro. La empresa sigue trabajando con normalidad y empiezan a contar sus días de cortesía.',
    },
  ],
  PAST_DUE: [
    {
      to: 'ACTIVE',
      label: 'Volver a activa (pago recibido)',
      consequence: 'La cuenta vuelve a estar al día y deja de contar la cortesía.',
      primary: true,
    },
    {
      to: 'READ_ONLY',
      label: 'Pasar a solo lectura',
      consequence:
        'La empresa deja de poder crear y modificar información. Sigue consultando e imprimiendo todo lo suyo.',
      policyNote: READ_ONLY_POLICY_NOTE,
    },
  ],
  READ_ONLY: [
    {
      to: 'ACTIVE',
      label: 'Reactivar',
      consequence: 'La empresa recupera el uso normal de inmediato.',
      primary: true,
    },
  ],
  CANCELLED: [],
  EXPIRED: [],
}

/**
 * «Cancelar contrato» se ofrece desde los cuatro estados vivos, pero <b>no es
 * una transición de estado</b>: es `PATCH /{id}/cancel`, tiene sus dos fechas y
 * no cambia el estado al ejecutarse. Por eso viaja aparte del mapa de arriba.
 */
export function canRequestCancellation(status: SubscriptionStatus): boolean {
  return (
    status === 'TRIALING' || status === 'ACTIVE' || status === 'PAST_DUE' || status === 'READ_ONLY'
  )
}

/** El estado de la cuenta que obliga a un banner persistente en las seis sub-vistas (§3.4.3). */
export function statusBannerTone(status: SubscriptionStatus): 'warning' | 'error' | null {
  if (status === 'PAST_DUE') return 'warning'
  if (status === 'READ_ONLY') return 'error'
  return null
}
