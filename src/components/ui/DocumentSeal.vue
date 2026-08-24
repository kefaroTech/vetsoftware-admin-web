<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/**
 * **El sello de un registro consumado.** Cierra el issue #163.
 *
 * <p>Es la señal 2 de las cuatro de la §3.2: la marca textual que dice que lo que
 * hay debajo es un hecho y no un borrador. Se lee, no se edita.
 *
 * <h3>Por qué es un componente y no una primitiva CSS</h3>
 *
 * <p>El #163 pedía un `.ds-seal` en `primitives.css`, y ahí se atascó: ese fichero
 * es <b>gemelo TR-02</b> y tocarlo es trabajo de `front-parity`, no de quien
 * implementa una pantalla. El propio issue dejaba abierta la salida pequeña —
 * <i>«aceptar el remate por marcado como el canónico y alinear `QuoteDocument` y
 * `ExternalInvoiceRecord` a él»</i>— y eso es exactamente lo que hace este
 * componente: encapsula el remate por marcado que `AmendmentEntry` y
 * `StatusChangeEntry` ya habían adoptado, en `src/components/ui/`, que <b>no</b> es
 * TR-02 (§6.3: el catálogo `App*` de la consola no se comparte con el tenant).
 *
 * <p>Resultado: <b>cero líneas de CSS</b>. El par `{align-self: flex-start; margin: 0}`
 * que el #163 contaba en cuatro componentes desaparece del árbol en vez de mudarse.
 * `.ds-pill` ya es `inline-flex` y un `<span>` no arrastra el margen de agente de
 * usuario que sí trae el `<p>`, así que el `<div>` envolvente basta para que la
 * píldora no se estire dentro del `.ds-stack` del padre.
 *
 * <h3>Qué NO es</h3>
 *
 * <p><b>No es un distintivo de estado.</b> «Emitida», «Anulada», «Vigente» y
 * «Caducada» son estados y los pintan `AppBadge`, `QuoteStatusBadge`,
 * `SubscriptionStatusBadge` y `QuoteValidity`, que ya existen y ya son correctos.
 * La §6.2 descarta explícitamente <i>«una variante nueva de `AppBadge`»</i> y la §5.2
 * manda que toda distinción nueva vaya <i>«por texto, icono y forma, no por un quinto
 * tono»</i>. Duplicar aquí el mapa de estados sería la forma exacta de que dos
 * pantallas del mismo dato acaben divergiendo.
 *
 * <p>Lo que este sello dice es otra cosa, y es constante para todo el ciclo de vida
 * del registro: <b>la operación de editar no existe</b>. Por eso el texto es una
 * frase sobre cómo se corrige («solo se agrega», «solo se inserta»), no un adjetivo
 * sobre en qué punto está.
 *
 * <h3>Accesibilidad</h3>
 *
 * <p>El significado va <b>íntegro en el texto</b> (§5.2): el tono neutro y el candado
 * son refuerzo y nada más. En escala de grises, sin CSS o leído en voz alta, la
 * píldora sigue diciendo lo mismo. El icono es decorativo y va `aria-hidden`, para
 * que no se anuncie dos veces lo que la frase ya dice.
 */
defineProps<{
  /**
   * La frase del sello, entera. La escribe el consumidor porque cada tipo de
   * registro se corrige de una forma distinta y la frase tiene que decir cuál:
   * «Documento · solo se agrega» en una cotización emitida, «Bitácora · solo se
   * inserta» en el historial de estados.
   */
  text: string
}>()
</script>

<template>
  <!--
    El `<div>` no es decorativo: es lo que impide que la píldora se estire a lo
    ancho del `.ds-stack` que la contiene, sin gastar una regla `align-self`.
  -->
  <div>
    <span class="ds-pill ds-tone--neutral">
      <component :is="ICONS.LOCK" :size="13" aria-hidden="true" />
      {{ text }}
    </span>
  </div>
</template>
