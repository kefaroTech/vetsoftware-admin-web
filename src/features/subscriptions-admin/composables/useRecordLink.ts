import { computed, nextTick, watch, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'

/**
 * <b>El acuerdo de la cadena del expediente, escrito en un solo sitio</b> (§3.3,
 * tarea W3-D).
 *
 * <p>La pregunta que vertebra el modelo —<i>«¿qué tenía contratado Ana el 3 de
 * marzo, y por qué se le facturaron 179.000?»</i>— se responde saltando entre las
 * sub-vistas del expediente, y la especificación lo exige en los dos sentidos:
 * <b>«cada eslabón es un enlace, y cada uno tiene su vuelta»</b>. Ese salto viaja
 * en la query string, y hasta ahora el nombre del parámetro era un <b>acuerdo
 * tácito</b>: lo eligió W2-C al escribir «Historia», lo copiaron W2-B, W2-D y
 * W2-E leyendo el código ajeno, y los issues #161 y #164 pidieron literalmente
 * «dejar el nombre del parámetro escrito donde las sub-vistas lo vean». Este
 * módulo es ese sitio.
 *
 * <h3>Por qué se extrajo, y qué NO se extrajo</h3>
 *
 * <p>Al cerrar la vuelta había que escribir el <b>tercero</b> y el <b>cuarto</b>
 * señalado —«Historia» y «Acceso»— junto a los dos que ya existían en «Lo
 * contratado» y «Dinero». Tres copias de lo mismo es como empieza la deriva, y la
 * copia más cara no es el `computed`: es que una sub-vista lea `?otrosi=` y otra
 * escriba `?otrosí=`, porque <b>eso no falla</b> — el enlace sigue navegando y
 * simplemente deja de señalar nada, en silencio, que es justo lo que #164 temía.
 * Con `recordLinkQuery()` los cuatro constructores de enlaces y los cuatro
 * lectores toman el nombre de la misma constante, así que un cambio de nombre o
 * es total o no compila.
 *
 * <p><b>Lo que a propósito NO vive aquí es el texto del aviso.</b> Cada destino
 * dice algo distinto y concreto cuando no encuentra lo señalado —«prueba con
 * “Expediente completo”», «puede estar en otra página», «prueba con el listado
 * completo, que incluye los caducados»—, y esa frase es la mitad del valor de la
 * pantalla. Fundirlas en una plantilla genérica habría convertido cuatro consejos
 * útiles en un «no se encontró» que no ayuda a nadie. Se comparte el mecanismo,
 * no las palabras.
 *
 * <p><b>Sin estado de módulo.</b> No hay ni un `ref()` ni un `reactive()` a nivel
 * de fichero: todo lo que devuelve sale de la ruta —que ya es reactiva y global—
 * o es una variable local de cada invocación, como el `let request` de
 * `useSubscriptionHistory`. La regla obligatoria de Pinia prohíbe el singleton de
 * módulo, no el estado por instancia.
 */

/**
 * Los dos parámetros de la cadena. Son <b>query</b> y no anclas `#`: un `#linea-9`
 * que el destino no renderiza deja el navegador a mitad de página sin decir nada,
 * mientras que una query que nadie lee degrada a <b>no hacer nada</b> y sigue
 * siendo un enlace correcto a la sub-vista. El nombre va en español porque queda
 * en la barra de direcciones del operador, junto a `/suscripciones/…/contratado`.
 */
export const RECORD_LINK_PARAMS = {
  /** Una línea del contrato. La leen «Lo contratado», «Acceso» y «Dinero». */
  ITEM: 'item',
  /** Un otrosí. Lo leen «Lo contratado», «Historia» y «Dinero». */
  AMENDMENT: 'otrosi',
} as const

export type RecordLinkParam = (typeof RECORD_LINK_PARAMS)[keyof typeof RECORD_LINK_PARAMS]

/**
 * La query de un enlace de la cadena, para los constructores de destinos.
 *
 * <p>Recordatorio de la otra mitad del acuerdo, que este helper no puede
 * imponer: <b>el destino lleva siempre los dos parámetros de ruta</b>
 * (`companyId` <i>e</i> `id`). La ruta del expediente es
 * `/suscripciones/:companyId/:id/…` y con `params: { id }` a secas
 * `router.resolve` falla.
 */
export function recordLinkQuery(param: RecordLinkParam, id: number): Record<string, string> {
  return { [param]: String(id) }
}

/**
 * El identificador con el que se llegó, o `null`.
 *
 * <p>Se exige entero positivo: un `?item=abc` o un `?item=-3` no son «la línea
 * cero», son basura, y tratarlos como un id haría que la pantalla anunciara que
 * no encuentra algo que nunca se pidió. Un parámetro repetido (`?item=1&item=2`)
 * llega como array y se toma el primero, que es lo que hace el navegador al
 * volver atrás.
 */
export function useRecordLinkId(param: RecordLinkParam): ComputedRef<number | null> {
  const route = useRoute()
  return computed(() => {
    const raw = route.query[param]
    const value = Array.isArray(raw) ? raw[0] : raw
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  })
}

export interface SignaledArrivalOptions {
  /** El identificador con el que se llegó. Mientras sea `null` no se toca nada. */
  linkedId: ComputedRef<number | null>
  /**
   * Los `id` de los anclas señalados, en el orden en que se pintan. Se salta al
   * primero. Vacío significa «no está en lo que se muestra», y de eso se encarga
   * el aviso de cada pantalla, no este mecanismo.
   */
  anchors: ComputedRef<string[]>
  /**
   * Falso mientras la pantalla todavía no sabe si lo señalado está o no —cargando
   * o en error—. Sin esto se saltaría sobre una tabla vacía y no se volvería a
   * intentar cuando llegan las filas.
   */
  settled: ComputedRef<boolean>
}

/**
 * <b>Llevar a la vista, y al foco, lo que se vino a ver.</b>
 *
 * <p><b>Una vez por llegada, no en cada repintado.</b> Ésta es la razón de que
 * lleve memoria: «Lo contratado» decidió en W2-B hacer solo `scrollIntoView`
 * porque mover el foco mientras el operador cambia la fecha de consulta sería
 * robárselo, y tenía razón <i>para ese caso</i>. Pero el caso de llegada es el
 * contrario: se viene de pulsar un enlace en otra sub-vista, el componente que
 * tenía el foco acaba de desmontarse y <b>el foco está en `&lt;body&gt;`</b> —
 * Vue Router no lo gestiona—. Dejarlo ahí obliga a quien navega con teclado a
 * recorrer la pantalla entera hasta la fila que el enlace prometía. Así que se
 * mueve el foco <b>solo cuando cambia el identificador</b>: al llegar sí, al
 * repintar la tabla con el mismo enlace puesto no.
 *
 * <p><b>`preventScroll` y luego `scrollIntoView`.</b> El desplazamiento que hace
 * `focus()` por su cuenta deja la fila pegada al borde; centrarla después es lo
 * que permite leer las de alrededor, que en una tabla de vigencias es la mitad de
 * la respuesta.
 *
 * <p>El elemento señalado tiene que llevar `tabindex="-1"`: sin él, `focus()` no
 * hace nada sobre un `&lt;tr&gt;` o un `&lt;article&gt;`. Es el mismo mecanismo
 * con el que `SubscriptionSummaryView` y `ErrorSummary` devuelven el foco.
 */
export function useSignaledArrival(options: SignaledArrivalOptions): void {
  // Local de esta invocación, no un singleton de módulo: dos expedientes abiertos
  // en dos pestañas no comparten «ya salté a la línea 900».
  let signaledFor: number | null = null

  watch(
    [options.linkedId, options.settled, options.anchors] as const,
    async ([id, settled, anchors]) => {
      if (id == null) {
        // Se quitó el parámetro (o se navegó a otro contrato): la próxima llegada
        // con este mismo id vuelve a señalar.
        signaledFor = null
        return
      }
      // `anchors[0]` con `noUncheckedIndexedAccess` es `string | undefined`, y el
      // `length === 0` de arriba no lo estrecha: se lee una vez y se comprueba.
      const first = anchors[0]
      if (!settled || first === undefined || signaledFor === id) return

      signaledFor = id
      await nextTick()
      const target = document.getElementById(first)
      if (!target) return
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'center' })
    },
    { immediate: true },
  )
}
