<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    required?: boolean
    error?: string
    placeholder?: string
    rows?: number
    id?: string
    disabled?: boolean
  }>(),
  { rows: 3 },
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
    <textarea
      :id="fieldId()"
      class="app-textarea"
      :class="{ 'has-error': !!error }"
      :rows="rows"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="!!error || undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="$emit('blur', $event)"
    />
    <p v-if="error" class="app-error">{{ error }}</p>
  </div>
</template>
