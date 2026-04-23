<script setup lang="ts">
defineProps<{
  headers: string[]
  loading?: boolean
  empty?: boolean
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <table class="w-full text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="header in headers"
            :key="header"
            class="px-4 py-3 text-left font-medium text-gray-600"
          >
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="headers.length" class="py-12 text-center text-gray-400">Cargando...</td>
        </tr>
        <tr v-else-if="empty">
          <td :colspan="headers.length" class="py-12 text-center text-gray-400">
            Sin resultados
          </td>
        </tr>
        <slot v-else />
      </tbody>
    </table>
  </div>
</template>
