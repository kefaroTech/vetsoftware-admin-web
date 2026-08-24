<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { describeEffect, type EffectSentenceContext } from '../composables/effect-sentence'
import {
  ANSWER_TYPE_LABEL,
  type ConfiguratorEffectResponse,
  type ConfiguratorOptionResponse,
  type ConfiguratorQuestionResponse,
} from '../types/configurator.types'

/**
 * Una pregunta del cuestionario, con sus respuestas y los efectos que cuelgan
 * de cada una.
 *
 * <p><b>Las condicionales no se pintan como árbol.</b> `parent_option_id` hace
 * que «¿Cuántas cajas?» solo aparezca si antes dijo que cobra en mostrador. La
 * tentación es el patrón *Tree View* del APG: es sobreingeniería para dos
 * niveles y trae un contrato de teclado entero. En su lugar, lista plana en
 * orden de `sortOrder` y una línea explícita encima —«Solo aparece si: …»—
 * en vez de una sangría. Dice la condición en vez de insinuarla con un margen
 * izquierdo, y se lee con un lector de pantalla sin un solo atributo ARIA.
 *
 * <p>Los efectos se leen como frases, nunca como códigos: ver
 * `describeEffect` y `EffectSentence.vue`.
 */
const props = defineProps<{
  question: ConfiguratorQuestionResponse
  options: ConfiguratorOptionResponse[]
  effectsByOption: Map<number, ConfiguratorEffectResponse[]>
  questionEffects: ConfiguratorEffectResponse[]
  context: EffectSentenceContext
}>()

defineEmits<{
  'edit-question': [question: ConfiguratorQuestionResponse]
  'delete-question': [question: ConfiguratorQuestionResponse]
  'add-option': [question: ConfiguratorQuestionResponse]
  'edit-option': [option: ConfiguratorOptionResponse]
  'delete-option': [option: ConfiguratorOptionResponse]
  'add-effect': [trigger: string]
  'edit-effect': [effect: ConfiguratorEffectResponse]
  'delete-effect': [effect: ConfiguratorEffectResponse]
}>()

/** «Sí, tengo punto de venta» (de «¿Cobras en mostrador?») — la condición, en palabras. */
const condition = computed(() => {
  if (props.question.parentOptionId == null) return ''
  const option = props.context.optionById.get(props.question.parentOptionId)
  if (!option) return `la respuesta #${String(props.question.parentOptionId)}`
  const parent = props.context.questionById.get(option.questionId)
  return parent ? `«${option.label}» (de «${parent.questionText}»)` : `«${option.label}»`
})

function sentence(effect: ConfiguratorEffectResponse) {
  return describeEffect(effect, props.context)
}

function effectsFor(optionId: number) {
  return props.effectsByOption.get(optionId) ?? []
}
</script>

<template>
  <article class="ds-card ds-stack ds-stack--14">
    <header class="ds-stack ds-stack--8">
      <p v-if="condition" class="ds-kicker">Solo aparece si: {{ condition }}</p>
      <div class="ds-block-head">
        <h3 class="ds-title">{{ question.questionText }}</h3>
        <div class="ds-flex-row ds-flex-row--6">
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--accent"
            :aria-label="`Editar la pregunta ${question.questionText}`"
            @click="$emit('edit-question', question)"
          >
            <component :is="ICONS.EDIT" :size="14" />
          </button>
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--danger"
            :aria-label="`Dar de baja la pregunta ${question.questionText}`"
            @click="$emit('delete-question', question)"
          >
            <component :is="ICONS.DELETE" :size="14" />
          </button>
        </div>
      </div>
      <p v-if="question.helpText" class="ds-hint">{{ question.helpText }}</p>
      <div class="ds-wrap-row">
        <AppBadge :label="ANSWER_TYPE_LABEL[question.answerType]" variant="neutral" />
        <AppBadge
          :label="question.required ? 'Obligatoria' : 'Opcional'"
          :variant="question.required ? 'success' : 'neutral'"
        />
        <span class="ds-pill ds-tone--neutral">{{ question.code }}</span>
        <span class="ds-meta">Orden {{ question.sortOrder }}</span>
      </div>
    </header>

    <!-- Efectos que dispara la propia pregunta: solo los hay en las numéricas. -->
    <section v-if="question.answerType === 'NUMBER'" class="ds-stack ds-stack--8">
      <div class="ds-block-head">
        <p class="ds-label">Al responder con un número</p>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="$emit('add-effect', `q:${question.id}`)"
        >
          <component :is="ICONS.ADD" :size="13" />
          Añadir efecto
        </button>
      </div>
      <p v-if="questionEffects.length === 0" class="ds-empty ds-empty--boxed">
        Ningún efecto usa este número, así que responderlo no cambia el carrito.
      </p>
      <ul v-else class="ds-list-reset ds-stack ds-stack--8">
        <li v-for="effect in questionEffects" :key="effect.id" class="efecto ds-flex-row">
          <span class="ds-flex-fill">{{ sentence(effect) }}</span>
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--accent"
            :aria-label="`Editar el efecto: ${sentence(effect)}`"
            @click="$emit('edit-effect', effect)"
          >
            <component :is="ICONS.EDIT" :size="13" />
          </button>
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--danger"
            :aria-label="`Dar de baja el efecto: ${sentence(effect)}`"
            @click="$emit('delete-effect', effect)"
          >
            <component :is="ICONS.DELETE" :size="13" />
          </button>
        </li>
      </ul>
    </section>

    <!-- Respuestas y sus efectos. -->
    <section v-else class="ds-stack ds-stack--10">
      <div class="ds-block-head">
        <p class="ds-label">Respuestas</p>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="$emit('add-option', question)"
        >
          <component :is="ICONS.ADD" :size="13" />
          Añadir respuesta
        </button>
      </div>

      <p v-if="options.length === 0" class="ds-empty ds-empty--boxed">
        Sin respuestas, el prospecto no puede contestar esta pregunta y ningún efecto se dispara.
      </p>

      <ul v-else class="ds-list-reset ds-stack ds-stack--10">
        <li v-for="option in options" :key="option.id" class="ds-panel ds-stack ds-stack--8">
          <div class="ds-block-head">
            <div>
              <p class="ds-item-label">{{ option.label }}</p>
              <p class="ds-meta">
                {{ option.code }}<span v-if="option.helpText"> · {{ option.helpText }}</span>
              </p>
            </div>
            <div class="ds-flex-row ds-flex-row--6">
              <button
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--sm"
                @click="$emit('add-effect', `o:${option.id}`)"
              >
                <component :is="ICONS.ADD" :size="13" />
                Efecto
              </button>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--accent"
                :aria-label="`Editar la respuesta ${option.label}`"
                @click="$emit('edit-option', option)"
              >
                <component :is="ICONS.EDIT" :size="13" />
              </button>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--danger"
                :aria-label="`Dar de baja la respuesta ${option.label}`"
                @click="$emit('delete-option', option)"
              >
                <component :is="ICONS.DELETE" :size="13" />
              </button>
            </div>
          </div>

          <p v-if="effectsFor(option.id).length === 0" class="ds-meta">
            Marcarla no cambia el carrito.
          </p>
          <ul v-else class="ds-list-reset ds-stack ds-stack--8">
            <li v-for="effect in effectsFor(option.id)" :key="effect.id" class="efecto ds-flex-row">
              <span class="ds-flex-fill">{{ sentence(effect) }}</span>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--accent"
                :aria-label="`Editar el efecto: ${sentence(effect)}`"
                @click="$emit('edit-effect', effect)"
              >
                <component :is="ICONS.EDIT" :size="13" />
              </button>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--danger"
                :aria-label="`Dar de baja el efecto: ${sentence(effect)}`"
                @click="$emit('delete-effect', effect)"
              >
                <component :is="ICONS.DELETE" :size="13" />
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.efecto {
  gap: var(--space-8);
}
</style>
