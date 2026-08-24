<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { quoteClientName } from '../composables/useQuoteDetail'
import type { QuoteResponse } from '../types/quotes.types'

/**
 * «Marcar aceptada» — el único formulario del detalle, y tiene **un** campo.
 *
 * <p><b>La IP no se pide y no debe pedirse.</b> `AcceptQuoteRequest` solo lleva `acceptedByEmail`;
 * la dirección y la marca de tiempo las escribe el servidor desde la petición, porque una prueba
 * que el cliente teclea no prueba nada. Añadir aquí un campo de IP sería fabricar evidencia.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro por campo →
 * `computed errors` → mapa `touched` que arranca en `false` → el error solo se pinta tras `@blur`
 * o tras un `validate()` fallido → `ErrorSummary` con el **mismo texto literal** que el error en
 * línea (GOV.UK, *Validation pattern*) y el foco puesto en él.
 */
const props = defineProps<{ open: boolean; quote: QuoteResponse; saving?: boolean }>()

const emit = defineEmits<{ close: []; submit: [acceptedByEmail: string] }>()

const emailId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ acceptedByEmail: '' })
const touched = reactive({ acceptedByEmail: false })

/** Mismo patrón que el resto de la consola; el ejemplo del mensaje no es opcional. */
function validateEmail(value: string): string {
  const v = value.trim()
  if (!v) return 'El correo de quien acepta es obligatorio.'
  if (v.length > 120) return 'El correo no puede pasar de 120 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return 'El correo no tiene el formato correcto. Ejemplo: ana@spaanapet.com'
  return ''
}

const errors = computed(() => ({ acceptedByEmail: validateEmail(form.acceptedByEmail) }))

const summaryItems = computed(() =>
  toSummaryItems(
    { acceptedByEmail: touched.acceptedByEmail ? errors.value.acceptedByEmail : '' },
    { acceptedByEmail: emailId },
    ['acceptedByEmail'],
  ),
)

function err(): string {
  return touched.acceptedByEmail ? errors.value.acceptedByEmail : ''
}

/** Se limpia al abrir: un correo tecleado para OTRA cotización no puede quedarse aquí. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.acceptedByEmail = props.quote.prospectEmail ?? ''
    touched.acceptedByEmail = false
  },
)

function submit() {
  touched.acceptedByEmail = true
  if (errors.value.acceptedByEmail) {
    void summary.value?.focus()
    return
  }
  emit('submit', form.acceptedByEmail.trim())
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Marcar la cotización como aceptada"
    :subtitle="`${quote.quoteNumber} · ${quoteClientName(quote)}`"
    :icon="ICONS.SUCCESS"
    compact
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">
          Queda constancia de quién aceptó, cuándo y desde qué dirección IP. La fecha y la IP las
          registra el servidor: aquí solo se escribe el correo de la persona que dijo que sí.
        </p>

        <AppInput
          :id="emailId"
          v-model="form.acceptedByEmail"
          label="Correo de quien acepta"
          required
          type="email"
          autocomplete="email"
          placeholder="ana@spaanapet.com"
          :error="err()"
          @blur="touched.acceptedByEmail = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : 'Marcar aceptada' }}
      </button>
    </template>
  </ModalShell>
</template>
