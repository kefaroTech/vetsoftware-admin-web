# Pistas del asistente sobre el catálogo — especificación de la consola de plataforma

**Repo:** `VetSoftwareFront` (consola de plataforma, superusuario) · **Tabla:** `catalog_item_ai_hints`
· **Slice del backend:** `com.vetsoftware.app.catalogitemaihint` · **Rol:** `hasRole('SYSTEM')` en los
seis puertos, sin excepción.

**Estado:** especificación para implementar. No hay una sola línea de front hoy: `src/features/` no
tiene carpeta para esta feature y `sidebar-nav.ts` no tiene entrada. El contrato OpenAPI **sí** trae
ya los tres esquemas —`api-contract-sync` los regeneró mientras se redactaba esto—, pero
`api.contract.ts` todavía no los ata: ver §2/B1, que es lo primero que hay que hacer.

**Qué NO decide este documento:** el texto de las pistas. Aquí se decide la pantalla con la que se
escriben.

---

## 0 · Resumen ejecutable

| #   | Decisión                                                                                                                                                                                                                        | Dónde  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| D1  | Dos rutas: **listado** `/asistente/pistas` y **ficha del artículo** `/asistente/pistas/:catalogItemId`.                                                                                                                          | §3     |
| D2  | El listado tiene **dos pestañas**: «Con pista» (servida) y **«Sin pista» (derivada en el front)**. La segunda es el hallazgo de fondo: hoy nada enseña qué artículo a la venta el asistente **no puede proponer**.                | §4     |
| D3  | Escribir se hace en **modal** (`ModalShell`), leer el historial en **ruta propia**. Ni panel lateral ni edición en línea.                                                                                                        | §7     |
| D4  | El compositor son **tres campos** —qué es, señales, cuándo NO aplica— que el front une con línea en blanco, con caída a **un solo campo de texto** cuando la pista guardada no tiene exactamente tres bloques.                    | §8     |
| D5  | **`SignedActionModal` está prohibido aquí.** El `DELETE` no lleva cuerpo: el motivo no viajaría a ningún sitio y sería teatro de auditoría, por el criterio que el propio repo escribió en `ConfirmSuppressionModal.vue:8-17`.    | §9     |
| D6  | **No existe «revertir».** El índice único `(catalog_item_id, hint_hash)` impide republicar un texto idéntico, así que deshacer una retirada es imposible por construcción. En su lugar, cada revisión ofrece **«Usar como base»**. | §10    |
| D7  | «Esto sale a producción al instante» se dice **en el punto de compromiso** (compositor y confirmación de retirada), no en un banner permanente del listado.                                                                      | §6     |
| D8  | Los 409 del servidor se pintan en el **`ErrorSummary` del formulario**, no en un toast. Un aviso flotante que dice «ese texto ya se publicó» mientras el texto ofensor sigue en el `<textarea>` está en el sitio equivocado.      | §11    |
| D9  | 11 ficheros nuevos, ninguno por encima de 300 líneas. El techo de `css:budget` es 500 y **no se toca ningún gemelo TR-02**.                                                                                                      | §13    |

**Bloqueo de secuencia (leer antes de escribir código):** ver §2/B1.

---

## 1 · Para quién es y qué resuelve

El usuario es **una sola persona**: el superusuario de plataforma. No hay roles intermedios —la
consola tiene un solo rol para 216 operaciones, como ya documenta `SignedActionModal.vue`— así que
aquí no hay aprobación de nadie, ni revisión por pares, ni despliegue. **Quien escribe, publica.**

Las cinco tareas reales, en orden de frecuencia esperada:

1. **«El asistente está proponiendo Peluquería a clínicas que solo piden agenda.»** → leer la pista
   vigente de ese artículo, entender qué señal la dispara de más, corregirla.
2. **«Sacamos un módulo nuevo y el asistente nunca lo propone.»** → descubrir que no tiene pista y
   publicarle la primera.
3. **«¿Con qué texto se generó esta cotización de marzo?»** → leer el historial de un artículo.
4. **«Este artículo ya no lo queremos ofrecer por el asistente.»** → retirar su pista.
5. **«¿Quién apagó esto y cuándo?»** → leer la firma de la retirada.

Las tres primeras son de escritura sobre un texto largo. La cuarta es destructiva en efecto y **apaga
comercialmente un artículo** sin borrar nada. La quinta existe porque el changeset 393 añadió
`superseded_by_system_user_id` justo para poder contestarla.

### Las tres propiedades que fijan el diseño

**a) El efecto es comercial, inmediato y de cara a desconocidos.** No hay entorno intermedio ni
bandera de despliegue: el siguiente prospecto que escriba en la landing recibirá una propuesta
calculada con este texto.

**b) El efecto no es observable desde la pantalla.** Nadie puede ver aquí si la recomendación mejoró.
El bucle de realimentación vive en las cotizaciones que se generen después, y es lento. La
consecuencia de diseño es dura: **la pantalla no puede ofrecer confianza que no tiene**. No hay
previsualización, no hay «probar esta pista», no hay métrica. Lo único honesto que puede hacer es
(i) decir claramente que el cambio rige ya, (ii) dejar el texto anterior a la vista mientras se
escribe el nuevo, y (iii) conservar el historial completo y legible.

**c) La tabla es historial, no estado.** Ni el `PUT` ni el `DELETE` hacen lo que su nombre HTTP
sugiere a nivel de fila (`CatalogItemAiHintController.java:54-62`). La interfaz **no puede** usar el
vocabulario de un CRUD:

| Nunca decir             | Decir                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| Editar / Guardar cambios | **Corregir** / **Publicar la revisión**                                   |
| Eliminar / Borrar       | **Retirar**                                                               |
| Versión                 | **Revisión** (la palabra de la columna `hint_revision` y del endpoint)     |
| Historial de cambios    | **Historial de revisiones**                                               |

---

## 2 · Bloqueos y supuestos marcados

### B1 · RESUELTO A MEDIAS DURANTE LA REDACCIÓN · el contrato ya trae los esquemas; las aserciones no

Cuando empecé este documento, `grep "AiHint" src/types/api.generated.d.ts` daba **cero
coincidencias**. Mientras lo escribía, `api-contract-sync` regeneró el contrato. Estado real,
verificado al cerrar:

```
$ git status --porcelain          →  M api/openapi.json   M src/types/api.generated.d.ts
$ grep -c "AiHint" src/types/api.generated.d.ts   →  12
$ grep -c "AiHint" src/types/api.contract.ts      →  0        ← esto sigue pendiente
```

Las tres rutas están: `/catalog-item-ai-hints`, `/catalog-item-ai-hints/{catalogItemId}` y
`/catalog-item-ai-hints/{catalogItemId}/revisions`.

**Lo que queda por hacer, y sigue siendo lo primero:** `api.contract.ts` ata las 90 interfaces
escritas a mano contra `api.generated.d.ts` (TR-01), y su comprobación `UndeclaredFields` **rompe el
build** en cuanto un esquema del contrato no tiene su interfaz declarada aquí. Así que declarar los
tres tipos y sus aserciones no es un remate: es lo que impide que el `quality` se ponga rojo por un
motivo que no parece relacionado con esta pantalla.

**La forma exacta, leída del contrato regenerado** —ya no es un supuesto, es lo que hay en
`api/openapi.json`—. Nótese qué campos van `required` y cuáles no:

```ts
/** GET /catalog-item-ai-hints · GET /{id} · GET /{id}/revisions · POST · PUT */
export interface CatalogItemAiHintResponse {
  id: number
  catalogItemId: number
  /** Nulo si el artículo se retiró del catálogo. NO es `required` en el contrato. */
  catalogItemCode: string | null
  /** Nulo si el artículo se retiró del catálogo. NO es `required` en el contrato. */
  catalogItemName: string | null
  hintRevision: number
  hintText: string
  publishedAt: string
  publishedBySystemUserId: number
  /** Nulo si es la vigente. */
  supersededAt: string | null
  /** Nulo = «no consta», y no es lo mismo que «no se ha retirado». Ver §5.3. */
  supersededBySystemUserId: number | null
  current: boolean
  createdDate: string
}

/** POST /catalog-item-ai-hints */
export interface PublishCatalogItemAiHintRequest {
  catalogItemId: number
  /** `maxLength: 1000` declarado en el contrato. */
  hintText: string
}

/** PUT /catalog-item-ai-hints/{catalogItemId} */
export interface ReviseCatalogItemAiHintRequest {
  /** `maxLength: 1000` declarado en el contrato. */
  hintText: string
}
```

`required` del contrato: `id, catalogItemId, hintRevision, hintText, publishedAt,
publishedBySystemUserId, current, createdDate`. Los cuatro que faltan —`catalogItemCode`,
`catalogItemName`, `supersededAt`, `supersededBySystemUserId`— son **nulables a propósito** y cada
uno de los cuatro tiene una rama de interfaz en esta especificación. Declararlos no nulables aquí
haría que la comprobación `NullableWhereRequired` los dejara pasar y la pantalla se rompería en
runtime con `undefined`.

**Lo que el contrato NO documenta, y por tanto no se puede derivar de él:** los códigos de error. El
`POST` declara solo 201 y el `DELETE` solo 204 — ni un 409 ni un 404. Los cuatro casos de §11 salen
de las excepciones de dominio que leí en el slice, no del OpenAPI. Si el implementador espera
encontrarlos en el contrato, no están.

### B2 · GRAVE · el listado no admite búsqueda ni filtro por servidor

`CatalogItemAiHintController.listCurrent` declara **solo** `page` y `pageSize`
(`CatalogItemAiHintController.java:97-103`). No hay `query`.

Consecuencia: **la v1 sale sin buscador**, y eso es deliberado. Las dos alternativas son peores:

- _Filtrar en el front la página cargada._ Prohibido. `AppListSearch` anuncia el recuento en una
  región viva (`AppListSearch.vue:70-90`); anunciar «3 resultados» cuando se ha filtrado una página
  de veinte de un total de sesenta es mentir en el canal de accesibilidad. Es exactamente lo que
  `docs/ux/patron-de-busqueda-en-listado.md` existe para impedir.
- _Cargar todas las páginas en memoria y filtrar._ Es lo que ya hace
  `useCommercialCatalog.fetchAllCatalogOptions` (`useCommercialCatalog.ts:52-63`) con
  `OPTIONS_PAGE_SIZE = 200`, así que hay precedente. Pero obliga a retirar `AppPagination` y el
  listado deja de escalar en cuanto el catálogo crezca. **No se hace para la lista principal.** Sí,
  acotado, para la pestaña «Sin pista» (§4.4), donde no hay alternativa.

**Petición al backend, redactada y sin abrir** (el dueño prohibió abrir issues en esta sesión):

> **`GET /catalog-item-ai-hints` necesita `query`**
> `listCurrent(page, pageSize)` no acepta término de búsqueda, así que la consola de pistas sale sin
> buscador. El término debería casar contra `catalog_items.code` y `catalog_items.name` —no contra
> `hint_text`, que es texto largo y daría resultados que el operador no puede interpretar en una
> tabla—. Mismo `@RequestParam(required = false) String query` que ya usan otros listados de
> plataforma. Sin esto, `CatalogAiHintsListView` no puede montar `AppListSearch` sin mentir en el
> recuento anunciado (`AppListSearch.vue:70-90`).

### S1 · SUPUESTO · el nombre del firmante no se puede resolver

`CatalogItemAiHintResponse` sirve `publishedBySystemUserId` y `supersededBySystemUserId` como
**identificadores**, y su Javadoc dice que es el criterio de todo el backend: ninguna respuesta
expone el nombre de una cuenta de plataforma. Verificado en el front: **no existe ningún cliente de
un directorio de usuarios de sistema** (`grep -rn "system-users" src/features` → cero).

**Decisión:** se pinta `usuario #{id}`, literal. Hay dos precedentes exactos:
`subscriptionHistoryText.ts:122` («Usuario de plataforma #{id}») y el respaldo de
`SignedActionModal.vue` (`usuario #${signer.id}`). Es R14 —un hueco honesto antes que un dato
inventado—, y fabricar un nombre en la constancia de quién apagó comercialmente un artículo sería
justo lo contrario.

**Una sola mejora permitida:** cuando el id coincide con `useAuthStore().me?.id`, se escribe
`tú (usuario #{id})`. Es cierto, es barato y ayuda en el caso más frecuente.

### S2 · SUPUESTO A VERIFICAR CON EL AGENTE DEL BACKEND · qué código HTTP devuelve la regla de los tres bloques

`CatalogItemAiHint.exigirLasTresPartes` lanza `IllegalArgumentException`
(`CatalogItemAiHint.java:166-177`), no una excepción de dominio con manejador propio como sus cuatro
hermanas. **Si el manejador global no la mapea a 400, el operador recibe un 500 por un texto que
acaba de escribir.** No he leído el `@RestControllerAdvice`, así que queda marcado.

Impacto en el diseño, que **no cambia sea cual sea la respuesta**: la regla de los tres bloques se
valida en el cliente **antes** de enviar (§8.4). No es cinturón y tirantes: es lo único que separa al
usuario de un 500 con su texto perdido.

### S3 · SUPUESTO · `GET /{catalogItemId}/revisions` responde 200 con página vacía, no 404

`ListCatalogItemAiHintRevisionsService.listByCatalogItemId` resuelve el artículo con `.orElse(null)`
y devuelve `repository.findAllByCatalogItemId(...)` sin ninguna rama de excepción
(`ListCatalogItemAiHintRevisionsService.java:34-41`). De ahí se deduce 200 + página vacía. **La ficha
del artículo depende de esto** (§5.1): si en realidad devuelve 404, la pantalla de un artículo sin
pista se rompe. Verificar.

### S4 · SUPUESTO POR JAVADOC, NO POR CÓDIGO LEÍDO · la numeración de revisiones es contigua

`RetireCatalogItemAiHintUseCase` dice «Volver a publicar despues continua la numeracion —revision 3
tras retirar la 2—, no la reinicia». No he leído `PublishCatalogItemAiHintService`. **El diseño no
depende de este supuesto**: la etiqueta «Reemplazada / Retirada» se resuelve por posición en el
historial y no por aritmética de números (§5.3). Queda anotado por si alguien intenta «optimizarlo».

### S5 · SUPUESTO EDITORIAL, marcado en el propio marcado · qué significa cada bloque

El dominio exige **estructura, no vocabulario**: al menos tres bloques separados por línea en blanco,
y su Javadoc explica por qué no exige literales (`CatalogItemAiHint.java:150-158`). Que el **primer**
bloque sea la definición, el segundo las señales y el tercero el contraejemplo es la convención de
las catorce pistas del changeset 382, **no una invariante**.

Consecuencia: el encabezado de la columna del listado dice **«Primer bloque»** (estructural,
verdadero) y no «Definición» (semántico, supuesto). Y el compositor de tres campos tiene caída a
texto libre precisamente porque la convención puede no cumplirse (§8.3).

---

## 3 · Rutas y sitio en la navegación

### 3.1 · Rutas

| Nombre                    | Ruta                                | Vista                          |
| ------------------------- | ----------------------------------- | ------------------------------ |
| `CATALOG_AI_HINTS_LIST`   | `/asistente/pistas`                 | `CatalogAiHintsListView.vue`   |
| `CATALOG_AI_HINT_DETAIL`  | `/asistente/pistas/:catalogItemId`  | `CatalogAiHintDetailView.vue`  |

**Por qué bajo `/asistente/` y no bajo `/catalogo-comercial/`.** El prefijo `/asistente/` ya existe
(`/asistente/supresion-datos`) y agrupa el eslabón que `sidebar-nav.ts:78-95` documenta como «el
asistente», entre el catálogo y la oferta. La pista describe un artículo del catálogo, pero **lo que
gobierna es el comportamiento del asistente**: quien viene a esta pantalla viene porque el asistente
propone mal, no porque el artículo esté mal definido. Colgarla del catálogo comercial además
empujaría hacia meterla como tercera pestaña de `CommercialCatalogView.vue`, que ya se partió una vez
por rebasar el techo de 500 líneas (su propio Javadoc, `CommercialCatalogView.vue:25-34`).

`:catalogItemId` y no `:id`: **el recurso es «la pista vigente de un artículo» y su identidad es el
`catalogItemId`, no el `id` de la fila** (`CatalogItemAiHintController.java:36-38`). Un parámetro
llamado `:id` invitaría a pasarle el `id` de la revisión y a que la ficha cargara otra cosa.

`ROUTE_NAMES` (`src/constants/routes.ts`) gana dos entradas. Es un fichero de la consola, no gemelo
TR-02.

### 3.2 · Entrada del menú

En el grupo **Suscripciones**, **inmediatamente antes de «Supresión de datos»**:

```ts
{ label: 'Pistas del asistente', path: '/asistente/pistas', icon: ICONS.AI_HINT },
```

Las dos entradas son del mismo eslabón; las pistas van primero porque gobiernan lo que el asistente
hace todos los días y la supresión es un deber legal que se ejerce a petición. El orden de este grupo
está sujeto por `tests/unit/sidebar-sin-cifras-inventadas.spec.ts`, así que **esa prueba se actualiza
en el mismo PR** o el `quality` sale rojo por un motivo que no parece relacionado.

`ICONS` no tiene ningún icono de asistente ni de IA (inventario verificado: de `DASHBOARD` a
`UNCHECKED`, sin `SPARKLES`, `BOT` ni `WAND`). **Se añade una clave nueva:** `AI_HINT: Sparkles` de
`lucide-vue-next`. `src/constants/icons.ts` es de la consola, no gemelo TR-02.

**Sin rótulo «Nuevo» ni contador.** `AppSegmentedTabs.vue:49-54` ya dejó escrito por qué no hay
contadores por opción, y el mismo argumento vale para el menú: un «Sin pista (3)» exige una petición
extra en cada navegación o enseña un número viejo.

---

## 4 · El listado — `CatalogAiHintsListView.vue`

### 4.1 · Encabezado

Herencia literal de `CommercialCatalogView.vue:130-137`: `.ds-head` con `.eyebrow.ds-meta`,
`<h1 class="ds-title">` y el botón primario a la derecha.

```
Suscripciones · El asistente                       ← eyebrow
Pistas del asistente                               ← h1
Lo que se escriba aquí rige desde la siguiente     ← subtítulo, .ds-meta
propuesta del asistente. No hay despliegue.
```

**El subtítulo es texto plano, no un `ds-banner`.** Un banner permanente en la cabecera de la
pantalla que más se visita se vuelve invisible a la tercera visita; el aviso con peso va donde se
compromete la acción (§6). Esta línea solo instala el marco una vez.

El botón primario **no es «Nueva pista»**: es **«Ver artículos sin pista»**, y cambia a esa pestaña.
No se puede publicar una pista sin elegir antes un artículo, y el sitio donde se elige es esa
pestaña. Un «Nueva pista» que abre un modal con un desplegable de cuarenta artículos es la misma
información con un paso más y sin el contexto que importa —cuáles llevan sin pista—.

### 4.2 · Pestañas

`AppSegmentedTabs` con el patrón APG **Tabs** completo (activación automática, un solo tab en el
orden de tabulación, flechas dentro del grupo). El `role="tabpanel"` **lo pinta la vista**, no el
componente, y el contrato de identificadores es el de `segmented-tabs.ts`:

```ts
const panelId = useId()
// <AppSegmentedTabs v-model="tab" :options="TABS" label="Estado de la pista" :panel-id="panelId" />
// <section :id="panelId" role="tabpanel" :aria-labelledby="segmentedTabId(panelId, tab)">
```

`TABS = [{ value: 'con', label: 'Con pista' }, { value: 'sin', label: 'Sin pista' }]`.

La pestaña activa se sincroniza con la URL con `useQuerySync({ tab: 'con' })` —gemelo TR-02, se
consume, no se toca— para que la pantalla sobreviva a un F5 y al botón «atrás».

**Nada de contadores en los rótulos.** El recuento vive donde es exacto: el pie del paginador.

### 4.3 · Pestaña «Con pista» — servida

`GET /catalog-item-ai-hints?page&pageSize` vía `useServerPaged` + `AppTable` + `AppPagination`,
exactamente el montaje de `CommercialCatalogView.vue:148-215`.

| Columna       | Contenido                                             | Notas                                                                                          |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Código        | `catalogItemCode`                                     | `.ds-text-strong`. **Nulable**: si es `null`, `—` y la marca de abajo.                          |
| Artículo      | `catalogItemName`                                     | Segunda línea `.ds-meta` con `Artículo #{catalogItemId}` cuando el nombre es `null`.            |
| Primer bloque | `hintFirstBlock(hintText)`, recortado a 2 líneas      | Encabezado literal «Primer bloque» — ver S5.                                                    |
| Rev.          | `hintRevision`                                        | Numérico, alineado a la derecha, `.ds-num`.                                                     |
| Publicada     | fecha de `publishedAt` + `usuario #{id}` en `.ds-meta` | Formato de la casa.                                                                             |
| Acciones      | tres botones de icono                                 | Abajo.                                                                                          |

**El artículo retirado del catálogo.** `catalogItemCode` y `catalogItemName` vienen `null` cuando el
artículo dejó de estar habilitado (`CatalogItemAiHintDto`, Javadoc). Esa fila es la más interesante
del listado —una pista viva sobre un artículo que ya no se vende— y **no se puede esconder ni pintar
con guiones y ya**. Lleva un `AppBadge` de variante `warning` con el rótulo **«Artículo no
disponible»** y su fila enlaza igual a la ficha. Es candidata a retirar la pista.

**Acciones de fila** (`.ds-actions.ds-actions--start`, `.ds-icon-btn`, 24×24 CSS mínimo — WCAG 2.2
§2.5.8):

| Icono                              | Acción                              | `aria-label` (R04: lleva el sujeto)              |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `ICONS.HISTORY`                    | ir a la ficha (`RouterLink`)        | `Historial de la pista de ${sujeto(row)}`         |
| `ICONS.EDIT`                       | abrir el compositor en modo corregir | `Corregir la pista de ${sujeto(row)}`             |
| `ICONS.DELETE` + `.ds-icon-btn--danger` | abrir la confirmación de retirada | `Retirar la pista de ${sujeto(row)}`              |

`sujeto(row)` es una función pura del módulo de la feature, **no una interpolación en la plantilla**:

```ts
export function sujeto(h: CatalogItemAiHintResponse): string {
  return h.catalogItemName ?? h.catalogItemCode ?? `el artículo #${h.catalogItemId}`
}
```

Sin ella, el `aria-label` de una fila con nombre nulo dice «Corregir la pista de null», que es peor
que no tener etiqueta.

### 4.4 · Pestaña «Sin pista» — derivada en el front, y por qué existe

**Este es el hallazgo de fondo de la especificación.** El backend solo sabe listar las pistas
vigentes. Nada, en ningún lado, contesta la pregunta que más dinero mueve: **¿qué artículo está a la
venta y el asistente no puede proponer?** Un módulo nuevo sin pista es invisible para el prospecto y
nadie se entera hasta que alguien pregunta por qué nunca sale en las cotizaciones.

Se calcula en el front, con dos colecciones que ya existen:

```
sinPista = { i ∈ GET /catalog-items : i.enabled && i.status === 'ACTIVE' }
         \ { h.catalogItemId : h ∈ GET /catalog-item-ai-hints }
```

Se filtra por `enabled && status === 'ACTIVE'` porque **ese es exactamente el criterio de la guarda
de publicación** del backend (`CatalogItemQueryPort.findById`, Javadoc: «solo si existe, esta a la
venta (`status = 'ACTIVE'`) y habilitado»). Listar aquí un artículo en borrador ofrecería un botón
que el servidor rechazará con un 404.

**Coste, dicho sin adornos.** Exige cargar **todas** las páginas de las dos colecciones. Se hace con
el bucle que el repo ya tiene (`useCommercialCatalog.fetchAllCatalogOptions`, `OPTIONS_PAGE_SIZE =
200`), y **solo al activar la pestaña por primera vez** (perezoso), no al montar la vista: el camino
por defecto sigue siendo una petición. El resultado se cachea en el store de la feature con la misma
forma que `catalogOptions` en `commercial-catalog.store.ts`, y se invalida tras publicar o retirar.

Esto es aceptable **hoy** —`catalog_items` es catálogo global de plataforma, del orden de decenas de
filas— y **deja de serlo** si crece a centenares. Va escrito en el Javadoc del composable con el
número que lo desmiente: si el `total` de `/catalog-items` pasa de 200, hay que pedir el endpoint.

Columnas: Código · Artículo · Tipo · **acción única**: botón `ds-btn ds-btn--sm ds-btn--primary`
**«Escribir la pista»**, que abre el compositor en modo publicar con el artículo ya fijado.

**Lo que esta pestaña no puede distinguir:** «nunca tuvo pista» de «se la retiraron». Para eso haría
falta una llamada a `/revisions` por fila (N+1). No se hace. La fila enlaza a la ficha del artículo,
donde el historial contesta con exactitud (§5.2). Es un clic de más para una pregunta poco frecuente,
y es la decisión correcta.

### 4.5 · Estados vacíos

| Situación                     | Qué se pinta                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/catalog-items` vacío        | `PlatformSetupChecklist` — la plataforma no está sembrada, igual que `CommercialCatalogView.vue:157-161`. No es «sin resultados».                                     |
| Hay artículos, ninguno con pista | `AppEmptyState`, título **«Ningún artículo tiene pista»**, descripción **«El asistente todavía no puede proponer nada.»**, y en el `slot` el botón «Ver artículos sin pista». |
| «Sin pista» vacía             | `AppEmptyState`, título **«Todos los artículos a la venta tienen pista.»**, sin acción. Es un buen estado y se dice como tal.                                          |
| Error de red                  | Lo pinta `AppTable` con `:error` y `:trace-id` de `useServerPaged`, **antes** que el vacío (R05). No se toca.                                                        |

### 4.6 · Carga

`PawLoader` y solo `PawLoader`, por la vía que ya existe: `AppTable :loading`. Prohibido cualquier
spinner de Lucide o rotación CSS suelta (R06).

---

## 5 · La ficha del artículo — `CatalogAiHintDetailView.vue`

### 5.1 · Qué pide, y por qué una sola llamada

**Solo `GET /catalog-item-ai-hints/{catalogItemId}/revisions`.** La pista vigente es la revisión de
arriba cuando su `current === true`; no hace falta el `GET /{catalogItemId}` aparte.

Esto no es una micro-optimización: `GET /{catalogItemId}` **responde 404 cuando el artículo no tiene
pista vigente** (Javadoc del controller: «404 si no tiene»), y ese 404 es el estado normal de todo
artículo de la pestaña «Sin pista». Una ficha que llama a ese endpoint y enruta su 404 al banner de
error se rompe precisamente para los artículos que más necesitan la pantalla. Con `/revisions` no
existe esa rama.

**Cuando el historial viene vacío** no hay de dónde sacar el código ni el nombre del artículo (los
sirve `CatalogItemAiHintDto`, y sin filas no hay DTO). Se cae a `catalogItemsApi.findById(id)`, que
ya existe en `commercial-catalog.api.ts:39-42`. Es una llamada de respaldo, no del camino feliz.

### 5.2 · Encabezado y estado del artículo

```
← Pistas del asistente                        ← miga de pan, RouterLink a /asistente/pistas
GROOMING · Peluquería y estética              ← h1
```

Bajo el `h1`, **una sola frase que dice el estado**, derivada de la revisión de arriba:

| Revisión de arriba | Estado             | Frase                                                                                                 |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `current === true` | Con pista vigente  | «El asistente propone este artículo con la revisión {N}, publicada el {fecha}.»                        |
| `current === false` | Retirada          | «Este artículo **no se propone**. Su última pista se retiró el {fecha}.» + `AppBadge` `warning` «Sin pista» |
| historial vacío    | Nunca tuvo pista   | «Este artículo nunca ha tenido pista, así que el asistente no lo propone.»                             |

Las tres frases dicen la consecuencia comercial, no el estado de la fila. «Superseded» y «vigente»
son vocabulario de la tabla; «el asistente no lo propone» es lo que el operador vino a saber.

Acciones de la cabecera, según el estado: **«Corregir la pista»** (primario) + **«Retirar»**
(`ds-btn--danger`) si hay vigente; **«Escribir la pista»** (primario) si no la hay.

### 5.3 · El historial — `HintRevisionList.vue`

Lista vertical, **de la más nueva a la más vieja** (es el orden que ya sirve el endpoint). **No es una
tabla**: cada elemento contiene hasta 1000 caracteres en varios párrafos, y una celda con eso dentro
rompe el modelo de tabla de datos y el `AppTable` de la casa.

Cada revisión es un `.ds-card .ds-card--tight` con cuatro partes.

**1. Cabecera**

```
Revisión 3   [Vigente]                        ← AppBadge variant="success", solo si current
Revisión 2   Reemplazada
Revisión 1   Reemplazada
```

**Reemplazada vs. Retirada — la regla, que es por posición y no por aritmética.** La API **no
distingue** los dos casos: en ambos `supersededAt` está puesto. Se resuelve así, y solo así:

- la revisión **de arriba del todo** con `current === false` → **«Retirada»** (nadie la sucedió: si la
  hubieran sucedido habría una más nueva encima);
- cualquier otra con `current === false` → **«Reemplazada»**.

Se decide por posición y **no** calculando `N+1`, para no depender de que la numeración sea contigua
(S4). Y la revisión de arriba del todo está siempre en la primera página del historial, porque el
orden es descendente: la regla funciona aunque el historial esté paginado.

**2. El texto**, completo, con los saltos de línea en blanco preservados:

```css
.texto {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
```

Dos declaraciones de geometría en `scoped`, sin color ni tipografía (regla de especificidad de
`AGENTS.md:103-122`). **Nunca `v-html`**: es texto de entrada de un formulario y el asistente lo
consume como texto plano (guía de seguridad de Vue).

Ningún recorte, ningún «ver más». La revisión reemplazada existe **para poder leerla entera** meses
después; plegarla es esconder la única evidencia de con qué texto se generó una propuesta pasada.

**3. El pie de procedencia.** Aquí está el error de implementación más probable de toda la pantalla.
La tabla de verdad, completa:

| `supersededAt` | `supersededBySystemUserId` | Texto exacto                                                                                                                                          |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `null`         | `null`                     | `Publicada el {publishedAt} por usuario #{pub}. Vigente.`                                                                                              |
| fecha          | id                         | `Publicada el {publishedAt} por usuario #{pub} · retirada el {supersededAt} por usuario #{sup}.`                                                       |
| fecha          | **`null`**                 | `Publicada el {publishedAt} por usuario #{pub} · retirada el {supersededAt}. **No consta quién**: la firma de retirada no existía cuando ocurrió.`     |
| `null`         | id                         | **imposible** (`chk_catalog_item_ai_hints_superseded_by`). Si llega: `Dato incoherente: figura firmante de retirada sin fecha.` y no se inventa nada.  |

El tercer caso **no es un dato que falte, es información**: significa «no consta», y el Javadoc del
DTO insiste en que la pantalla tiene que poder distinguirlo de «la retiró fulano». Pintar
`usuario #null`, o esconder la línea, o —peor— caer al `publishedBySystemUserId` porque «es el que
hay», convierte una laguna conocida en un dato falso. Es R14 al pie de la letra.

**4. La acción por revisión: «Usar como base».** Ver §10.2.

Paginación del historial: `AppPagination` con `pageSize` 20, solo si `total > pageSize`. Un artículo
con tres revisiones no enseña paginador.

---

## 6 · Cómo se comunica que el cambio sale a producción al instante

Es la petición explícita del dueño y merece sección propia porque **es fácil hacerlo mal en las dos
direcciones**: un banner permanente que nadie lee, o nada en absoluto.

**El aviso va en el punto de compromiso, y en ningún otro sitio.** NN/g, _Confirmation Dialog_
(18-02-2018, revisado 07-08-2026): el diálogo tiene que ser específico sobre lo que va a pasar, con
los detalles identificativos del sujeto, y el rótulo del botón tiene que resumir el resultado. Un
aviso genérico en otra parte de la pantalla no cumple ninguna de las tres cosas.

Tres sitios, tres textos, todos literales:

**a) Listado, bajo el `h1`** — instalar el marco una vez, sin peso visual:

> Lo que se escriba aquí rige desde la siguiente propuesta del asistente. No hay despliegue.

**b) Compositor, `ds-banner ds-banner--warning` sobre los botones** — el punto de compromiso de la
escritura:

> Al publicar, el asistente empieza a usar este texto en la siguiente propuesta que genere. No hay
> despliegue y no lo revisa nadie más.

y justo debajo, en `.ds-meta`, la parte incómoda y honesta:

> Esta pantalla no puede decirte si la recomendación mejora: el efecto se ve en las cotizaciones que
> el asistente genere después.

**c) Confirmación de retirada** — §9.2.

**Lo que NO se hace:** un modal de «¿seguro?» adicional al publicar una corrección. NN/g avisa de que
confirmar acciones rutinarias hace que la gente ignore los avisos, y corregir una pista es la tarea
número uno de esta pantalla. La escritura ya tiene su fricción propia: un formulario largo con un
botón que nombra la acción. **Solo la retirada lleva confirmación**, porque solo ella apaga
comercialmente un artículo.

---

## 7 · Dónde se edita: modal, panel lateral o pantalla propia

El dueño pidió justificarlo con evidencia y no con gusto. La evidencia es desigual y lo digo campo
por campo.

### 7.1 · Edición en línea — descartada, con motivo de dominio

El campo son hasta **1000 caracteres en tres o más párrafos** (`MAX_HINT_TEXT = 1000`). No cabe en
una celda, y meter un formulario con su resumen de errores dentro de un `<td>` de una tabla de datos
rompe la semántica de la tabla.

Hay un motivo mejor que el espacio: **la edición en línea comunica «pequeño, barato, reversible»**, y
esto es lo contrario de las tres cosas. Es un argumento de correspondencia entre el peso del afordance
y el peso de la consecuencia, que es lo que NN/g pide en _Confirmation Dialog_. Evidencia: media.
Coherencia con el repo: total (ninguna de las 30 pantallas de catálogo edita en línea).

### 7.2 · Panel lateral (drawer) — descartado, y la evidencia externa es floja

Busqué evidencia de que un panel lateral sea mejor que un modal para editar un elemento de una lista
larga. **No la hay con calidad citable.** Lo que existe son artículos de Medium
([Modal vs Drawer](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da),
[When, Where, and How to Use Modals](https://bootcamp.uxdesign.cc/when-where-and-how-to-use-modals-in-ux-design-7f69841de9e5))
y documentación de proveedores. NN/g no tiene ningún artículo que zanje la comparación; lo más cercano
es _Modes in User Interfaces_ (https://www.nngroup.com/articles/modes/), que argumenta contra los
modos en general, no a favor del drawer.

**Esto lo decido por coherencia con el repo, y la evidencia externa no lo contradice ni lo sostiene.**
El motivo decisivo es local y es duro: la consola **no tiene primitiva de panel lateral**. Construir
una significa una segunda capa flotante con su propia gestión de foco, junto a la que ya existe. Y la
que ya existe es `ModalShell` —**gemelo TR-02**— con `useModalFocus` (trampa y devolución de foco,
A11Y-08), `useModalHistory` (que «atrás» cierre la capa, EST-09) y `useModalLayer` (pila, para que
Escape lo atienda solo la capa de arriba). Duplicar las cuatro piezas de accesibilidad que el repo ya
tiene verificadas, apoyándose en artículos de Medium, sería un mal negocio.

**Si algún día se construye un drawer, no es tarea de esta pantalla**: es una primitiva, y una
primitiva que probablemente deba ser gemela.

### 7.3 · Modal para escribir — elegido

`ModalShell` cumple el patrón APG **Dialog (Modal)** verificado hoy
(https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): Tab y Shift+Tab que dan la vuelta dentro del
diálogo, Escape que lo cierra, foco inicial dentro, y foco de vuelta al disparador salvo que ya no
exista. Además trae lo que este formulario en concreto necesita: `confirmCloseWhen`, que intercepta X
/ Escape / backdrop y confirma antes de tirar lo escrito.

Con un texto de 1000 caracteres a medio redactar, **eso no es un adorno: es la prioridad número uno de
esta app —que no se pierda trabajo—**. Es obligatorio (§8.6).

### 7.4 · Pantalla propia para leer el historial — elegida

Argumento con evidencia real: NN/g, _Modes in User Interfaces_ — un modo tiene coste, y leer el
historial no es un modo, es una tarea de lectura a la que se vuelve, que se enlaza en un correo («mira
la revisión 2 de GROOMING») y que se consulta **mientras** se mira otra cosa. Un modal no se puede
enlazar, no se puede dejar abierto y encadena mal: abrir el compositor desde dentro del historial
serían modales anidados, que `ModalShell` soporta con `elevated` pero que el repo trata como
excepción y no como patrón.

Y hay precedente exacto en la casa: el detalle por artículo del catálogo comercial se resolvió con
**ruta propia** (`/catalogo-comercial/articulos/:id`) y no con modal
(`CommercialCatalogView.vue:36-42`).

### 7.5 · Se puede corregir desde el listado, pero nunca a ciegas

La corrección es la tarea más frecuente; obligar a pasar por la ficha añade fricción diaria. Se abre
el compositor desde la fila. **Con una condición innegociable:** en modo corregir, el compositor
**muestra el texto vigente** encima de los campos, en un bloque de solo lectura (§8.5). Reescribir una
pista sin ver la que hay es la manera de repetir el error que se venía a arreglar.

---

## 8 · El compositor — `HintComposerModal.vue` + `HintTextFields.vue`

### 8.1 · Contenedor

`ModalShell` con `compact`, `width: 720`, `accent: 'amatista'`, `role: 'dialog'` (no `alertdialog`: es
un formulario, no una alerta).

| Modo                | Título                             |
| ------------------- | ---------------------------------- |
| Publicar la primera | `Escribir la pista de {CÓDIGO}`    |
| Corregir            | `Corregir la pista de {CÓDIGO}`    |

### 8.2 · Los tres campos

El texto se compone de **tres `AppTextarea`** que el front une con `\n\n`:

| Campo | Etiqueta                     | `hint`                                                                                                         | `rows` |
| ----- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 1     | **Qué es este artículo**     | «En palabras del negocio, como lo diría un cliente. No copies la descripción comercial.»                         | 3      |
| 2     | **Qué señales lo activan**   | «Las palabras literales que un prospecto escribiría y que deben hacer que el asistente lo proponga.»             | 4      |
| 3     | **Cuándo NO aplica**         | «El contraejemplo. Es el bloque que más trabaja: sin él, el modelo propone de más.»                              | 3      |

Los tres son `required`. El texto de los `hint` sale del Javadoc del dominio
(`CatalogItemAiHint.java:48-53` y `PublishCatalogItemAiHintRequest`), no de mi cosecha.

**Por qué tres campos y no un `<textarea>` grande.** Tres razones, en orden de peso:

1. **Convierte una invariante del servidor en una imposibilidad de la interfaz.** La regla de los tres
   bloques deja de ser algo que el usuario descubre por un error y pasa a ser la forma del formulario.
2. **Cada bloque gana su propia etiqueta, su propia ayuda y su propio error**, asociados al control
   (WCAG 2.2 §3.3.2 y §3.3.1). Un solo campo solo puede tener un mensaje para tres problemas
   distintos.
3. **Enseña la convención.** Hoy vive en el Javadoc de una clase Java que el operador no leerá nunca.

### 8.3 · La caída a texto libre — obligatoria, no opcional

Al abrir en modo corregir se parte el texto guardado con la **misma expresión que el servidor**:

```ts
const BLOQUE = /\r?\n\s*\r?\n/ // espejo de "\\R\\s*\\R" en Java
export function splitBlocks(t: string): string[] {
  return t
    .split(BLOQUE)
    .map((b) => b.trim())
    .filter((b) => b !== '')
}
```

- **exactamente 3 bloques** → los tres campos, uno por bloque;
- **cualquier otra cosa (2, 4, 7…)** → **modo texto**: un solo `AppTextarea` con `rows: 12` y el texto
  íntegro, más un `ds-banner ds-banner--info`:

  > Esta pista no tiene tres bloques exactos, así que se edita como texto. Sepáralos con una línea en
  > blanco: al menos tres.

Y un conmutador manual en las dos direcciones, `ds-btn ds-btn--plain`: **«Editar como texto»** /
**«Editar por bloques»** (este último deshabilitado, con el motivo escrito, cuando el texto no tiene
tres bloques exactos).

**Nunca se descarta un bloque en silencio.** Un texto de cinco bloques exprimido en tres campos
perdería dos, y perdería texto que se le está diciendo al modelo. Es el fallo que hace que esta caída
sea obligatoria y no una comodidad.

### 8.4 · Validación

Un módulo puro, `composables/hintText.ts`, **sin nada de Vue**, único sitio donde vive la regla:

```ts
export const HINT_MAX_LENGTH = 1000 // CatalogItemAiHint.MAX_HINT_TEXT
export const HINT_MIN_BLOCKS = 3 // CatalogItemAiHint.PARTES_DE_LA_PISTA
export function joinBlocks(b: string[]): string // b.map(trim).join('\n\n')
export function validateHintText(text: string): string // '' = válido
```

Reglas y **texto exacto** de cada error:

| Regla                          | Mensaje                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| vacío                          | `Escribe la pista: sin texto el asistente no puede proponer este artículo.`                                                              |
| bloque 1/2/3 vacío (modo bloques) | `Falta {el qué es · las señales · el contraejemplo}. Los tres bloques son obligatorios.`                                                |
| < 3 bloques (modo texto)       | `La pista necesita al menos tres bloques separados por una línea en blanco: qué es, qué señales lo activan y cuándo NO aplica.`          |
| > 1000 caracteres              | `La pista no puede pasar de 1000 caracteres. Ahora tiene {n}: sobran {n-1000}.`                                                          |

**La longitud se mide sobre el texto UNIDO**, incluidos los dos `\n\n` separadores, porque es lo que
mide `@Size(max = 1000)` en el servidor. Medirla campo a campo daría un formulario que valida en verde
y el servidor rechaza.

**No se pone `maxlength` en los `AppTextarea`.** Con tres campos no hay un tope por campo que sea
correcto, y un `maxlength` que corta a mitad de palabra al pegar es peor que un error explícito. En su
lugar, un contador bajo el último campo:

```
842 / 1000 caracteres            → .ds-meta
Sobran 42 caracteres.            → .ds-hint en tono de error cuando n > 1000
```

**El contador NO es una región viva.** Un `aria-live` que recita un número en cada pulsación es ruido
del que la gente se defiende apagando el lector. La restricción se comunica por el camino normal:
mensaje de error asociado al control (§3.3.1). Es la misma lógica con la que `AppListSearch` retrasa
su anuncio de recuento.

**Cuándo se valida.** Error en un campo **al salir de él** (`@blur` → mapa `touched`), y **todos a la
vez al confirmar**, moviendo el foco al `ErrorSummary`. Nunca mientras se teclea.

> **Discrepancia declarada.** GOV.UK, _Validation_
> (https://design-system.service.gov.uk/patterns/validation/) dice literalmente que **no** se valide al
> salir de un campo, sino solo al enviar. **Aquí gana la coherencia con el repo**: `SignedActionModal` y
> todos los formularios del tenant usan `touched` + `@blur`, y una pantalla nueva con otra regla
> confundiría más de lo que aporta. Lo que sí se toma de GOV.UK, entero, es lo que el repo ya
> implementa en `ErrorSummary.vue`: resumen arriba, **el foco se mueve al resumen**, el texto del
> resumen es **literalmente el mismo** que el del error en línea (por eso `toSummaryItems` recibe el
> mapa de errores y no reformula), los enlaces del resumen mueven **el foco** al control, y el orden
> del resumen es el orden del DOM (§2.4.3).

### 8.5 · El texto vigente, a la vista mientras se corrige

En modo corregir, **encima** de los campos, un bloque de solo lectura:

```
Texto vigente · revisión 3                    ← .ds-kicker
{hintText completo, white-space: pre-wrap}    ← .ds-card--flat, sin controles
```

Es el sustituto honesto de un diff. **Un diff palabra a palabra queda fuera de alcance**, y el motivo
es concreto y no «no hace falta»: exige una dependencia nueva de comparación de texto y bastante
marcado, en una pantalla que ya reparte 11 ficheros. Langfuse sí tiene vista de diff entre versiones
(https://langfuse.com/docs/prompt-management/features/prompt-version-control, consultado 2026-08-31),
así que es una mejora legítima para más adelante — pero el antes/después importa **en el momento de
escribir**, y eso lo resuelve tener el texto anterior delante.

### 8.6 · Pérdida de trabajo — la parte que no se puede escatimar

Tres defensas, las tres obligatorias:

1. `:confirm-close-when="() => isDirty()"` en `ModalShell`. Escape, la X y el clic fuera pasan por la
   confirmación «Se perderán los datos escritos», que el propio `ModalShell` ya trae.
2. `useUnsavedChangesGuard(() => composerOpen && composerRef?.isDirty())` en la vista, para la
   navegación de ruta. Es lo que `CommercialCatalogView.vue:63` ya hace.
3. **El modal no se cierra si el envío falla.** Ni con 409, ni con 500. El texto se queda escrito y el
   error se pinta dentro (§11). Cerrar el modal al fallar tira 1000 caracteres redactados.

### 8.7 · Botones

`footer-actions`: `Cancelar` (`ds-btn--ghost`) y el primario, que **nombra la acción** (WCAG 2.2
§3.3.4, y el criterio que `SignedActionModal` ya impone al no dar valor por defecto a `confirmLabel`):

| Modo     | Rótulo                             | Guardando     |
| -------- | ---------------------------------- | ------------- |
| Publicar | **Publicar la pista**              | `Publicando…` |
| Corregir | **Publicar la revisión {N+1}**     | `Publicando…` |

Nunca «Guardar»: no se guarda nada, se publica una revisión.

**El botón no se deshabilita por formulario incompleto** — regla ya escrita en
`SignedActionModal.vue:56-60`: un botón apagado no dice qué falta. Se confirma, se valida, y el foco
salta al `ErrorSummary`. Solo se deshabilita mientras hay envío en curso.

---

## 9 · Retirar — `RetireHintModal.vue`

### 9.1 · Por qué NO es `SignedActionModal`

`SignedActionModal` es la pieza con la que esta consola confirma trece acciones con consecuencia, y
**aquí está prohibida**. El criterio ya está escrito, palabra por palabra, en
`ConfirmSuppressionModal.vue:8-17`: ese modal exige un motivo de lista cerrada y una nota, y su valor
es que **el motivo viaja con la operación** y queda escrito para quien la audite después.

`DELETE /catalog-item-ai-hints/{catalogItemId}` **no lleva cuerpo** —el propio Javadoc del controller
lo subraya: «no hay cuerpo del que pudiera salir»—. Un motivo pedido aquí se tiraría al enviar. Sería
teatro de auditoría: el operador creería estar firmando algo y no estaría firmando nada.

Tampoco es `useConfirmDialog`: ese diálogo pinta un mensaje, una consecuencia y un rótulo, y no puede
sostener la estructura «qué pasa / qué NO pasa» que esta acción necesita (§9.2).

**Se escribe un modal propio, calcado de `ConfirmSuppressionModal`**, que es el precedente exacto:
acción con consecuencia, sin motivo que pueda viajar, sujeto a la vista, consecuencias enumeradas y un
botón que nombra la acción.

### 9.2 · Contenido, literal

`ModalShell` con `role="alertdialog"`, `accent="danger"`, `compact`, `width: 560`,
`icon: ICONS.WARNING`.

- **Título:** `Retirar la pista de {CÓDIGO}`
- **Pregunta** (`.ds-dialog-body`): `¿Retirar la pista vigente de «{nombre}» ({código})?`
- **Consecuencia**, `ds-banner ds-banner--warning` con `role="alert"`:

  > El asistente **dejará de proponer este artículo** en la siguiente cotización. Rige de inmediato: no
  > hay despliegue ni revisión de nadie.

- **«Qué NO pasa»** — el antídoto contra el `DELETE` que engaña:

  > **No se borra nada.** La revisión {N} se queda en el historial con su texto y su fecha. Si más
  > adelante vuelves a publicar, la numeración sigue en {N+1}.

- **La firma, que se muestra y no se elige** (mismo argumento que `SignedActionModal`: la consola tiene
  un solo rol, la firma es todo el control que hay, y un control que no se ve no disuade):

  > Queda firmado por **tú (usuario #{id})**. Es lo único que dirá quién apagó este artículo.

  Si `auth.me` no resuelve, `usuario #{sub del JWT}`; si tampoco, **no se confirma** y se pinta el
  banner de sesión sin identificar, exactamente como hace `SignedActionModal`.

- **Botones:** `Cancelar` (`ds-btn--ghost`) · **`Retirar la pista`** (`ds-btn--danger`), `Retirando…`
  mientras envía.

### 9.3 · Lo que se consideró y se descarta

**Escribir el código del artículo para confirmar.** NN/g lo recomienda «para operaciones
particularmente peligrosas». Se descarta por dos motivos: la acción **no destruye datos** (la fila se
queda entera en el historial), y **esta consola no lo hace en ningún otro sitio** — ni siquiera en la
supresión de datos personales, que sí es irreversible. Añadirlo aquí y solo aquí desalinearía la
escala de gravedad de toda la consola: el usuario aprendería que retirar una pista es más grave que
borrar los datos de un titular, que es falso.

**Un «deshacer» en el toast de éxito.** Imposible. Ver §10.1.

### 9.4 · Devolución del foco — el detalle que se rompe siempre

Al retirar desde el listado, **la fila desaparece** de la pestaña «Con pista» y con ella el botón que
abrió el diálogo. Si no se dice nada, el foco cae en `<body>` y quien navega con teclado o lector
aparece al principio del documento sin saber qué pasó.

`ModalShell` tiene la prop para esto y hay que usarla, **pasando una función** para que se resuelva en
el instante del cierre (es lo que `ConfirmSuppressionModal.vue:34-46` documenta):

```ts
:return-focus-to="() => (retirado ? tablaHeadingEl : disparadorEl)"
```

- **cancelar o Escape** → al disparador (cadena de respaldo de `ModalShell`, no hace falta nada);
- **retirar con éxito** → al encabezado del panel de la pestaña, que es donde aparece el listado ya sin
  la fila; el toast de éxito se anuncia por `ToastStack` (`aria-live="polite"`).

Desde la ficha del artículo el disparador **sí sigue existiendo** (la cabecera se reconfigura pero no
desaparece), así que basta el respaldo por defecto.

---

## 10 · Versionado y reversión sin convertirlo en un control de versiones

El dueño pidió versionado y reversión que no parezcan Git. La respuesta corta: **la reversión no
existe, y decirlo es la parte importante.**

### 10.1 · Por qué no hay «revertir a la revisión 2»

El camino obvio —volver a publicar el texto de la revisión 2— **está cerrado por la base de datos**:
`uq_catalog_item_ai_hints_text` es un índice único sobre `(catalog_item_id, hint_hash)` **sobre todas
las filas, no solo las vigentes**, y republicar un texto idéntico responde 409
(`CatalogItemAiHintTextAlreadyPublishedException`).

Consecuencia de diseño, y es grande: **el remedio que NN/g prefiere sobre cualquier confirmación —el
deshacer— está clausurado por construcción.** _Confirmation Dialog_ dice que priorices el deshacer
porque reduce la ansiedad y permite recuperarse sin interrumpir el flujo. Aquí no se puede. Por eso el
diálogo de retirada (§9) carga todo el peso y por eso está redactado con ese detalle: es lo único que
hay.

**Petición al backend, redactada y sin abrir:**

> **`uq_catalog_item_ai_hints_text` clausura el «deshacer» de la consola**
> El índice es único sobre `(catalog_item_id, hint_hash)` en toda la tabla, así que republicar el texto
> de una revisión anterior —el único «revertir» posible en un modelo append-only— responde 409.
> Deshacer una retirada, que es la operación con más consecuencia comercial de la feature, es imposible
> sin editar el texto.
> Alternativa a estudiar: acotar la unicidad a la fila **vigente** (`current_hint_marker`), que sigue
> impidiendo dos vigentes idénticas —de lo que protege el índice— sin prohibir que una revisión repita
> un texto histórico. La objeción del Javadoc («con que texto se genero esta propuesta deja de tener
> una respuesta util») se sostiene igual: la propuesta apunta a una revisión concreta, no a un hash.

### 10.2 · Lo que sí se ofrece: «Usar como base»

Cada revisión del historial lleva un botón `ds-btn ds-btn--sm ds-btn--ghost`: **«Usar como base»**.
Abre el compositor en modo corregir con **el texto de esa revisión precargado**, y un
`ds-banner ds-banner--info` dentro:

> Estás partiendo de la revisión {N}. **No se puede republicar un texto idéntico**: cambia algo antes
> de publicar.

Es honesto —nombra lo que de verdad ocurre—, no cuesta ninguna llamada nueva, y evita que el operador
descubra el 409 después de haber decidido que quería «volver atrás».

Si aun así el texto se envía sin tocar, el 409 se pinta en el `ErrorSummary` del formulario con el
texto de §11, no como un toast.

### 10.3 · Vocabulario

Nada de «versión», «rama», «commit», «revertir», «historial de cambios». Se usa **revisión**,
**publicar**, **corregir**, **retirar**, **historial de revisiones** y **usar como base**. Son seis
expresiones y todas menos la última salen de la propia API.

---

## 11 · Errores del servidor — dónde va cada uno y con qué texto

**La regla, que hay que escribir porque el repo hoy manda todo a un toast**
(`useCommercialCatalog.ts`, `errorFrom` en cada `catch`):

> Un error que el usuario puede arreglar **editando el formulario que tiene delante** se pinta en el
> `ErrorSummary` de ese formulario. Todo lo demás va por `errorFrom(titulo, error)`.

Un aviso flotante que dice «ese texto ya se publicó» mientras el texto ofensor sigue en el `<textarea>`
está en el sitio equivocado: se desvanece, no está asociado al control y no da nada que pulsar.
`ErrorSummary` acepta `traceId` y tiene `slot` de traza precisamente para poder recibir también los
fallos del servidor.

| Origen                                     | HTTP  | Dónde                                                                            | Texto exacto                                                                                                                                                                        |
| ------------------------------------------ | ----- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CatalogItemAiHintTextAlreadyPublished`    | 409   | `ErrorSummary` del compositor, con enlace al campo 1 (o al campo único)           | `Ese texto exacto ya se publicó antes para este artículo. Cambia algo: dos revisiones idénticas dejan el historial sin poder responder con qué texto se generó una propuesta.`       |
| `CatalogItemAiHintAlreadyPublished`        | 409   | `ErrorSummary`, **y además** se recarga el listado y el modal pasa a modo corregir | `Este artículo ya tiene una pista vigente —quizá la publicó otra persona mientras escribías—. Se ha cargado la que hay: revísala y publica una corrección.`                          |
| `HintCatalogItemNotFound`                  | 404   | `ErrorSummary`                                                                   | `Este artículo ya no está a la venta, así que no se le puede publicar una pista. Compruébalo en Catálogo y precios.`                                                                 |
| `CatalogItemAiHintNotFound` (corregir/retirar) | 404 | `ErrorSummary` del modal correspondiente                                         | `Este artículo ya no tiene pista vigente. Puede que alguien la haya retirado mientras tenías la pantalla abierta.`                                                                    |
| Regla de los tres bloques                  | 400 o 500 (S2) | `ErrorSummary`                                                          | Se previene en el cliente. Si llega, `errorFrom` con traza.                                                                                                                          |
| Cualquier otro                             | 5xx / red | `errorFrom('No se pudo publicar la pista', error)`                            | El `ProblemDetail` del backend con su `X-Trace-Id`.                                                                                                                                  |

**El texto del error se compone en un solo sitio** —`composables/hintText.ts` o un mapa hermano—, no en
cada `catch`, para que el resumen y el mensaje en línea sean literalmente el mismo texto (GOV.UK).

Éxitos, por `useToast().success`, con la revisión dentro:

| Acción              | Toast                                                             |
| ------------------- | ----------------------------------------------------------------- |
| Publicar la primera | `Pista publicada. El asistente ya puede proponer {CÓDIGO}.`        |
| Corregir            | `Revisión {N} publicada. Rige desde ahora.`                        |
| Retirar             | `Pista retirada. El asistente deja de proponer {CÓDIGO}.`          |

---

## 12 · Accesibilidad — la lista que el implementador tiene que poder tachar

Todo WCAG 2.2, nivel indicado. Nada de esto es opcional.

| #   | Qué                                                                                                                                                                                                                                            | Criterio                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A1  | Los tres campos con `label` asociada (`AppTextarea` lo hace con `:for`/`:id`). Ninguna etiqueta como `placeholder`.                                                                                                                              | §3.3.2 (A)                        |
| A2  | Error asociado por `aria-describedby` + `aria-invalid` — `AppTextarea` ya lo hace; **no reimplementar el mensaje a mano fuera del componente**.                                                                                                  | §3.3.1 (A)                        |
| A3  | `ErrorSummary` arriba del formulario, **el foco se mueve a él** al confirmar con errores, texto literal idéntico al de línea, orden del DOM.                                                                                                     | §3.3.1 (A) · §2.4.3 (A)           |
| A4  | El botón que confirma **nombra la acción** («Publicar la revisión 4», «Retirar la pista»), nunca «Aceptar».                                                                                                                                      | §3.3.4 (AA)                       |
| A5  | Retirar: acción confirmada mediante mecanismo de revisión y confirmación. Es literalmente el tercer supuesto de §3.3.4 —«un mecanismo disponible para revisar, confirmar y corregir la información antes de finalizar»— y el único que esta operación puede satisfacer, porque no es reversible (§10.1). | §3.3.4 (AA)                       |
| A6  | Modales: Tab y Shift+Tab que dan la vuelta dentro, Escape que cierra, foco inicial dentro, foco de vuelta al disparador. Lo da `ModalShell`; **no reimplementar**.                                                                               | §2.4.3 (A) · APG Dialog (Modal)   |
| A7  | `return-focus-to` **como función** en el modal de retirada. Sin esto el foco cae al `<body>` cuando la fila desaparece.                                                                                                                          | §2.4.3 (A) · A11Y-08              |
| A8  | Pestañas: `role="tablist"` en `AppSegmentedTabs`, `role="tabpanel"` en la vista con `aria-labelledby` derivado de `segmentedTabId`. Flechas dentro, un solo tab tabulable.                                                                       | §4.1.2 (A) · APG Tabs             |
| A9  | Cada botón de icono lleva el **sujeto** en su nombre accesible, vía `sujeto(row)` con respaldo a `#id`.                                                                                                                                          | §4.1.2 (A) · R04                  |
| A10 | `.ds-icon-btn` ≥ 24×24 CSS.                                                                                                                                                                                                                     | §2.5.8 (AA)                       |
| A11 | La vigencia y la retirada **no se comunican solo por color**: `AppBadge` lleva rótulo escrito, y el pie de cada revisión lo dice en texto.                                                                                                       | §1.4.1 (A)                        |
| A12 | El contador de caracteres **no** es región viva. La restricción se comunica por el mensaje de error asociado.                                                                                                                                   | §3.3.1 (A), sin ruido             |
| A13 | El texto de la pista con `white-space: pre-wrap`. **Nunca `v-html`.**                                                                                                                                                                           | Seguridad de Vue                  |
| A14 | Carga: `PawLoader` por la vía de `AppTable :loading`. Cero spinners propios.                                                                                                                                                                    | R06                               |
| A15 | Error de red **antes** que el estado vacío, con `traceId`. Lo da `AppTable` + `useServerPaged`.                                                                                                                                                  | R05                               |
| A16 | El `<title>` de la ruta describe la pantalla («Pistas del asistente · VetSoftware»).                                                                                                                                                            | §2.4.2 (A) · R08                  |

**No verificado y declarado como tal:** no he ejecutado `axe-core`, ni Lighthouse, ni ningún cálculo de
contraste sobre esta pantalla, porque no existe todavía. No hay puerta de accesibilidad en el pipeline
de este repo (`docs/ux/README.md`, cierre). El diseño se apoya en primitivas ya medidas
(`.ds-btn--danger`, `.ds-banner--warning`, `.ds-focus-ring`) y **no introduce ningún tono nuevo**, así
que no abre frente de contraste. Si el implementador inventa un tono, esa afirmación deja de valer.

---

## 13 · Despiece de componentes y presupuesto de líneas

Techos reales de `scripts/css-budget.config.json` (consola): `maxSfcLines: 500`, `maxOversizedSfc: 0`,
`maxDuplicateGroups: 0`, **`maxStyleMinusScript: 0`**.

Ese último es el que sorprende: **el bloque `<style>` de un SFC no puede tener más líneas que su
`<script>`**. Un componente muy presentacional con poco script lo rompe. Aquí se cumple sin esfuerzo si
todo lo visual sale de `ds-*` y el `scoped` se limita a geometría (`pre-wrap`, `flex-wrap`, márgenes).
**Ninguna regla de color en `scoped`**: pesaría `(0,2,0)` y le ganaría a la primitiva, que es la trampa
de especificidad de `AGENTS.md:103-122`.

Todo bajo `src/features/catalog-ai-hints/`.

| Fichero                                   | Qué es                                                                                                                          | Objetivo  | Techo |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| `types/catalog-ai-hints.types.ts`         | los 3 tipos del contrato + `HINT_MAX_LENGTH`, `HINT_MIN_BLOCKS`                                                                   | ~80       | —     |
| `api/catalog-ai-hints.api.ts`             | los 5 clientes HTTP                                                                                                              | ~90       | —     |
| `composables/hintText.ts`                 | **puro, sin Vue**: `splitBlocks`, `joinBlocks`, `validateHintText`, `hintFirstBlock`, `sujeto`, mapa de errores del servidor      | ~130      | —     |
| `composables/useCatalogAiHints.ts`        | API + toasts + recargas, patrón `useCommercialCatalog`                                                                           | ~170      | —     |
| `stores/catalog-ai-hints.store.ts`        | Pinia. Solo lo compartido entre las dos rutas: caché de «sin pista» con su `loading`/`error`/`traceId`                            | ~90       | —     |
| `views/CatalogAiHintsListView.vue`        | cabecera, pestañas, los dos paneles, paginador, anfitrión de los dos modales                                                     | **≤ 260** | 500   |
| `components/HintsWithHintTable.vue`       | la tabla «Con pista» y sus acciones de fila                                                                                      | **≤ 150** | 500   |
| `components/HintsMissingTable.vue`        | la tabla «Sin pista» y su estado vacío                                                                                           | **≤ 120** | 500   |
| `views/CatalogAiHintDetailView.vue`       | cabecera del artículo, estado, acciones, anfitrión del historial y los modales                                                   | **≤ 240** | 500   |
| `components/HintRevisionList.vue`         | el historial: tarjeta por revisión, etiqueta, texto, pie de procedencia, «Usar como base»                                        | **≤ 190** | 500   |
| `components/HintComposerModal.vue`        | `ModalShell` + `ErrorSummary` + texto vigente + conmutador + contador + banner de inmediatez + botones                            | **≤ 300** | 500   |
| `components/HintTextFields.vue`           | los tres campos / el campo único, con sus etiquetas y ayudas                                                                     | **≤ 150** | 500   |
| `components/RetireHintModal.vue`          | el `alertdialog` de retirada                                                                                                     | **≤ 140** | 500   |
| `router/routes/catalog-ai-hints.routes.ts` | las dos rutas                                                                                                                    | ~45       | —     |

**Por qué `HintTextFields` sale del compositor.** No es reparto cosmético: el compositor con los tres
campos, sus tres ayudas, el conmutador de modo, el texto vigente, el resumen de errores, el contador y
el banner rondaría las 420 líneas — bajo el techo, pero a un cambio de rebasarlo, que es exactamente el
estado en el que estaba `CommercialCatalogView.vue` cuando llegó a 715. Además el grupo de campos es lo
único con lógica de reparto de texto y merece prueba propia.

**Por qué las dos tablas salen de la vista de listado.** La vista sola, con las dos tablas dentro,
pasaría de 450. Y el corte es limpio: las dos pestañas son excluyentes en el marcado y no comparten un
solo manejador — el mismo criterio con el que `PriceListsPanel` salió de `CommercialCatalogView`.

### Ficheros existentes que se tocan — todos aditivos, ninguno gemelo TR-02

| Fichero                                          | Cambio                                        | ¿Gemelo? |
| ------------------------------------------------ | --------------------------------------------- | -------- |
| `src/constants/routes.ts`                        | +2 nombres de ruta                            | no       |
| `src/constants/icons.ts`                         | +1 clave `AI_HINT: Sparkles`                  | no       |
| `src/components/layout/sidebar-nav.ts`           | +1 hoja en el grupo Suscripciones             | no       |
| `src/router/index.ts`                            | registrar el módulo de rutas                  | no       |
| `src/types/api.contract.ts`                      | +3 aserciones — **lo primero, ver B1**        | no       |
| `tests/unit/sidebar-sin-cifras-inventadas.spec.ts` | actualizar el orden esperado                  | no       |

### Gemelos TR-02 que se **consumen** y no se tocan

`ModalShell.vue`, `ErrorSummary.vue`, `useModalFocus.ts`, `useModalHistory.ts`, `useModalLayer.ts`,
`useServerPaged.ts`, `useQuerySync.ts`, `types/pagination.ts`, `PawLoader.vue`, `PageLoader.vue`,
`ToastStack.vue`, `tokens.css`, `primitives.css`, `base.css`, `http.client.ts`.

**Ninguna primitiva nueva de `ds-*`.** Todo lo que necesita esta pantalla existe ya: `.ds-head`,
`.ds-title`, `.ds-meta`, `.ds-kicker`, `.ds-card--tight`, `.ds-card--flat`, `.ds-banner--warning`,
`.ds-banner--info`, `.ds-btn--primary/--danger/--ghost/--plain/--sm`, `.ds-icon-btn(--danger)`,
`.ds-actions--start`, `.ds-empty`, `.ds-stack--*`, `.ds-num`, `.ds-text-strong`, `.ds-list-reset`,
`.ds-dialog-body`, `.ds-focus-ring`. Verificado contra `primitives.css`.

**Nada del catálogo `Base*` del tenant.** El compositor **no** usa `BaseField` ni `SearchableSelect`:
no existen en este repo, y traerlos crearía un gemelo de facto no declarado — exactamente lo que
`AppSegmentedTabs.vue:17-21` explica que no se debe hacer.

---

## 14 · Comprobaciones que verifican esta especificación

Ninguna se ha ejecutado: no hay código. Van declaradas para que quien implemente sepa qué le van a
pedir.

**Unitarias (`tests/unit/`)** — es donde vive el valor, porque casi toda la lógica es pura:

1. `hint-text.spec.ts` — `splitBlocks` con 1, 2, 3 y 4 bloques, con `\r\n`, con líneas de solo
   espacios; `joinBlocks` recorta y une con exactamente `\n\n`; `validateHintText` da los cuatro
   mensajes literales; la longitud se mide sobre el texto **unido**.
2. `hint-revision-label.spec.ts` — la tabla de verdad de §5.3 entera, **incluido el caso
   `supersededAt != null && supersededBy == null` → «No consta quién»** y el caso imposible.
3. `hint-composer.spec.ts` — con 3 bloques abre en modo campos; con 4 abre en modo texto y **no pierde
   ningún bloque**; confirmar con un campo vacío **no emite `submit`** y mueve el foco al
   `ErrorSummary`.
4. `retire-hint-modal.spec.ts` — `role="alertdialog"`, el rótulo del botón es «Retirar la pista», y
   `return-focus-to` se pasa como función.
5. `sujeto.spec.ts` — nombre nulo y código nulo caen a `el artículo #{id}` y nunca a `null`.

**De rejilla, ya existentes:** `npm run quality` (que incluye `css:budget`, `stylelint` con
`vetsoftware/no-duplicate-primitive` y el gate de paridad TR-02) y `vue-tsc`. Recordatorio de la casa:
la cadena es **fail-fast**, así que un fallo de formato oculta si los tipos están verdes.

**No hay puerta de accesibilidad automatizada en este repo.** Estas pruebas no la sustituyen: solo
sujetan lo que se puede sujetar sin `axe-core`.

---

## 15 · Fuentes que de verdad cambiaron una decisión

Todas consultadas el **2026-08-31** salvo indicación.

| Fuente                                                                                                                                                                          | Qué decidió                                                                                                                                                                                                                                                                                                                                        | Peso                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **WCAG 2.2 §3.3.4 Error Prevention (Legal, Financial, Data)** — https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html                            | Es el criterio normativo (AA) que exige confirmación para la retirada, y sus tres supuestos —reversible / comprobado / **confirmado**— son los que obligan a que el diálogo permita «revisar, confirmar y corregir». El primer supuesto está cerrado (§10.1), así que solo queda el tercero. También sostiene el rótulo que nombra la acción.        | **decisivo**          |
| **APG · Dialog (Modal)** — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/                                                                                                 | Tab/Shift+Tab que dan la vuelta, Escape que cierra, foco inicial dentro y «el foco vuelve al elemento que invocó el diálogo salvo que ese elemento ya no exista; entonces se sitúa en otro que dé un flujo de trabajo lógico». Esa segunda mitad es literalmente el caso de §9.4.                                                                    | **decisivo**          |
| **NN/g · Confirmation Dialog** (18-02-2018, revisado 07-08-2026) — https://www.nngroup.com/articles/confirmation-dialog/                                                          | Tres cosas: (a) prioriza el deshacer sobre el confirmar — lo que obligó a comprobar si el deshacer era posible, y no lo es (§10.1); (b) el diálogo debe llevar los detalles identificativos del sujeto y explicar la consecuencia, no «¿seguro?»; (c) rótulos que resumen el resultado. Y su aviso sobre confirmar acciones rutinarias, que es por lo que **corregir no lleva confirmación** y retirar sí. | **decisivo**          |
| **GOV.UK Design System · Validation** — https://design-system.service.gov.uk/patterns/validation/                                                                                  | Resumen de errores arriba **con el foco movido a él**, prefijo del `<title>`, mensaje en línea junto al campo y coincidencia literal entre resumen y línea. El repo ya lo implementa en `ErrorSummary.vue`. **Discrepa** del repo en validar al salir del campo, y esa discrepancia va declarada en §8.4 en vez de disimulada.                        | alto                  |
| **Langfuse · Prompt version control** — https://langfuse.com/docs/prompt-management/features/prompt-version-control                                                                | El producto de gestión de prompts más documentado en cuanto a UI: versiones con etiquetas (`production`, `latest`), **reversión reasignando la etiqueta** y vista de diff. Sirvió por contraste: aquí **no hay etiquetas**, así que ese modelo de reversión no es trasladable; y confirmó que el diff es funcionalidad esperable, pero de otra fase.  | medio                 |
| **NN/g · Modes in User Interfaces** — https://www.nngroup.com/articles/modes/                                                                                                     | El argumento general contra los modos, que sostiene sacar el historial del modal y darle ruta propia. No es un artículo sobre drawers ni resuelve la comparación.                                                                                                                                                                                   | medio                 |
| Medium: [Modal vs Drawer](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da) · [When, Where, and How to Use Modals](https://bootcamp.uxdesign.cc/when-where-and-how-to-use-modals-in-ux-design-7f69841de9e5) | **Evidencia floja, y así queda dicho.** Es todo lo que hay sobre drawer contra modal para editar dentro de una lista: blogs sin estudio detrás. Por eso §7.2 dice explícitamente que **la decisión de no hacer drawer es por coherencia con el repo**, no por evidencia.                                                                             | **bajo — declarado**  |

**Evidencia que busqué y no encontré:** ningún estudio ni guía de un sistema de diseño de referencia
(GOV.UK, Carbon, Primer) sobre **cómo comunicar que un cambio de configuración sale a producción sin
despliegue**. Los productos de gestión de prompts lo tratan como virtud comercial («sin esperar a
ingeniería»), no como un riesgo que haya que advertir. Los textos de §6 son míos, construidos sobre el
requisito de especificidad de NN/g; **no hay fuente que los respalde palabra por palabra**.

### Fuentes internas que pesaron tanto como las externas

- `ConfirmSuppressionModal.vue:8-17` — el criterio de «teatro de auditoría» que prohíbe
  `SignedActionModal` aquí (§9.1). Es la cita más importante de todo el documento.
- `SignedActionModal.vue:56-60` — «el botón no se deshabilita» (§8.7) y la firma que se muestra y no se
  elige (§9.2).
- `AppSegmentedTabs.vue` — el patrón APG Tabs completo y por qué no se copia el del tenant.
- `CommercialCatalogView.vue:25-42` — el precedente del despiece por techo de líneas y el de la ruta
  propia para el detalle por artículo.
- `docs/ux/README.md` y `reglas-de-interfaz.md` (R04, R05, R06, R14) — gemelos byte a byte entre los dos
  fronts. **Este documento no los toca.**

---

## 16 · Lo que queda abierto

No abro issues: el dueño lo prohibió para esta sesión. Redactados en el cuerpo:

1. **§2/B2** — `GET /catalog-item-ai-hints` sin `query`: el listado sale sin buscador.
2. **§10.1** — `uq_catalog_item_ai_hints_text` clausura el deshacer de la retirada.
3. **§2/S2** — verificar a qué código HTTP mapea la `IllegalArgumentException` de la regla de los tres
   bloques. Si es 500, es un defecto del backend, no del front.
4. **§2/S3** — confirmar que `/revisions` responde 200 con página vacía y no 404 para un artículo sin
   pista. La ficha depende de ello.
5. **§4.4** — no hay endpoint que conteste «qué artículo a la venta no tiene pista». Se deriva en el
   front y **deja de escalar por encima de ~200 artículos**.
6. **§8.5** — diff entre revisiones: fuera de alcance, con motivo (dependencia + presupuesto).
7. **§2/S1** — el nombre del firmante no se puede resolver; se pinta `usuario #{id}`. Si algún día
   existe un directorio de cuentas de plataforma, esta pantalla es su primer consumidor.
