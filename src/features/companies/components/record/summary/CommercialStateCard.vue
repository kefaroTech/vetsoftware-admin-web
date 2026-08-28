<script setup lang="ts">
import SummaryCard from '../SummaryCard.vue'
import MissingDataNote from '../MissingDataNote.vue'
import { COMMERCIAL_STATE_GAP, MISSING_DATA_TITLE } from '../../../composables/companySummaryText'

/**
 * <b>Estado comercial</b> — la segunda tarjeta de §I2, y <b>la que no tiene
 * dato</b>.
 *
 * <p>La especificación la describe entera —«Pagando» · «Gratuito con cupo» ·
 * «Solo prueba, nunca ha pagado» · «Se fue»— y el contrato del backend no la
 * expone por ninguna vía. Esta tarjeta existe igualmente, y dice eso.
 *
 * <p><b>Por qué la tarjeta se pinta en vez de omitirse.</b> Omitirla dejaría la
 * rejilla con cinco huecos y a nadie enterado de que falta; peor, el siguiente
 * que abra la pantalla la añadiría con el estado del contrato dentro, que es el
 * error exacto que `commercial_state` existe para impedir. La tarjeta escrita con
 * el hueco declarado es lo que impide que ese error se cometa dos veces.
 *
 * <p>No recibe props a propósito: no hay nada que pasarle. El día que el contrato
 * traiga el dato, esta tarjeta lo recibe y el hueco se va.
 */
</script>

<template>
  <SummaryCard title="Estado comercial">
    <MissingDataNote
      :title="MISSING_DATA_TITLE"
      :what="COMMERCIAL_STATE_GAP.what"
      :why="COMMERCIAL_STATE_GAP.why"
      :trap="COMMERCIAL_STATE_GAP.trap"
      :blocked-by="COMMERCIAL_STATE_GAP.blockedBy"
    />
  </SummaryCard>
</template>
