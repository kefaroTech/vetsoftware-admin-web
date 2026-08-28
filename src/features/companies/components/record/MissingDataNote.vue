<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/**
 * <b>El hueco honesto.</b> Lo que se pinta donde iría un dato que todavía no
 * existe.
 *
 * <p>La regla que lo justifica es R14 de `docs/ux/reglas-de-interfaz.md`: si el
 * dato no está, no se pinta la línea — ni un valor de ejemplo, ni un contador
 * plausible. El motivo es que un dato inventado <b>desinforma con la misma cara
 * con la que informa</b>, así que quien lo lee no puede reconocerlo,
 * diagnosticarlo ni recuperarse de él.
 *
 * <p>Pero un hueco en blanco tampoco vale en esta pantalla concreta. El resumen
 * del expediente lo abre soporte con el cliente al teléfono, y una tarjeta vacía
 * se lee como «esta clínica no tiene nada», que es otra mentira. Por eso el hueco
 * <b>habla</b>: dice qué iría ahí, por qué importa, y qué falta para que exista.
 *
 * <p><b>Tono `info`, no `warning`.</b> No hay nada que el operador pueda hacer ni
 * nada que esté yendo mal en esta empresa: es una pieza del producto que aún no
 * está. `role="status"` y no `alert` por lo mismo — no interrumpe a quien está
 * leyendo la ficha. No introduce ningún tono nuevo y por tanto no toca la puerta
 * de contraste.
 */
defineProps<{
  /** El titular del hueco. Dice si falta el dato o falta la pantalla. */
  title: string
  /** Qué se vería aquí, en una frase. */
  what: string
  /** Por qué importa. Es lo que evita que el hueco se cierre con un cero. */
  why?: string
  /** El error concreto que alguien cometería al rellenarlo mal. */
  trap?: string
  /** Qué hace falta para cerrarlo. */
  blockedBy?: string | null
}>()
</script>

<template>
  <div class="ds-banner ds-banner--info hueco" role="status">
    <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
    <div class="ds-stack ds-stack--8 ds-flex-fill">
      <p class="ds-text-strong parrafo">{{ title }}</p>
      <p class="parrafo">{{ what }}</p>
      <p v-if="why" class="ds-meta parrafo">{{ why }}</p>
      <p v-if="trap" class="ds-meta parrafo">{{ trap }}</p>
      <p v-if="blockedBy" class="ds-meta parrafo">Falta para cerrarlo: {{ blockedBy }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* El icono se alinea con la primera línea y no con el centro de un bloque que
   puede tener cinco párrafos. */
.hueco {
  align-items: flex-start;
}

.parrafo {
  margin: 0;
}
</style>
