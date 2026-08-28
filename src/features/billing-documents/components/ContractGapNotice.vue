<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/**
 * <b>Un hueco honesto, con su causa escrita.</b>
 *
 * <p>La regla que materializa es la R14 del repositorio —<i>un hueco honesto
 * antes que un cero inventado</i>— aplicada al caso concreto del bloque del
 * dinero: cuando el contrato de hoy no tiene de dónde sacar un dato, la pantalla
 * <b>no</b> pinta un cero, ni una raya sin explicación, ni una tabla vacía que se
 * lee como «no hay nada». Dice qué falta, por qué falta y qué haría falta para
 * que dejara de faltar.
 *
 * <p><b>Por qué importa tanto aquí.</b> Un cero en una pantalla contable no se
 * lee como «no lo sé»: se lee como «es cero». «Impuesto: 0» sobre un documento
 * cuyo desglose no se pudo cargar es un dato falso que alguien va a copiar en un
 * correo. Y el vacío que de verdad significa «no hay» —ninguna aplicación
 * todavía, ningún renglón— se pinta con `AppEmptyState`, que es otra cosa: eso sí
 * es un hecho del negocio.
 *
 * <p><b>No es un error y no se pinta como tal</b>: usa el tono informativo y no
 * `role="alert"`. No ha fallado nada — el servidor respondió lo que sabe. Pintarlo
 * en rojo mandaría a alguien a reintentar una petición que no está rota, y
 * acabaría en un ticket de soporte por una carencia conocida.
 *
 * <p>Cero CSS de color: el tono viaja en `ds-banner--info` desde el marcado.
 */
defineProps<{
  /** Qué no se puede enseñar, dicho como dato: «La historia de estados». */
  title: string
  /** Por qué. La causa concreta, no una disculpa genérica. */
  reason: string
  /**
   * Qué lo cerraría, en el vocabulario del contrato: el endpoint o el campo que
   * hace falta. Es lo que convierte el hueco en una tarea de alguien.
   */
  needed?: string
}>()
</script>

<template>
  <div class="ds-banner ds-banner--info hueco">
    <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
    <div class="ds-flex-fill ds-stack ds-stack--6">
      <p class="ds-text-strong titulo">{{ title }}</p>
      <p class="razon">{{ reason }}</p>
      <p v-if="needed" class="ds-meta razon">
        <span class="ds-text-strong">Qué haría falta:</span> {{ needed }}
      </p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* El aviso se alinea arriba: su cuerpo son varias líneas y centrar el icono
   respecto de un bloque de tres párrafos lo deja flotando a media altura. */
.hueco {
  align-items: flex-start;
}

.titulo,
.razon {
  margin: 0;
}
</style>
