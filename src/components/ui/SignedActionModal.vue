<script lang="ts">
/** Una opción del desplegable de motivos. `value` viaja al backend, `label` se lee. */
export interface SignedActionReason {
  value: string
  label: string
}

/** Lo que el modal entrega al confirmar: la firma de la acción. */
export interface SignedActionSignature {
  /** El `value` del motivo elegido. Nunca vacío: sin motivo no se emite. */
  reason: string
  /** El texto libre, ya recortado. `null` cuando no se escribió nada. */
  note: string | null
}

export const SIGNED_ACTION_MISSING_REASON =
  'Elige un motivo de la lista: es lo que explica esta acción cuando alguien la audite.'

/**
 * El texto que exige la nota cuando el motivo elegido no se explica solo. Se
 * compone con el rótulo del motivo para que el error nombre el caso concreto.
 */
export function signedActionMissingNote(reasonLabel: string): string {
  return `Con el motivo «${reasonLabel}» la nota es obligatoria: el motivo por sí solo no dice qué pasó.`
}
</script>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch, type Component } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'

/**
 * <b>Acción que exige firma</b>: la pieza compartida de las once pantallas que
 * escriben algo que después hay que poder explicar —negociar y revocar
 * excepciones, corregir un contador, abrir una ventana de prueba, conceder un
 * módulo a mano, migrar tarifas, registrar retenciones y devoluciones, conciliar,
 * archivar y restaurar, ceder un contrato, cerrar y reabrir un periodo contable—.
 *
 * <p><b>Envuelve `ModalShell`, no lo sustituye.</b> `ModalShell` es gemelo TR-02 y
 * es quien sabe de foco, pila de capas, historial y Escape; aquí no se replica
 * nada de eso. Lo que este componente añade es el <b>formulario de la firma</b> y
 * su regla: motivo de lista cerrada obligatorio, nota libre opcional, y una
 * confirmación que nombra la acción.
 *
 * <p><b>Por qué el motivo es una lista cerrada y no un campo de texto.</b> La
 * firma existe para que dentro de dos ejercicios alguien pueda contar cuántas
 * excepciones se negociaron «por competencia» y cuántas «por error nuestro». Con
 * texto libre esa cuenta no se puede hacer: se convierte en cuatrocientas frases
 * distintas que dicen ocho cosas. El texto libre sigue estando, al lado, para lo
 * que el código no captura — pero nunca <i>en lugar</i> del código.
 *
 * <p><b>El botón no se deshabilita.</b> Un botón apagado no dice qué falta: se
 * confirma, se valida, y si falta el motivo el foco salta al `ErrorSummary` con
 * el texto exacto del campo (GOV.UK, patrón de validación; WCAG 2.2 §3.3.1). Lo
 * que NO ocurre nunca es que se emita `submit` sin motivo: es la razón de ser de
 * este componente, y `tests/unit/signed-action-modal.spec.ts` lo sujeta.
 *
 * <p><b>`confirmLabel` es obligatorio a propósito.</b> WCAG 2.2 §3.3.4 y APG
 * (<i>Alert Dialog</i>) piden que el nombre accesible del botón describa el
 * resultado. Si tuviera valor por defecto, ese valor sería «Confirmar» y once
 * pantallas lo heredarían sin pensarlo.
 *
 * <p><b>`role="alertdialog"`</b>: toda acción que se firma tiene consecuencia y su
 * cuerpo hay que oírlo sí o sí.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    /** Cabecera del modal. Nombra la acción, no la pantalla. */
    title: string
    subtitle?: string
    icon?: Component
    /** La pregunta con el sujeto dentro: «¿Revocar la excepción de Clínica Norte?» (R04). */
    question: string
    /** La lista cerrada. Sin opciones no hay firma posible: no se puede confirmar. */
    reasons: SignedActionReason[]
    reasonLabel?: string
    reasonHint?: string
    /**
     * Los motivos que NO se explican solos («Otro», «Error nuestro»…): con ellos
     * la nota pasa a ser obligatoria. Vacío = la nota siempre es opcional.
     */
    noteRequiredReasons?: string[]
    noteLabel?: string
    noteHint?: string
    noteRows?: number
    /** `@Size(max = …)` del DTO. Acompaña al validador, no lo sustituye. */
    maxNoteLength?: number
    /** Qué deja hecho la acción y qué no se deshace. Se pinta como aviso sobre el formulario. */
    consequence?: string
    /** Rótulo del botón que confirma. Nombra la acción: «Revocar la excepción», nunca «Confirmar». */
    confirmLabel: string
    cancelLabel?: string
    accent?: 'amatista' | 'danger' | 'warn'
    /** Tono del botón de confirmación. Por defecto, el destructivo. */
    confirmTone?: 'danger' | 'primary'
    width?: number
    saving?: boolean
    savingLabel?: string
  }>(),
  {
    reasonLabel: 'Motivo',
    noteLabel: 'Nota',
    noteRows: 3,
    maxNoteLength: 500,
    cancelLabel: 'Cancelar',
    accent: 'warn',
    confirmTone: 'danger',
    width: 560,
    savingLabel: 'Guardando…',
    noteRequiredReasons: () => [],
  },
)

const emit = defineEmits<{ close: []; submit: [signature: SignedActionSignature] }>()

const reasonId = useId()
const noteId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ reason: '', note: '' })
const touched = reactive({ reason: false, note: false })

const chosenReason = computed(() => props.reasons.find((r) => r.value === form.reason) ?? null)

const noteIsRequired = computed(
  () => form.reason !== '' && props.noteRequiredReasons.includes(form.reason),
)

function validateNote(): string {
  if (noteIsRequired.value && form.note.trim() === '')
    return signedActionMissingNote(chosenReason.value?.label ?? form.reason)
  if (form.note.length > props.maxNoteLength)
    return `La nota no puede pasar de ${props.maxNoteLength} caracteres.`
  return ''
}

const errors = computed(() => ({
  reason: form.reason === '' ? SIGNED_ACTION_MISSING_REASON : '',
  note: validateNote(),
}))

const shown = computed(() => ({
  reason: touched.reason ? errors.value.reason : '',
  note: touched.note ? errors.value.note : '',
}))

const summaryItems = computed(() =>
  toSummaryItems(shown.value, { reason: reasonId, note: noteId }, ['reason', 'note']),
)

/** Cada apertura empieza en blanco: una firma nunca hereda la del caso anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.reason = ''
    form.note = ''
    touched.reason = false
    touched.note = false
  },
)

function submit() {
  touched.reason = true
  touched.note = true
  if (errors.value.reason || errors.value.note) {
    void summary.value?.focus()
    return
  }
  emit('submit', { reason: form.reason, note: form.note.trim() || null })
}

defineExpose({ submit })
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    :subtitle="subtitle"
    :icon="icon ?? ICONS.WARNING"
    :accent="accent"
    role="alertdialog"
    compact
    :width="width"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">{{ question }}</p>

        <div v-if="consequence" class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ consequence }}</span>
        </div>

        <!-- Lo que la pantalla necesite decir entre la consecuencia y la firma:
             importes, fechas, el estado del que se viene. Va en el flujo, no en
             un segundo modal. -->
        <slot name="details" />

        <AppSelect
          :id="reasonId"
          v-model="form.reason"
          :options="reasons"
          :label="reasonLabel"
          required
          :hint="reasonHint"
          :error="shown.reason"
          @blur="touched.reason = true"
        />

        <AppTextarea
          :id="noteId"
          v-model="form.note"
          :label="noteLabel"
          :required="noteIsRequired"
          :rows="noteRows"
          :maxlength="maxNoteLength"
          :hint="noteHint"
          :error="shown.note"
          @blur="touched.note = true"
        />

        <slot name="extra" />
      </form>
    </template>

    <template #footer-left>
      <slot name="footer-left" />
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="ds-btn"
        :class="confirmTone === 'danger' ? 'ds-btn--danger' : 'ds-btn--primary'"
        :disabled="saving"
        @click="submit"
      >
        {{ saving ? savingLabel : confirmLabel }}
      </button>
    </template>
  </ModalShell>
</template>
