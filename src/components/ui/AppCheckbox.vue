<script setup lang="ts">
import { Check } from 'lucide-vue-next'

/**
 * Casilla de la consola (1 consumidor: `BaseRoleForm.vue`).
 *
 * DS-01: retirados los tres `--vs-field-*` y los cuatro hexadecimales
 * literales. El prefijo `app-` de las clases se retira también: son `scoped`,
 * nunca fueron globales, y el prefijo inducía a pensar que venían de la hoja
 * `app.css` que este lote acaba de vaciar.
 */
defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="check" :class="{ checked: modelValue, disabled }">
    <input
      type="checkbox"
      class="ds-sr-only"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="box">
      <Check v-if="modelValue" :size="12" />
    </span>
    <span v-if="label" class="text">{{ label }}</span>
  </label>
</template>

<style scoped>
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
</style>
