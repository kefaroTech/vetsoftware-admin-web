<script setup lang="ts">
import { Icon } from '@iconify/vue'

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
  <label class="app-check" :class="{ checked: modelValue, disabled }">
    <input
      type="checkbox"
      class="app-check__native"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="app-check__box">
      <Icon v-if="modelValue" icon="tabler:check" width="12" height="12" />
    </span>
    <span v-if="label" class="app-check__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.app-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.app-check.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.app-check__native {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.app-check__box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid var(--vs-field-border);
  background: #fff;
  display: grid;
  place-items: center;
  color: #fff;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.app-check.checked .app-check__box {
  background: #7e22ce;
  border-color: #7e22ce;
}

.app-check__native:focus-visible + .app-check__box {
  border-color: var(--vs-field-focus);
  box-shadow: 0 0 0 4px var(--vs-field-focus-ring);
}

.app-check__label {
  font-size: 13px;
  color: #3d2e57;
}
</style>
