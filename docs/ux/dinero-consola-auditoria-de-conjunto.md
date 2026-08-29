# Consola de plataforma · El bloque del dinero, auditado **como conjunto**

**Fecha:** 2026-08-28 · **Repo:** `VetSoftwareFront` (consola de plataforma) · **Alcance:** las
~60 pantallas de cobranza, documentos de cobro, contratos, cupos y límites, pruebas y concesiones,
conciliación, cotizaciones, configurador, catálogo y precios, y facturación de plataforma.

**Qué es este documento y qué NO es.**

Las dos especificaciones que ya viven aquí —`suscripciones-consola-especificacion.md` (capas A–H) y
`suscripciones-consola-ampliacion-especificacion.md` (capas I–P)— son los **planos con los que se
construyó**. Este documento es lo contrario: es la **revisión del edificio terminado**, buscando
exactamente lo que un plano no puede prever —lo que se degrada cuando cuarenta manos construyen
sesenta pantallas en paralelo durante meses.

No propone rediseñar nada. **Estas pantallas funcionan y su calidad media es alta**: los estados
vacíos están escritos, el vocabulario del dinero se respeta, los huecos del contrato se declaran y
las primitivas están adoptadas. Lo que sigue es la lista de las **costuras** entre pantallas, más
los seis sitios donde la construcción se desvió de su propia regla escrita.

Los hallazgos van ordenados **por valor para el operador**, no por fichero ni por severidad
académica. Cada uno lleva `fichero:línea`, el criterio que lo exige y el coste.

---

## Contenido

- [0 · Veredicto en un párrafo](#0--veredicto-en-un-párrafo)
- [1 · Barato y de alto valor](#1--barato-y-de-alto-valor--se-hace-en-una-tarde)
  - [D-01 · Paginar con el teclado destruye el foco, en 18 listas de dinero](#d-01--paginar-con-el-teclado-destruye-el-foco-en-18-listas-de-dinero)
  - [D-02 · El mismo peso tiene tres tipografías, y el reparto no sigue ninguna regla](#d-02--el-mismo-peso-tiene-tres-tipografías-y-el-reparto-no-sigue-ninguna-regla)
  - [D-03 · La cabecera de una columna de importes está alineada al revés, en las 37 tablas](#d-03--la-cabecera-de-una-columna-de-importes-está-alineada-al-revés-en-las-37-tablas)
  - [D-04 · «Vigilancia de solapes»: cuatro defectos en 77 líneas](#d-04--vigilancia-de-solapes-cuatro-defectos-en-77-líneas)
  - [D-05 · El contrato que generó el documento no es un enlace](#d-05--el-contrato-que-generó-el-documento-no-es-un-enlace)
  - [D-06 · La firma no dice quién firma, en 12 de las 13 pantallas que firman](#d-06--la-firma-no-dice-quién-firma-en-12-de-las-13-pantallas-que-firman)
  - [D-07 · Tres relojes distintos para la misma hora](#d-07--tres-relojes-distintos-para-la-misma-hora)
  - [D-08 · «Reintentar» sobre un 403](#d-08--reintentar-sobre-un-403)
- [2 · Vale la pena aunque cueste](#2--vale-la-pena-aunque-cueste)
  - [D-09 · El nombre de la empresa, resuelto en cliente y cacheado](#d-09--el-nombre-de-la-empresa-resuelto-en-cliente-y-cacheado)
  - [D-10 · La ausencia de filtro y de suma de página no se explica al operador](#d-10--la-ausencia-de-filtro-y-de-suma-de-página-no-se-explica-al-operador)
  - [D-11 · La tarifa aplicada se pinta como identificador crudo](#d-11--la-tarifa-aplicada-se-pinta-como-identificador-crudo)
  - [D-12 · El alcance por empresa son dos controles con dos verbos](#d-12--el-alcance-por-empresa-son-dos-controles-con-dos-verbos)
- [3 · Necesita backend](#3--necesita-backend)
- [4 · Lo dejaría como está, y por qué](#4--lo-dejaría-como-está-y-por-qué)
- [5 · Lo que NO se ha comprobado](#5--lo-que-no-se-ha-comprobado)
- [6 · Orden de ejecución sugerido](#6--orden-de-ejecución-sugerido)

---

## 0 · Veredicto en un párrafo

**Estas pantallas están bien.** Mejor que bien: el nivel de honestidad del texto —estados vacíos que
distinguen «no hay» de «no se pudo», huecos del contrato declarados en pantalla con
`ContractGapNotice`, sumas de página que avisan de que son solo de esa página, familias de rechazo
escritas y no codificadas en color— está por encima de lo que se ve en la mayoría de consolas
internas. `AppTable` resuelve el orden error→carga→vacío en un solo sitio y lo documenta;
`SignedActionModal` implementa §3.3.4 de WCAG con más rigor que la norma exige.

Lo que falla es **exactamente lo que predice el modo de construcción**: las costuras. Doce
hallazgos, de los que **ocho se arreglan en una tarde y siete de esos ocho se arreglan tocando entre
uno y tres ficheros compartidos**, porque el defecto está en la primitiva o en el patrón repetido,
no en la pantalla. El único hallazgo verdaderamente sistémico y caro no es de interfaz: es el hueco
del contrato que obliga a identificar a los clientes por número.

---

## 1 · Barato y de alto valor — se hace en una tarde

### D-01 · Paginar con el teclado destruye el foco, en 18 listas de dinero

> **Severidad: bloqueante** · `PaymentAttemptsTable.vue:156-157` y 20 sitios más
> **Criterio:** WCAG 2.2 §2.4.3 *Focus Order* (A) · contradice la regla que el propio
> `AppTable.vue:22-24` declara

**Qué está mal hoy.** El paginador se monta con `v-if` sobre `!loading`:

```vue
<!-- features/billing-operations/components/PaymentAttemptsTable.vue:156-157 -->
<AppPagination
  v-if="!loading && !error && total > 0"
```

Al pulsar «Siguiente», `loading` pasa a `true`, el `<nav>` entero se desmonta **con el botón que el
usuario acaba de pulsar dentro**, y el navegador devuelve el foco a `<body>`. Cuando la página nueva
llega, el paginador vuelve, pero el operador ya está en la casilla de salida: su siguiente `Tab`
empieza por el logotipo de la barra lateral. En la cola de vencidos, que es una lista de trabajo de
cientos de filas, eso significa re-navegar la pantalla entera **una vez por página**.

Es, además, la contradicción exacta de la regla que `AppTable` escribió para sí misma:

> «La rama 3 (`loading` con filas ya pintadas) NO existe en `ListBody`, que en un refresco borra la
> tabla: **refrescar ocho filas no puede destruir el contexto que el usuario está mirando**.»
> — `AppTable.vue:22-24`

La tabla protege las filas; el paginador destruye el control. Y es el control el que el usuario
tiene en la mano.

**Alcance medido.** 25 instancias de `AppPagination` en 23 ficheros. **21 llevan `!loading`**, de
las cuales **18 están en pantallas de dinero**:

`BillingDocumentsTable.vue:193` · `CustomerCreditBalancesTable.vue:115` ·
`CustomerCreditEntriesTable.vue:106` · `DunningEventsTable.vue:96` · `PaymentAttemptsTable.vue:157` ·
`PaymentRefundsTable.vue:120` · `PaymentReversalsTable.vue:176` · `PaymentsTable.vue:96` ·
`PriceListPricesPanel.vue:156` · `PriceListsPanel.vue:373` · `CommercialCatalogView.vue:243-245` ·
`BankReceiptsPanel.vue:186` · `ExternalReconciliationsPanel.vue:223-227` · `SettlementsPanel.vue:221` ·
`SubscriptionAccessView.vue:335` · `SubscriptionMoneyView.vue:318, 368, 417`.

**Y la forma correcta ya existe en el repositorio**, en cuatro sitios que no la copiaron de nadie:

`QuotesListView.vue:157` → `v-if="!quotesError && total > 0"`
`SubscriptionsAdminView.vue:159` → `v-if="!subscriptionsError && total > 0"`
`BillingDocumentSequencesPanel.vue:172` → `v-if="sequences.pageCount.value > 1"`
`CompanyCessionView.vue:219` → `v-if="totalPages > 1"`

**Qué se propone.** Quitar `!loading` de la condición en los 18 sitios. Nada más.

Es seguro porque `useServerPaged` **conserva `total` y `pageCount` durante la carga**: solo los pone
a cero en la rama de error (`useServerPaged.ts:76-78`), que el `!error` de la condición ya cubre.
Mientras la página nueva viaja, el paginador sigue diciendo «Mostrando 21–40 de 317», que es la
verdad de lo que hay en pantalla, y sus botones siguen siendo enfocables. No hace falta ni un
`disabled` ni un `aria-busy` nuevos: `AppTable` ya pone `aria-busy` en la `<table>` y anuncia
«Cargando…» por su `role="status"` (`AppTable.vue:58-63`).

**Coste.** Una línea por sitio, 18 sitios, un solo `sed` revisado a mano. **~1 hora.** Cero CSS,
cero primitivas nuevas, cero riesgo de presupuesto.

**Cómo se verifica después.** Un spec de Vitest por familia: montar la tabla, enfocar «Siguiente»,
emitir `update:page`, poner `loading` a `true`, y comprobar que `document.activeElement` sigue siendo
el botón. Es el mismo patrón que ya sujeta `signed-action-modal.spec.ts`.

---

### D-02 · El mismo peso tiene tres tipografías, y el reparto no sigue ninguna regla

> **Severidad: grave** · `billingFormat.ts:28-31` vs `composables/format.ts:102-110` vs
> `PriceListPricesPanel.vue:63-68`
> **Criterio:** consistencia (Nielsen §4, *Consistency and Standards*) · y la regla que el propio
> `billingFormat.ts:21-26` escribe y el resto del producto incumple

**Qué está mal hoy.** Hay **tres políticas de moneda** conviviendo en el bloque del dinero:

| Formateador | Salida | Ficheros |
|---|---|---|
| `formatDocumentAmount` (`billingFormat.ts:28`) | `179.000,00` — **sin símbolo** | 25 |
| `formatCurrency` (`format.ts:102`) | `$ 179.000,00` — **COP a fuego** | 21 |
| `new Intl.NumberFormat(…, { currency: priceList.currency })` | la divisa **real** de la lista | 2 |

La regla que justifica la primera está escrita, y es buena:

> «No es un descuido ni una tercera convención de formato: `BillingDocumentResponse` no expone
> `currency` […] y rotular «$» sobre un documento cuya divisa el contrato no declara es **inventar un
> dato en una pantalla contable**.» — `billingFormat.ts:20-26`

**El problema es que esa regla la incumple media aplicación.** Comprobado contra los tipos:
`ExternalInvoiceReconciliationResponse` **tampoco** declara `currency` (`reconciliation.types.ts:64`
—`computedTotal`, `computedTax`, `externalTotal`— y `:83-91` para las liquidaciones), y sin embargo
toda la conciliación lo pinta con `$`. Igual `SubscriptionChargeResponse`
(`subscription-money.types.ts:101-103`) y `QuoteResponse` (`quotes.types.ts:122-135`).

El resultado, en cuatro costuras que el operador cruza a diario:

1. **El mismo total del mismo documento**, con dos aspectos. `BillingDocumentsTable.vue` lo pinta
   `179.000,00`; `ExternalReconciliationsPanel.vue:177` pinta el `computedTotal` de ese mismo
   documento como `$ 179.000,00`.
2. **Dentro del mismo expediente de contrato**: la pestaña «Lo contratado»
   (`SubscriptionItemsTable.vue`, `AddSubscriptionItemModal.vue`) usa `$`; la pestaña «Dinero»
   (`SubscriptionMoneyView.vue`, vía `subscriptionMoneyText.ts:1`) no. Dos pestañas, un clic de
   distancia.
3. **Dentro de la misma ficha de artículo del catálogo**: `PriceListPricesPanel.vue:63` y
   `TierSimulatorPanel.vue:76` usan la divisa **declarada por la lista de precios**;
   `CatalogItemLimitsPanel.vue:224` usa `formatCurrency`, o sea **COP a fuego**. En una lista en
   dólares, el simulador de escalera diría `US$ 50,00` y el precio de excedente `$ 50,00`, en la
   misma pantalla, para el mismo artículo.
4. **La cotización** (`QuoteTotals.vue:23-35`) fija COP aunque su pie
   (`QuoteTotals.vue:38-42`) diga literalmente que los importes salen de una tarifa concreta —cuya
   divisa el catálogo sí conoce.

**Qué se propone.** Una sola política, escrita en `src/composables/format.ts`, con tres funciones y
una regla de elección que un revisor pueda aplicar sin pensar:

```ts
// src/composables/format.ts  (añadir; no se toca formatCurrency, que se conserva)

/**
 * Importe cuya divisa el contrato SÍ declara. Es el caso normal cuando el DTO
 * trae `currency`: pagos, precios de una lista, cotizaciones.
 */
export function formatMoney(value: number | string | null | undefined, currency: string): string

/**
 * Importe cuya divisa el contrato NO declara. Se imprime sin símbolo, y la
 * PANTALLA declara la divisa una sola vez, en su cabecera o en la cabecera de
 * la columna: «Total (COP)». Nunca en cada celda.
 */
export function formatAmount(value: number | string | null | undefined): string
```

Y **la regla de elección, en una frase**: *si el DTO trae `currency`, `formatMoney(v, dto.currency)`;
si no lo trae, `formatAmount(v)` y la divisa se dice una vez en la cabecera de la columna.*

Con eso, los cuatro casos de arriba se resuelven solos y —lo importante— **el operador deja de tener
que decidir si dos números con distinta tipografía son la misma cifra**.

Cambios concretos:

- `formatDocumentAmount` → se renombra a `formatAmount` y sube a `src/composables/format.ts`.
  `billingFormat.ts` conserva solo `daysSince`/`agingText`/`agingTitle`/`daysUntil`/`deadlineText`,
  que es lo que de verdad es de cobranza.
- **Conciliación** (`ExternalAmountsGrid`, `ExternalReconciliationsPanel`, `SettlementAmounts`,
  `SettlementsPanel`, `BankReceiptsPanel`, `LinkBankReceiptModal`, `MatchExternalInvoiceForm`,
  `RegisterSettlementForm`, `ResolveReconciliationModal`) pasa de `formatCurrency` a `formatAmount`,
  y cada tabla declara la divisa en su cabecera de columna: `Bruto (COP)`, `Neto (COP)`.
- **`CatalogItemLimitsPanel.vue:224`** pasa a `formatMoney(limit.overageUnitAmount, <divisa de la
  lista en contexto>)`; si en ese punto no hay lista en contexto, `formatAmount` y la divisa en la
  cabecera.
- **`SubscriptionItemsTable`, `AddSubscriptionItemModal`, `ChangeItemQuantityModal`,
  `subscriptionHistoryText`** pasan a `formatAmount`, para que las dos pestañas del expediente digan
  lo mismo.
- **Cotizaciones** (`QuoteTotals`, `QuoteLinesTable`, `QuotesListView`): ver D-11 — ahí sí se puede
  resolver la divisa real, porque el catálogo de tarifas ya está cargado en la pantalla.

**Coste.** ~45 llamadas repartidas en 21 ficheros, todas mecánicas, más dos funciones nuevas en un
módulo transversal que **no** es gemelo TR-02 (`format.ts:24-32` lo dice explícitamente). **Media
jornada.** Requiere una pasada de revisión visual porque cambia texto en pantalla.

**Ojo con el presupuesto.** Ninguna de las cabeceras nuevas (`Total (COP)`) toca CSS: son cadenas
dentro del array `headers` que ya reciben las tablas.

---

### D-03 · La cabecera de una columna de importes está alineada al revés, en las 37 tablas

> **Severidad: grave** · `AppTable.vue:66` · adopción cero de `primitives.css:1290`
> **Criterio:** WCAG 2.2 §1.3.1 (A, relación cabecera–celda) en su lectura débil; sobre todo, IBM
> Carbon y GOV.UK, *numeric columns are right-aligned, header included*

**Qué está mal hoy.** `AppTable` pinta la cabecera así:

```vue
<!-- src/components/ui/AppTable.vue:66 -->
<th v-for="header in headers" :key="header">{{ header }}</th>
```

`headers` es `string[]`. **No hay forma de decir que una columna es numérica.** Las celdas sí lo
dicen —de los **37 ficheros** del bloque del dinero que montan un `AppTable`, **21 usan
`<td class="ds-num">`**— pero la cabecera queda alineada a la izquierda sobre cifras alineadas a la
derecha. En la tabla de intentos de cobro, el rótulo «Importe» flota sobre la primera cifra de la
columna y a partir de la tercera fila ya no está encima de nada.

**Y la primitiva que lo arregla ya existe, en los dos repos, byte a byte:**

```css
/* src/assets/styles/primitives.css:1290 */
.ds-table th.ds-num { text-align: right; }
```

**Adopción en la consola: cero.** El único `<th>` con clase de la consola es
`SubscriptionItemsTable.vue:169`, y solo porque esa tabla se escribió su propio `<thead>` a mano en
vez de usar `AppTable`:

```vue
<th scope="col" class="ds-col-actions">Acciones</th>
```

—lo que de paso deja **dos marcados de tabla distintos** en el mismo producto: `AppTable` no pone
`scope="col"` y esta sí.

**Qué se propone.** Ampliar el contrato de `headers` sin romper los 37 consumidores:

```ts
// src/components/ui/AppTable.vue
export type AppTableHeader = string | { label: string; align?: 'num' | 'actions' }

defineProps<{ headers: (string | AppTableHeader)[] /* … */ }>()
```

```vue
<th
  v-for="(h, i) in normalizedHeaders"
  :key="i"
  scope="col"
  :class="h.align === 'num' ? 'ds-num' : h.align === 'actions' ? 'ds-col-actions' : undefined"
>
  {{ h.label }}
</th>
```

Tres detalles que hay que respetar:

1. **La clave del `v-for` pasa de `header` a `i`.** Hoy es el propio texto
   (`AppTable.vue:66`), y hay tablas con dos cabeceras vacías (`SubscriptionDocumentsTable.vue:64`
   termina en `''`) o repetidas — una clave duplicada en `v-for` es el defecto R12 del catálogo de
   reglas. El índice es legítimo aquí porque la cabecera **no** es una lista reordenable.
2. **`scope="col"` para todas.** Es gratis, lo pide el tutorial de tablas del W3C, y hoy solo lo
   tienen las 32 apariciones sueltas del repo, ninguna dentro de `AppTable`.
3. **Cero CSS nuevo.** Las dos clases están en `primitives.css` y sus reglas de refuerzo de
   especificidad (`:1290` y `:1294`) están escritas y comentadas. **No hay que pedirle nada a
   `front-parity`.**

Después, marcar como `{ label: 'Importe', align: 'num' }` las columnas de cifra de las tablas del
dinero, y como `align: 'actions'` la última donde el `<td>` ya lleva `.ds-col-actions`
(`DocumentApplicationsBlock.vue:178`, `CustomerCreditBalancesTable.vue:87`,
`PaymentAttemptsTable.vue:133`, `PaymentReversalsTable.vue:133`,
`SubscriptionDocumentsTable.vue:130`).

**Coste.** ~20 líneas en `AppTable.vue` + un array por tabla. **Media jornada** si se marcan los 37
ficheros; **2 horas** si se limita a los 21 que ya tienen columna con `.ds-num`, que es donde se
nota.

---

### D-04 · «Vigilancia de solapes»: cuatro defectos en 77 líneas

> **Severidad: grave** · `SubscriptionOverlapsPanel.vue:18, 27-29, 61, 62, 68, 71`
> **Criterio:** R14 (hueco honesto antes que dato inventado) · §4 del plano A–H (fecha `dd/mm/aaaa`)
> · WCAG 2.2 §1.3.1

Esta pantalla detecta **artículos cobrados dos veces**. Es la que menos puede permitirse fallar, y
es la única del bloque del dinero que concentra cuatro defectos que en el resto del producto están
resueltos.

**1 · Un `formatDate` que no formatea, y una fecha que ni siquiera pasa por él.**

```ts
// SubscriptionOverlapsPanel.vue:27-29
function formatDate(value: string | null): string {
  return value ?? 'Sin límite'
}
```

Devuelve el ISO crudo. Y en la plantilla, la fecha de **inicio** ni siquiera lo llama:

```vue
<!-- :68 -->
#{{ overlap.firstItemId }} · {{ overlap.firstFrom }} → {{ formatDate(overlap.firstTo) }}
```

Resultado en pantalla: `#88 · 2026-03-01 → 2026-08-31`. En la misma celda, la fecha de inicio sin
formato y la de fin pasando por una función que tampoco la formatea. **Es el último superviviente
del defecto exacto que `src/composables/format.ts:12-13` se escribió para matar** —y ese fichero lo
cita por su nombre. Barrido el resto del bloque del dinero (11 features, todos los `.vue`): **este
es el único sitio con fechas ISO crudas en plantilla.**

Además, el `formatDate` local **sombrea** el nombre del formateador canónico: quien lea la plantilla
verá `formatDate(...)` y dará por hecho que es el bueno.

*Arreglo:* borrar la función local, `import { formatDate } from '@/composables/format'`, y llamarla
en los cuatro sitios: `formatDate(overlap.firstFrom)`, `formatDate(overlap.firstTo, 'Sin límite')` —
`formatDate` ya acepta el texto de vacío como segundo argumento (`format.ts:76`).

**2 · La empresa se pinta cruda, y es la única tabla del producto que lo hace.**

```vue
<!-- :61 -->
<td class="ds-text-strong">#{{ overlap.companyId }}</td>
```

`CompanyRef` (`components/ui/CompanyRef.vue`) existe exactamente para esto y lo usan **14 tablas**,
incluidas las siete de cobranza, las dos de límites, la de conciliación y la de pruebas. Esta no.
Consecuencia: en la única pantalla que detecta doble cobro, el número de la empresa **no lleva a
ninguna parte** y el lector de pantalla anuncia «almohadilla cuarenta y dos».

*Arreglo:* `<td><CompanyRef :company-id="overlap.companyId" /></td>`. Una línea.

**3 · El contrato tampoco es enlace, teniendo todo lo que hace falta.**

`:62` pinta `#{{ overlap.subscriptionId }}` como texto plano, cuando la fila trae `companyId` **y**
`subscriptionId`, que es justo el par que pide la ruta `/suscripciones/:companyId/:id`
(`subscriptions-admin.routes.ts:97`). Ver D-05: es el mismo defecto, aquí y en otros cuatro sitios.

**4 · «Sin datos» es el rótulo del error, y se lee como el del vacío.**

```ts
// :17-25
if (props.error)  return { label: 'Sin datos', variant: 'danger' }
if (props.loading) return { label: 'Verificando', variant: 'neutral' }
if (props.items.length === 0) return { label: 'Sano', variant: 'success' }
```

El vacío —«no hay solapes»— dice **«Sano»**. El fallo de lectura —«no sabemos si hay solapes»— dice
**«Sin datos»**. Un operador que barre la pantalla lee «Sin datos» como *«no hay nada que
mirar aquí»*, que es la conclusión opuesta a la correcta. Es literalmente el caso que el encargo
nombra: en un dominio de dinero, «no pudimos leerlo» y «no hay nada» son cosas distintas.

*Arreglo:* `label: 'No se pudo comprobar'`. El resto del bloque ya escribe así: la tabla de abajo
distingue las dos ramas correctamente (`AppTable` rama 1 vs rama 4) y el vacío tiene su texto
positivo (`:56`). Solo el badge de la cabecera miente.

**Coste de los cuatro.** Un fichero, ~8 líneas. **30 minutos.**

---

### D-05 · El contrato que generó el documento no es un enlace

> **Severidad: grave** · `DocumentIdentityCard.vue:70-72` · `BillingDocumentsTable.vue:166` ·
> `PaymentAttemptsTable.vue:95` · `SubscriptionOverlapsPanel.vue:62` · `EntitlementsTable.vue:164`
> **Criterio:** Nielsen §7 *Flexibility and Efficiency of Use* · plano I–P §3.3 («cada eslabón es un
> enlace, y cada uno tiene su vuelta»)

**Qué está mal hoy.** En la ficha de un documento de cobro, dos identificadores viven uno al lado
del otro y solo uno navega:

```vue
<!-- features/billing-documents/components/DocumentIdentityCard.vue:65-72 -->
<div>
  <dt class="ds-label">Empresa</dt>
  <dd><CompanyRef :company-id="document.companyId" /></dd>   <!-- navega -->
</div>
<div>
  <dt class="ds-label">Contrato</dt>
  <dd>#{{ document.subscriptionId }}</dd>                     <!-- no navega -->
</div>
```

La pregunta que vertebra el modelo —*«¿por qué se le facturaron 179.000?»*— se responde en el
expediente del contrato. Desde el documento que cobra esos 179.000 **no hay camino**, aunque el DTO
traiga las dos mitades de la ruta (`companyId` y `subscriptionId`) en la misma fila, y aunque la
ruta de dos parámetros exista y esté probada (`subscriptions-admin.routes.ts:97`).

El operador tiene que copiar el número, ir al listado de suscripciones, filtrar, y volver.

**Qué se propone.** Una primitiva hermana de `CompanyRef`, en `components/ui/`, con el mismo
criterio y el mismo aviso de que mitiga un hueco del contrato:

```vue
<!-- src/components/ui/SubscriptionRef.vue -->
<script setup lang="ts">
// OJO: el nombre de ruta NO está en `constants/routes.ts`. Vive junto a su ruta,
// en `router/routes/subscriptions-admin.routes.ts:15`, y de ahí hay que importarlo.
import { SUBSCRIPTION_RECORD_ROUTE_NAMES } from '@/router/routes/subscriptions-admin.routes'
defineProps<{ companyId: number; subscriptionId: number }>()
</script>

<template>
  <RouterLink
    class="enlace"
    :to="{ name: SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
           params: { companyId, id: subscriptionId } }"
    :aria-label="`Contrato ${subscriptionId} de la empresa ${companyId}`"
  >#{{ subscriptionId }}</RouterLink>
</template>
```

Y se aplica en los cinco sitios listados arriba. En `PaymentAttemptsTable.vue:95` el identificador es
`billingDocumentId`, que apunta a `/documentos/:companyId/:id`
(`billing-documents.routes.ts:39-40`, nombre `BILLING_DOCUMENT_ROUTE_NAMES.DETAIL`, definido en
`billing-documents.routes.ts:27`): mismo patrón, primitiva `DocumentRef`.

**Advertencia para quien lo implemente.** Un componente de `components/ui/` importando desde
`router/routes/` es una dependencia hacia arriba que hoy no existe (`CompanyRef.vue:2` importa de
`@/constants/routes`, que es plano). Si eso incomoda, la salida limpia es **subir los dos nombres a
`constants/routes.ts`** —donde ya vive `COMPANY_DETAIL`— y que los ficheros de ruta los importen de
ahí, igual que hace `subscriptions-admin.routes.ts:93` con `ROUTE_NAMES.SUBSCRIPTIONS_ADMIN`.

**Coste.** Dos SFC de 15 líneas (uno reutiliza el `<style scoped>` de tres líneas de `CompanyRef`,
que solo fija `font-variant-numeric`, así que no duplica ninguna primitiva) y cinco sustituciones.
**~2 horas.**

**Restricción respetada.** No añade CSS: `.enlace` de `CompanyRef` ya es local y mínimo; si se quiere
evitar la tercera copia, la salida limpia es una única primitiva `RecordRef` con un slot, no una
clase nueva en `primitives.css`.

---

### D-06 · La firma no dice quién firma, en 12 de las 13 pantallas que firman

> **Severidad: grave** · `SignedActionModal.vue:193-233` (ausencia)
> **Criterio:** plano I–P §3.1, regla 3 — *«La firma se muestra y no se elige»* · WCAG 2.2 §3.3.4
> *Error Prevention (Legal, Financial, Data)* (AA)

**Qué está mal hoy.** El plano fija cinco reglas para toda operación con firma. `SignedActionModal`
implementa cuatro con rigor —el botón nombra la acción y `confirmLabel` es obligatorio a propósito
(`:62-65`); el motivo es lista cerrada (`:49-54`); el botón no se deshabilita y el error va al
`ErrorSummary` (`:56-60`); la consecuencia se pinta como aviso (`:199-202`)— y **omite la tercera**:

> «**La firma se muestra y no se elige.** Es el usuario en sesión. Un selector de “quién autoriza”
> convierte la firma en una afirmación.» — plano I–P §3.1.3

El cuerpo del modal es: resumen de errores → pregunta → consecuencia → `#details` → motivo → nota →
`#extra`. **En ningún punto aparece quién está firmando.** El operador confirma una condonación de
deuda o una devolución sin ver su propio nombre al lado del botón.

**Alcance.** 13 pantallas consumen `SignedActionModal`. **Una sola** toca la identidad del firmante:
`ResolveReconciliationModal.vue:93` importa `useAuthStore`, y ni siquiera la muestra — la usa para
bloquear el envío si la sesión no trae identificador (`:239-244`). Las otras doce
—`GrantCreditModal`, `RegisterRefundModal`, `ReversalDecisionModal`, `PropagateLimitModal`,
`SucceedContractModal`, `AdjustUsageModal`, `GrantOverrideModal`, `RevokeOverrideModal`,
`LinkBankReceiptModal`, `GrantTrialModal`, `OpenTrialWindowModal`, `RecordTrialOutcomeModal`— no
lo mencionan.

**Por qué importa más de lo que parece.** La consola tiene **un solo rol de plataforma** para 216
operaciones (plano I–P §1.10). La firma no protege de nada técnicamente: **es todo el control que
hay**. Y un control que no se ve no disuade. Es el mismo argumento que el plano usa en §3.9 para
poner la constancia de acceso dentro de la empresa: *«ponerla ahí la hace visible para el propio
operador antes de entrar, y eso es la mitad del efecto»*.

**Qué se propone.** Un bloque en `SignedActionModal`, entre la nota y `#extra`, que se pinta siempre
y no se puede quitar por prop:

```vue
<!-- SignedActionModal.vue, tras el AppTextarea -->
<p class="ds-meta firma">
  <component :is="ICONS.USER" :size="14" aria-hidden="true" />
  Firma <strong>{{ signerName }}</strong><template v-if="signerEmail"> · {{ signerEmail }}</template>.
  Queda escrito con la operación y no se puede cambiar.
</p>
```

Texto exacto cuando la sesión no trae identidad, que es el caso que `ResolveReconciliationModal` ya
detecta y que hoy solo esa pantalla contempla:

> «La sesión no identifica a nadie, así que esta operación no se puede firmar. Vuelve a iniciar
> sesión y reinténtalo.»

—en `ds-banner ds-banner--error` con `role="alert"`, y con el botón de confirmar deshabilitado. Es
la **única** excepción legítima a la regla «el botón no se deshabilita» de `:56-60`, porque aquí lo
que falta no es un dato del formulario sino la propia sesión, y decirlo antes es mejor que dejar que
el servidor lo rechace después.

**Coste.** ~15 líneas en un SFC compartido + `.firma { display:flex; align-items:center;
gap: var(--space-6) }` en su `<style scoped>` — geometría pura, sin color, así que no choca con
`no-duplicate-primitive` ni con la trampa de especificidad. **~1 hora, y las 13 pantallas lo
heredan.**

---

### D-07 · Tres relojes distintos para la misma hora

> **Severidad: menor** · `quoteDateTime.ts:22` · `entitlementText.ts:255` ·
> `subscriptionHistoryText.ts:234`
> **Criterio:** consistencia (Nielsen §4) · deuda declarada por los tres ficheros en sus propios
> comentarios

**Qué está mal hoy.** `src/composables/format.ts` resuelve `dd/mm/aaaa` y **no tiene hora**. Tres
features la necesitaron y cada una escribió la suya:

| Fichero | Salida para el mismo instante |
|---|---|
| `quotes/composables/quoteDateTime.ts:22` | `14/03/2026 **a las** 09:14` |
| `subscriptions-admin/composables/entitlementText.ts:255` | `14/03/2026 **·** 09:14` |
| `subscriptions-admin/composables/subscriptionHistoryText.ts:234` | `14/03/2026 **·** 09:14` |

Dos de tres coinciden. La tercera —la que sella la **prueba de aceptación de una cotización**, que es
el documento que se enseña cuando alguien discute que contrató— dice `a las`.

Los tres ficheros **declaran la deuda ellos mismos**: `quoteDateTime.ts:11-12` («Vive en esta feature
y no en el módulo transversal porque `src/composables/format.ts` es de la tarea W1-A y esta no lo
toca. **Fundirlo allí queda como deuda declarada con issue.**»). O sea: nadie se equivocó, la
ventana de tareas paralelas lo impuso. Ahora esa ventana está cerrada.

**Qué se propone.** Subir **una** implementación a `src/composables/format.ts` y borrar las tres. La
forma ganadora es la de `subscriptionHistoryText.ts:230-235`, por dos motivos técnicos y no de gusto:

1. Recorta `HH:mm` de la cadena ISO con una expresión regular en vez de pasar por `Date`. El backend
   serializa `LocalDateTime` sin zona; reinterpretarlo como instante es el corrimiento de un día que
   `format.ts:41-46` documenta. `entitlementText.ts:242` construye un `Date` con componentes locales
   —correcto, pero es más código para el mismo resultado.
2. Sin hora en la cadena devuelve solo la fecha, **sin inventar `00:00`**. Es R14 aplicado al reloj.

Separador: **`·`**, que es el que ya usan dos de tres y el que el resto del producto usa para
encadenar metadatos.

**Coste.** Una función de 6 líneas en `format.ts`, tres borrados, ~20 importaciones. **~1 hora.**

---

### D-08 · «Reintentar» sobre un 403

> **Severidad: menor** · `useServerPaged.ts:74-83` + `AppTable.vue:71-95`
> **Criterio:** WCAG 2.2 §3.3.1 no aplica; sí NN/g, *Error Message Guidelines* — un mensaje de error
> tiene que ofrecer la salida real, no una que no existe

**Qué está mal hoy.** `useServerPaged` guarda el `detail` del `ProblemDetail`
(`http.client.ts:361-369`) y **descarta el código HTTP**. `AppTable` pinta cualquier error en la
misma rama, con el mismo `ds-banner--error` y el mismo botón **«Reintentar»** (`:77-84`).

Un 403 —«no tienes permiso para ver los pagos»— sale con un botón que promete que volviendo a
intentarlo se arregla. No se arregla nunca. Es el patrón que el encargo describe como *«textos que
prometen algo que la pantalla no hace»*.

Frecuencia hoy: baja, porque hay un solo rol de plataforma. Pero el día que se parta el rol —que es
un pendiente conocido (plano I–P §1.10, D-94)— este defecto se multiplica por 216 operaciones de
golpe, y para entonces será caro.

**Qué se propone.** Dos cambios pequeños y una frase:

1. `useServerPaged` expone `errorStatus: Ref<number | null>` (`e.response?.status`). Ya tiene el
   `AxiosError` en la mano en `:74`.
2. `AppTable` acepta `errorStatus?: number | null` y, cuando es `401`/`403`/`404`, cambia la rama 1:
   tono `ds-banner--warning`, icono `ICONS.LOCK`, **sin** botón «Reintentar», **con** la traza (que
   sigue siendo lo que soporte necesita).
3. Texto exacto para el 403 cuando el backend no manda `detail`:
   > «No tienes permiso para ver esto. No es un fallo de carga: reintentarlo daría el mismo
   > resultado. Si crees que deberías tenerlo, pásale la traza a soporte de plataforma.»

**Coste.** ~15 líneas entre los dos ficheros compartidos; los 37 consumidores no cambian salvo por
pasar un prop más donde ya pasan `:error` y `:trace-id`. **~2 horas.**

---

## 2 · Vale la pena aunque cueste

### D-09 · El nombre de la empresa, resuelto en cliente y cacheado

> **Severidad: grave** · `CompanyRef.vue:16-26` · `CompanyScopeFilter.vue:16-18` ·
> `CompanyScopePicker.vue:29-34`
> **Criterio:** Nielsen §6 *Recognition rather than Recall* · el mayor impuesto diario del bloque

**Qué está mal hoy.** **Todo el bloque del dinero identifica a los clientes por número.** Tres
componentes distintos documentan el mismo hueco del contrato, cada uno con su párrafo:

- `CompanyRef.vue:16-21` — «`BillingDocumentResponse`, `SubscriptionPaymentResponse` y
  `DunningEventResponse` exponen `companyId: integer` y nada más, mientras `QuoteSummaryResponse` sí
  trae `company: CompanySummary {id, name, identifier}`. El contrato es inconsistente consigo mismo y
  **convierte la lista de trabajo del cierre de mes en una columna de números opacos**.»
- `CompanyScopeFilter.vue:16-18` — «Se pide el identificador y no el nombre porque el contrato no
  trae el nombre en ninguno de los dos DTO.»
- `CompanyScopePicker.vue:29-34` — lo mismo para los tres DTO de cupo.

El operador trabaja con `#42`, `#117`, `#3`. En una consola de plataforma con decenas o cientos de
clínicas, eso obliga a memorizar o a abrir una segunda pestaña para cada fila que se quiera entender.
**Es, con diferencia, el mayor coste diario de estas pantallas**, y ninguna otra mejora lo compensa.

**Y la objeción escrita para no resolverlo tiene arreglo.** `CompanyRef.vue:23-25` dice: *«No se
resuelve el nombre con una llamada por fila: 20 peticiones por página es peor que el problema.»*
Cierto **sin caché**. Con caché no:

- El endpoint existe: `GET /companies/{id}` (`companies.api.ts:59`), devolviendo `CompanyResponse`
  con `name` e `identifier` (`companies.types.ts:7-19`).
- Una página son ≤20 filas y **normalmente muchas menos empresas distintas** que filas.
- **Las mismas clínicas se repiten en las diez pantallas del bloque.** Con caché de sesión, la
  segunda pantalla y la página 2 en adelante cuestan **cero peticiones**.

**Qué se propone.** Un store de Pinia —no un `ref()` a nivel de módulo, que está prohibido— y un
único punto de consumo:

```ts
// src/features/companies/stores/company-names.store.ts
export const useCompanyNamesStore = defineStore('companyNames', () => {
  /** id → nombre resuelto. `null` = se intentó y no se pudo (403/404): no se reintenta. */
  const names = ref<Record<number, string | null>>({})
  const inflight = new Set<number>()

  /** Resuelve solo los que faltan. Idempotente y sin ráfagas duplicadas. */
  async function ensure(ids: number[]): Promise<void> { /* … */ }

  return { names, ensure }
})
```

Y **solo `CompanyRef.vue` cambia** por dentro: llama a `ensure([companyId])` en `onMounted` y pinta

- resuelto → `Clínica Norte` con `#42` en `.ds-meta` al lado, y `aria-label="Clínica Norte, empresa 42"`
- **pendiente** → `#42` tal cual, **sin esqueleto y sin salto de maquetación**
- **no resuelto** → `#42` tal cual, con `title` vacío. **R14: hueco honesto, nunca un nombre
  inventado ni un «(desconocida)» que parezca dato.**

**Ese es el detalle que hace la propuesta barata:** los 14 sitios que ya usan `CompanyRef` no se
tocan. Se cambia **un fichero** y mejoran **catorce pantallas**.

Con el store en pie, los dos selectores de alcance (D-12) pueden ofrecer además búsqueda por nombre
usando `GET /companies/search` (`companies.api.ts:51`), que también existe.

**Coste.** Un store (~60 líneas), un cambio en `CompanyRef` (~20), y su spec. **1 jornada.**
Riesgo controlado: si el endpoint falla, la pantalla queda **exactamente como hoy**.

**Advertencia verificada.** No usar `GET /companies` paginado para prellenar la caché: ese listado
tiene el sesgo conocido de no devolver empresas deshabilitadas, y prellenar con él dejaría a las
deshabilitadas como «no resueltas» de forma permanente, indistinguibles de un fallo de red.
`GET /companies/{id}` una a una, cacheado, es la vía segura.

---

### D-10 · La ausencia de filtro y de suma de página no se explica al operador

> **Severidad: menor** · `AwaitingExternalView.vue:43-46` (comentario) · `OverdueDocumentsView.vue`
> · `BillingDocumentsView.vue:130-135` (el único que sí suma)
> **Criterio:** R14 · plano I–P §3.7 · Nielsen §1 *Visibility of System Status*

Dos asimetrías que el código explica al programador y calla al operador.

**a · El filtro por empresa está en cinco colas de nueve, y el motivo es invisible.**

`CompanyScopeFilter` se usa en `CustomerCreditView`, `DunningEventsView`, `PaymentAttemptsView`,
`PaymentRefundsView` y `PaymentsView`. No está en «Esperando factura» ni en «Vencidos», y el motivo
está escrito —muy bien— en un comentario:

```
 *       no ofrece buscador: este endpoint **no admite filtro ni orden** (issue …)
 — features/billing-operations/views/AwaitingExternalView.vue:43
```

El operador que viene de «Pagos», donde sí filtró por empresa, llega a «Vencidos» y **no encuentra el
control**. No hay forma de saber si es un olvido, un permiso o una limitación.

*Arreglo:* una línea de `.ds-meta` bajo la cabecera, con la razón y la salida real:
> «Esta cola no se puede filtrar por empresa: el barrido de plataforma no lo admite. Los vencidos de
> **una** empresa concreta están en el expediente de su contrato, en «Dinero».»

Es la misma frase que `BillingDocumentsView.vue:182-185` ya usa dentro de `ContractGapNotice`, así
que el patrón está escrito y solo hay que copiarlo. **~30 min.**

**b · La suma de la página existe en una cola de diez.**

`BillingDocumentsView.vue:130-135` hace algo excelente:

> «Los 20 de esta página suman **1.240.500,00**. El servidor no devuelve el acumulado de los 317, así
> que esta suma es solo la de lo que se está viendo.»

Ninguna otra cola lo hace: ni `OverdueDocumentsView`, ni `PaymentsView`, ni `PaymentRefundsView`, ni
`CustomerCreditView`, ni `AwaitingExternalView`. **Una presencia irregular es peor que una ausencia
uniforme**: enseña al operador que la cola sin subtotal no tiene nada que sumar.

*Arreglo:* extraer esa frase a un componente `PageAmountNote` en
`features/billing-operations/components/` y ponerlo en las colas cuyo DTO trae un importe por fila.
El cálculo es un `reduce` de una línea (`BillingDocumentsView.vue:81`). **~2 horas** para las cinco.

---

### D-11 · La tarifa aplicada se pinta como identificador crudo

> **Severidad: menor** · `SubscriptionSummaryView.vue:150` · `QuoteTotals.vue:38-42`
> **Criterio:** plano I–P §3.4 — *«número de documento y fecha, nunca el identificador crudo»*

```vue
<!-- SubscriptionSummaryView.vue:149-151 -->
<dt class="ds-label">Tarifa aplicada</dt>
<dd class="valor">#{{ subscription.priceListId }}</dd>
```

```vue
<!-- QuoteTotals.vue:38-42 -->
Importes congelados al {{ formatDate(quote.createdDate) }} con la tarifa #{{ quote.priceListId }}.
```

«Tarifa #7» no responde a la pregunta que se hace al mirar ese campo, que es *«¿por qué este precio y
no el de hoy?»*. La lista de precios tiene `code`, `name`, `validFrom` y `currency`
(`commercial-catalog.types.ts:64, 77`) — todo lo que hace falta.

**En cotizaciones se arregla gratis.** `useQuoteCatalog` **ya carga el catálogo completo de tarifas**
en las pantallas de cotización y ya construye la etiqueta canónica:

```ts
// features/quotes/composables/useQuoteCatalog.ts:43-48
label: `${list.code} · ${list.name} (desde ${formatDate(list.validFrom)})`
```

Basta con resolver `quote.priceListId` contra `priceLists` y pintar `TAR-2026-A · Tarifa estándar
2026`, con enlace a `/catalogo-comercial`. **Y de paso resuelve la divisa real de la cotización, que
es lo que cierra el punto 4 de D-02.** ~1 hora.

**En el expediente del contrato cuesta más:** `SubscriptionSummaryView` no carga el catálogo. Opciones:
(a) `GET /price-lists/{id}` puntual —una petición por expediente, aceptable—; (b) el mismo patrón de
caché de D-09 aplicado a tarifas, que son muchas menos que empresas. Recomiendo (b) si D-09 se hace,
(a) si no. ~3 horas.

---

### D-12 · El alcance por empresa son dos controles con dos verbos

> **Severidad: nota** · `CompanyScopeFilter.vue` (100 líneas) vs `CompanyScopePicker.vue` (102)
> **Criterio:** Nielsen §4 *Consistency and Standards*

Dos componentes con el mismo aspecto —rótulo «Empresa», campo numérico, botón— y todo distinto:

| | `CompanyScopeFilter` (cobranza) | `CompanyScopePicker` (límites) |
|---|---|---|
| Obligatorio | no | sí |
| Verbo del botón | **«Filtrar»** | **«Consultar»** |
| Tono del botón | `ds-btn--ghost` | `ds-btn--primary` |
| Segundo botón | «Quitar el filtro» | — |
| Texto de ayuda | «Deja el campo vacío para ver … de todas.» | «La plataforma no ofrece un listado de todas las empresas a la vez.» |

**La diferencia de fondo es real y está bien razonada** (`CompanyScopePicker.vue:6-9`): en cobranza la
empresa es un filtro opcional; en límites es el alcance obligatorio sin el cual no hay consulta. Eso
justifica el `required` y el segundo botón. **No justifica dos verbos ni dos tonos.**

*Arreglo:* un solo componente en `components/ui/`, con prop `required: boolean`, verbo único
**«Consultar»** (es lo que hace en los dos casos: pedirle al servidor un subconjunto) y tono
`primary` cuando es obligatorio, `ghost` cuando es filtro. La validación pura ya está exportada y
probada en `CompanyScopePicker.vue:11-17`.

**Coste.** ~3 horas incluyendo migrar los siete consumidores. **Bajo valor por sí solo**: hacerlo
solo si se toca D-09, porque entonces el componente unificado gana la búsqueda por nombre y el
ahorro se paga.

---

## 3 · Necesita backend

Ordenado por lo que más devuelve al operador por unidad de trabajo del backend.

**B-1 · El nombre de la empresa en los DTO del dinero.** Es el hueco raíz de D-09 y D-12, y está
documentado en tres sitios del front (`CompanyRef.vue:16-21`, `CompanyScopeFilter.vue:16-18`,
`CompanyScopePicker.vue:29-34`). `QuoteSummaryResponse` **ya** trae
`company: CompanySummary {id, name, identifier}` — o sea, el patrón correcto existe en el contrato y
no se replicó. Pedir: el mismo `CompanySummary` embebido en `BillingDocumentResponse`,
`SubscriptionPaymentResponse`, `DunningEventResponse`, `PaymentAttemptResponse`,
`PaymentRefundResponse`, `PaymentReversalResponse`, `CustomerCreditBalanceResponse`,
`CompanyLimitOverrideResponse`, `CompanyLimitEventResponse`, `EffectiveLimitResponse`,
`ExternalInvoiceReconciliationResponse` y `SubscriptionItemOverlapResponse`.
**D-09 lo mitiga sin backend, pero no lo sustituye**: la caché no puede resolver lo que el operador
quiere buscar *por nombre* en el servidor.

**B-2 · `currency` en los DTO de dinero.** Cierra D-02 de raíz.
`BillingDocumentResponse.currency` es el que `billingFormat.ts:26` señala por su nombre («Cuando el
contrato añada `currency` al documento, esta función se borra»). Añadir también a
`SubscriptionChargeResponse`, `QuoteResponse` y los tres de conciliación
(`reconciliation.types.ts:64, 83, 91`). Con esto, `formatAmount` desaparece y queda una sola
función de dinero en todo el producto.

**B-3 · `issueStatus` como filtro en `GET /system/subscription-billing/documents`.** Ya está pedido
en pantalla, con el texto redactado, por `BillingDocumentsView.vue:173-180` vía `ContractGapNotice`.
Hoy dos de los cuatro estados del circuito **no se pueden listar en absoluto** desde la consola.

**B-4 · Orden por urgencia en los barridos.** Verificado: **ninguna** de las API de dinero envía un
parámetro `sort` (`billing-operations/api`, `billing-documents/api`, `reconciliation/api`,
`trials/api`, `limits/api` — cero apariciones). El plano I–P §3.7 exige *«ordenables por urgencia, y
ordenadas por urgencia por defecto»*, y hoy las nueve colas muestran lo que el servidor devuelva. **No
se puede arreglar en cliente**: ordenar una página de 20 sobre un total de 317 pondría arriba lo más
urgente *de esa página*, que es peor que no ordenar porque parece que sí ordena.

**B-5 · Acumulado del total, no solo de la página.** `BillingDocumentsView.vue:132-134` lo dice con
todas las letras: *«El servidor no devuelve el acumulado de los 317»*. Un campo `totalAmountSum` en
la `PageResponse` de las colas de dinero convertiría D-10-b de un parche honesto en el dato que el
operador de verdad necesita para cerrar el mes.

**B-6 · Fecha de corte del barrido.** El plano I–P §3.7 pide *«17 pruebas vencen en los próximos 7
días · datos a 27/08/2026 09:14»*. Se puede aproximar en cliente con la hora en que resolvió la
petición, pero eso miente en cuanto haya caché o réplica de lectura con retardo. Lo honesto es un
`asOf` en la respuesta. **Prioridad baja**: la aproximación en cliente es aceptable y barata si se
rotula «consultado a las …» y no «datos a las …».

---

## 4 · Lo dejaría como está, y por qué

Esta sección importa tanto como las otras. Lo que sigue **se puede mejorar y no merece tocarse**.

**`formatDocumentAmount` sin símbolo, si B-2 no va a hacerse.** El razonamiento de
`billingFormat.ts:20-26` es correcto: inventar «$» sobre un importe cuya divisa el contrato no
declara es inventar un dato. D-02 **no discute la regla, discute que solo se aplique en un tercio de
las pantallas**. Si B-2 se va a hacer pronto, D-02 se puede hacer a medias (unificar y esperar). Lo
que no vale es dejarlo como está.

**El orden de ramas de `AppTable` (error → esqueleto → vacío → filas).** Es el corazón del bloque y
está bien resuelto y bien documentado (`AppTable.vue:15-24`). El comentario explica por qué invertir
el orden hace que un 500 se disfrace de «no hay registros». **No lo toque nadie salvo para añadir
el `errorStatus` de D-08.**

**La preservación de filas durante el refresco** (`AppTable.vue:125-129`). Es una divergencia
deliberada respecto de `ListBody` del tenant, razonada y correcta. Que los dos fronts difieran aquí
**no es deuda de paridad**: `AppTable` no es gemelo TR-02.

**`SignedActionModal` con nota opcional, contra el plano.** El plano I–P §3.1.2 exige motivo **y**
nota, ambos obligatorios, con mínimo de 15 caracteres. El componente
(`SignedActionModal.vue:83-87, 130-140`) hace la nota obligatoria **solo** para los motivos que no se
explican solos (`noteRequiredReasons`) y no impone mínimo. **Es una mejora sobre el plano, no una
desviación**: obligar a escribir 15 caracteres cuando el motivo de lista cerrada ya dice todo produce
cuatrocientos «ok» y «según lo hablado», que es exactamente el ruido que la lista cerrada existe para
evitar (el propio componente lo argumenta en `:49-54`). *Recomendación: actualizar el plano para que
diga lo que el código hace, no al revés.* Es la única corrección de documentación que pido.

**`ContractGapNotice`.** Es lo mejor de estas pantallas: una operación que no existe se explica en el
sitio donde se buscaría, con la razón y con la alternativa. No tocar. *Lo único que sugiero es
promoverlo de `features/billing-documents/components/` a `components/feedback/`* para que D-10 pueda
usarlo sin importar desde otra feature — mismo criterio con el que `CompanyRef` se mudó a
`components/ui/` (`CompanyRef.vue:7-14`).

**`DeclineKindLegend`.** Las tres familias de rechazo escritas, con el techo de reintentos a la
vista, y el color acompañando al rótulo sin sustituirlo (§1.4.1 respetado y argumentado en su
docblock). Es un ejemplo de cómo debería escribirse cualquier leyenda del producto.

**Los estados vacíos del bloque de cobranza.** «Todo facturado», «Ningún reintento programado en la
ventana… Es un hecho, no un fallo: los rechazos duros no programan reintento nunca», «No queda nada
devengado sin facturar». Están escritos como buenas noticias cuando lo son y como hechos cuando no,
que es lo que pide NN/g. **Cero cambios.**

**El vocabulario devengado / facturado / cobrado.** Barrido completo de las 11 features: la
distinción se mantiene con las mismas palabras en todas partes —bloques rotulados
(`subscriptionMoneyText.ts:63, 69, 74`), tabla por concepto
(`SubscriptionChargesTable`/`DocumentsTable`/`PaymentsTable`, cada una con su docblock), y frases
que la refuerzan donde más se confunde (*«Emitido no es cobrado»*
`SubscriptionDocumentsTable.vue:22`; *«Facturado no es cobrado: el dinero puede seguir sin entrar»*
`subscription-money.types.ts:252`). La distinción entre el documento de cobro interno y la factura
fiscal también está escrita en la cabecera de la pantalla que más se presta al error
(`BillingDocumentsView.vue:100-102`). **Esto está bien y no admite mejora que valga el riesgo.**

**`AppBadge` sin canal no-cromático.** Formalmente el `variant` es solo color, pero **el `label`
siempre lleva el texto** y se pinta dentro, así que §1.4.1 se cumple por construcción. Añadir iconos
por variante sería ruido en tablas densas.

**El tamaño de `.ds-icon-btn` (28×28) y `.ds-btn--sm`.** Cumplen §2.5.8 (24×24). Ver §5 para el único
que no he podido medir.

**La densidad y la jerarquía en general.** El encargo pregunta si hay tablas que deberían ser fichas.
Mi lectura es que **no**: las tablas son listas de trabajo de las que se sacan filas, y las fichas
—`DocumentIdentityCard`, `PaymentRecord`, `TrialWindowCard`, `SettlementAmounts`— ya se usan donde
el objeto es único y se lee entero. La separación está bien hecha y `DocumentSheet`/`DocumentSeal`
(«Documento · solo se agrega») refuerzan que lo que se ve no se edita. No moverlo.

---

## 5 · Lo que NO se ha comprobado

Se dice explícitamente para que nadie lo dé por pasado.

- **Nada se ha ejecutado.** Ni `npm run quality`, ni `css:budget`, ni Stylelint, ni Vitest, ni
  Playwright, ni el servidor de desarrollo. Todos los hallazgos salen de leer el código con
  `fichero:línea`. Las estimaciones de coste no están validadas contra las puertas.
- **Contraste no medido.** No he calculado ningún ratio. La paleta OKLCH lleva luminancia explícita y
  el catálogo de reglas dice que R03/R10/R11 tienen guarda por token, pero **eso vive en el otro
  repo** y aquí no hay nada que lo mida. Sigue sin haber ninguna puerta de accesibilidad en el
  pipeline (`docs/ux/README.md`, punto 3 de su tabla).
- **`.ds-btn--plain` está en el límite de §2.5.8 y no lo he medido.** `padding: 4px 6px` +
  `font-size: 13px` con `line-height: normal` da una altura estimada de **23–25 px CSS**, contra el
  mínimo de 24 de WCAG 2.2 §2.5.8 (AA). Lo usan el botón «Copiar» de la traza (`AppTable.vue:88`) y
  «Quitar el filtro» (`CompanyScopeFilter.vue:61`). **Hay que medirlo en navegador antes de
  decidir**, y si falla el arreglo es de `front-parity` porque `primitives.css` es gemelo byte a
  byte.
- **No he auditado el foco atrapado en `ModalShell`.** El plano I–P §6.1 dice que el chasis **no
  atrapa el foco** y que es un pendiente conocido; lo doy por vigente sin reverificarlo. Afecta a los
  ~25 modales del bloque del dinero y es, en rigor, un incumplimiento de §2.4.3 (A) de mayor
  severidad que varios de los hallazgos de arriba. **No lo cuento como hallazgo nuevo porque ya está
  escrito**, pero conviene no perderlo de vista.
- **`SubscriptionOverlapsPanel` y `EntitlementSnapshotView` no se han visto renderizadas.** Los
  defectos de D-04 son de lectura del código, incluidos los textos que aparecerían en pantalla.
- **No se ha abierto ningún issue de GitHub**, por orden explícita del dueño.

---

## 6 · Orden de ejecución sugerido

Pensado para que dos agentes puedan trabajar en paralelo sin pisarse, porque los árboles son
disjuntos.

**Tanda 1 — primitivas compartidas** (un solo agente; toca `components/ui/` y `composables/`)

1. **D-01** · quitar `!loading` de los 18 `v-if`. *Lo más barato y lo que más devuelve.*
2. **D-03** · `AppTableHeader` + `scope="col"` + `.ds-num`/`.ds-col-actions` en la cabecera.
3. **D-06** · bloque de firma en `SignedActionModal`.
4. **D-08** · `errorStatus` en `useServerPaged` + rama de permiso en `AppTable`.
5. **D-07** · `formatDateTime` único en `composables/format.ts`.

**Tanda 2 — features** (puede ir en paralelo con la 1 salvo por D-02, que espera a D-07)

6. **D-04** · `SubscriptionOverlapsPanel`, los cuatro defectos. *Aislado, media hora.*
7. **D-05** · `SubscriptionRef` / `DocumentRef` y sus cinco aplicaciones.
8. **D-02** · unificación de moneda. *La más ancha; hacerla cuando la 1 esté cerrada.*
9. **D-10** · nota de ausencia de filtro + `PageAmountNote`.
10. **D-11** · tarifa con código y nombre en cotizaciones.

**Tanda 3 — con presupuesto propio**

11. **D-09** · caché de nombres de empresa. *Una jornada, y cambia el día a día más que las diez de
    arriba juntas.*
12. **D-12** · unificación del selector de alcance, **solo si D-09 se hizo**.

**Y una corrección de documentación, no de código:** actualizar el plano I–P §3.1.2 para que
describa lo que `SignedActionModal` hace con la nota (obligatoria por motivo, sin mínimo de 15
caracteres) en vez de lo que se pensó antes de escribirlo. Un plano que contradice al código
construido es una trampa para el siguiente que lo lea.
