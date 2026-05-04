<script setup lang="ts">
defineProps<{
  headers: string[]
  empty?: boolean
}>()
</script>

<template>
  <v-card variant="outlined" rounded="lg">
    <v-table density="comfortable" hover>
      <thead>
        <tr>
          <th
            v-for="header in headers"
            :key="header"
            class="text-left text-medium-emphasis font-weight-medium"
          >
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="empty">
          <td :colspan="headers.length" class="text-center text-medium-emphasis py-8">
            Sin resultados
          </td>
        </tr>
        <slot v-else />
      </tbody>
    </v-table>
  </v-card>
</template>
