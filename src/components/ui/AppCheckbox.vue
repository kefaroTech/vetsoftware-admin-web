<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, useId } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Casilla de la consola (1 consumidor: `BaseRoleForm.vue`).
 *
 * DS-01: retirados los tres `--vs-field-*` y los cuatro hexadecimales
 * literales. El prefijo `app-` de las clases se retira también: son `scoped`,
 * nunca fueron globales, y el prefijo inducía a pensar que venían de la hoja
 * `app.css` que este lote acaba de vaciar.
 */
const props = defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
  id?: string
  required?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const autoId = useId()
const fieldId = computed(() => props.id ?? autoId)
const errorId = computed(() => `${fieldId.value}-error`)
</script>

<template>
  <div class="checkfield">
    <!-- El mensaje de error queda FUERA del `<label>`: dentro pasaría a formar
         parte del nombre accesible de la casilla en vez de describirla. -->
    <label class="check" :class="{ checked: modelValue, disabled }">
      <input
        :id="fieldId"
        type="checkbox"
        class="ds-sr-only"
        :checked="modelValue"
        :disabled="disabled"
        :aria-required="required || undefined"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? errorId : undefined"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span class="box">
        <Check v-if="modelValue" :size="12" />
      </span>
      <span v-if="label" class="text"
        >{{ label }}<span v-if="required" class="required" aria-hidden="true">*</span></span
      >
    </label>
    <p v-if="error" :id="errorId" class="error">
      <component :is="ICONS.WARNING" :size="11" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>

<style scoped>
/* `inline-flex` y no `flex`: la casilla se maqueta en flujo en línea, junto al
   texto o a otro control, y un envoltorio de bloque la sacaría de esa línea. */
.checkfield {
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-6);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  cursor: pointer;
  user-select: none;
}

.check.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.box {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  display: grid;
  place-items: center;
  color: var(--warm-50);
  transition:
    background-color var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.check.checked .box {
  background: var(--amatista-700);
  border-color: var(--amatista-700);
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- el cuerpo
   coincide con `.ds-focus-ring:focus-visible` a propósito y la primitiva NO se
   puede aplicar aquí: quien recibe el foco es el `<input>` visualmente oculto y
   quien debe pintar el anillo es su hermano `.box`. `.ds-focus-ring` solo sabe
   pintarse a sí misma, no a un hermano, así que no hay elemento al que
   colgársela — es el caso «forma que sólo existe plana» de FE-08. */
.ds-sr-only:focus-visible + .box {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

.text {
  color: var(--text);
  font-size: var(--text-body);
}

.required {
  color: var(--danger-500);
}

/* La sangría alinea el mensaje con el texto de la etiqueta y no con la casilla:
   es el ancho de `.box` más el `gap` de `.check`, y se mueve con ellos. */
.error {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: 0;
  padding-inline-start: calc(18px + var(--space-8));
  color: var(--danger-500);
  font-size: var(--text-xs);
}
</style>
