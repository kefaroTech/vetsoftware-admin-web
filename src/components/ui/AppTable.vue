<script lang="ts">
/**
 * Una cabecera de columna. La cadena suelta sigue valiendo —los 37 consumidores
 * no cambian— y la forma con objeto añade lo único que faltaba: <b>decir que la
 * columna es numérica</b>.
 */
export interface AppTableColumn {
  label: string
  /**
   * `num` alinea la cabecera a la derecha, sobre las cifras; `actions` la alinea
   * a la derecha y le da el ancho de la columna de botones. Las dos clases ya
   * existen en `primitives.css` (`.ds-table th.ds-num`,
   * `.ds-table th.ds-col-actions`) con sus reglas de refuerzo de especificidad
   * escritas y comentadas: <b>este cambio no añade ni una línea de CSS</b>, así
   * que no toca ningún gemelo TR-02.
   */
  align?: 'num' | 'actions'
}

export type AppTableHeader = string | AppTableColumn
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { ICONS } from '@/constants/icons'
import { useToast } from '@/composables/useToast'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import MoneyCaption from '@/components/ui/MoneyCaption.vue'

/**
 * Tabla de las 17 vistas de listado de la consola.
 *
 * DS-02: la geometría dejó de reescribirse aquí. `.tabla` declaraba a mano lo
 * mismo que `.ds-table` (`primitives.css`, 88 usos en el front del tenant y 0
 * en esta consola) y el gate de duplicados no lo veía porque las dos copias no
 * eran idénticas byte a byte tras interpolar los tokens. El hover de fila pasa
 * a `.ds-row-hover`.
 *
 * EST-06: la tabla ya sabe decir tres cosas distintas donde antes decía una.
 * Hasta ahora pintaba «Sin resultados» en cuanto `empty` era cierto, así que un
 * catálogo recién creado, una carga en vuelo y un 500 compartían el mismo
 * mensaje sin salida. El orden de las ramas —error ANTES que vacío— es el
 * criterio que `ListBody.vue` del tenant dejó escrito: si se invierten, un 500
 * vuelve a disfrazarse de «no hay registros».
 *
 * La rama 3 (`loading` con filas ya pintadas) NO existe en `ListBody`, que en
 * un refresco borra la tabla: refrescar ocho filas no puede destruir el
 * contexto que el usuario está mirando.
 *
 * ── La cabecera sabe decir que una columna es numérica ────────────────────
 *
 * `headers` era `string[]`, así que no había forma de decirlo. Las celdas sí lo
 * decían —21 de los 37 ficheros del bloque del dinero usan `<td class="ds-num">`—
 * pero la cabecera quedaba alineada a la izquierda sobre cifras alineadas a la
 * derecha: en la tabla de intentos de cobro el rótulo «Importe» flotaba sobre la
 * primera cifra y a partir de la tercera fila ya no estaba encima de nada. La
 * primitiva que lo arregla existía desde el principio (`primitives.css:1290`)
 * <b>con adopción cero</b>, porque el único sitio que podía adoptarla no admitía
 * la clase.
 *
 * <p>Dos detalles del `v-for` que van con esto:
 *
 * <ul>
 *   <li><b>La clave pasa del texto al índice.</b> Era el propio rótulo, y hay
 *       tablas con dos cabeceras vacías (`SubscriptionDocumentsTable` termina en
 *       `''`) o repetidas — una clave duplicada en `v-for` es el defecto R12. El
 *       índice es legítimo aquí porque la cabecera no es una lista reordenable.</li>
 *   <li><b>`scope="col"` para todas.</b> Es gratis, lo pide el tutorial de tablas
 *       del W3C, y hasta ahora solo lo tenían las tablas que se escribían su
 *       `<thead>` a mano — o sea, ninguna de las que pasan por aquí.</li>
 * </ul>
 */
const props = withDefaults(
  defineProps<{
    headers: AppTableHeader[]
    /**
     * <b>De qué es esta tabla</b>, en dos o tres palabras y sin la palabra
     * «tabla»: el rol ya la anuncia. Es obligatoria a propósito — el lector de
     * pantalla lista las tablas de la pantalla por su nombre, y en el expediente
     * hay varias por pantalla; sin nombre se anuncian todas igual.
     *
     * <p>Sirve para dos cosas a la vez y por eso es una sola prop: el
     * `<caption>` de la tabla y el nombre del contenedor que se desplaza, que
     * sin nombre no puede llevar `role="region"`.
     */
    caption: string
    /** Sin filas que pintar. Va SIEMPRE acompañada de `loading` para que la
     *  primera carga muestre esqueleto y no el estado vacío. */
    empty?: boolean
    loading?: boolean
    error?: string | null
    traceId?: string | null
    /** Filas del esqueleto durante la primera carga. */
    skeletonRows?: number
    /**
     * La tabla trae importes de la plataforma cuyo DTO <b>no</b> declara
     * `currency`. Pinta la divisa una vez, en el `<caption>` (`MoneyCaption`).
     *
     * <p>Es la mitad «de superficie» de la política que documenta
     * `composables/format.ts`: las celdas siguen imprimiendo la cifra desnuda
     * con `formatAmount`, y quien rotula es la tabla — nunca la celda ni la
     * cabecera de la columna. <b>No se pone</b> en las tablas cuyo DTO sí trae
     * divisa y ya la pintan con `formatMoney` (`PaymentsTable`,
     * `SubscriptionPaymentsTable`, `PriceListPricesPanel`, `TierSimulatorPanel`):
     * ahí la divisa es un dato de la fila y decirla dos veces la contradice el
     * día que una fila venga en otra.
     */
    money?: boolean
  }>(),
  { skeletonRows: 5 },
)

defineEmits<{ retry: [] }>()

const { success } = useToast()

/** La cadena suelta se normaliza a columna sin alineación: el 90 % de los casos. */
const columns = computed<AppTableColumn[]>(() =>
  props.headers.map((h) => (typeof h === 'string' ? { label: h } : h)),
)

const ALIGN_CLASS = { num: 'ds-num', actions: 'ds-col-actions' } as const

const scroll = useTemplateRef<HTMLElement>('scroll')
const tabla = useTemplateRef<HTMLElement>('tabla')

/**
 * Si el envoltorio desborda, su contenido solo se alcanza desplazándolo, y sin
 * ratón eso exige que sea enfocable (§2.1.1, regla `scrollable-region-focusable`
 * de axe). Pero <b>solo si desborda de verdad</b>: un `tabindex` fijo metería una
 * parada de tabulador que no lleva a ninguna parte en cada una de las tablas de
 * la consola, que es cambiar un defecto por otro.
 */
const scrollable = ref(false)

function measureScroll() {
  const el = scroll.value
  scrollable.value = el !== null && el.scrollWidth > el.clientWidth
}

let observer: ResizeObserver | null = null

onMounted(() => {
  measureScroll()
  // Se observan los DOS: el envoltorio cambia con la ventana, y la tabla con las
  // filas que llegan. Vigilar solo uno deja el `tabindex` desfasado.
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(measureScroll)
  if (scroll.value !== null) observer.observe(scroll.value)
  if (tabla.value !== null) observer.observe(tabla.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

async function copyTrace() {
  if (!props.traceId) return
  await navigator.clipboard.writeText(props.traceId)
  success('Identificador de traza copiado')
}
</script>

<template>
  <div class="ds-card ds-card--flat tabla-caja">
    <!-- Anuncio de cambio de estado para lector de pantalla (WCAG 2.2 §4.1.3).
         Va FUERA de la tabla y en `polite`: una carga informa, no interrumpe.
         No dice el texto del error a propósito — ese ya lo anuncia el banner de
         la rama 1 con `role="alert"`, y repetirlo sería anunciarlo dos veces. -->
    <p class="ds-sr-only" role="status">
      {{ error ? 'Error al cargar la tabla' : loading ? 'Cargando…' : '' }}
    </p>

    <div
      ref="scroll"
      class="ds-table-scroll tabla-scroll"
      :role="scrollable ? 'region' : undefined"
      :tabindex="scrollable ? 0 : undefined"
      :aria-label="scrollable ? caption : undefined"
    >
      <table ref="tabla" class="ds-table" :aria-busy="loading || undefined">
        <!-- Va ANTES de `<thead>` porque el HTML solo admite el `<caption>` como
             primer hijo de la tabla, y porque es lo primero que se anuncia. -->
        <MoneyCaption v-if="money">{{ caption }}</MoneyCaption>
        <caption v-else class="ds-sr-only">
          {{
            caption
          }}
        </caption>

        <thead>
          <tr>
            <th
              v-for="(column, i) in columns"
              :key="i"
              scope="col"
              :class="column.align ? ALIGN_CLASS[column.align] : undefined"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <!-- 1 · Fallo del servidor. -->
        <tbody v-if="error">
          <tr>
            <td :colspan="headers.length">
              <div class="ds-banner ds-banner--error ds-banner--flush" role="alert">
                <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
                <span class="ds-flex-fill">{{ error }}</span>
                <button
                  type="button"
                  class="ds-btn ds-btn--ghost ds-btn--sm"
                  @click="$emit('retry')"
                >
                  <component :is="ICONS.RETRY" :size="14" />
                  Reintentar
                </button>
              </div>
              <p v-if="traceId" class="traza ds-meta">
                <span>Traza: {{ traceId }}</span>
                <button type="button" class="ds-btn ds-btn--plain ds-btn--sm" @click="copyTrace">
                  <component :is="ICONS.COPY" :size="13" />
                  Copiar
                </button>
              </p>
            </td>
          </tr>
        </tbody>

        <!-- 2 · Primera carga: no hay nada que conservar, se pinta esqueleto. -->
        <tbody v-else-if="loading && empty" aria-hidden="true">
          <tr v-for="fila in skeletonRows" :key="fila">
            <td v-for="celda in columns.length" :key="celda">
              <span class="ds-skeleton ds-skeleton--text celda-esqueleto" />
            </td>
          </tr>
        </tbody>

        <!-- 4 · Vacío de verdad: ni error ni carga. -->
        <tbody v-else-if="empty">
          <tr>
            <td :colspan="headers.length" class="celda-vacia">
              <!--
                El contenido por defecto es el de la rama 4 (catálogo vacío de
                verdad), NO el de la rama 3 (la búsqueda no casó): son estados
                distintos y confundirlos es el defecto que este orden de ramas
                existe para evitar. Toda vista con buscador declara su propio
                slot con los dos textos; este es solo el suelo honesto para una
                tabla sin búsqueda.
              -->
              <slot name="empty">
                <AppEmptyState title="Aún no hay registros" />
              </slot>
            </td>
          </tr>
        </tbody>

        <!-- 3 y 5 · Filas. En un refresco (`loading` con datos ya pintados) se
             conservan, y el `aria-busy` del `<table>` es quien lo anuncia. -->
        <tbody v-else>
          <slot />
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* La caja ya NO recorta: un `overflow:hidden` aquí dejaba las últimas columnas
   inalcanzables cuando la tabla es más ancha que el contenedor (WCAG 1.4.10
   Reflow). Quien recorta ahora es el envoltorio `.ds-table-scroll`, que además
   deja desplazarla en horizontal. */
.tabla-caja {
  padding: 0;
}

/* `.ds-table-scroll` aporta el `overflow-x:auto`; eso ya establece un contexto
   de recorte, así que basta con heredar el radio de la caja para conservar las
   esquinas redondeadas que antes recortaba el `overflow:hidden`. */
.tabla-scroll {
  border-radius: inherit;
}

.celda-esqueleto {
  display: block;
  width: 70%;
}

.celda-vacia {
  padding: 0;
}

.traza {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin: var(--space-8) 0 0;
}
</style>
