<script lang="ts">
import type { Component } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * De dónde sale un dato. Son cuatro y no hay un quinto: si aparece un origen
 * nuevo, se añade aquí y el compilador recorre solo los cuatro mapas de abajo.
 */
export type ProvenanceSource = 'PLAN' | 'CONTRACT' | 'NEGOTIATED_EXCEPTION' | 'FACTORY'

export const PROVENANCE_SOURCES: readonly ProvenanceSource[] = [
  'PLAN',
  'CONTRACT',
  'NEGOTIATED_EXCEPTION',
  'FACTORY',
] as const

/** El rótulo corto. Es la parte que se lee de un vistazo dentro de una tabla. */
export const PROVENANCE_LABEL: Record<ProvenanceSource, string> = {
  PLAN: 'Viene del plan',
  CONTRACT: 'Viene del contrato',
  NEGOTIATED_EXCEPTION: 'Excepción negociada',
  FACTORY: 'Valor de fábrica',
}

/**
 * Qué implica ese origen, en una frase. Es lo que decide si alguien puede tocar
 * el dato o tiene que ir a otra pantalla, y por eso no es decoración: la
 * diferencia entre «lo trae el plan» y «se pactó aparte» es la diferencia entre
 * un recálculo que lo repone y uno que lo borra.
 */
export const PROVENANCE_MEANING: Record<ProvenanceSource, string> = {
  PLAN: 'Lo trae el plan contratado. Si se cambia de plan, cambia con él.',
  CONTRACT: 'Lo fija una línea del contrato vigente. Se cambia en «Lo contratado».',
  NEGOTIATED_EXCEPTION:
    'Se pactó aparte del plan. No lo repone un recálculo: si se revoca, se pierde.',
  FACTORY: 'Nadie lo ha cambiado: es el valor con el que nace el producto.',
}

/**
 * El icono es DECORATIVO y va con `aria-hidden`: el origen ya lo dice el rótulo.
 * Está aquí para que la columna se recorra con la vista, no para sustituir texto
 * (§5.2 · nada se comunica solo por forma o color).
 */
export const PROVENANCE_ICON: Record<ProvenanceSource, Component> = {
  PLAN: ICONS.SUBSCRIPTION,
  CONTRACT: ICONS.RECEIPT,
  NEGOTIATED_EXCEPTION: ICONS.EDIT,
  FACTORY: ICONS.SETTINGS,
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/**
 * <b>La línea de procedencia</b>: de dónde sale este dato — del plan, del
 * contrato, de una excepción negociada, o de fábrica.
 *
 * <p><b>Para qué existe.</b> En las pantallas derivadas, la pregunta que se hace
 * un operador con el cliente al teléfono no es «¿cuánto es?» sino «¿por qué es
 * esto?». Sin procedencia, la respuesta es una conjetura, y la conjetura acaba
 * siendo «te lo cambio» sobre un dato que el siguiente recálculo va a reponer.
 * Con ella, la pantalla dice a la vez el valor y quién manda sobre él.
 *
 * <p><b>Texto siempre, color nunca.</b> El rótulo va escrito y el icono es
 * decorativo (`aria-hidden`). Un origen no se puede comunicar por tono: se lee
 * por teléfono y se copia en un correo (§5.2). No introduce ningún tono nuevo, y
 * por eso no toca la puerta de contraste.
 *
 * <p><b>El enlace es opcional y no se inventa.</b> `CORE` y lo concedido a mano no
 * tienen línea detrás —igual que en `entitlementJustification`—, así que ofrecer
 * un enlace en esos casos prometería una pantalla que no existe (R14 · un hueco
 * honesto antes que un dato inventado). Si la pantalla no pasa `to`, no hay
 * enlace.
 */
const props = withDefaults(
  defineProps<{
    source: ProvenanceSource
    /** El dato concreto: «Plan Profesional», «Línea #482». Se pinta tras el rótulo. */
    detail?: string | null
    /** `true` añade la frase que explica qué implica el origen. */
    explain?: boolean
    /** A dónde se va a comprobarlo. Sin `to` no se pinta enlace. */
    to?: RouteLocationRaw | null
    /** Nombre accesible del enlace. Lleva el sujeto, no dice «ver más» (R04). */
    linkLabel?: string
  }>(),
  { linkLabel: 'Ver el origen' },
)

const label = computed(() => PROVENANCE_LABEL[props.source])
const meaning = computed(() => PROVENANCE_MEANING[props.source])
const icon = computed(() => PROVENANCE_ICON[props.source])
</script>

<template>
  <p class="ds-meta ds-flex-row linea">
    <component :is="icon" :size="14" class="ds-banner-icon" aria-hidden="true" />
    <span class="ds-text-strong">{{ label }}</span>
    <span v-if="detail">· {{ detail }}</span>
    <RouterLink v-if="to" :to="to" :aria-label="linkLabel">{{ linkLabel }}</RouterLink>
    <span v-if="explain">{{ meaning }}</span>
  </p>
</template>

<style scoped>
/* La línea envuelve en pantallas estrechas en vez de recortar el rótulo: el
   origen es la parte que no se puede perder (WCAG 2.2 §1.4.10). Una sola
   declaración; la geometría de fila la pone `.ds-flex-row`. */
.linea {
  flex-wrap: wrap;
}
</style>
