/**
 * Formateo transversal de dinero y fechas para la consola de plataforma.
 *
 * Sustituye a los tres formatos que llegaron a convivir sin que ninguno fuera
 * el canónico (docs/ux/suscripciones-consola-especificacion.md §4, tarea
 * W1-A, issue B-9):
 *
 * - `BillingDocumentsTable.vue:29-32` formatea importes sin símbolo de
 *   moneda con un `Intl.NumberFormat` propio.
 * - `CommercialCatalogView.vue:115-121` los formatea con divisa variable
 *   (la de la lista de precios seleccionada) con otro `Intl.NumberFormat`.
 * - `SubscriptionsAdminView.vue:38-40` no formatea la fecha en absoluto —
 *   `formatDate` devuelve el ISO crudo (`2026-03-03`) tal cual.
 *
 * Un importe mal formateado en una pantalla de cobranza no es cosmética: es
 * la lista de trabajo con la que se cierra el mes. §4 fija el vocabulario:
 * dinero alineado con `.ds-num` en el marcado, fecha `dd/mm/aaaa`, nulo → `—`.
 *
 * **La política de moneda ya no es la de §4** (`currency: 'COP'` a fuego).
 * §4 se escribió cuando este módulo era el único formateador y todo el
 * producto era COP; hoy conviven documentos sin divisa declarada y listas de
 * precios con divisa propia. La regla vigente —una sola, y la que el código
 * hace— está escrita entera sobre `formatAmount`/`formatMoney`, más abajo.
 * `formatCurrency` (COP fijo) **ya no existe**: era la tercera política.
 *
 * Este módulo NO es el gemelo TR-02 de `VetSoftwarePublicFront/src/
 * composables/format.ts`: no figura en la tabla de archivos idénticos de
 * `CLAUDE.md`, y su forma es distinta a propósito. El del tenant cubre
 * fechas cortas/largas para historia clínica y no tiene formateo de dinero
 * (eso vive en `features/tienda/composables/pricing.ts`, con reglas propias
 * del punto de venta). Esta consola solo necesita pesos colombianos y una
 * fecha numérica para tablas contables — el vocabulario que fija §4 — así
 * que se escribe su propia versión, más pequeña, en vez de forzar un
 * gemelo que tendría que cargar con casos que aquí no existen.
 */

/** Marcador de "sin dato" del sistema de diseño. */
const EMPTY = '—'

/**
 * Parsea la parte de fecha de un ISO (`yyyy-MM-dd` o con hora,
 * `yyyy-MM-ddTHH:mm:ss`) a medianoche LOCAL.
 *
 * El `T00:00:00` explícito es lo que evita el corrimiento de zona horaria:
 * `new Date('2026-03-03')` se interpreta como UTC y en Bogotá (UTC-5) cae el
 * día 2 — que es exactamente la clase de error que una pantalla de cobranza
 * no se puede permitir en una fecha de vencimiento.
 *
 * Devuelve `null` si la cadena no empieza por una fecha ISO válida o si el
 * calendario desborda (`2026-02-31` no es `Invalid Date`, es el 3 de marzo,
 * y hay que detectarlo a mano): una fecha que el backend no pudo haber
 * emitido tiene que cantar como dato roto, no imprimirse como otro día.
 */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const [, y, mo, day] = m
  const d = new Date(`${y}-${mo}-${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  if (d.getMonth() !== Number(mo) - 1 || d.getDate() !== Number(day)) return null
  return d
}

/**
 * Fecha numérica `dd/mm/aaaa` — el único formato de fecha que fija §4 de la
 * especificación de suscripciones para las tablas de esta consola.
 *
 * `empty` es lo que se imprime cuando no hay fecha; por defecto el guion
 * largo del sistema de diseño. Pásale `''` si el hueco debe quedar vacío.
 *
 * Si la cadena no es un ISO parseable, se devuelve tal cual: es preferible
 * mostrar un dato crudo pero visible a esconder un valor real detrás de un
 * guion, que es justo el defecto que este módulo reemplaza
 * (`SubscriptionsAdminView.vue:38-40` hoy hace lo contrario: nunca formatea,
 * ni siquiera cuando sí podría).
 */
export function formatDate(iso: string | null | undefined, empty: string = EMPTY): string {
  if (!iso) return empty
  const d = parseISODate(iso)
  if (!d) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

/**
 * ── LA POLÍTICA DE DINERO DE LA CONSOLA, EN UNA REGLA ─────────────────────
 *
 * <b>Si el DTO trae `currency`, `formatMoney(v, dto.currency)`. Si no lo trae,
 * `formatAmount(v)`: la cifra desnuda, sin símbolo en la celda — y la
 * superficie que la contiene (tabla, ficha, panel o modal) dice UNA vez, con
 * `MONEY_SCOPE_NOTE`, en qué divisa factura la plataforma.</b>
 *
 * <p>Antes de esto convivían tres políticas para el mismo peso —importe sin
 * símbolo (`formatDocumentAmount`, 25 ficheros), importe con «COP» a fuego
 * (`formatCurrency`, 21) y un `Intl.NumberFormat` con la divisa real (2)—, y el
 * reparto no seguía ninguna regla: el mismo total del mismo documento salía
 * `179.000,00` en la cola de cobranza y `$ 179.000,00` en conciliación, y las
 * pestañas «Lo contratado» y «Dinero» del mismo expediente discrepaban a un
 * clic de distancia. El operador tenía que decidir si dos números con distinta
 * tipografía eran la misma cifra.
 *
 * <p><b>Por qué la regla es esta y no «poner “$” en todas partes».</b> El
 * razonamiento que escribió `billingFormat.ts` era correcto y se conserva
 * entero: `BillingDocumentResponse` no expone `currency`, y rotular «$» sobre
 * un documento cuya divisa el contrato no declara es inventar un dato en una
 * pantalla contable. Lo que estaba mal no era la regla: era que solo se aplicaba
 * en un tercio de las pantallas.
 *
 * <p><b>Dónde SÍ se nombra la divisa, y por qué eso no es la misma invención.</b>
 * Aquí vivía una nota que rechazaba también el rótulo de pantalla: «escribir
 * “Total (COP)” encima de un importe cuya divisa el contrato no declara es
 * exactamente la misma invención que el “$” […]. Si el contrato no lo dice, la
 * pantalla no lo dice». Ese razonamiento acierta en la mitad que defiende, y
 * colapsa dos afirmaciones que no son la misma:
 *
 * <ul>
 *   <li><b>«el importe de ESTA fila es COP»</b> — <i>es</i> una invención. Se
 *       deduce de un DTO que no la declara y se ata a un registro concreto, fila
 *       a fila. Da igual si el vehículo es un «$» pegado a la cifra o un «(COP)»
 *       en la cabecera de esa columna: los dos afirman algo del dato que el
 *       contrato no dice. <b>Eso sigue prohibido</b>, y por eso la cabecera de
 *       columna se quedó sin rótulo de divisa.</li>
 *   <li><b>«esta plataforma factura en COP»</b> — <i>no</i> es una deducción
 *       sobre un dato: es un hecho estructural del producto. La geografía
 *       sembrada es Colombia y solo Colombia, y el modelo de dinero entero está
 *       construido sobre UVT, SMMLV, retenciones DIAN y periodos gravables
 *       colombianos —`RegisterWithholdingModal.vue` pide municipio DIVIPOLA y
 *       año gravable, y no hay ninguna rama que no lo pida—. Decirlo una vez
 *       por superficie describe la plataforma, no el registro, y no atribuye
 *       nada a ninguna fila.</li>
 * </ul>
 *
 * <p>De ahí que la política tenga dos mitades y no una: <b>la celda no rotula</b>
 * (`formatAmount`, sin símbolo) y <b>la superficie sí</b> —`<caption>` en las
 * tablas de datos, una línea `.ds-meta` en fichas, paneles y modales—, siempre
 * con el mismo texto y desde una sola constante, `MONEY_SCOPE_NOTE`. Publicar
 * solo la primera mitad es lo que dejó 44 ficheros pintando cifras desnudas sin
 * que nada en la pantalla dijera de qué divisa se habla; una cifra sin unidad no
 * es más honesta que una cifra con la unidad equivocada, solo es menos
 * verificable. La divisa se dice en el nivel donde es cierta, la pantalla, y se
 * calla en el nivel donde no se sabe, la fila.
 *
 * <p><b>Esto NO cierra el hueco; lo señala mientras siga abierto.</b> El arreglo
 * de verdad es `currency` en los DTO: de los 53 `*Response` del backend que
 * exponen un `BigDecimal`, <b>exactamente uno</b> lo declara. Sigue pendiente y
 * no es un olvido — añadir el campo dispara `UndeclaredFields` en cada atadura
 * de esos esquemas en los dos fronts, así que es un cambio coordinado de tres
 * repositorios. Hoy declaran divisa dos DTO del bloque
 * (`SubscriptionPaymentResponse.currency` y `PriceListResponse.currency`, cinco
 * llamadas): esas —y solo esas— usan `formatMoney`. Cuando el contrato añada
 * `currency` a las demás, cada llamada pasa de `formatAmount` a `formatMoney`,
 * la nota de superficie deja de hacer falta, y `formatAmount` y
 * `MONEY_SCOPE_NOTE` se borran juntas.
 */

/** La divisa en la que factura la plataforma. Ver la nota de arriba. */
export const PLATFORM_CURRENCY = 'COP'

/**
 * <b>La única frase con la que esta consola nombra su divisa.</b>
 *
 * <p>Se pinta una vez por superficie de dinero —`MoneyCaption` en las tablas de
 * datos, `MoneyScopeNote` en fichas, paneles y modales— y <b>nunca</b> por
 * celda ni por cabecera de columna. Es una sola constante a propósito: la
 * discrepancia que arregló este módulo empezó porque el mismo peso se rotulaba
 * con tres textos distintos, y un rótulo copiado a mano en treinta ficheros
 * vuelve a ese sitio en un trimestre.
 */
export const MONEY_SCOPE_NOTE = `Importes en pesos colombianos (${PLATFORM_CURRENCY})`

const amountFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Cache de formateadores por divisa: `Intl.NumberFormat` no es barato de construir. */
const moneyFormatters = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currency: string): Intl.NumberFormat {
  const cached = moneyFormatters.get(currency)
  if (cached) return cached
  const created = new Intl.NumberFormat('es-CO', {
    // Los dos decimales son EXPLÍCITOS y no el valor por defecto de la divisa, y
    // esto no es un detalle: `Intl` da a COP cero decimales por CLDR, así que el
    // `formatCurrency` que había aquí imprimía `$ 179.000` mientras el importe
    // sin símbolo del mismo documento imprimía `179.000,00`. O sea que las dos
    // políticas de moneda no solo discrepaban en el símbolo — discrepaban en la
    // cifra. Con esto, `formatAmount` y `formatMoney` producen exactamente los
    // mismos dígitos y solo se diferencian en si rotulan la divisa.
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency,
  })
  moneyFormatters.set(currency, created)
  return created
}

/**
 * Importe cuya divisa el contrato <b>NO</b> declara: `179.000,00`, sin símbolo.
 *
 * <p>En el marcado se combina con la clase `.ds-num` (`primitives.css`) para
 * alinear a la derecha con cifras tabulares — esta función solo produce el
 * texto, no añade esa clase.
 *
 * <p>`value` acepta `null`/`undefined` (campo opcional del DTO) y también una
 * cadena numérica, porque algún DTO de este contrato serializa un `BigDecimal`
 * como string; `NaN` cae en `empty`, igual que un valor ausente.
 */
export function formatAmount(
  value: number | string | null | undefined,
  empty: string = EMPTY,
): string {
  const n = toNumber(value)
  return n === null ? empty : amountFormatter.format(n)
}

/**
 * Importe cuya divisa el contrato <b>SÍ</b> declara: `$ 179.000,00` en pesos,
 * `US$ 50,00` en dólares — lo que diga el DTO, nunca lo que se suponga.
 *
 * <p>Es lo que evita que en una lista de precios en dólares el simulador de
 * escalera diga `US$ 50,00` y el precio de excedente `$ 50,00` en la misma
 * pantalla para el mismo artículo. Si `currency` viniera vacío se cae a
 * `formatAmount`: sin divisa no se inventa una.
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  empty: string = EMPTY,
): string {
  const n = toNumber(value)
  if (n === null) return empty
  const code = currency?.trim()
  if (!code) return amountFormatter.format(n)
  return moneyFormatter(code).format(n)
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isNaN(n) ? null : n
}
