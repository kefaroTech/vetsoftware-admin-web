<script setup lang="ts">
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'

/**
 * La confirmación de una operación **irreversible** sobre datos personales.
 *
 * <p><b>Por qué NO usa `SignedActionModal`</b>, que es la pieza con la que se
 * confirman las otras trece acciones con consecuencia de esta consola. Ese modal
 * exige un motivo de lista cerrada y una nota, y su valor es que ese motivo
 * <i>viaja con la operación</i> y queda escrito para quien la audite después.
 * Aquí no hay dónde escribirlo: `SuppressProposalDataRequest` declara
 * <b>un solo campo</b>, `contactEmail`. Pedir un motivo que después se tira sería
 * teatro de auditoría — el operador creería estar firmando algo y no estaría
 * firmando nada. Se confirma con el peso que sí se puede sostener: el sujeto a la
 * vista, la consecuencia enumerada y un botón que nombra la acción.
 *
 * <p><b>`role="alertdialog"`</b>: el cuerpo hay que oírlo sí o sí, porque
 * contiene el límite de lo que se va a borrar y el hecho de que no se deshace.
 *
 * <p><b>No se cierra al pulsar fuera</b> (regla global de `ModalShell`) y el
 * botón de confirmar es `ds-btn--danger`. Los tres puntos de la lista no son
 * literatura: son las tres consultas de `AiProposalRetentionJpaRepository`
 * (`:196`, `:212`, `:236`), que son exactamente lo que se ejecuta.
 */
defineProps<{
  open: boolean
  /** El correo, ya recortado. Se pinta literal: es el sujeto de la operación. */
  email: string
  saving: boolean
  /**
   * A11Y-08 · dónde dejar el foco al cerrar. Se pasa tal cual a `ModalShell`.
   *
   * <p>Existe porque los dos cierres de este diálogo NO son el mismo. Cancelar o
   * Escape no ha escrito nada y el foco vuelve al disparador —la cadena de
   * respaldo del propio `ModalShell`—. Confirmar sí ha escrito, y de forma
   * irreversible: el acuse aparece por debajo del botón que se pulsó, así que
   * quedarse en ese botón deja a quien navega con teclado o lector de pantalla
   * sin enterarse del resultado. La vista pasa una FUNCIÓN, que `ModalShell`
   * resuelve en el instante del cierre y puede por tanto contestar distinto
   * según por dónde se haya cerrado.
   */
  returnFocusTo?: HTMLElement | (() => HTMLElement | null) | string | null
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <ModalShell
    :open="open"
    title="Suprimir los datos de este titular"
    subtitle="Habeas data · artículo 8, literal e, de la Ley 1581"
    :icon="ICONS.WARNING"
    accent="danger"
    role="alertdialog"
    compact
    :width="560"
    :return-focus-to="returnFocusTo"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--16">
        <p class="ds-dialog-body">
          ¿Suprimir todo lo que el asistente guarda del correo
          <strong class="correo" data-testid="confirmar-correo">{{ email }}</strong
          >?
        </p>

        <div class="ds-banner ds-banner--warning" role="alert">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            No se puede deshacer. Los datos no se archivan en ninguna parte: se borran de la fila.
          </span>
        </div>

        <div class="ds-stack ds-stack--8">
          <p class="ds-kicker">Qué se borra</p>
          <ul class="ds-list-reset ds-meta ds-stack ds-stack--8">
            <li>El correo de contacto de sus propuestas y su clave de idempotencia.</li>
            <li>En cada turno, el texto que escribió y la respuesta cruda del modelo.</li>
            <li>Los motivos que el modelo dejó escritos línea a línea.</li>
          </ul>
        </div>

        <div class="ds-stack ds-stack--8">
          <p class="ds-kicker">Hasta dónde llega</p>
          <p class="ds-meta">
            Alcanza las propuestas <strong>escritas desde esa dirección</strong>. Un correo que
            aparezca mencionado dentro del texto de la propuesta de otra persona no lo toca esta
            operación: de eso se encarga la anonimización por tiempo.
          </p>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--danger"
        :disabled="saving"
        @click="emit('confirm')"
      >
        {{ saving ? 'Suprimiendo…' : 'Suprimir los datos' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El sujeto de la operación se lee entero aunque sea largo: un correo cortado
   por la mitad en el diálogo que decide un borrado irreversible es el peor sitio
   donde ahorrar espacio. */
.correo {
  overflow-wrap: anywhere;
}
</style>
