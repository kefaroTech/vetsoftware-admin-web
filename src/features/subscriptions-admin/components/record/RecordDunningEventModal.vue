<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  ANNOTATABLE_EVENT_OPTIONS,
  CHANNEL_OPTIONS,
  EVENT_TYPE_MEANING,
  toDateTimeInput,
  validateChannel,
  validateDaysOverdue,
  validateDetail,
  validateOccurredAt,
} from '../../composables/dunningRecordText'
import type {
  DunningChannel,
  DunningEventDraft,
  DunningEventType,
} from '../../types/dunning-record.types'

/**
 * <b>Anotar un hito del expediente</b> — la única escritura normal de la
 * pantalla, y es un alta.
 *
 * <p><b>Esto no es «editar el expediente».</b> La bitácora no tiene `PUT` ni
 * `DELETE`; corregir un hito mal anotado es anotar otro, y los dos quedan. El
 * formulario lo dice antes de que alguien lo descubra a base de buscar el botón
 * que no hay.
 *
 * <p><b>Los cuatro hitos que ofrece, y el que no.</b> `WRITTEN_OFF` no está en el
 * desplegable: declarar una deuda incobrable es una decisión contable, no un
 * valor más de una lista, y tiene su propio formulario, su propio bloque y su
 * propia confirmación. Meterlo aquí lo dejaría a un clic de «anoté una llamada».
 *
 * <p><b>El canal es obligatorio en un recordatorio</b>, y se comprueba antes de
 * enviar. Es el espejo de `chk_dunning_events_reminder_channel`, y el motivo lo
 * escribe el propio dominio: «un recordatorio sin canal no prueba nada ante una
 * reclamación». Descubrir esa regla con un 400 delante y el cliente al teléfono
 * es exactamente lo que §5.6 pide evitar.
 *
 * <p><b>Por qué no hay campo para el documento de cobro.</b> El contrato lo
 * admite (`billingDocumentId`), pero solo por su identificador interno: no hay
 * forma de elegirlo por su número desde aquí, y un campo numérico libre invita a
 * un dígito equivocado que ataría este aviso a la factura de otro periodo — en la
 * pantalla cuya única razón de ser es servir de prueba. Se prefiere el hueco
 * declarado a la prueba corrompida; queda como issue para cuando «Dinero» pueda
 * ofrecer los documentos de este contrato.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro →
 * `computed errors` → mapa `touched` que arranca en `false` → el error solo se
 * pinta tras `@blur` o tras un envío fallido → `ErrorSummary` con el mismo texto
 * literal que el error en línea, y el foco puesto en él.
 */
const props = defineProps<{
  open: boolean
  subscriptionNumber: string
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [draft: DunningEventDraft] }>()

const occurredAtId = useId()
const channelId = useId()
const daysOverdueId = useId()
const detailId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const draft = reactive<DunningEventDraft>({
  eventType: 'REMINDER_SENT',
  occurredAt: toDateTimeInput(new Date()),
  channel: '',
  daysOverdue: '',
  detail: '',
})

const touched = reactive({
  occurredAt: false,
  channel: false,
  daysOverdue: false,
  detail: false,
})

const errors = computed(() => ({
  occurredAt: validateOccurredAt(draft.occurredAt),
  channel: validateChannel(draft.eventType, draft.channel),
  daysOverdue: validateDaysOverdue(draft.daysOverdue),
  detail: validateDetail(draft.detail),
}))

const shown = computed(() => ({
  occurredAt: touched.occurredAt ? errors.value.occurredAt : '',
  channel: touched.channel ? errors.value.channel : '',
  daysOverdue: touched.daysOverdue ? errors.value.daysOverdue : '',
  detail: touched.detail ? errors.value.detail : '',
}))

/** El orden del resumen es el orden visual del formulario (§5.1, WCAG §2.4.3). */
const summaryItems = computed(() =>
  toSummaryItems(
    shown.value,
    {
      occurredAt: occurredAtId,
      channel: channelId,
      daysOverdue: daysOverdueId,
      detail: detailId,
    },
    ['occurredAt', 'channel', 'daysOverdue', 'detail'],
  ),
)

const channelRequired = computed(() => draft.eventType === 'REMINDER_SENT')

const question = computed(() => `Se anota en ${props.subscriptionNumber}, de ${props.companyName}.`)

/**
 * Se limpia al abrir. Lo tecleado para un hito que no se llegó a anotar no puede
 * reaparecer sobre otro, y la hora por defecto tiene que ser la de ahora y no la
 * de la última vez que se abrió el formulario.
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.eventType = 'REMINDER_SENT'
    draft.occurredAt = toDateTimeInput(new Date())
    draft.channel = ''
    draft.daysOverdue = ''
    draft.detail = ''
    touched.occurredAt = false
    touched.channel = false
    touched.daysOverdue = false
    touched.detail = false
  },
)

function onEventType(value: string) {
  draft.eventType = value as DunningEventType
}

function onChannel(value: string) {
  draft.channel = value as DunningChannel | ''
  touched.channel = true
}

function submit() {
  touched.occurredAt = true
  touched.channel = true
  touched.daysOverdue = true
  touched.detail = true
  if (Object.values(errors.value).some(Boolean)) {
    void summary.value?.focus()
    return
  }
  emit('submit', { ...draft })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Anotar un hito de cobranza"
    :subtitle="`${subscriptionNumber} · ${companyName}`"
    :icon="ICONS.BELL"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">{{ question }}</p>

        <AppSelect
          :model-value="draft.eventType"
          :options="ANNOTATABLE_EVENT_OPTIONS"
          label="Qué pasó"
          required
          @update:model-value="onEventType"
        />

        <!-- Lo que significa lo que se está a punto de anotar, antes de anotarlo.
             En «Pasó a solo lectura» esta frase es la política, y quien la anota
             es quien se la va a explicar al cliente. -->
        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ EVENT_TYPE_MEANING[draft.eventType] }}</span>
        </div>

        <AppInput
          :id="occurredAtId"
          v-model="draft.occurredAt"
          type="datetime-local"
          label="Cuándo ocurrió"
          required
          hint="La fecha y la hora del hecho, no las de ahora: se anota la llamada de ayer con la hora de ayer."
          :error="shown.occurredAt"
          @blur="touched.occurredAt = true"
        />

        <AppSelect
          :id="channelId"
          :model-value="draft.channel"
          :options="CHANNEL_OPTIONS"
          label="Canal"
          :required="channelRequired"
          :hint="
            channelRequired
              ? 'Por dónde se avisó. En un recordatorio es obligatorio: es lo que lo hace demostrable.'
              : 'Por dónde se hizo, si se hizo por algún medio concreto.'
          "
          :error="shown.channel"
          @update:model-value="onChannel"
          @blur="touched.channel = true"
        />

        <AppInput
          :id="daysOverdueId"
          v-model="draft.daysOverdue"
          inputmode="numeric"
          label="Días de mora"
          hint="Días que llevaba vencida la deuda ese día. Si no lo sabes con certeza, déjalo vacío: un número inventado en la prueba es peor que un hueco."
          :error="shown.daysOverdue"
          @blur="touched.daysOverdue = true"
        />

        <AppTextarea
          :id="detailId"
          v-model="draft.detail"
          label="Detalle"
          required
          :rows="3"
          hint="Qué se dijo y a quién. Es lo que se lee cuando alguien pregunta seis meses después."
          :error="shown.detail"
          @blur="touched.detail = true"
        />

        <p class="ds-meta">
          El hito se anota contra el contrato. Atarlo además a un documento de cobro concreto exige
          su identificador interno, que esta pantalla todavía no puede ofrecer.
        </p>
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Anotando…' : 'Anotar el hito' }}
      </button>
    </template>
  </ModalShell>
</template>
