<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { maxLength } from '@/composables/validators'
import {
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
} from '@/features/billing-operations/types/billing-operations.types'
import { nowLocalDateTime } from '../../composables/subscriptionDateTime'
import {
  PAYMENT_INDEPENDENCE_NOTE,
  PAYMENT_STARTS_PENDING_NOTE,
} from '../../composables/subscriptionMoneyText'
import type { RegisterSubscriptionPaymentRequest } from '../../types/subscription-money.types'

/**
 * El alta de un pago: <b>anotar que entró la plata</b>.
 *
 * <p><b>`clientRequestId` se genera una vez al abrir el formulario</b>, con
 * `crypto.randomUUID()`, y <b>no</b> en cada envío. Es la llave que impide que un
 * doble clic cobre dos veces; regenerarla por envío la anularía justo cuando
 * sirve. Es el patrón que ya usan `CancelSubscriptionModal` (W2-A) y las
 * cotizaciones (W1-D), y aquí importa más que en ninguno: lo que se duplica es un
 * asiento de dinero.
 *
 * <p><b>Lo que este formulario NO hace, y lo dice antes de que alguien lo
 * suponga.</b> Registrar un pago no lo aplica a ninguna cuenta de cobro concreta:
 * el modelo los separa a propósito porque un cliente puede pagar tres de un giro o
 * abonar la mitad de una. Y el pago nace <b>pendiente</b>: el estado lo pone el
 * servidor y hasta que esté confirmado no cuenta como cobro. Las dos frases van en
 * pantalla, no en un comentario.
 *
 * <p><b>La pasarela y su referencia son únicas juntas.</b> Por eso una referencia
 * sin pasarela es un error de validación y no un campo suelto: sola no identifica
 * nada, y lo que la protege del duplicado es el par.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro por
 * campo → `computed errors` → mapa `touched` que arranca todo en `false` → el
 * error solo se pinta tras `@blur` o tras un `validate()` fallido → `ErrorSummary`
 * con el <b>mismo texto literal</b> que el error en línea (GOV.UK, *Validation
 * pattern*) y el foco puesto en él. `AppInput` y `AppSelect` atan el mensaje al
 * control con `aria-describedby` y marcan `aria-invalid` (§5.6).
 */
const props = defineProps<{ open: boolean; companyName: string }>()

const emit = defineEmits<{ submit: [payload: RegisterSubscriptionPaymentRequest] }>()

type Field = 'amount' | 'currency' | 'paymentMethod' | 'receivedAt' | 'gateway' | 'gatewayReference'

const ids: Record<Field, string> = {
  amount: useId(),
  currency: useId(),
  paymentMethod: useId(),
  receivedAt: useId(),
  gateway: useId(),
  gatewayReference: useId(),
}

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({
  amount: '',
  currency: 'COP',
  paymentMethod: 'TRANSFER' as PaymentMethod,
  receivedAt: '',
  gateway: '',
  gatewayReference: '',
})

const touched = reactive<Record<Field, boolean>>({
  amount: false,
  currency: false,
  paymentMethod: false,
  receivedAt: false,
  gateway: false,
  gatewayReference: false,
})

const clientRequestId = ref('')

const methodOptions = computed(() =>
  (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((value) => ({
    value,
    label: PAYMENT_METHOD_LABEL[value],
  })),
)

/**
 * La divisa se escribe en mayúsculas mientras se teclea. Es el saneado en vivo de
 * la convención de formularios: `cop` y `COP` son la misma divisa y no hay razón
 * para que el operador tenga que acordarse de cuál acepta el servidor.
 */
const currency = computed({
  get: () => form.currency,
  set: (value: string) => {
    form.currency = value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3)
  },
})

/**
 * El importe admite coma o punto — se teclea como se lee en Colombia — y se
 * convierte una sola vez, aquí. Devuelve `NaN` si no es un número, que es lo que
 * el validador convierte en un mensaje con ejemplo.
 */
function parseAmount(value: string): number {
  const limpio = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!limpio) return Number.NaN
  return Number(limpio)
}

function validateAmount(value: string): string {
  const parsed = parseAmount(value)
  if (!value.trim()) return 'El importe es obligatorio: es cuánta plata entró.'
  if (Number.isNaN(parsed)) return 'El importe tiene que ser un número. Ejemplo: 179000 o 179000,50'
  if (parsed <= 0)
    return 'El importe tiene que ser mayor que cero. Una devolución no se registra como un pago negativo: tiene su propio estado.'
  return ''
}

function validateCurrency(value: string): string {
  if (!value.trim()) return 'La divisa es obligatoria. Ejemplo: COP'
  if (!/^[A-Z]{3}$/.test(value.trim()))
    return 'La divisa son tres letras del código ISO 4217. Ejemplo: COP'
  return ''
}

/**
 * <b>Cuándo entró la plata, no cuándo se registra.</b> Puede ser de ayer —un giro
 * que se anota al día siguiente es lo normal— y lo que no puede es ser futura:
 * aceptar un pago que todavía no ocurrió da por cobrada una cuenta que sigue
 * debiendo.
 */
function validateReceivedAt(value: string): string {
  if (!value.trim()) return 'La fecha y la hora en que se recibió el pago son obligatorias.'
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value))
    return 'La fecha no es válida. Usa el calendario del campo.'
  if (value > nowLocalDateTime())
    return 'El pago no puede haberse recibido en el futuro: escribe cuándo entró la plata de verdad.'
  return ''
}

/**
 * `gateway` + `gatewayReference` son únicos <b>juntos</b>: una referencia sin su
 * pasarela no identifica nada y deja el pago sin la protección contra el aviso
 * duplicado, que es justo para lo que existe el par.
 */
function validateGateway(value: string): string {
  const largo = maxLength(value, 'La pasarela', 40)
  if (largo) return largo
  if (!value.trim() && form.gatewayReference.trim())
    return 'Escribe también la pasarela: la referencia solo identifica el pago junto con ella.'
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  amount: validateAmount(form.amount),
  currency: validateCurrency(form.currency),
  paymentMethod: form.paymentMethod ? '' : 'Debes seleccionar el medio de pago.',
  receivedAt: validateReceivedAt(form.receivedAt),
  gateway: validateGateway(form.gateway),
  gatewayReference: maxLength(form.gatewayReference, 'La referencia de la pasarela', 120),
}))

/** El orden del resumen es el orden VISUAL del formulario (WCAG §2.4.3), no el de las claves. */
const ORDER: Field[] = [
  'amount',
  'currency',
  'paymentMethod',
  'receivedAt',
  'gateway',
  'gatewayReference',
]

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((field) => [field, touched[field] ? errors.value[field] : ''])),
    ids,
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/**
 * Al abrir: campos en blanco salvo los dos que tienen un valor por defecto
 * honesto —la divisa de la plataforma y el instante actual—, y <b>una llave de
 * idempotencia nueva</b>.
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.amount = ''
    form.currency = 'COP'
    form.paymentMethod = 'TRANSFER'
    // `datetime-local` no admite los segundos si el paso no los pide: se recorta
    // a minutos para que el campo acepte el valor por defecto.
    form.receivedAt = nowLocalDateTime().slice(0, 16)
    form.gateway = ''
    form.gatewayReference = ''
    for (const field of ORDER) touched[field] = false
    clientRequestId.value = crypto.randomUUID()
  },
  { immediate: true },
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  const gateway = form.gateway.trim()
  const gatewayReference = form.gatewayReference.trim()
  emit('submit', {
    amount: parseAmount(form.amount),
    currency: form.currency.trim(),
    paymentMethod: form.paymentMethod,
    // `LocalDateTime` del backend: sin zona y con segundos. El campo da minutos.
    receivedAt: `${form.receivedAt}:00`.slice(0, 19),
    ...(gateway ? { gateway } : {}),
    ...(gatewayReference ? { gatewayReference } : {}),
    clientRequestId: clientRequestId.value,
  })
}

/** FORM-07 · lo que decide si cerrar el modal pide confirmación. */
function isDirty(): boolean {
  return (
    form.amount.trim() !== '' || form.gateway.trim() !== '' || form.gatewayReference.trim() !== ''
  )
}

defineExpose({ submit, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <ErrorSummary ref="summary" :items="summaryItems" />

    <!-- Las dos cosas que este formulario NO hace. Van antes de los campos: quien
         las lea después ya habrá dado por hecho lo contrario. -->
    <div class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Se registra un pago de <strong>{{ companyName }}</strong
        >. {{ PAYMENT_INDEPENDENCE_NOTE }} {{ PAYMENT_STARTS_PENDING_NOTE }}
      </span>
    </div>

    <AppInput
      :id="ids.amount"
      v-model="form.amount"
      label="Importe recibido"
      required
      inputmode="decimal"
      hint="Cuánta plata entró. Admite coma o punto para los decimales."
      :error="err('amount')"
      @blur="touched.amount = true"
    />

    <AppInput
      :id="ids.currency"
      v-model="currency"
      label="Divisa"
      required
      hint="Código ISO 4217 de tres letras. La plataforma cobra en COP; si el giro llegó en otra, escríbela."
      :error="err('currency')"
      @blur="touched.currency = true"
    />

    <AppSelect
      :id="ids.paymentMethod"
      v-model="form.paymentMethod"
      label="Medio de pago"
      required
      :options="methodOptions"
      :error="err('paymentMethod')"
      @blur="touched.paymentMethod = true"
    />

    <AppInput
      :id="ids.receivedAt"
      v-model="form.receivedAt"
      label="Recibido el"
      required
      type="datetime-local"
      hint="Cuándo entró la plata, no cuándo se registra. Puede ser anterior a hoy."
      :error="err('receivedAt')"
      @blur="touched.receivedAt = true"
    />

    <AppInput
      :id="ids.gateway"
      v-model="form.gateway"
      label="Pasarela"
      hint="Opcional. Junto con la referencia impide que el mismo aviso recibido dos veces cree dos pagos."
      :error="err('gateway')"
      @blur="touched.gateway = true"
    />

    <AppInput
      :id="ids.gatewayReference"
      v-model="form.gatewayReference"
      label="Referencia de la pasarela"
      hint="Opcional. El identificador que devolvió la pasarela para este giro."
      :error="err('gatewayReference')"
      @blur="touched.gatewayReference = true"
    />
  </form>
</template>
