<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import MissingDataNote from '../../components/record/MissingDataNote.vue'
import { PENDING_SCREEN_TITLE } from '../../composables/companySummaryText'
import type { CompanyRecordPending } from '../../types/company-record.types'

/**
 * <b>El destino honesto de una pestaña que todavía no está construida.</b>
 *
 * <p>El armazón registra las diez sub-vistas de §I2–I11 desde el primer día, y
 * ocho de ellas son de otros lotes. Había tres formas de dejarlas y solo una es
 * aceptable:
 *
 * <ol>
 *   <li>No registrar la ruta. La pestaña llevaría a un 404 —o desaparecería de la
 *       barra y nadie sabría que va a existir—. Descartada.</li>
 *   <li>Registrarla con la pantalla maquetada y datos de relleno. Es la que hay
 *       que descartar con más ganas: un «0 documentos vencidos» de relleno y un
 *       cero verdadero se ven exactamente igual, y solo uno de los dos es cierto
 *       (R14). Descartada.</li>
 *   <li><b>Registrarla y decir la verdad</b>: qué va a haber aquí, qué ficha de la
 *       especificación lo construye y, si el impedimento es el contrato del
 *       backend y no la falta de tiempo, cuál. Elegida.</li>
 * </ol>
 *
 * <p><b>Un solo componente para las ocho</b>, parametrizado por la prop que le
 * pasa el módulo de rutas desde el `*.tab.ts` de cada una. Ocho SFC casi idénticos
 * serían ocho cuerpos de CSS repetidos —lo que mide el presupuesto— y ocho sitios
 * donde arreglar la misma frase.
 *
 * <p>Quien tome uno de esos lotes cambia el `component` de su `*.tab.ts`, le quita
 * el `pending`, y escribe su SFC al lado. No toca este fichero, ni el armazón, ni
 * la barra, ni el módulo de rutas.
 */
defineProps<{ pending: CompanyRecordPending }>()
</script>

<template>
  <section class="ds-stack ds-stack--14">
    <div class="ds-empty ds-empty--boxed">
      <component :is="ICONS.EMPTY" :size="28" class="ds-icon-muted" aria-hidden="true" />
      <MissingDataNote
        :title="PENDING_SCREEN_TITLE"
        :what="pending.what"
        :why="`La construye la ficha ${pending.spec} de la especificación de la consola.`"
        :blocked-by="pending.blockedBy"
      />
    </div>
  </section>
</template>
