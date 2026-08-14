<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { ICONS } from '@/constants/icons'

const { notifications, dismiss } = useNotification()

function colorFor(type: string) {
  if (type === 'success') return 'success'
  if (type === 'error') return 'error'
  if (type === 'warning') return 'warning'
  return 'grey-darken-3'
}

function iconFor(type: string) {
  if (type === 'success') return ICONS.SUCCESS
  if (type === 'error') return ICONS.ERROR
  if (type === 'warning') return ICONS.WARNING
  return ICONS.INFO
}

/** Id del aviso cuya traza se acaba de copiar, para confirmar el clic sin sacar otro aviso. */
const copiado = ref<number | null>(null)

async function copiar(id: number, traceId: string) {
  try {
    await navigator.clipboard.writeText(traceId)
    copiado.value = id
    window.setTimeout(() => {
      if (copiado.value === id) copiado.value = null
    }, 2000)
  } catch {
    // Sin permiso de portapapeles el identificador sigue visible y seleccionable a mano.
  }
}

const items = computed(() => notifications.value)
</script>

<template>
  <div class="vet-toast-wrapper">
    <v-snackbar
      v-for="n in items"
      :key="n.id"
      :model-value="true"
      :color="colorFor(n.type)"
      :timeout="-1"
      location="bottom right"
      class="ma-2"
    >
      <div class="d-flex align-center ga-2">
        <v-icon :icon="iconFor(n.type)" />
        <span>{{ n.message }}</span>
      </div>
      <!-- TR-05: el identificador de la traza. Es lo único que permite a soporte encontrar en el
           servidor qué pasó detrás de un «se quedó cargando». -->
      <button
        v-if="n.traceId"
        type="button"
        class="vet-toast-trace"
        @click="copiar(n.id, n.traceId)"
      >
        <v-icon :icon="copiado === n.id ? ICONS.SUCCESS : ICONS.COPY" size="x-small" />
        <span class="vet-toast-trace-id">{{ n.traceId }}</span>
      </button>
      <template #actions>
        <v-btn :icon="ICONS.CLOSE" variant="text" size="small" @click="dismiss(n.id)" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
/* Identificador de la traza (TR-05): discreto, monoespaciado y copiable de un clic. */
.vet-toast-trace {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 2px 7px;
  border: 1px solid rgb(255 255 255 / 35%);
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  max-width: 100%;
}

.vet-toast-trace-id {
  font-family: ui-monospace, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
