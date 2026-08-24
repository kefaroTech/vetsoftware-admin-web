<script setup lang="ts">
import DocumentSeal from './DocumentSeal.vue'

/**
 * **El chasis de documento.** La materialización de la §3.2 de la especificación
 * de suscripciones, y la tarea W3-B.
 *
 * <p>El principio, literal: <i>un documento se lee, no se edita</i>. Una cotización
 * emitida, un otrosí firmado o una referencia de facturación ya registrada son
 * hechos consumados. Pintarlos con la misma caja que un formulario invita a
 * tratarlos como editables, y ese es justo el error que este componente existe para
 * hacer imposible.
 *
 * <h3>Las cuatro señales, simultáneas y ninguna de color</h3>
 *
 * <ol>
 *   <li><b>Chasis distinto.</b> Regla superior, el número de documento como titular
 *       (`.ds-display--xs`) y los datos en un <code>&lt;dl&gt;</code> sobre
 *       <code>.ds-detail-grid</code> — <b>nunca</b> en <code>&lt;input
 *       disabled&gt;</code>. Un input gris dice «editable, pero ahora no»; un
 *       <code>&lt;dl&gt;</code> dice «esto es un hecho». La regla superior es
 *       geometría, no color: en escala de grises la ficha se sigue leyendo como
 *       documento.</li>
 *   <li><b>Sello textual</b> (`DocumentSeal`), con el significado íntegro en el
 *       texto.</li>
 *   <li><b>«Editar» no está en el marcado.</b> Ni deshabilitado ni oculto: no
 *       existe. Este componente <b>no expone ninguna prop `editable`</b>, y el slot
 *       `actions` solo debe recibir verbos de añadir. Es una decisión de diseño
 *       expresada como ausencia de API: no hay forma de pedirle a esta ficha que se
 *       ponga en modo edición, porque la operación no existe en el contrato.</li>
 *   <li><b>La cadena de corrección se ve</b>, y en los dos sentidos: el slot
 *       `chain`.</li>
 * </ol>
 *
 * <h3>Sobre el orden de los bloques</h3>
 *
 * <p>Las acciones van <b>antes</b> del cuerpo, pegadas a la cabecera. En una ficha
 * que puede ser larga —una cotización trae líneas, totales y respuestas— enterrar
 * los verbos al final obliga a recorrerla entera para actuar, y en teclado son un
 * viaje de vuelta. Es el orden que ya tenía `QuoteDocument` y se conserva.
 *
 * <h3>Sobre el `<h2>` y el foco</h3>
 *
 * <p>El titular lleva `tabindex="-1"` y un `id` que fija el consumidor, porque las
 * dos pantallas que montan esta ficha le devuelven el foco tras una escritura que
 * cambia de chasis (§5.1): al pasar de borrador a documento, quien navega con
 * teclado se quedaría con el foco en un botón que acaba de salir del árbol. El `id`
 * es prop y no un valor fijo para que dos fichas puedan convivir en una pantalla sin
 * duplicarlo.
 */
defineProps<{
  /** El número del documento. Es el titular: identifica la ficha. */
  documentNumber: string
  /** Qué clase de documento es. Va de antetítulo sobre el número. */
  kindLabel: string
  /** La frase del sello. Ver `DocumentSeal`. */
  sealText: string
  /** `id` del `<h2>`, para que el consumidor pueda devolverle el foco. */
  titleId: string
}>()
</script>

<template>
  <article class="ds-card documento ds-stack ds-stack--18">
    <header class="ds-stack ds-stack--10">
      <p class="ds-kicker">{{ kindLabel }}</p>
      <div class="ds-flex-row ds-flex-row--12 titular">
        <h2 :id="titleId" class="ds-display--xs numero" tabindex="-1">{{ documentNumber }}</h2>
        <!-- Distintivos de estado y vigencia: son de quien monta la ficha, porque
             cada tipo de documento tiene los suyos y ya existen (§6.2 descarta una
             variante nueva de `AppBadge`). -->
        <slot name="titular" />
      </div>
      <DocumentSeal :text="sealText" />
    </header>

    <!-- Los datos, como hechos. Ni un solo control de formulario en este bloque. -->
    <dl v-if="$slots.meta" class="ds-detail-grid">
      <slot name="meta" />
    </dl>

    <!-- Solo verbos de añadir. «Editar» no cabe aquí porque la operación no existe. -->
    <div v-if="$slots.actions" class="ds-actions ds-actions--start">
      <slot name="actions" />
    </div>

    <slot name="body" />

    <slot name="chain" />
  </article>
</template>

<style scoped>
/* La regla superior es la señal de chasis: separa un documento de una tarjeta de
   trabajo sin depender del color. Vivía copiada en `QuoteDocument` y en
   `ExternalInvoiceRecord`; ahora vive una sola vez, aquí. */
.documento {
  border-top: 3px solid var(--amatista-500);
}

.titular {
  flex-wrap: wrap;
}

.numero {
  margin: 0;
}

/* El `<dd>` del navegador nace con `margin-inline-start: 40px`, que desalinea la
   rejilla de detalle. El contenido del slot se compila en el ámbito del PADRE, así
   que la regla tiene que cruzar con `:deep()`; a cambio, los consumidores dejan de
   arrastrar cada uno su propia clase `.valor` para hacer exactamente esto. */
:deep(dd) {
  margin: var(--space-4) 0 0;
}
</style>
