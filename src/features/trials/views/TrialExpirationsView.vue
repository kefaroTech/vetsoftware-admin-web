<script setup lang="ts">
import { computed } from 'vue'
import TrialExpirationsPanel from '../components/TrialExpirationsPanel.vue'
import { businessToday } from '../composables/trialWindowText'

/**
 * `/pruebas/vencimientos` — <b>a quién hay que llamar hoy</b>.
 *
 * <p>Es la pantalla que `TrialExpirationsPanel.vue` anticipó por escrito: «el día
 * que exista la pantalla de plataforma se monta ahí sin tocar nada». Se monta sin
 * tocar nada — el panel no se ha modificado, solo ha cambiado el anfitrión.
 *
 * <p><b>El día por defecto es hoy, y aquí sí.</b> El panel deja esa decisión al
 * anfitrión a propósito, porque no es la misma en los dos sitios: desde el
 * expediente de una empresa la pregunta útil es «qué más vence el día que vence
 * lo de esta empresa», y desde plataforma es «qué vence hoy». Ese «hoy» se
 * resuelve en la zona del negocio con {@link businessToday}, no con el reloj del
 * navegador: un operador conectado desde otro huso pediría el barrido del día
 * siguiente durante las últimas horas de la tarde en Bogotá, y vería una lista
 * vacía justo el día que había que llamar.
 *
 * <p><b>No se pasa `currentCompanyId`.</b> Ese prop existe para que el panel no
 * repita como novedad la empresa que ya se está mirando; aquí no se está mirando
 * ninguna, y todas las filas son igual de nuevas.
 */
const today = computed(() => businessToday())
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="vencimientos-title">
    <div class="ds-block-head">
      <h2 id="vencimientos-title" class="ds-title">Vencimientos del día</h2>
    </div>

    <p class="ds-meta intro">
      Las concesiones de <strong>todas</strong> las empresas que terminan ese día. Una que termina
      hoy <strong>sigue viva hoy</strong>: el último día cuenta entero, así que la llamada se hace
      hoy y no mañana. Desde cada fila se salta al expediente de su empresa para escribir el
      desenlace.
    </p>

    <TrialExpirationsPanel :initial-day="today" />
  </section>
</template>

<style scoped>
.intro {
  max-width: 70ch;
}
</style>
