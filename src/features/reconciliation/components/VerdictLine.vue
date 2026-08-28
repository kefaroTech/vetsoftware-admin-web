<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { Verdict } from '../composables/reconciliationVerdict'

/**
 * Un veredicto de conciliación: el rótulo con su tono y, cuando hace falta, la
 * frase que dice qué significa.
 *
 * <p><b>El rótulo va escrito, siempre.</b> «Cuadra dentro de la tolerancia» en
 * verde y «No cuadra» en rojo se distinguen por el texto y no por el color: el
 * cierre del mes se lee por teléfono y se pega en un correo (§5.2 · nada se
 * comunica solo por forma o color).
 *
 * <p><b>`meaning` es opcional a propósito.</b> En una tabla de veinte filas,
 * repetir la explicación veinte veces la vuelve invisible; en el detalle de una
 * fila es justo lo que hace falta. La decide la pantalla, no esta pieza.
 */
defineProps<{
  verdict: Verdict
  /** `true` añade la frase que explica el veredicto bajo el rótulo. */
  explain?: boolean
}>()
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <div>
      <AppBadge :variant="verdict.tone" :label="verdict.label" />
    </div>
    <p v-if="explain" class="ds-meta">{{ verdict.meaning }}</p>
  </div>
</template>
