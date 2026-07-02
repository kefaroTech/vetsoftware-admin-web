<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    required?: boolean
    error?: string
    placeholder?: string
    type?: string
    id?: string
    disabled?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'decimal' | 'search' | 'none'
  }>(),
  { type: 'text' },
)

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const autoId = useId()
const fieldId = () => props.id ?? autoId
</script>

<template>
  <div class="app-field">
    <label v-if="label" :for="fieldId()" class="app-label">
      {{ label }}<span v-if="required" class="app-req">*</span>
    </label>
    <div class="app-inputbox" :class="{ 'has-error': !!error, disabled }">
      <input
        :id="fieldId()"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-invalid="!!error || undefined"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
      />
    </div>
    <p v-if="error" class="app-error">{{ error }}</p>
  </div>
</template>
