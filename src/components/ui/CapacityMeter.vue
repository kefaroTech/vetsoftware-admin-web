<script lang="ts">
/**
 * «7 de 10 usuarios», y su caso incómodo: <b>un límite nulo no es un límite de
 * cero</b>.
 *
 * <p>Pintar «7 de 0 usuarios» —o una barra al 100 % que no significa nada— sería
 * inventar un techo que el contrato no declara. Cuando no hay límite, el texto lo
 * dice y la barra no se pinta.
 *
 * <p>Función pura y exportada porque es lo que una prueba puede barrer sin montar
 * nada, y porque el mismo texto se lee por teléfono y se copia en un correo: si
 * cambia, tiene que cambiar en un solo sitio.
 */
export function capacityMeterText(used: number, limit: number | null, unit: string): string {
  if (limit == null) return `${used} ${unit} · sin límite declarado`
  return `${used} de ${limit} ${unit}`
}

/**
 * `null` cuando no hay techo declarado: es lo que decide si hay barra o no. Un
 * límite de cero o negativo se trata como ausencia de límite y no como un cupo
 * agotado — un cero aquí es casi siempre un dato que el backend no calculó.
 */
export function declaredLimit(limit: number | null | undefined): number | null {
  return limit != null && limit > 0 ? limit : null
}

export const CAPACITY_EXHAUSTED_DEFAULT =
  'Se agotó. La empresa no puede añadir más hasta que se amplíe la cantidad contratada. Lo que ya tiene sigue funcionando.'
</script>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * <b>Un cupo</b>: barra, texto y el caso de límite nulo. La pieza compartida de
 * las pantallas que enseñan cuánto se ha consumido de lo contratado.
 *
 * <p><b>`<progress>` nativo con su `<label>`, y ni una sola ARIA.</b> Un
 * `<progress>` etiquetado ya expone rol, valor, mínimo y máximo al lector de
 * pantalla. Un `<div role="progressbar">` con tres `aria-value*` a mano es más
 * marcado para conseguir menos.
 *
 * <p><b>Y la barra nunca va sola.</b> El texto «7 de 10 usuarios» está siempre,
 * porque una barra al 70 % no se puede leer por teléfono ni contar en un correo
 * (§5.2 · nada se comunica solo por forma o color).
 *
 * <p><b>Este componente no sabe de rutas.</b> El aviso de agotado trae la frase;
 * la salida a mano —«Ampliar en …»— la pone la pantalla por el slot `action`,
 * porque a dónde se amplía depende de dónde se esté y una pieza de
 * `components/ui/` no puede decidirlo por las nueve que la consumen.
 *
 * <p><b>Geometría, no copia.</b> Lo único que este SFC declara en `scoped` es el
 * alto de la barra, que no existe como primitiva y no se puede añadir a
 * `primitives.css` sin tocar un fichero gemelo TR-02. Todo lo demás
 * —apilado, rótulo, texto secundario, aviso— sale de primitivas ya medidas, que
 * es lo que mantiene el presupuesto de CSS (FE-08) en cero grupos duplicados.
 */
const props = withDefaults(
  defineProps<{
    /** El nombre del cupo, con mayúscula: «Usuarios», «Sedes», «Terminales». */
    label: string
    /** Lo consumido. `null` se lee como cero: no saber es haber usado nada, no romper. */
    used?: number | null
    /** El techo declarado. `null` = el contrato no declara ninguno. */
    limit?: number | null
    /**
     * El sustantivo en minúscula que cierra el texto («usuarios»). Por defecto se
     * deriva del rótulo, que es lo correcto en castellano para los tres casos
     * conocidos; se pasa a mano cuando no lo sea.
     */
    unit?: string
    /**
     * Lo dice el servidor, no esta pieza. `null` = no se pronunció, y entonces se
     * deduce del consumo contra el límite.
     *
     * <p><b>Por qué es `boolean | null` y no `boolean`, que sería lo obvio.</b> Vue
     * castea a `false` toda prop declarada `Boolean` que no se pase y que no
     * tenga default, así que un `exhausted?: boolean` NUNCA llega como
     * `undefined`: llega como `false`, el `??` no se dispara y el cupo agotado
     * deja de avisar en silencio. Con el tercer valor explícito la distinción
     * entre «el servidor dijo que no» y «el servidor no dijo nada» sobrevive.
     */
    exhausted?: boolean | null
    /** El aviso de agotado, cuando la pantalla necesite nombrar el cupo dentro. */
    exhaustedMessage?: string
    /** `id` del `<progress>`, si la pantalla necesita apuntar a él desde fuera. */
    id?: string
  }>(),
  { exhausted: null, exhaustedMessage: CAPACITY_EXHAUSTED_DEFAULT },
)

const autoId = useId()
const controlId = computed(() => props.id ?? autoId)

const used = computed(() => props.used ?? 0)
const limit = computed(() => declaredLimit(props.limit))
const unit = computed(() => props.unit ?? props.label.toLowerCase())

const text = computed(() => capacityMeterText(used.value, limit.value, unit.value))

/**
 * La barra se acota al máximo. Un consumo por encima del techo es un dato real
 * —pasa cuando se baja el contrato sin retirar lo que ya había— y el TEXTO lo
 * dice tal cual («12 de 10 usuarios»); lo que no puede es desbordar la barra.
 */
const barValue = computed(() => (limit.value == null ? 0 : Math.min(used.value, limit.value)))

/**
 * Sin límite declarado NUNCA está agotado: es justo el error que la barra evita.
 * Con límite, se cree al servidor si se pronunció y si no se compara.
 */
const isExhausted = computed(() => {
  if (limit.value == null) return false
  return props.exhausted ?? used.value >= limit.value
})
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <label class="ds-label" :for="controlId">{{ label }}</label>

    <progress
      v-if="limit !== null"
      :id="controlId"
      class="medidor"
      :max="limit"
      :value="barValue"
    />

    <p class="ds-meta">{{ text }}</p>

    <div
      v-if="isExhausted"
      class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush"
      role="status"
    >
      <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ exhaustedMessage }}</span>
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
/* La única geometría propia: un `<progress>` sin alto explícito sale con el del
   navegador y no coincide entre Chrome y Firefox. `--space-8` es el mismo alto
   que ya usaba la barra del expediente de contratos, para que las dos se vean
   igual mientras convivan. */
.medidor {
  width: 100%;
  height: var(--space-8);
}
</style>
