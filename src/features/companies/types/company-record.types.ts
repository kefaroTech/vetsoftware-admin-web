import type { RouteRecordRaw } from 'vue-router'

/**
 * El expediente de empresa (§I2–I11 de
 * `docs/ux/suscripciones-consola-ampliacion-especificacion.md`, lote W5-A).
 *
 * <p>`/empresas/:id` deja de ser un formulario suelto y pasa a ser un armazón con
 * sub-vistas. Este fichero declara el contrato de una de ellas y nada más: la
 * carga de la empresa vive en `company-record.store.ts` y los datos de la
 * pestaña de resumen en `company-summary.store.ts`.
 */

/**
 * <b>Lo que una pestaña dice de sí misma cuando todavía no existe.</b>
 *
 * <p>La alternativa —no registrar la ruta hasta que su lote aterrice— deja la
 * barra con enlaces que llevan a un 404, y la contraria —pintar la pestaña con
 * ceros de relleno— es peor: un «0 documentos vencidos» y un «no lo hemos
 * construido» se ven exactamente igual y solo uno de los dos es cierto (R14 de
 * `docs/ux/reglas-de-interfaz.md`).
 *
 * <p>Con esto la ruta existe, el enlace funciona, y la pantalla dice en palabras
 * qué va a haber ahí, quién lo construye y qué falta. <b>Ni un número.</b>
 */
export interface CompanyRecordPending {
  /** Qué se verá aquí, en una frase. Se pinta como cuerpo del estado vacío. */
  what: string
  /**
   * La ficha de la especificación que la construye: `I6`, `B8`… Es lo que
   * permite a quien lea la pantalla ir a buscar el trabajo, y a quien tome el
   * lote saber que este fichero es suyo.
   */
  spec: string
  /**
   * Lo que hoy impide pintarla, cuando el impedimento es el contrato del backend
   * y no la falta de tiempo. Nulo o ausente = la pantalla se puede escribir ya.
   */
  blockedBy?: string | null
}

/**
 * Contrato de una sub-vista del expediente de empresa — <b>el punto de extensión
 * de los lotes que cuelgan de W5-A</b>.
 *
 * <p>Cada sub-vista se declara en su propio fichero
 * `views/record/<segmento>.tab.ts` y el módulo de rutas los descubre solo con
 * `import.meta.glob` (ver `src/router/routes/companies.routes.ts`). Consecuencia
 * práctica: para construir «Cartera» no hay que editar <b>ningún</b> fichero
 * existente —ni `router/index.ts`, ni el módulo de rutas, ni la barra de
 * pestañas, ni el armazón—. Se cambia el `component` del propio
 * `cartera.tab.ts`, se le quita el `pending`, y se escribe el SFC al lado.
 *
 * <p><b>Es una copia deliberada de `SubscriptionRecordTab`, no una abstracción
 * compartida.</b> Con dos instancias no hay patrón todavía: extraer ahora un
 * `RecordTab` genérico obligaría a la tercera a caber en una forma que nadie ha
 * comprobado que le sirva. Dos copias explícitas son más baratas que una
 * abstracción equivocada; el día que haya una tercera se decidirá con datos.
 */
export interface CompanyRecordTab {
  /** Último segmento de la ruta: `resumen`, `datos`, `cupos`… */
  segment: string
  /** Nombre de la ruta hija. Convención: `company-record-<segmento>`. */
  routeName: string
  /** Rótulo de la pestaña, corto: es uno de diez en una barra que se desplaza. */
  label: string
  /** Orden en la barra. El de §I2–I11: 1 resumen … 10 cesión. */
  order: number
  /**
   * Carga diferida de la vista. Un SFC por sub-vista (techo de 500 líneas del
   * presupuesto de CSS).
   *
   * <p>`NonNullable` y no `RouteRecordRaw['component']` a secas: esa propiedad
   * admite `null`/`undefined` —hay rutas que solo agrupan hijas— y una pestaña
   * sin componente no es una pestaña. Sin el `NonNullable`, el objeto de ruta que
   * se construye con esto no encaja en `RouteRecordRaw` y `vue-tsc` lo rechaza.
   */
  component: NonNullable<RouteRecordRaw['component']>
  /**
   * Presente mientras la pantalla no exista. El módulo de rutas lo pasa como
   * prop a `CompanyRecordPendingView`; quien construya la pestaña lo borra.
   */
  pending?: CompanyRecordPending
}
