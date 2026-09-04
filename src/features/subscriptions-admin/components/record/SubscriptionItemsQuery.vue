<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { ICONS } from '@/constants/icons'
import { formatDate, parseISODate } from '@/composables/format'
import { todayISODate } from '../../composables/subscriptionDateTime'
import type { SubscriptionItemsScope } from '../../stores/subscription-items.store'

/**
 * <b>El control principal de «Lo contratado», arriba y visible</b> — no escondido
 * en un filtro (§3.3).
 *
 * <p>`onDate` es un parámetro que ya existe en el contrato y que nadie usaba, y es
 * lo que convierte una tabla en una respuesta: sin él la pantalla enseña una lista
 * de líneas; con él responde «qué tenía contratado Ana el 3 de marzo». Por eso no
 * es un filtro plegado en un panel lateral: es el encabezado de la pregunta.
 *
 * <p><b>La fecha manda en los dos alcances.</b> Con «Expediente completo» no filtra
 * nada —se ven también las cerradas— pero sigue siendo el día respecto al cual cada
 * línea es Vigente, Programada o Cerrada. Con «Solo lo vigente» viaja además como
 * `onDate` y filtra el servidor. Que sea una sola fecha para las dos cosas es lo que
 * evita la pantalla con dos calendarios que nadie sabe distinguir.
 *
 * <p><b>Se aplica al `change`, no al `input`</b> (§3.3). Es un `&lt;input
 * type="date"&gt;` nativo, y mientras se teclea `03/…` el valor intermedio es una
 * fecha distinta y válida: emitir en cada pulsación dispararía una consulta por
 * cada dígito y anunciaría respuestas que nadie pidió. `AppInput` no vale aquí
 * porque emite en `input`; a cambio, esto se ata a mano lo que aquel trae hecho —
 * `aria-describedby`, `aria-invalid` y el reparto del relleno vertical—.
 *
 * <p><b>Por qué un `&lt;fieldset&gt;` con dos radios nativos y no una casilla.</b>
 * Los dos estados tienen nombre y ninguno es «lo normal»: una casilla «ocultar
 * cerradas» obligaría a leer una negación y dejaría un estado sin rótulo. Los radios
 * nativos traen además el grupo, la navegación con flechas y el nombre accesible sin
 * una línea de ARIA.
 *
 * <p>No se crea ninguna primitiva de fecha: la consola no la tiene —`DateInput` solo
 * existe en el front del tenant— y el `&lt;input type="date"&gt;` nativo ya trae
 * calendario, teclado y localización del sistema.
 */
// Sin prop `busy` a propósito: la pregunta no se bloquea mientras se carga la
// respuesta. Deshabilitar el calendario durante la petición es lo que obliga a
// esperar para corregir una fecha mal tecleada.
const props = defineProps<{
  date: string
  scope: SubscriptionItemsScope
}>()

const emit = defineEmits<{
  'update:date': [value: string]
  'update:scope': [value: SubscriptionItemsScope]
}>()

const dateId = useId()
const hintId = useId()
const errorId = useId()
const scopeName = useId()

/**
 * Solo se pinta cuando el operador deja el campo en un estado que no es una fecha:
 * un `<input type="date">` con la fecha a medias devuelve la cadena vacía. No
 * arranca en error —nada que el usuario no haya tocado se marca como mal— y no se
 * emite el cambio mientras lo esté.
 */
const invalidReason = ref('')

const describedBy = computed(() => (invalidReason.value ? errorId : hintId))

const hint = computed(() =>
  props.scope === 'on-date'
    ? 'Se pide al servidor lo que estaba vigente ese día.'
    : 'La fecha no filtra: dice respecto a qué día se clasifica cada línea.',
)

const isToday = computed(() => props.date === todayISODate())

function onDateChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (!value) {
    invalidReason.value = 'Escribe una fecha completa o usa el calendario del campo.'
    return
  }
  if (!parseISODate(value)) {
    invalidReason.value = `«${value}» no es una fecha válida.`
    return
  }
  invalidReason.value = ''
  emit('update:date', value)
}

function goToToday() {
  invalidReason.value = ''
  emit('update:date', todayISODate())
}

function onScopeChange(value: SubscriptionItemsScope) {
  emit('update:scope', value)
}
</script>

<template>
  <div class="ds-card consulta ds-stack ds-stack--10">
    <div class="fila">
      <!-- `ds-stack--8` y no un gap propio: el catálogo de gaps de `primitives.css`
           existe justamente para que un cuarto componente no reinvente el suyo, y
           `css:budget` lo mide en el agregado. -->
      <div class="ds-stack ds-stack--8">
        <label :for="dateId" class="ds-label">Ver a fecha</label>
        <div
          class="ds-field ds-flex-row fechabox"
          :class="invalidReason ? 'ds-field-invalid' : 'ds-field-rest ds-focus-ring'"
        >
          <input
            :id="dateId"
            type="date"
            class="ds-flex-fill fecha"
            :value="date"
            :aria-invalid="invalidReason ? true : undefined"
            :aria-describedby="describedBy"
            @change="onDateChange"
          />
        </div>
      </div>

      <button type="button" class="ds-btn ds-btn--ghost hoy" :disabled="isToday" @click="goToToday">
        <component :is="ICONS.RETRY" :size="14" />
        Hoy
      </button>

      <fieldset class="alcance">
        <legend class="ds-label">Qué se muestra</legend>
        <div class="opciones">
          <label class="opcion">
            <input
              type="radio"
              :name="scopeName"
              value="on-date"
              :checked="scope === 'on-date'"
              @change="onScopeChange('on-date')"
            />
            <span>Solo lo vigente</span>
          </label>
          <label class="opcion">
            <input
              type="radio"
              :name="scopeName"
              value="all"
              :checked="scope === 'all'"
              @change="onScopeChange('all')"
            />
            <span>Expediente completo</span>
          </label>
        </div>
      </fieldset>
    </div>

    <!-- El error del campo se pinta con la primitiva de banner y no con un bloque
         de estilo propio: el cuerpo de regla del error en línea ya existe tres
         veces en `AppInput`/`AppSelect`/`AppTextarea`, y una cuarta copia rompe el
         presupuesto de CSS. La asociación con el control la da `aria-describedby`,
         que apunta a este `id`. -->
    <p v-if="invalidReason" :id="errorId" class="ds-banner ds-banner--error ds-banner--sm">
      <component :is="ICONS.WARNING" :size="14" class="ds-banner-icon" />
      <span>{{ invalidReason }}</span>
    </p>
    <p v-else :id="hintId" class="ds-hint">
      Mostrando el contrato tal como estaba el {{ formatDate(date) }}. {{ hint }}
    </p>
  </div>
</template>

<style scoped>
/* La consulta es el encabezado de la pantalla, no un panel de filtros: se separa
   del resto con la regla superior que ya usa el chasis de documento, para que se
   lea como «la pregunta» y la tabla como «la respuesta». */
.consulta {
  border-top: 3px solid var(--amatista-500);
}

.fila {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-18);
}

/* El relleno vertical lo lleva el `<input>` y no el envoltorio, igual que en
   `AppInput`: con el de `.ds-field` aquí, la mitad del alto visible del campo
   queda fuera del objetivo de pulsación y el clic no enfoca nada. */
.fechabox {
  padding-block: 0;
}

/* El `<input type="date">` nativo trae su propio ancho según el idioma del
   sistema; se le deja crecer lo justo y no se estira a toda la fila. */
.fecha {
  min-width: 9.5rem;
  padding-block: var(--space-10);
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

/* Issue #102: el envoltorio YA es el anillo de foco visible del patrón de campo;
   sumar el del `<input>` dejaría un doble anillo. */
.fecha:focus-visible {
  box-shadow: none;
}

/* Altura mínima del objetivo táctil de §2.5.8, igual que el resto de `.ds-btn`. */
.hoy {
  flex: none;
}

/* `<fieldset>` + `<legend>` nativos: el grupo de radios trae de serie su nombre
   accesible, la navegación con flechas y el anuncio del grupo al entrar. Se le
   quitan el borde y el relleno que el navegador le pone por defecto, nada más. */
.alcance {
  margin: 0;
  padding: 0;
  border: none;
}

.alcance > legend {
  padding: 0;
}

.opciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6) var(--space-18);
  margin-top: var(--space-6);
}

.opcion {
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
  min-height: var(--space-24);
  color: var(--text);
  font-size: var(--text-body);
  cursor: pointer;
}
</style>
