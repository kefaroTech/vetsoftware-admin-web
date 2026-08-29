<script setup lang="ts">
import { MONEY_SCOPE_NOTE } from '@/composables/format'

/**
 * <b>La divisa de la plataforma, dicha una vez por tabla, en su `&lt;caption&gt;`.</b>
 *
 * <p>Es la mitad «de superficie» de la política de dinero que documenta
 * `composables/format.ts`: la celda imprime la cifra desnuda (`formatAmount`,
 * sin símbolo, porque el DTO no declara `currency`) y la tabla dice de qué
 * divisa se habla. No es lo mismo que rotular «Total (COP)» en la cabecera de
 * la columna —eso ataría la divisa a un dato concreto que el contrato no ata—:
 * esto describe la plataforma, no la fila.
 *
 * <p><b>Por qué un `&lt;caption&gt;` y no un párrafo encima de la tabla.</b> El
 * `&lt;caption&gt;` es el único sitio del HTML que un lector de pantalla anuncia
 * <i>como nombre de la tabla</i>, antes de leer una sola celda; un `&lt;p&gt;`
 * hermano es texto suelto que se lee —o no— según por dónde entre el usuario.
 * Una unidad que vale para toda la tabla pertenece a la tabla.
 *
 * <p><b>El texto viene de una constante y no se puede sustituir por prop</b>: la
 * discrepancia que este bloque de trabajo arregla nació de tener tres textos
 * para el mismo peso. Lo que sí admite es una descripción propia de la tabla,
 * por el slot, que se anuncia antes de la divisa y queda solo para lector de
 * pantalla: así las tablas que ya tenían su `&lt;caption class="ds-sr-only"&gt;`
 * no pierden lo que decían, y ninguna acaba con dos `&lt;caption&gt;` (el HTML
 * solo admite uno y el navegador descarta el segundo en silencio).
 */
</script>

<template>
  <caption class="ds-meta leyenda">
    <span v-if="$slots.default" class="ds-sr-only"><slot /></span>
    {{
      MONEY_SCOPE_NOTE
    }}
  </caption>
</template>

<style scoped>
/* El navegador centra el `<caption>` por defecto; aquí tiene que leerse como
   una línea de metadatos alineada con la primera columna, no como un título.
   El padding horizontal es el mismo de `.ds-table th`/`td` para que caiga a
   plomo sobre la primera celda. */
.leyenda {
  padding: var(--space-8) var(--space-14);
  text-align: left;
}
</style>
