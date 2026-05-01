<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  modelValue?: string | number
  type?: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :type="type"
    :placeholder="placeholder"
    :error-messages="error"
    variant="outlined"
    density="comfortable"
    color="primary"
    hide-details="auto"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>
