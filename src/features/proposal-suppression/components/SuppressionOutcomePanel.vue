<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'
import type { ProposalSuppressionOutcome } from '../types/proposal-suppression.types'
import { formatSuppressionInstant, suppressionStatusOf } from '../composables/suppressionRules'

/**
 * El acuse de una supresión ya ejecutada.
 *
 * <p><b>Dos desenlaces, y pintarlos igual sería el defecto de esta pantalla.</b>
 * El servidor responde 200 en los dos casos, así que la única barrera entre «se
 * borró» y «no había nada» es este componente. Quien atiende una petición de
 * habeas data necesita saber cuál de los dos tiene delante: en el segundo, su
 * trabajo no ha terminado — tiene que probar con otra dirección o volver al
 * titular a preguntarle desde cuál escribió.
 *
 * <p><b>Los tres contadores se enseñan, no solo el total.</b> Es la razón por la
 * que el backend los devuelve por separado
 * (`ProposalSuppressionDto.java:9-13`): un total suelto no distingue «ese correo
 * no está» de «el paso de los motivos no tocó nada porque su consulta está
 * rota». Con el desglose delante, una supresión sana de una propuesta con
 * conversación mueve los tres números, y una rota se ve como dos con cifra y uno
 * a cero.
 *
 * <p><b>Y son filas, no personas.</b> El rótulo lo dice, porque «3» junto a la
 * palabra «propuestas» se lee como tres propuestas distintas y puede ser una
 * sola contada tres veces por sus turnos.
 */
const props = defineProps<{ outcome: ProposalSuppressionOutcome }>()

const encontrado = computed(() => suppressionStatusOf(props.outcome.counters) === 'suppressed')

const filas = computed(() => [
  {
    testid: 'acuse-contador-proposals',
    label: 'Cabeceras de propuesta (correo y clave de idempotencia)',
    value: props.outcome.counters.proposals,
  },
  {
    testid: 'acuse-contador-turns',
    label: 'Turnos (texto del prospecto y respuesta del modelo)',
    value: props.outcome.counters.turns,
  },
  {
    testid: 'acuse-contador-lines',
    label: 'Motivos por línea',
    value: props.outcome.counters.lines,
  },
])

/**
 * La marca del SERVIDOR, que es la única que vale como prueba. Esto era
 * `new Date(outcome.at)` —el reloj del equipo del operador— mientras el contrato
 * no devolvió ninguna; ver el javadoc de `ProposalSuppressionResponse`.
 */
const momento = computed(() => formatSuppressionInstant(props.outcome.counters.suppressedAt))

/**
 * Cuándo se había suprimido antes, si es que se había. Es lo que convierte un
 * acuse de tres ceros en una respuesta útil para el titular: «ya se atendió el 3
 * de julio» en lugar de «no hay nada, prueba otra dirección».
 */
const supresionAnterior = computed(() =>
  formatSuppressionInstant(props.outcome.counters.previouslySuppressedAt),
)
</script>

<template>
  <section
    class="ds-card ds-stack ds-stack--14"
    :role="encontrado ? 'status' : 'alert'"
    aria-labelledby="acuse-titulo"
    data-testid="acuse"
    :data-resultado="encontrado ? 'hallazgo' : 'sin-hallazgo'"
  >
    <div
      class="ds-banner ds-banner--flush"
      :class="encontrado ? 'ds-banner--success' : 'ds-banner--warning'"
      data-testid="acuse-banner"
      :data-tono="encontrado ? 'exito' : 'aviso'"
    >
      <component
        :is="encontrado ? ICONS.SUCCESS : ICONS.WARNING"
        :size="16"
        class="ds-banner-icon"
      />
      <span id="acuse-titulo" class="ds-flex-fill">
        <template v-if="encontrado">
          Se suprimieron los datos del asistente asociados a
          <strong class="correo">{{ outcome.email }}</strong
          >.
        </template>
        <template v-else>
          No se encontró ningún dato del asistente asociado a
          <strong class="correo">{{ outcome.email }}</strong
          >. Nada se borró.
        </template>
      </span>
    </div>

    <!-- El desglose se pinta también cuando son ceros: los tres ceros SON la
         respuesta, y esconderlos dejaría al operador sin ver que la petición
         llegó al servidor y volvió. -->
    <div class="ds-stack ds-stack--8">
      <p class="ds-kicker">Filas afectadas</p>
      <ul class="ds-list-reset ds-stack ds-stack--8">
        <li v-for="fila in filas" :key="fila.label" class="ds-flex-row">
          <span class="ds-flex-fill">{{ fila.label }}</span>
          <span class="ds-num" :data-testid="fila.testid">{{ fila.value }}</span>
        </li>
        <li class="ds-flex-row">
          <span class="ds-flex-fill ds-text-strong">Total de filas</span>
          <strong class="ds-num" data-testid="acuse-contador-total">{{
            outcome.counters.total
          }}</strong>
        </li>
      </ul>
      <p class="ds-meta">
        Son filas de base de datos, no personas ni propuestas distintas: una misma propuesta con
        conversación cuenta su cabecera, cada turno y cada motivo.
      </p>
    </div>

    <div v-if="!encontrado" class="ds-stack ds-stack--8">
      <p class="ds-kicker">Qué significa, y qué hacer ahora</p>
      <!-- Con `previouslySuppressedAt` los dos ceros dejan de ser el mismo caso:
           uno está atendido y el otro no. Mandar a «probar otra dirección» a un
           titular al que ya se le borró todo le hace perder el tiempo sobre un
           derecho que, de hecho, ya se ejerció. -->
      <p v-if="supresionAnterior" class="ds-meta" data-testid="acuse-supresion-anterior">
        <strong>Ya se había suprimido antes</strong>, el {{ supresionAnterior }}, y por eso no
        quedaba nada que borrar. La petición está atendida y este acuse es la constancia de que se
        atendió: no hace falta probar otra dirección.
      </p>
      <template v-else>
        <p class="ds-meta" data-testid="acuse-cero-ambiguo">
          Sin supresión anterior registrada, un cero puede venir de dos sitios y
          <strong>el servidor no los distingue a propósito</strong>: o ese correo nunca pidió una
          propuesta, o sus datos ya se los llevó el barrido automático de retención. Responder «no
          existe» sería convertir esta pantalla en un chivato que dice qué direcciones han usado el
          asistente.
        </p>
        <p class="ds-meta" data-testid="acuse-otra-direccion">
          Si el titular pudo escribir desde otra dirección, pruébala:
          <strong>el correo es la única llave que admite este borrado</strong>. No hay búsqueda por
          identificador de propuesta ni por token.
        </p>
      </template>
    </div>

    <p v-else class="ds-meta">
      Si vuelves a lanzarlo con este mismo correo, dirá que no encontró nada — es lo esperado, no un
      fallo: lo que se busca es el correo, y el correo ya no está.
    </p>

    <p v-if="momento" class="ds-meta" data-testid="acuse-momento">
      Registrado por el servidor el {{ momento }}. Es la fecha del acuse —del reloj del servidor, no
      del de tu equipo—, que es la que sirve como constancia de que la petición se atendió. El
      servidor no deja constancia de quién la pidió.
    </p>
  </section>
</template>

<style scoped>
/* Un correo largo se parte antes que desbordar la tarjeta del acuse. */
.correo {
  overflow-wrap: anywhere;
}
</style>
