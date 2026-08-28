<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import {
  DECLINE_KINDS,
  DECLINE_KIND_PRESENTATION,
  SOFT_MAX_ATTEMPTS,
  SOFT_WINDOW_DAYS,
} from '../types/payment-attempts.types'

/**
 * <b>Las tres familias de rechazo, escritas.</b>
 *
 * <p>No es decoración ni una ayuda contextual: es la regla de operación de toda la
 * pestaña. Quien no distinga las tres reintenta un rechazo duro —y las redes cobran
 * por eso— o persigue a un cliente por una credencial nuestra mal puesta.
 *
 * <p><b>Cada familia dice tres cosas que no se pueden deducir del rótulo</b>: si se
 * reintenta, si el intento cuenta contra el cliente y si arranca cobranza. Van
 * escritas, no en un color: se leen por teléfono y se copian en un correo (§5.2 ·
 * WCAG §1.4.1). El tono del `AppBadge` acompaña al rótulo, nunca lo sustituye.
 *
 * <p>El techo de reintentos —{@code SOFT_MAX_ATTEMPTS} en {@code SOFT_WINDOW_DAYS}
 * días— se pinta con su cifra a la vista. Un umbral que no se ve es un umbral que
 * nadie puede discutir.
 */
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="familias-titulo">
    <div class="ds-block-head">
      <div>
        <h3 id="familias-titulo" class="ds-title titulo">Las tres familias de rechazo</h3>
        <p class="ds-meta descripcion">
          No son grados de gravedad: son tres cosas distintas con tres respuestas distintas.
          Reintentar un rechazo duro es ofrecer algo que daña —las redes penalizan el reintento
          excesivo—, y contar un error nuestro contra el cliente es restringirle la cuenta por una
          avería que no es suya.
        </p>
      </div>
    </div>

    <dl class="familias">
      <div v-for="kind in DECLINE_KINDS" :key="kind" class="familia ds-stack ds-stack--6">
        <dt>
          <AppBadge
            :variant="DECLINE_KIND_PRESENTATION[kind].variant"
            :label="DECLINE_KIND_PRESENTATION[kind].label"
          />
        </dt>
        <dd class="ds-stack ds-stack--6 detalle">
          <p class="linea">{{ DECLINE_KIND_PRESENTATION[kind].meaning }}</p>
          <p class="ds-meta linea">
            <component
              :is="DECLINE_KIND_PRESENTATION[kind].retryable ? ICONS.CHECKED : ICONS.UNCHECKED"
              :size="14"
              class="ds-banner-icon"
              aria-hidden="true"
            />
            {{
              DECLINE_KIND_PRESENTATION[kind].retryable
                ? 'Se puede reprogramar el reintento'
                : 'No se reintenta nunca'
            }}
          </p>
          <p class="ds-meta linea">
            <component
              :is="
                DECLINE_KIND_PRESENTATION[kind].consumesCustomerAttempts
                  ? ICONS.CHECKED
                  : ICONS.UNCHECKED
              "
              :size="14"
              class="ds-banner-icon"
              aria-hidden="true"
            />
            {{
              DECLINE_KIND_PRESENTATION[kind].consumesCustomerAttempts
                ? `Cuenta contra el cliente: ${SOFT_MAX_ATTEMPTS} intentos en ${SOFT_WINDOW_DAYS} días`
                : 'No consume los intentos del cliente'
            }}
          </p>
          <p class="ds-meta linea">
            <component
              :is="DECLINE_KIND_PRESENTATION[kind].startsDunning ? ICONS.CHECKED : ICONS.UNCHECKED"
              :size="14"
              class="ds-banner-icon"
              aria-hidden="true"
            />
            {{
              DECLINE_KIND_PRESENTATION[kind].startsDunning
                ? 'Arranca cobranza contra el cliente'
                : 'No arranca cobranza contra el cliente'
            }}
          </p>
          <p class="ds-text-strong linea">{{ DECLINE_KIND_PRESENTATION[kind].nextStep }}</p>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.titulo,
.descripcion,
.linea {
  margin: 0;
}

/* Tres columnas cuando caben y una cuando no: las tres familias se comparan de un
   vistazo, y esa comparación es justo el trabajo que hace esta tarjeta. */
.familias {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: var(--space-16);
}

.detalle {
  margin-inline-start: 0;
}
</style>
