# Consola de plataforma · Especificación de las pantallas de suscripciones

> **Qué es esto.** La especificación de diseño con la que se implementan las pantallas que le
> faltan a `VetSoftwareFront` para operar el modelo de suscripciones. Está escrita para que varias
> instancias de `front-feature` trabajen en paralelo sin volver a preguntar.
>
> **Qué NO es.** No es el histórico de una auditoría (eso es `reglas-de-interfaz.md`), ni el
> criterio de CSS (eso es `AGENTS.md`), ni el modelo de datos (eso es
> `models/modelo-datos-suscripciones.html` y `VetSoftware/docs/db/suscripciones-*.md`).
>
> **No gemelo — y no lo enlaces desde el README.** A diferencia de `reglas-de-interfaz.md` y
> `patron-de-mensajes.md`, este documento es **exclusivo de la consola de plataforma**. No se copia
> a `VetSoftwarePublicFront`: describe pantallas que la app del tenant no tiene y no debe tener.
>
> ⚠️ `docs/ux/README.md` declara en su sección «Gemelo por contenido» que él y
> `reglas-de-interfaz.md` son **idénticos byte a byte en los dos fronts**. Añadir ahí un enlace a
> este fichero **rompe esa paridad**. Si algún día se quiere indexar, se hace con una sección
> «Documentos propios de este repo» **añadida a los dos README a la vez**, y eso es trabajo de
> `front-parity`, no de quien implemente estas pantallas.
>
> Fecha: 2026-08-23 · Contrato de referencia: `VetSoftware/api/openapi.json` (366 rutas).
> Issue de inventario: [admin-web #145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145).
>
> **Alcance de este documento: las capas A–H del modelo** — lo que ya existe en el backend. Las
> siete capas de la ampliación (I a P: prueba gratuita con ventana, límites, cobrar en Colombia,
> prueba documental, contabilidad, puente al contador y cumplimiento) tienen su propia
> especificación, que continúa esta y su numeración de ondas:
> [`suscripciones-consola-ampliacion-especificacion.md`](suscripciones-consola-ampliacion-especificacion.md).
> **Aviso para quien reparta trabajo: W1-A sigue sin hacerse y bloquea la onda 5 de aquella.**

---

## Contenido

- [0 · Para quién se diseña](#0--para-quién-se-diseña)
- [1 · Cuatro hechos del contrato que condicionan todo el diseño](#1--cuatro-hechos-del-contrato-que-condicionan-todo-el-diseño)
- [2 · Navegación propuesta](#2--navegación-propuesta)
- [3 · Las siete decisiones](#3--las-siete-decisiones)
- [4 · Pantalla por pantalla](#4--pantalla-por-pantalla)
- [5 · Accesibilidad WCAG 2.2 AA — en las decisiones, no como coletilla](#5--accesibilidad-wcag-22-aa--en-las-decisiones-no-como-coletilla)
- [6 · Coherencia con el design system](#6--coherencia-con-el-design-system)
- [7 · Prioridad de implementación y paralelización](#7--prioridad-de-implementación-y-paralelización)
- [8 · Lo que dejo fuera a propósito](#8--lo-que-dejo-fuera-a-propósito)
- [9 · Comprobaciones — qué medí y qué no](#9--comprobaciones--qué-medí-y-qué-no)
- [10 · Issues propuestos](#10--issues-propuestos)

---

## 0 · Para quién se diseña

**Ana no entra aquí nunca.** `VetSoftwareFront` es la consola de la plataforma; la app del tenant es
`VetSoftwarePublicFront`, otro repositorio. Los tres usuarios reales de estas pantallas son:

| Perfil | Su tarea | Qué necesita que la pantalla haga rápido |
|---|---|---|
| **Comercial** | Cotizó a Ana antes de que existiera como empresa | Armar una selección, congelarla y enviarla. Volver a ver **por qué** cotizó eso. |
| **Soporte** | Ana llamó: «quiero historia clínica y un usuario más» | Encontrar el contrato, añadir la línea, ver el prorrateo antes de confirmarlo. |
| **Administración / cartera** | Cierra el mes | La lista de documentos atascados esperando la factura fiscal, y quién debe. |

Las tres tareas comparten una propiedad que fija toda la jerarquía: **son operaciones sobre el
dinero y el contrato de un tercero.** No hay «deshacer». Por eso el orden de prioridades de esta
especificación es *que no se pierda ni se corrompa trabajo* → *que no se pueda actuar sobre la
empresa equivocada* → *que se entienda sin leer* → *que sea bonito*.

---

## 1 · Cuatro hechos del contrato que condicionan todo el diseño

Verificados leyendo el backend, no supuestos. Si un `CLAUDE.md` dice otra cosa, manda esto.

### 1.1 · La mitad de las rutas nuevas son de **tenant**, no de plataforma — y exigen una cabecera que este front no envía

Este es **el hallazgo que decide el orden de implementación entero**, y contradice el plan que hoy
propone [#145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145).

`Authz.currentCompanyId()` — `VetSoftware/src/main/java/com/vetsoftware/app/auth/infrastructure/security/Authz.java:48-55`:

```java
public Long currentCompanyId() {
    return switch (currentContext()) {
        case EmployeeContext me -> me.companyId();
        case SystemUserContext _ -> requiredSystemCompanyId();   // ← lee X-Company-Id
        case SystemContext _ -> throw new AccessDeniedException(NO_COMPANY_CONTEXT);
        case null -> throw new AccessDeniedException(NO_COMPANY_CONTEXT);
    };
}
```

Y `requiredSystemCompanyId()` (`Authz.java:155-175`) lanza
`IllegalArgumentException("X-Company-Id is required for tenant operations")` si la cabecera falta.

**El operador de la consola es un `SystemUserContext`.** Por tanto:

- Toda ruta que llame a `currentCompanyId()` **falla con 400** desde esta consola salvo que la
  petición lleve `X-Company-Id`.
- `VetSoftwareFront` **no envía esa cabecera en ningún sitio**: `grep -rn "X-Company-Id" src/` →
  **0 resultados**. `src/services/http/http.client.ts` no la contempla.

Clasificación completa, que es lo que cada instancia de `front-feature` necesita saber antes de
escribir una línea:

| Alcance | Rutas | Requiere `X-Company-Id` |
|---|---|---|
| **Global (plataforma)** | `/catalog-items/**`, `/catalog-prices/**`, `/price-lists/**`, `/configurator/**`, `/platform-billing-config`, `/platform-subscriptions`, `/platform-subscriptions/item-overlaps`, `/quotes/platform`, `/quotes/expire-overdue`, `/system/**` | **No** |
| **Por empresa, con `companyId` en la ruta** | `/system/subscription-billing/companies/{companyId}/**` (7 escrituras: cargo, anular cargo, generar documento, await-external, nota crédito, factura externa, anular documento) | **No** — la empresa viaja en la URL |
| **Por empresa, resuelta con `currentCompanyIdOrNull()`** | `/quotes` POST, `/quotes/{id}` GET/DELETE, `/quotes/{id}/send`, `/accept`, `/reject` | **No** — devuelve `null` para un system user y el caso está contemplado (`QuoteController.java:97,105,131,144,151,163`) |
| **Por empresa, resuelta con `currentCompanyId()`** | **todo** `/subscriptions/**` (10 rutas), `/entitlements/**` (3), `/subscription-payments/**` (5), `/dunning-events` GET+POST+`{id}` (3), `/subscription-billing/charges|documents` (4) | **Sí — obligatoria** |

> `GET /quotes` (`listMine`, `QuoteController.java:110-115`) sí usa `currentCompanyId()`, pero la
> consola no lo necesita: su lista es `GET /quotes/platform` (`listAll`, línea 122), documentada en
> el propio código como *«El embudo completo de la consola de plataforma. Sin filtro de empresa:
> SYSTEM.»*

**Consecuencia de diseño, no de infraestructura.** Una cabecera oculta que cambia sobre qué empresa
se está actuando es una trampa: es exactamente el mecanismo con el que un operador cancela el
contrato equivocado. Por eso la respuesta no es «añadir un interceptor», es **la pantalla de la
§4.4: el contrato se opera desde su propio expediente, y el expediente hace visible y permanente en
qué empresa se está trabajando.** Ver §3.4 y §4.4.1.

> ⚠️ **Frontera de agente.** `src/services/http/http.client.ts` declara en su cabecera (líneas
> 42-47) que *«El resto de este archivo se mantiene idéntico en los dos fronts (TR-02)»*. Añadir
> ahí el envío condicional de `X-Company-Id` **rompe la paridad y no es trabajo de
> `front-feature`**: va por `front-parity`. Ver la tarea **W1-A** en §7.

### 1.2 · La lista de plataforma no sabe el nombre de la empresa

`SubscriptionResponse` (`openapi.json`) expone `companyId: integer` y nada más. Igual
`BillingDocumentResponse` (`companyId`) y `SubscriptionPaymentResponse` (`companyId`).

En cambio `QuoteSummaryResponse` sí trae `company: CompanySummary { id, name, identifier }`, y
`DunningEventResponse` trae `subscription` y `billingDocument` como resúmenes anidados. **El
contrato es inconsistente consigo mismo.**

Se ve hoy en pantalla: `src/features/subscriptions-admin/views/SubscriptionsAdminView.vue:97`
pinta la columna «Empresa» como `#{{ subscription.companyId }}`, y
`src/features/billing-operations/components/BillingDocumentsTable.vue:96` pinta
«Suscripción» como `#{{ document.subscriptionId }}`.

Esto convierte la lista de trabajo del cierre de mes en una lista de números opacos. **No se
resuelve en el front** — resolver 20 nombres con 20 llamadas por página es peor que el problema.
Se resuelve en el contrato: issue **B-1** en §10. Mientras tanto, mitigación obligatoria en §4.5.

### 1.3 · El configurador no tiene estado de borrador; la lista de precios sí

`price_lists.status ∈ {DRAFT, PUBLISHED, ARCHIVED}` con `PATCH /price-lists/{id}/publish`. Es el
patrón correcto y ya está implementado (`CommercialCatalogView.vue:202-214`).

`configurator_questions`, `configurator_options` y `configurator_effects` **no tienen `status`**.
Ninguna de sus 9 rutas expone publicación. Un `PUT /configurator/effects/{id}` cambia el
cuestionario **en vivo, para el siguiente prospecto que entre**. Un efecto mal puesto es cotizar de
menos, inmediatamente y sin red. Ver la solución de diseño en §3.6 e issue **B-2** en §10.

### 1.4 · Tres tablas puente del catálogo no tienen ningún editor

`GET/POST/PUT/DELETE` sobre `/catalog-items/{id}/dependencies`, `/{id}/components` y
`/{id}/sub-modules` — **9 rutas, 0 consumidores**:

```
grep -rn "dependencies\|sub-modules" src/features/commercial-catalog/   →   0 resultados
```

`src/features/commercial-catalog/api/commercial-catalog.api.ts` solo cubre el CRUD plano de
`/catalog-items`, `/price-lists` y `/catalog-prices`.

El [#145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145) cuenta `/catalog-items`
como «sí — consumido», y en el recuento por prefijo tiene razón; en lo funcional no. **La tabla que
falta es la que importa más**: `catalog_item_sub_modules` es *«el puente entre vender y
funcionar»* (modelo, capa A). Sin ella, vender «Historia clínica» no abre ninguna pantalla en la
app de Ana. Es un prerrequisito de arranque, y por eso entra en la lista de puesta en marcha (§3.7)
y en la prioridad P1 (§7).

---

## 2 · Navegación propuesta

**Diez familias de rutas no son diez entradas de menú.** El modelo tiene una cadena y el menú debe
contarla: *catálogo y precios → el asistente → la cotización → el contrato → el dinero*. Eso son
**cinco entradas** más una de configuración.

El grupo «Suscripciones» ya existe en `src/components/layout/AppSidebar.vue:52-74` con tres
entradas. Se conserva, se le añaden dos y se reordena para que el orden del menú sea el orden de la
cadena.

```
General
  Dashboard                              /dashboard
  Empresas                               /empresas
  Empleados                              /empleados

Suscripciones                            ← el grupo cuenta la cadena, en orden
  Catálogo y precios                     /catalogo-comercial          (existe, se completa)
  Configurador                           /configurador                ← NUEVA
  Cotizaciones                           /cotizaciones                ← NUEVA
  Contratos                              /suscripciones               (existe, se le añade expediente)
    └ expediente                         /suscripciones/:id/*         ← NUEVA (5 sub-vistas)
  Cobranza                               /cobranza                    (existe, se replantea)

Configuración
  … (sin cambios)

Sistema
  Configuración                          /configuracion
  Facturación de plataforma              /configuracion/facturacion   ← NUEVA
```

### 2.1 · Qué NO merece pantalla propia, y por qué

| Familia | Rutas | Dónde vive en su lugar | Razón |
|---|---:|---|---|
| `/entitlements` | 3 | Sub-vista del expediente del contrato: `/suscripciones/:id/acceso` | Es **tabla derivada**: no contiene ninguna decisión, solo el resultado de aplicar el contrato vigente (modelo, capa F). Una lista global de permisos derivados no responde ninguna pregunta que el contrato no responda mejor. Además es company-scoped (§1.1): una lista global es **literalmente imposible** con el contrato de hoy. |
| `/dunning-events` | 2 + `/system/dunning-events` | Pestaña de `/cobranza` (feed global) **y** sub-vista `/suscripciones/:id/cobranza` (expediente de una cuenta) | Nadie navega a «eventos de cobranza» en abstracto. O estás cerrando el mes, o estás mirando por qué esta cuenta está en solo lectura. |
| `/subscription-billing/charges` | 2 | Sub-vista `/suscripciones/:id/dinero` y detalle del documento | Un cargo devengado es **una línea**, no un registro maestro. Su sitio es el documento que lo agrupa y el contrato que lo generó. |
| `/configurator/{questions,options,effects}` | 9 | **Una** pantalla, `/configurador`, con dos modos | Tres pantallas para tres tablas de la misma estructura es exponer el esquema, no la tarea. La tarea es «editar el cuestionario» y «comprobar que no rompí nada». |
| `/platform-billing-config` | 1 | `/configuracion/facturacion` junto a `/system/billing-document-sequences` | Es una fila única. Ir sola a un grupo de menú de primer nivel sería darle el mismo peso que a «Contratos». |
| `/quotes/expire-overdue` | 1 | **Ninguna.** Es un trabajo programado. | Un barrido masivo con un botón en una consola es cómo se ejecuta dos veces. Si hoy no está agendado, eso es un defecto de backend (issue **B-5**), no una pantalla que falte. |
| `/subscriptions` POST (`create`) | 1 | **Ninguna en esta consola.** | *«Toda empresa nace con un contrato. El alta de la empresa y la creación de su suscripción ocurren en la misma transacción»* (modelo, anexo técnico). El contrato inicial se crea al aceptar la cotización o al dar de alta la empresa, no desde un formulario suelto. Un formulario «crear suscripción» permitiría crear una segunda, que el índice único de `active_marker` rechazaría con un error de base de datos crudo. |

**Recuento: 10 familias (54 rutas) → 5 entradas de menú + 1 de configuración.**

### 2.2 · Las sub-vistas del expediente son rutas, no pestañas de componente

Decisión explícita, porque afecta al reparto de trabajo:

```
/suscripciones/:id                       → redirect a /resumen
/suscripciones/:id/resumen
/suscripciones/:id/contratado
/suscripciones/:id/historia
/suscripciones/:id/acceso
/suscripciones/:id/dinero
/suscripciones/:id/cobranza
```

Se presentan como una barra de pestañas, **pero son `<RouterLink>` dentro de un `<nav>`**, no un
`role="tablist"`. Cuatro razones, todas verificables:

1. **No hay que implementar el contrato de teclado del patrón Tabs del APG** (flechas, roving
   `tabindex`, `aria-selected`). Una barra de enlaces es un `nav` y ya tiene su semántica. El
   patrón exacto —`<RouterLink custom>` + `isActive` gobernando a la vez la clase y
   `aria-current="page"`— **ya está resuelto en este repositorio** en
   `src/components/layout/AppSidebar.vue:224-247`, con el comentario que explica por qué no se usa
   `active-class`. Se copia ese patrón, no se inventa otro.
2. **Enlace profundo y botón «atrás».** Soporte pega la URL de la pestaña «Dinero» en un ticket.
3. **Presupuesto de SFC.** `css-budget.config.json` fija `maxSfcLines: 500` y `maxOversizedSfc: 0`.
   Seis paneles en un SFC lo revientan; seis sub-vistas con carga diferida no.
4. **Paralelización.** Cada sub-vista es un fichero propio → una instancia de `front-feature` por
   sub-vista, sin conflicto de escritura. Ver §7.

`.ds-tab--active` ya existe en `primitives.css:1422` y aporta exactamente el estado activo
(`border-bottom-color` + `color`); la geometría de la pestaña la pone el componente. **No se
inventa una primitiva de pestaña nueva.**

---

## 3 · Las siete decisiones

### 3.1 · Qué agrupar y qué separar

Resuelto en §2. El criterio, para que se pueda aplicar a lo que venga después:

> **Una entrada de menú es una tarea recurrente con un principio y un final, no una tabla.**
> Si la respuesta a «¿cuándo entrarías aquí?» es «cuando estoy mirando otra cosa», no es una
> entrada de menú: es una sub-vista de esa otra cosa.

`/entitlements` falla la prueba (siempre se mira desde un contrato). `/cobranza` la pasa (se entra
el día 1 de cada mes con un objetivo propio).

### 3.2 · Qué es un documento y qué es un formulario

**El principio.** En este modelo hay cosas que *solo se agregan*. Editarlas no está prohibido: **la
operación no existe.** Una interfaz que las presenta con un botón «Editar» deshabilitado miente
dos veces — dice que la operación existe y que hoy no te dejan.

**El inventario, cerrado.** Todo objeto de estas pantallas cae en una de las dos columnas:

| **Documentos** (solo se agregan) | **Formularios** (se editan) |
|---|---|
| Cotización en `SENT`/`ACCEPTED`/`REJECTED`/`EXPIRED` | Cotización en `DRAFT` |
| Lista de precios en `PUBLISHED`/`ARCHIVED` | Lista de precios en `DRAFT`, y sus `catalog_prices` |
| Otrosí (`subscription_amendments`) | Artículo del catálogo (`catalog_items`) |
| Línea de contrato (`subscription_items`) | Puentes del catálogo (dependencias, componentes, submódulos) |
| Cambio de estado (`subscription_status_history`) | Pregunta / opción / efecto del configurador |
| Cargo devengado (`subscription_charges`) | Configuración de facturación de plataforma |
| Cuenta de cobro (`subscription_billing_documents`) | Secuencia de numeración (solo alta) |
| Pago (`subscription_payments`) | |
| Evento de cobranza (`dunning_events`) | |

**Cómo se ve la diferencia, sin depender de deshabilitar nada.** Cuatro señales simultáneas —
ninguna es color:

1. **Chasis distinto.** Un documento se pinta con `DocumentSheet.vue` (§6.2): `ds-frame` con regla
   superior, el número de documento como titular (`ds-display--xs`, `DC-2026-00184`) y **los datos
   en un `<dl>` sobre `ds-detail-grid`, nunca en `<input disabled>`**. Un `<input disabled>` dice
   «editable, pero ahora no»; un `<dl>` dice «esto es un hecho». Un formulario se pinta con
   `ds-card` y campos reales.
2. **Sello textual con icono.** `ds-pill` + `ICONS.LOCK` + el texto **«Documento · solo se
   agrega»**, con `title` no, con texto sí. Sobre la lista, la misma señal en el encabezado de la
   sección: «Estos registros no se editan; se corrigen con otro documento».
3. **El repertorio de acciones solo tiene verbos de añadir.** No hay «Editar» ni deshabilitado ni
   oculto: **no está en el marcado**. En su lugar, y solo lo que la ruta permita:
   - Cuenta de cobro → «Registrar factura externa», «Emitir nota crédito», «Anular documento»
   - Cargo → «Anular cargo» (crea el cargo negativo que compensa)
   - Cotización `DRAFT` → «Enviar» (puerta de un solo sentido, con confirmación)
   - Cotización `SENT` → «Marcar aceptada», «Marcar rechazada». **Sin «Eliminar»** aunque
     `DELETE /quotes/{id}` exista: borrar una oferta enviada es borrar el embudo comercial.
     `DELETE` solo se ofrece en `DRAFT`.
4. **La cadena de corrección se ve, y las dos partes quedan.** `correctsDocumentId` se pinta como
   enlace «Corrige a **DC-2026-00121**» en la nota crédito, y el original pinta «Corregido por
   **NC-2026-00007**». Igual `voidsChargeId` en los cargos. Esto no es adorno: es la única forma de
   que «se corrige con otro documento y los dos quedan» sea visible en vez de ser una promesa del
   README.

**El caso frontera que enseña la regla: la lista de precios.** Es formulario en `DRAFT` y documento
en `PUBLISHED`. El paso es una puerta de un solo sentido. Ya está bien resuelto hoy
(`CommercialCatalogView.vue:202-214` usa `useConfirmDialog` con `consequence: 'La lista y sus
precios quedarán congelados para preservar lo ofrecido.'`). **Lo que falta**: tras publicar, el
panel debe **re-renderizarse con chasis de documento**, no quedarse igual con los botones grises.
Ese cambio de forma es la enseñanza.

**Qué NO hacer, explícito:**
- ❌ `<button disabled>Editar</button>` en cualquier documento.
- ❌ `<input disabled>` / `<input readonly>` para mostrar datos de un documento.
- ❌ Un icono de lápiz atenuado en la columna de acciones de una tabla de documentos.
- ❌ Un tooltip «no se puede editar» como única explicación.

### 3.3 · Cómo se ve un contrato: un expediente que crece

La pregunta que la pantalla tiene que responder es la del documento, literal:

> *«¿Qué tenía contratado Ana el 3 de marzo, y por qué se le facturaron 179.000?»*

Son **dos** preguntas y el contrato responde cada una por un camino distinto.

**«¿Qué tenía el 3 de marzo?» — el control de fecha.** La respuesta está en un parámetro que ya
existe y hoy nadie usa: `GET /subscriptions/{id}/items?onDate=2026-03-03`. El propio backend lo
documenta (`SubscriptionController.java:183-187`): *«Con `onDate` responde qué tenía la clínica ese
día; sin él, devuelve el expediente completo, con las líneas ya cerradas incluidas —que siguen ahí,
porque dar de baja no borra—.»*

Por tanto la sub-vista **«Lo contratado»** (`/suscripciones/:id/contratado`) tiene como control
principal, arriba y no escondido en un filtro:

```
Ver a fecha:  [ 2026-03-03 ]  [Hoy]        ○ Solo lo vigente   ● Expediente completo
```

- `Ver a fecha` es un `<input type="date">` nativo. Es un cambio de **consulta**, no de datos:
  se aplica al `change`, no al `input`, y el resultado se anuncia en una región `role="status"`
  (§5.3). La consola no tiene primitiva de fecha —`DateInput` solo existe en el tenant—, y **no se
  crea una para esto**: `<input type="date">` trae calendario, teclado y localización del sistema.
- El conmutador es un `radiogroup` de dos opciones, no una casilla, porque los dos estados tienen
  nombre y ninguno es «lo normal».

**Las tres vigencias, con la definición correcta.** El modelo insiste en que *«vigente» no es «sin
fecha de fin», es «ya empezó y todavía no ha terminado»*, y avisa de que usar el criterio
equivocado es un error invisible. La pantalla lo hace visible con **tres** estados de línea, no dos:

| Estado de la línea | Condición | Distintivo |
|---|---|---|
| **Vigente** | `effectiveFrom ≤ fecha` y (`effectiveTo` vacío o `> fecha`) | `AppBadge variant="success"` + texto «Vigente» |
| **Programada** | `effectiveFrom > fecha` | `AppBadge variant="neutral"` + texto «Programada» + `ds-meta` «desde el 1 de abril» |
| **Cerrada** | `effectiveTo ≤ fecha` | `AppBadge variant="neutral"` + texto «Cerrada» + fila con `ds-meta` (no atenuada al 40 %: sigue siendo información) |

Las líneas cerradas **se muestran, no se ocultan**. Ocultarlas es reintroducir el modelo viejo por
la puerta de atrás.

**«¿Por qué 179.000?» — la cadena, clicable en los dos sentidos.** El modelo lo llama «el puente de
vuelta al dinero». La pantalla lo hace navegable:

```
Cuenta de cobro DC-2026-00184   (179.000)
   └─ cargos que la componen           GET /subscription-billing/charges?subscriptionId=…
        ├─ RECURRING   «Núcleo + agenda…»          145.000
        └─ PRORATION   «Historia clínica»           34.000
              ├─ prorationDays 18 / periodDays 31   ← «18 de 31 días»
              └─ amendmentId → OTR-2026-00042
                    └─ abrió la línea CLINICAL_HISTORY, effectiveFrom 2026-03-14
```

**Requisito duro:** cada eslabón es un enlace, y cada uno tiene su vuelta. Desde una línea de
contrato se llega a su `createdAmendmentId` y a su `endedAmendmentId`; desde un otrosí, a las
líneas que abrió y cerró y al cargo que generó. Un prorrateo **siempre** se acompaña de su
fracción en texto — «18 de 31 días» — porque el modelo dice explícitamente que sin
`proration_days`/`period_days` explicárselo a un cliente que reclama *«pasa a ser un ejercicio de
arqueología»*.

**Lo que NO se construye.** Un diagrama de barras tipo Gantt de las vigencias. Es tentador y es un
componente nuevo, complejo, con su propio problema de accesibilidad (una barra no tiene nombre
accesible). La tabla con `onDate` responde la misma pregunta con cero componentes nuevos. Si algún
día se quiere, va después de medir que la tabla no basta; queda anotado en §8, no aquí.

### 3.4 · El estado de una cuenta

Seis estados, y una política **innegociable**: no existe ni existirá corte total de acceso. Un
moroso baja a solo lectura y **nunca** pierde la consulta de su propia historia clínica.

**La interfaz no puede sugerir que exista un botón de bloquear.** Esto se traduce en cuatro reglas
concretas:

1. **El vocabulario está fijado aquí y no se improvisa.** El mapa actual
   (`src/features/subscriptions-admin/components/SubscriptionStatusBadge.vue:9-16`) es correcto en
   los rótulos y se conserva; se le añade la frase de apoyo, que es donde vive la política:

   | Estado | Rótulo (**no cambiar**) | `variant` | Frase de apoyo obligatoria en el expediente |
   |---|---|---|---|
   | `TRIALING` | En prueba | `neutral` | «Prueba hasta el {trialEndDate}.» |
   | `ACTIVE` | Activa | `success` | «Al día. Próximo cobro el {nextBillingDate}.» |
   | `PAST_DUE` | Pago vencido | `warning` | «Debe desde el {pastDueSince}. **Sigue trabajando con normalidad**; le quedan {n} días de cortesía.» |
   | `READ_ONLY` | Solo lectura | `danger` | «**Consulta e impresión activas.** Conserva el acceso a su historia clínica. No puede crear ni modificar.» |
   | `CANCELLED` | Cancelada | `neutral` | «Cancelada el {cancelEffectiveDate}. Motivo: {cancelReason}.» |
   | `EXPIRED` | Vencida | `neutral` | «Terminó el {currentPeriodEnd} y no se renovó.» |

   **Palabras prohibidas en toda la consola**: «bloquear», «bloqueada», «suspender el acceso»,
   «cortar», «desactivar la cuenta», «inhabilitar». Si un texto necesita una de ellas, el texto
   está mal, no el modelo. (`SUSPEND` es un `amendment_type` del contrato y se rotula
   **«Suspensión de facturación»**, nunca «Suspender cuenta».)

2. **No hay desplegable con los seis estados.** `PATCH /subscriptions/{id}/status` acepta un enum,
   pero exponerlo como `<select>` de seis opciones convierte una decisión de negocio en un cambio
   de campo. En su lugar, **transiciones con nombre**, y solo las que tengan sentido desde el
   estado actual:

   | Desde | Acciones ofrecidas |
   |---|---|
   | `TRIALING` | «Activar contrato» |
   | `ACTIVE` | «Marcar pago vencido» *(normalmente lo hace el sistema)* · «Cancelar contrato» |
   | `PAST_DUE` | «Pasar a solo lectura» · «Volver a activa (pago recibido)» · «Cancelar contrato» |
   | `READ_ONLY` | «Reactivar» · «Cancelar contrato» |
   | `CANCELLED` / `EXPIRED` | *(ninguna)* |

   Cada acción abre un modal con: la frase de consecuencia, un campo **`reason` obligatorio** (el
   modelo: *«el motivo, que es información de negocio, no burocracia»*), y confirmación explícita.
   El modal de «Pasar a solo lectura» lleva de forma literal, en `ds-banner--info`:
   > **La empresa conserva la consulta y la impresión de toda su información, incluida la historia
   > clínica.** Deja de poder crear y modificar hasta que se regularice el pago.

3. **El aviso vive en el expediente, no en un toast.** Con `PAST_DUE` o `READ_ONLY`, el expediente
   muestra un `ds-banner--warning` / `ds-banner--error` **persistente** en la cabecera, en las seis
   sub-vistas, con la salida primaria a mano: «Registrar pago». Es un estado permanente, así que va
   con `role="status"` (educado), no `role="alert"` — regla ya fijada en
   `docs/ux/patron-de-mensajes.md` §4.

4. **Cancelar separa las dos fechas.** `CancelSubscriptionRequest` y el modelo distinguen
   `cancel_requested_at` de `cancel_effective_date` (*«El cliente cancela el 10 y se va el 30, que
   es lo que ya pagó»*). El modal lo dice antes de confirmar: «Se solicita hoy, 10 de marzo. **El
   servicio sigue activo hasta el 30 de marzo**, que es el periodo ya pagado.»

### 3.5 · Dónde se ve el dinero

El modelo separa deliberadamente **devengar** (el servicio se prestó) · **facturar** (se emitió el
documento) · **cobrar** (entró la plata). La interfaz mantiene la separación y **la nombra**, en vez
de meterlo todo en «Facturación».

| Verbo | Tabla | Dónde se ve | Endpoint |
|---|---|---|---|
| **Devengar** | `subscription_charges` | `/suscripciones/:id/dinero`, bloque «Devengado» | `GET /subscription-billing/charges?subscriptionId=&status=` |
| **Facturar** | `subscription_billing_documents` | `/cobranza` (global) y `/suscripciones/:id/dinero` | `GET /system/subscription-billing/documents/{awaiting-external,overdue}` · `GET /subscription-billing/documents` |
| **Cobrar** | `subscription_payments` | `/cobranza` pestaña «Pagos» | `GET /system/subscription-payments` · `POST /subscription-payments` |

**La mitad que ocurre fuera de este software, y la lista de trabajo que genera.** La factura fiscal
de la suscripción la emite otro sistema; aquí solo se registra su referencia. Los documentos en
`AWAITING_EXTERNAL` son, literalmente, la lista de pendientes de alguien cada mes. Por eso
**`/cobranza` abre en esa pestaña**, no en un resumen.

Se diseña como **lista de trabajo, no como informe**. Diferencias concretas:

- **El titular es el recuento**, en `ds-display--sm`: «**7 documentos** esperando su factura
  fiscal». Un informe empieza por la tabla; una lista de trabajo empieza por cuánto queda.
- **Cada fila tiene una acción primaria y es la que la saca de la lista**: «Registrar factura
  externa» → modal con `invoiceNumber`, `cufe`, `issuedAt`, `provider` →
  `POST /system/subscription-billing/companies/{companyId}/documents/{id}/external-invoice`.
- **Antigüedad visible.** Columna «Esperando desde» con los días en texto («hace 14 días»), y el
  valor absoluto en `title`. ⚠️ El endpoint **no tiene parámetro de orden** ni de filtro: se
  documenta como limitación y se pide en el issue **B-3**. **No se ordena en cliente sobre una
  página**: ordenar 20 de 300 filas es mentir sobre cuál es el más viejo.
- **El vacío aquí es un éxito, no un hueco.** «**Todo facturado.** Ningún documento espera su
  referencia externa.» con `ICONS.SUCCESS`. Es un estado vacío distinto del de §3.7 y del de «la
  búsqueda no casó»; confundirlos es el defecto que el orden de ramas de `AppTable` (líneas 65-120)
  existe para evitar.

**Las cuatro pestañas de `/cobranza`**, que son un solo trabajo y por eso una sola entrada:

1. **Pendiente de facturar** — `AWAITING_EXTERNAL`. *(por defecto)*
2. **Vencidos** — `GET /system/subscription-billing/documents/overdue`. Es la cartera.
3. **Pagos** — `GET /system/subscription-payments`, con «Conciliar» (`PATCH …/reconciliation`) y
   cambio de estado (`PATCH …/status`). *Lo no conciliado es lo que hay que revisar cada mes.*
4. **Gestión de mora** — `GET /system/dunning-events`, el feed global. Sirve para lo que dice el
   modelo: *demostrar que se avisó antes de restringir la cuenta.*

**El signo, con la convención del modelo declarada en pantalla.** Los importes de un documento son
siempre positivos y el signo lo da su tipo; un cargo de anulación es negativo. Por tanto:
- Documentos: `documentKind` es el que informa (`INVOICE` / `CREDIT_NOTE` / `DEBIT_NOTE`), y una
  nota crédito **no se pinta en rojo con un menos**: se pinta con su badge.
- Cargos: el importe negativo lleva `ds-amount--neg` **y** el badge «Anulado». El color no es el
  único portador (WCAG §1.4.1), y de hecho el signo `−` ya está en la cifra.
- Todo importe va con `.ds-num` (`primitives.css:1296`) — alineado a la derecha y con
  `font-variant-numeric: tabular-nums`, sin excepción. Una columna de dinero sin cifras tabulares
  no se puede escanear.

### 3.6 · El configurador: dos pantallas muy distintas, un solo menú

`/configurador` con dos modos. Se implementan como **dos sub-rutas**, por la misma razón que §2.2:
`/configurador/cuestionario` y `/configurador/probar`.

#### A · Editar el cuestionario — `/configurador/cuestionario`

Es un **formulario** (§3.2): tiene «Editar» y «Guardar».

Estructura: preguntas (`GET /configurator/questions`, paginado) → opciones
(`GET /configurator/questions/{id}/options`) → efectos (`GET /configurator/effects`, paginado).

**Las condicionales no se pintan como árbol.** `parent_option_id` hace que «¿Cuántas cajas?» solo
aparezca si antes dijo que cobra en mostrador. La tentación es el patrón **Tree View** del APG; es
sobreingeniería para dos niveles y trae un contrato de teclado entero. En su lugar: lista plana en
orden de `sortOrder`, y las condicionales llevan una línea explícita encima, no una sangría:

> `ds-kicker` → **Solo aparece si:** «Sí, tengo punto de venta» (de *¿Cobras en mostrador?*)

Es más honesto (dice la condición, no la insinúa con margen izquierdo) y es legible por lector de
pantalla sin ningún ARIA.

**El efecto es la fila peligrosa, y se edita como una frase.** Un efecto mal puesto es cotizar de
menos. Una fila de tres `<select>` con `optionId`, `catalogItemId` y `effect` en códigos es
exactamente donde eso pasa. Por eso el editor de efectos es una **frase con huecos**
(`EffectSentence.vue`, §6.2):

> Si responde **[ Sí, tengo punto de venta ▾ ]** → **[ fija la cantidad de ▾ ]**
> **[ Terminal (TERMINAL) ▾ ]** en **[ el número que escriba el cliente ▾ ]**

Los cuatro efectos, en castellano y sin códigos visibles:

| `effect` | Se lee | Campo extra |
|---|---|---|
| `ADD` | «añade» | — |
| `REMOVE` | «quita» | — |
| `SET_QUANTITY` | «fija la cantidad de … en» | `quantity` (número) |
| `QUANTITY_FROM_ANSWER` | «fija la cantidad de … en el número que escriba el cliente» | — (requiere pregunta `NUMBER`) |

Cada `<select>` de la frase lleva su `<label>` en `.ds-sr-only` («Respuesta que dispara el
efecto», «Qué hace», «Artículo afectado»): la frase da el contexto visual y la etiqueta da el
nombre accesible (WCAG §4.1.2). **La frase no sustituye a la etiqueta.**

#### B · Probarlo — `/configurador/probar`

Renderiza `GET /configurator/questionnaire` **exactamente como lo ve el prospecto** y envía
`POST /configurator/resolve` con `{ selectedOptionIds: number[], numericAnswers: object }`,
pintando `ConfiguratorSelectionResponse.items` como el carrito resultante.

**Cómo se previsualiza el efecto de un cambio antes de publicarlo — y el problema real.**

El contrato **no tiene estado de borrador en el configurador** (§1.3). Un `PUT` sobre un efecto
cambia el cuestionario en vivo. Eso significa que **una previsualización de datos sin publicar es
hoy imposible**, y decirlo es más útil que fingir lo contrario. La respuesta de diseño tiene tres
partes, dos que se implementan ya y una que se pide:

1. **Comparación antes/después con instantánea local.** Antes de guardar un efecto, la pantalla
   guarda en memoria el resultado de `POST /configurator/resolve` para un **escenario de
   referencia** (el conjunto de respuestas que el comercial tenga cargado en la pestaña «Probar»,
   o el escenario «Spa Ana Pet» precargado). Tras guardar, vuelve a resolver y muestra **las dos
   listas en paralelo**, con lo añadido, lo quitado y lo que cambió de cantidad marcado con texto:

   ```
   Antes (12 artículos)                Después (12 artículos)
   …                                   …
   Terminal ×1                         Terminal ×3        ← cantidad: 1 → 3
                                       Historia clínica   ← AÑADIDO
   Inventario                                             ← QUITADO
   ```

   Cada diferencia lleva **la palabra** («AÑADIDO», «QUITADO», «cantidad: 1 → 3»), no solo un
   color de fondo (§1.4.1). El bloque de comparación es `role="status"`: el resultado aparece
   después de una acción del usuario y hay que anunciarlo.

   Es previsualización *a posteriori inmediata*, no *previa*. Se llama por su nombre en la
   interfaz: el encabezado dice **«Qué cambió al guardar»**, no «Vista previa».

2. **Toda escritura del cuestionario pasa por `useConfirmDialog` con la consecuencia en vivo.**
   Literal, sin suavizar: *«El cuestionario no tiene borrador: este cambio afecta al siguiente
   prospecto que entre en el configurador.»* Un cambio de efecto añade además: *«Un efecto mal
   puesto se traduce en cotizar de menos.»*

3. **Se pide el estado de borrador al backend** (issue **B-2**). El precedente está dentro del
   propio modelo: `price_lists` ya tiene `DRAFT → PUBLISHED → ARCHIVED` por exactamente la misma
   razón. Que el configurador no lo tenga es una asimetría del modelo, no una decisión.

**Un escenario guardado, no un formulario que se rellena cada vez.** La pestaña «Probar» conserva
el último escenario en `sessionStorage` (no en Pinia global: es un borrador de trabajo, no estado
de aplicación) y ofrece **«Spa Ana Pet»** precargado como escenario de referencia, porque es el
caso que guía todo el modelo y porque un escenario fijo hace comparables dos ejecuciones separadas
en el tiempo.

### 3.7 · Qué NO se puede hacer todavía, y cómo se dice

**El hecho.** El catálogo comercial no está sembrado por decisión de producto. Hoy no hay artículos
ni tarifa publicada, y el alta de una empresa falla con un error que enumera lo que falta. **Las
pantallas van a arrancar vacías.**

**El defecto que hay que evitar.** `AppEmptyState` dice hoy «Aún no hay registros»
(`AppTable.vue` rama 4). En una consola recién desplegada eso se lee como *«esto está roto»* o
*«los datos no cargaron»*, y el operador abre un ticket. NN/g, *Empty State Interface Design*: un
estado vacío de arranque es una oportunidad de onboarding, no un error.

**La regla de decisión, para que se pueda aplicar sin pensar:**

> Si una lista está vacía **y no hay ningún filtro ni búsqueda aplicados** **y** el recurso es un
> **prerrequisito de arranque de la plataforma**, entonces el estado no es «sin resultados»: es
> **«falta el paso N de la puesta en marcha»**, y lleva la lista de pasos y sus enlaces.

**El componente: `PlatformSetupChecklist.vue`** (§6.2). No es un `AppEmptyState` con más texto: son
cinco prerrequisitos con estado independiente y destino propio, y `AppEmptyState` tiene un solo
slot de acción.

Los pasos, en orden de dependencia real, cada uno con la llamada que decide su estado:

| # | Paso | Cómo se comprueba | ¿Bloquea el alta? |
|---:|---|---|---|
| 1 | Al menos un artículo `ACTIVE` en el catálogo | `GET /catalog-items` → alguno con `status === 'ACTIVE'` | **Sí** |
| 2 | Cada artículo `MODULE` activo tiene sus submódulos puenteados | `GET /catalog-items/{id}/sub-modules` por artículo | **Sí** — sin esto se vende algo que no abre ninguna pantalla (§1.4) |
| 3 | Una lista de precios `PUBLISHED` y vigente | `GET /price-lists` → `status === 'PUBLISHED'` y `validTo` vacío o futuro | **Sí** |
| 4 | Precio para cada artículo activo en esa lista | `GET /catalog-prices?priceListId=…` → cubre los ids del paso 1 | **Sí** |
| 5 | Configuración de facturación con lista por defecto | `GET /platform-billing-config` → `defaultPriceList` no nulo | **Sí** |
| 6 | Una secuencia de numeración `DC` | `GET /system/billing-document-sequences` | **Sí** |
| 7 | Cuestionario con al menos una pregunta | `GET /configurator/questions` → `total > 0` | No — *«recomendado»* |

**Los textos, fijados aquí para que sean idénticos en todos los sitios donde aparezcan:**

- Encabezado: **«Puesta en marcha de la plataforma»**
- Recuento: **«{n} de 6 pasos obligatorios completados»**
- Cuerpo: **«Todavía no se puede dar de alta una empresa. El alta fallará hasta que los seis pasos
  obligatorios estén completos.»**
- Cada paso: `ds-pill` + icono + **«Listo»** / **«Pendiente»** / **«Recomendado»**, y el rótulo es
  un enlace al sitio donde se hace.

**Dónde se pinta:**

| Sitio | Forma |
|---|---|
| `/catalogo-comercial`, cuando el catálogo está vacío | Completo, arriba, sustituyendo al `AppEmptyState` |
| `/cotizaciones` y `/suscripciones` vacías | **Compacto** — una línea: «Faltan {n} pasos de la puesta en marcha para poder {cotizar\|contratar}. → Ver los pasos», enlazando a `/catalogo-comercial` |
| `/configurador/probar`, si no hay preguntas | Compacto, apuntando al paso 7 |
| **El fallo del alta de empresa** | **Completo**, con los mismos textos, mapeando el `ProblemDetail` del servidor a los mismos pasos |

Ese último es el que cierra el círculo. GOV.UK, *Validation pattern*: el mensaje del resumen y el
mensaje del sitio donde se arregla tienen que ser **literalmente el mismo texto**. Si el servidor
enumera lo que falta con otras palabras que la lista de puesta en marcha, el operador cree que son
dos problemas distintos.

**Accesibilidad del bloque** (detalle en §5.3): es una `<ol>` dentro de una región con
`role="status"` y `aria-live="polite"`, para que al volver de completar un paso el cambio de
recuento se anuncie sin robar el foco. El recuento va **también en el encabezado visible**, no solo
en la región viva: un vidente que vuelve a la pantalla necesita el mismo dato.

---

## 4 · Pantalla por pantalla

Convenciones que aplican a **todas** y no se repiten en cada ficha:

- **Carga.** Primera carga → esqueleto de `AppTable` (`skeletonRows`). Refresco con filas ya
  pintadas → **no se borra la tabla** (regla de `AppTable.vue`, comentario de cabecera). Velo
  global solo lo que ya hace `http.client`. **`PawLoader` es el único loader**; prohibidos
  spinners de Lucide y rotaciones CSS sueltas (R06 de `reglas-de-interfaz.md`).
- **Error.** `AppTable` con `:error` y `:trace-id` → banner `role="alert"` con «Reintentar» y traza
  copiable. **El error se pinta antes que el vacío** (R05). Los avisos van por `useToast()` con
  `errorFrom(titulo, error)` (`src/composables/useToast.ts:42`), **nunca** con el texto del error
  escrito a mano.
- **Sin permiso.** El `permissionGuard` de `src/router/guards/` decide la ruta. Dentro de una
  pantalla, una acción sin permiso **no se pinta**; no se pinta deshabilitada. Excepción: si
  ocultarla dejaría la pantalla sin ninguna salida, se pinta con `ds-banner--info` explicando
  quién puede hacerlo. ⚠️ `src/constants/permissions.ts` tiene hoy **una sola** constante
  (`company.create`): los códigos de permiso de estas 54 rutas no están inventariados. Issue
  **B-4**.
- **Vacío.** Tres vacíos distintos y no se confunden: *puesta en marcha* (§3.7) · *la búsqueda no
  casó* · *no hay nada y está bien* (p. ej. «Sin solapes detectados»).
- **Paginación.** `AppPagination` + `useServerPaged` + `useQuerySync` (los tres existen). Todos los
  listados de estas rutas son `?page=&pageSize=` con `PageResponse<T>`.
- **Formato.** Dinero con `Intl.NumberFormat('es-CO', { style:'currency', currency:'COP' })` y
  clase `.ds-num`. Fechas `dd/mm/aaaa`. Nulo → `—`. ⚠️ Hoy hay tres formatos conviviendo:
  `BillingDocumentsTable.vue:29-32` (sin símbolo), `CommercialCatalogView.vue:115-121` (con
  divisa) y `SubscriptionsAdminView.vue:38-40`, que **no formatea nada** — devuelve el ISO crudo.
  Unificar en un `src/composables/format.ts` (el tenant ya tiene uno; la consola no) es parte de
  la tarea **W1-A**.

---

### 4.1 · Catálogo y precios — `/catalogo-comercial` *(existe · se completa)*

**Propósito.** Definir qué se puede vender y a cuánto. Es el paso 0 de todo lo demás.

**Lo que ya está y no se toca**: CRUD de `catalog_items`, CRUD de `price_lists` con
publicar/archivar, CRUD de `catalog_prices` sobre la lista seleccionada, guarda de cambios sin
guardar (`useUnsavedChangesGuard`) y confirmaciones con consecuencia. Está bien resuelto.

**Lo que falta** — las tres tablas puente sin editor (§1.4). Se añaden como **sub-vista del
artículo**, `/catalogo-comercial/articulos/:id`, con tres bloques:

| Bloque | Endpoints | Nota de diseño |
|---|---|---|
| **Qué pantallas abre** (`catalog_item_sub_modules`) | `GET/POST/DELETE /catalog-items/{id}/sub-modules` | Selector múltiple contra `GET /sub-modules`, **filtrando por `sellable === true`** (el campo se llama `sellable` en `SubModuleResponse`, no `isSellable`): evita que «Configuración del sistema» aparezca como artículo vendible. Cada opción muestra además `readOnlyCapable`, con la advertencia «Esta pantalla **no admite solo lectura**: al dar de baja el artículo quedará oculta, no en consulta.» — es la diferencia entre una baja limpia y una pantalla rota. Ayuda: «Un artículo puede abrir varias pantallas; "Historia clínica" abre consultas, hospitalización y prescripciones.» |
| **Reglas** (`catalog_item_dependencies`) | `GET/POST/PUT/DELETE /catalog-items/{id}/dependencies` | Tres tipos con su texto: `REQUIERE` «no se puede vender sin», `RECOMIENDA` «el configurador lo sugiere», `EXCLUYE` «no pueden coexistir». El campo `note` **es obligatorio en la interfaz aunque el esquema lo permita vacío**: es el mensaje que lee el cliente («Facturar electrónicamente necesita el módulo de Caja»), y sin él sale un error críptico. |
| **Qué trae el paquete** (`bundle_components`) | `GET/POST/PUT/DELETE /catalog-items/{id}/components` | **Solo visible si `itemType === 'BUNDLE'`.** No deshabilitado: no existe para los demás tipos. |

**Aviso de ciclos.** El modelo advierte: *«Las dependencias entre artículos no forman ciclos
indirectos… el configurador entra en bucle y no se puede cotizar»*, y lo clasifica como regla que
garantiza el código. Si el backend rechaza el alta por ciclo, el mensaje debe nombrar **la cadena
concreta** («A requiere B, B requiere C, C requiere A»), no «dependencia inválida». Si el backend
no lo detecta, es issue **B-6**.

---

### 4.2 · Configurador — `/configurador/{cuestionario,probar}` *(nueva)*

Diseño completo en §3.6.

| Sub-vista | Endpoints |
|---|---|
| `/configurador/cuestionario` | `GET/POST /configurator/questions` · `GET/PUT/DELETE /configurator/questions/{id}` · `GET /configurator/questions/{id}/options` · `POST/PUT/DELETE /configurator/options[/{id}]` · `GET/POST/PUT/DELETE /configurator/effects[/{id}]` |
| `/configurador/probar` | `GET /configurator/questionnaire` · `POST /configurator/resolve` |

`ResolveConfiguratorSelectionRequest` = `{ selectedOptionIds: integer[], numericAnswers: object }`.
Respuesta: `ConfiguratorSelectionResponse { items: SelectedItemResponse[] }`.

**Tipos de respuesta** (`answer_type`) y su control:

| `answerType` | Control | Patrón |
|---|---|---|
| `SINGLE` | `<fieldset>` + radios | APG *Radio Group* (nativo basta) |
| `MULTI` | `<fieldset>` + `AppCheckbox` | nativo |
| `NUMBER` | `<input type="number">` con `min`/`max` del artículo | — |
| `BOOLEAN` | dos radios «Sí» / «No», **no** un `switch` | Un `switch` implica un ajuste que se guarda; esto es una respuesta |

Cada pregunta es un `<fieldset>` con `<legend>` = `questionText`, y `helpText` en un `<p>` referido
por `aria-describedby` desde el `fieldset`. Es el patrón del *Forms Tutorial* del W3C para grupos.

---

### 4.3 · Cotizaciones — `/cotizaciones` y `/cotizaciones/:id` *(nueva)*

**Propósito.** El embudo comercial: quién pidió precio, qué se le ofreció, y quién no volvió.

**Lista** — `GET /quotes/platform` (paginado). Es la ruta de plataforma; **no** `GET /quotes`
(§1.1). Columnas: `quoteNumber` · `company.name ?? prospectName` · estado · `totalAmount`
(`.ds-num`) · `validUntil` · `createdDate`.

La columna de cliente resuelve el prospecto y la empresa en una: si `company` viene, se pinta el
nombre con enlace a `/empresas/:id`; si no, `prospectName` con `ds-meta` «Prospecto». **Esta es la
única familia cuyo DTO sí trae el nombre** — aprovecharlo, y usarlo como argumento en el issue
**B-1**.

**Detalle** — `GET /quotes/{id}` → `QuoteResponse` con `lines[]` y `answers[]`.

Es **documento en cuanto sale de `DRAFT`** (§3.2). Chasis `DocumentSheet`. Tres bloques:

1. **La oferta.** Totales guardados (`subtotalAmount`, `discountAmount`, `taxAmount`,
   `totalAmount`), no recalculados. El pie lo dice: «Importes congelados al {createdDate} con la
   tarifa #{priceListId}.»
2. **Las líneas.** `item_code`/`item_name`/`item_type` son **copias congeladas**. Si el artículo se
   renombró después, se pinta el nombre congelado y, si difiere del actual, un `ds-meta`: «Hoy se
   llama "…"». Eso es fidelidad al documento **y** utilidad para soporte.
3. **Por qué se cotizó eso** — `answers[]`. El modelo insiste en que *no es accesorio*: es la única
   forma de responder «¿por qué le vendimos esto?» seis meses después. Se pinta como pares
   pregunta/respuesta legibles (usando `questionCode` + `answerValue`), **no** como ids.

**Acciones por estado** (jerarquía: una primaria, el resto `ds-btn--ghost`):

| Estado | Primaria | Secundarias |
|---|---|---|
| `DRAFT` | **Enviar** (`POST /{id}/send`) | Eliminar (`DELETE /{id}`) |
| `SENT` | **Marcar aceptada** (`POST /{id}/accept`) | Marcar rechazada (`POST /{id}/reject`) |
| `ACCEPTED` / `REJECTED` / `EXPIRED` | *(ninguna)* | Ver el contrato que originó, si lo hay |

«Enviar» es una puerta de un solo sentido: `useConfirmDialog` con consecuencia «A partir de aquí la
cotización no se puede editar ni eliminar. Si el precio cambia, se emite otra.»

`AcceptQuoteRequest` pide `acceptedByEmail`. La **IP no se pide**: la pone el servidor desde la
petición (`QuoteController.java:134-146`, *«una prueba que el cliente escribe no prueba nada»*).
**No añadir un campo de IP al formulario.**

`clientRequestId` (llave de idempotencia) lo genera el front con `crypto.randomUUID()` **una vez al
abrir el formulario**, no en cada envío: es lo que hace que un doble clic no cree dos cotizaciones.

---

### 4.4 · Contratos — `/suscripciones` y el expediente `/suscripciones/:id/*` *(lista existe · expediente nuevo)*

#### 4.4.1 · Lista — `/suscripciones` *(existe, se ajusta)*

`GET /platform-subscriptions` + `GET /platform-subscriptions/item-overlaps`. La vista actual está
bien planteada. Tres ajustes:

1. **La fila lleva a algún sitio.** Hoy no navega. Se hace clicable (`.ds-row-clickable`,
   `primitives.css:1400`) hacia `/suscripciones/:id/resumen`, **y además** la primera celda es un
   `<RouterLink>` real: una fila clicable sin un enlace dentro no es alcanzable por teclado.
2. **`formatDate` devuelve hoy el ISO crudo** (`SubscriptionsAdminView.vue:38-40`). Se corrige con
   el formateador compartido.
3. **El panel de solapes se mantiene y se sube de rango.** `SubscriptionOverlapsPanel.vue` es una
   pieza excelente: vigila la regla que el modelo dice que la base **no puede** garantizar
   (*«dos tramos con fechas de fin futuras que se pisen»*) y su vacío es un éxito, no un hueco. Es
   el ejemplo a imitar. **No tocar salvo el badge de recuento.**

El badge «Solo lectura» del encabezado (línea 65) **se elimina** cuando el expediente exista: dejará
de ser cierto.

#### 4.4.2 · Expediente — `/suscripciones/:id/*` *(nueva, seis sub-vistas)*

**El armazón**, común a las seis, en `SubscriptionRecordLayout`:

```
┌──────────────────────────────────────────────────────────────────────┐
│ ‹ Contratos                                                          │  breadcrumb
│ SUS-2026-00184                          [Activa]  [Vigente]          │  ds-display--xs + badges
│ Spa Ana Pet · NIT 900.123.456-7 · empresa #42                        │  ds-meta + enlace
│ Ciclo mensual · periodo 01/03 → 31/03 · próximo cobro 01/04          │  ds-meta
│ ⚠ Debe desde el 04/03. Sigue trabajando; le quedan 3 días…  [Pago]   │  banner condicional
├──────────────────────────────────────────────────────────────────────┤
│ Resumen │ Lo contratado │ Historia │ Acceso │ Dinero │ Cobranza      │  <nav> de RouterLink
└──────────────────────────────────────────────────────────────────────┘
```

**La identidad de la empresa es permanente y no se puede perder de vista.** Es la respuesta de
diseño a §1.1: cinco de las seis sub-vistas llaman a rutas que actúan sobre *una empresa*, y la
cabecera del expediente es la que dice cuál, en todo momento y en todas las sub-vistas. Ninguna
acción destructiva se confirma sin repetir el nombre de la empresa en el texto del modal
(«¿Cancelar el contrato **SUS-2026-00184** de **Spa Ana Pet**?»).

⚠️ **`SubscriptionResponse` no trae el nombre** (§1.2). Hasta que el issue **B-1** se resuelva, el
expediente hace **una** llamada extra a `GET /companies/{companyId}` al montar el armazón —una vez,
no por sub-vista— y pinta `—` con un `ds-meta` honesto si falla. Un `#42` como única identidad de
una empresa sobre cuyo contrato se va a actuar es inaceptable.

**Las seis sub-vistas:**

| Ruta | Propósito | Endpoints | Tipo |
|---|---|---|---|
| `/resumen` | Estado, periodo, permanencia, renovación, cancelación | `GET /subscriptions/{id}` | mixto |
| `/contratado` | **Qué tenía el {fecha}** (§3.3) | `GET /subscriptions/{id}/items?onDate=` | documento |
| `/historia` | Otrosíes + cambios de estado, en una línea de tiempo | `GET /{id}/amendments` · `GET /{id}/status-history` | documento |
| `/acceso` | Lo que puede usar hoy y sus contadores | `GET /entitlements` · `GET /entitlements/access` · `POST /entitlements/recalculate` | derivado |
| `/dinero` | Devengado · facturado · cobrado (§3.5) | `GET /subscription-billing/charges?subscriptionId=` · `GET /subscription-billing/documents` | documento |
| `/cobranza` | Expediente de mora de esta cuenta | `GET /dunning-events?subscriptionId=` · `POST /dunning-events` | documento |

**Detalles que no son obvios:**

**`/resumen`** es el único sitio con acciones sobre el contrato: cambio de estado (§3.4) y
cancelación. `commitmentEndDate` (permanencia del plan anual) se pinta como aviso cuando hay
cancelación pendiente: «Permanencia hasta el {commitmentEndDate}».

**`/contratado`** — las acciones sobre líneas viven aquí, no en «Resumen», porque es donde se ve el
efecto:
- **«Añadir artículo»** → `POST /subscriptions/{id}/items` (`AddSubscriptionItemRequest`).
- **«Cambiar cantidad»** → `POST /subscriptions/{id}/items/quantity`. Nótese que responde **201**,
  no 200: **no edita la línea, cierra una y abre otra**. El modal lo dice: «Se cerrará la línea
  actual y se abrirá una nueva desde el {fecha}. La línea anterior queda en el expediente.»
- **«Dar de baja»** → `PATCH /subscriptions/{id}/items/remove`. El modal, literal:
  > **No se borra nada.** La línea queda en el expediente con fecha de fin del {fecha}, y los datos
  > de la empresa pasan a **solo lectura**, no se eliminan.

  El artículo con `isCore` **no ofrece la acción**: la baja la rechaza el backend y ofrecerla es
  prometer algo que no existe.
- Los tres llevan `clientRequestId` (antiduplicados: *«dos clics en "Añadir" no generan dos
  cobros»*) y `reason`.
- **El prorrateo se muestra antes de confirmar si el contrato lo permite.** ⚠️ **No hay endpoint de
  previsualización de prorrateo** en el contrato. Se declara como limitación y se pide (issue
  **B-7**). Mientras tanto el modal advierte: «Se calculará el proporcional de los días que quedan
  del periodo (hasta el {currentPeriodEnd}). El importe exacto aparecerá en el otrosí.»

**`/historia`** — una sola lista ordenada por fecha, fusionando dos endpoints, con el tipo de
entrada como distintivo textual. Es «la película del contrato». Cada otrosí muestra
`monthlyDeltaAmount` con su signo y su lectura: «la factura recurrente sube 34.000 al mes».

**`/acceso`** — es la única sub-vista de datos **derivados**, y se dice: `ds-banner--info` «Esto no
se edita: se calcula desde el contrato. Si algo no cuadra, la verdad está en *Lo contratado*.»
`recalculatedAt` se pinta siempre, porque el modelo dice que *«si esta fecha se queda vieja, hay un
proceso caído — es un indicador de salud, no un adorno»*: si supera 24 h, badge `warning` «Recálculo
atrasado».
- `accessLevel` con tres rótulos: `FULL` «Uso normal» · `READ_ONLY` «Solo consulta» · `NONE` «No
  disponible».
- `source` con cuatro: `SUBSCRIPTION` «Contratado» · `TRIAL` «En prueba» · `CORE` «Núcleo» ·
  `MANUAL_GRANT` **«Concedido a mano»** — este último con badge `warning`, porque el modelo dice
  que *«queda constancia de que fue a mano»* y esa constancia tiene que verse.
- `POST /entitlements/recalculate` es acción secundaria con confirmación. No es destructiva, pero
  no debe parecer un refresco de página.
- Capacidades (`capacities`): `used_quantity` / `limit_quantity` con `<progress>` nativo y el texto
  «7 de 10 usuarios». Al 100 %, aviso y enlace a ampliar. Un `<progress>` con su `<label>` no
  necesita ARIA.

**`/cobranza`** — `POST /dunning-events` registra un aviso hecho por fuera (llamada, WhatsApp).
`channel ∈ {EMAIL, SMS, WHATSAPP, PHONE, IN_APP}`. Sirve para *«demostrar que se avisó antes de
restringir la cuenta»*, así que el formulario pide `detail` y no lo deja vacío.

---

### 4.5 · Cobranza — `/cobranza/*` *(existe · se replantea)*

Diseño en §3.5. Cuatro sub-rutas: `/cobranza/pendientes` *(por defecto)* · `/vencidos` ·
`/pagos` · `/mora`.

`BillingDocumentsTable.vue` se conserva y se le añaden la columna de antigüedad y la columna de
acción. Sus mapas de rótulos (líneas 34-52) ya son correctos y **no se cambian**.

**Mitigación de §1.2 mientras el contrato no traiga el nombre.** El `companyId` se pinta como
`<RouterLink to="/empresas/:id">#42</RouterLink>` — un número, pero navegable, y con
`aria-label="Empresa 42"` para que el lector de pantalla no anuncie «almohadilla cuarenta y dos».
**No** se hace una llamada por fila para resolver el nombre: 20 peticiones por página es peor que
el problema.

**Registrar un pago** — `POST /subscription-payments`. ⚠️ Esta ruta usa `currentCompanyId()`, así
que **exige `X-Company-Id`** (§1.1). Por eso el alta de un pago **se hace desde el expediente del
contrato** (`/suscripciones/:id/dinero`), donde la empresa es explícita, y desde `/cobranza/pagos`
solo se **consulta** (`GET /system/subscription-payments`), se **concilia** y se **cambia el
estado**. Esas dos últimas también son company-scoped: la fila navega al expediente para
ejecutarlas. Es una restricción del contrato convertida en una decisión de diseño coherente — la
empresa nunca es implícita.

`gateway` + `gatewayReference` son únicos juntos: el mismo aviso de la pasarela recibido dos veces
no crea dos pagos. Si el backend devuelve conflicto, el mensaje debe decir **«Ese pago ya estaba
registrado»**, no «violación de restricción única».

---

### 4.6 · Facturación de plataforma — `/configuracion/facturacion` *(nueva)*

**Propósito.** *«Las políticas del negocio, en un sitio»*: una sola fila, y los contadores de
numeración.

Es un **formulario**, el más claro de todos. Dos bloques:

1. **Políticas** — `GET/PUT /platform-billing-config`. Campos: `defaultPriceList` (selector contra
   `/price-lists` filtrado a `PUBLISHED`), `defaultGraceDays`, `defaultTrialDays`,
   `invoiceDayOfMonth` (1-28, y el texto dice por qué no 29-31), `defaultPaymentTermDays`
   (`0` = pago inmediato, y se dice), `externalBillingProvider`.

   Cada campo lleva `helpText` con su consecuencia, porque **son los valores por defecto de todo
   contrato nuevo**: «Días de cortesía tras el vencimiento antes de pasar a solo lectura. Se puede
   subir por contrato para un cliente grande.»

   Validación con la convención del repo: validador puro → `computed errors` → mapa `touched` →
   error solo tras `@blur` → `defineExpose({ validate })` → `ErrorSummary` del padre
   (`src/components/feedback/ErrorSummary.vue`, con `toSummaryItems` y el orden del DOM
   explícito). **Nunca validación prematura.**

2. **Numeración** — `GET/POST /system/billing-document-sequences`. Solo alta y consulta: **no hay
   `PUT`**, y con razón. La interfaz no ofrece editar `nextValue`; el texto lo explica: «El
   consecutivo lo lleva la base de datos. No se puede ajustar a mano: un salto crea un hueco en la
   numeración.» Alta de una serie nueva con confirmación fuerte.

---

## 5 · Accesibilidad WCAG 2.2 AA — en las decisiones, no como coletilla

### 5.1 · Orden de foco en los flujos largos — §2.4.3 (A)

Los dos flujos largos son el **configurador de prueba** (§4.2 B) y el **alta de líneas de
contrato** (§4.4.2).

**Al avanzar de paso**, el foco va al `<h2>` del paso nuevo, que lleva `tabindex="-1"`. No se
queda en el botón «Siguiente» (que puede desaparecer) ni salta al principio del documento (que
obliga a re-tabular la cabecera entera). Es el mismo mecanismo que `ErrorSummary.vue:56-58` ya usa
para su propio `focus()`.

**Al fallar la validación**, el foco va al `ErrorSummary` —`role="alert"`, `tabindex="-1"`— y desde
él cada enlace mueve el foco al control, no solo el hash. Eso ya está implementado
(`ErrorSummary.vue:63-69`, con el comentario que explica por qué el salto por hash no sirve con un
contenedor `overflow:auto`). **Reutilizar, no reescribir.**

**En los modales** (`ModalShell`): foco inicial y `Escape` ya funcionan. ⚠️ **No hay trampa de
foco** — es un hueco conocido y sistémico de los dos fronts, no de estas pantallas. Se hereda; se
menciona para que ninguna instancia crea que lo tiene que resolver aquí. Está en el inventario
general de accesibilidad, no en esta especificación.

**En el expediente**, la barra de sub-vistas es un `<nav aria-label="Secciones del contrato">` de
enlaces. Al navegar entre sub-vistas, el foco lo gestiona el router como en el resto de la consola:
no se fuerza. Cambiar de sub-vista **no** es cambiar de paso de un asistente.

### 5.2 · El estado de una cuenta no se comunica solo por color — §1.4.1 (A)

**El estado ya lleva texto hoy** y eso hay que preservarlo: `SubscriptionStatusBadge` renderiza
`AppBadge` con `label`, no un punto de color. La regla para todo lo nuevo:

> Ningún estado, en ninguna tabla de estas pantallas, se comunica con fondo, borde o punto **sin
> su rótulo textual al lado**.

Aplicado a lo que se añade:
- Estado de línea de contrato (Vigente / Programada / Cerrada) → badge con texto.
- Estado de documento (`DRAFT` / `AWAITING_EXTERNAL` / `EXTERNAL_REGISTERED` / `VOIDED`) → ya
  resuelto con texto en `BillingDocumentsTable.vue:40-45`.
- Diferencias del comparador del configurador → **la palabra** «AÑADIDO» / «QUITADO», no un fondo
  verde/rojo.
- Cargo anulado → badge «Anulado» **además** del importe negativo.
- Pasos de la puesta en marcha → «Listo» / «Pendiente» **además** del icono.

`.ds-status-dot` (`primitives.css:1366`) puede usarse **solo como refuerzo**, con `aria-hidden` y
siempre acompañado del rótulo. Nunca solo.

**Sobre el color: no se inventa ninguno.** Los cuatro pares de `AppBadge` vienen de `tokens.css` y
su propio comentario dice que están medidos contra §1.4.3 (DS-01). Cualquier distinción nueva se
resuelve con **texto, icono y forma**, no con un quinto tono. Eso es correcto por accesibilidad
**y** por design system a la vez.

### 5.3 · Cómo se anuncia un estado que cambia — §4.1.3 (AA)

Se sigue la tabla ya fijada en `docs/ux/patron-de-mensajes.md` §4.1. Aplicación concreta:

| Qué cambia | Región | `role` | Por qué |
|---|---|---|---|
| Resultado de «Ver a fecha» en «Lo contratado» | la tabla | `status` (polite) | Consulta, no urgencia. `AppTable` ya trae una región `ds-sr-only role="status"` (líneas 51-55) |
| Comparación antes/después del configurador | el bloque de comparación | `status` | Aparece tras una acción y hay que anunciarlo, sin interrumpir |
| Recuento de la puesta en marcha | la `<ol>` | `status` + `aria-live="polite"` | Al volver de completar un paso, el cambio se anuncia sin robar el foco |
| Banner de `PAST_DUE` / `READ_ONLY` | el banner | `status` | Condición permanente, no interrupción |
| Validación fallida de un formulario | `ErrorSummary` | `alert` | Ya implementado |
| Fallo del servidor en una tabla | el banner de `AppTable` | `alert` | Ya implementado |
| Éxito de una escritura | `ToastStack` (`aria-live="polite"`) | — | Ya implementado |

**Regla negativa, para que nadie la incumpla por exceso de celo:** una región `aria-live` que
cambia en cada pulsación de tecla es ruido. El anuncio de «Ver a fecha» va al `change` del
`<input type="date">`, no al `input`.

### 5.4 · Contraste — §1.4.3 y §1.4.11 (AA)

- **No se introduce ningún color nuevo.** Todo sale de `tokens.css` y de los tonos `ds-tone--*`.
  Eso hace que la conformidad heredada se mantenga sin re-medir.
- **El color va en el tono, nunca en el `<style scoped>`.** Trampa de especificidad de
  `AGENTS.md`: una primitiva global pesa `(0,1,0)` y una regla base en `scoped` con `[data-v-…]`
  pesa `(0,2,0)` y le gana siempre. La base del componente **solo geometría**; el color viaja en
  `ds-tone--*` desde el marcado, incluido el estado por defecto.
- **§1.4.11, 3:1 en bordes de control.** `.ds-icon-btn` ya declara `border: 1px solid
  var(--warm-450)` con el comentario «A11Y-09: era var(--warm-200) (1,23:1). Es un control (se
  pulsa): --warm-450 da 3,55:1» (`primitives.css:1072-1076`). Todo control nuevo usa esa
  primitiva; **no se declara un borde propio.**
- **Anillo de foco**: `--ring` / `--ring-danger` de `tokens.css`, vía la primitiva de foco. Regla
  R03 de `reglas-de-interfaz.md`.
- ⚠️ **No medí ningún contraste en este trabajo.** No corrí `ds:audit` ni ningún cálculo de
  luminancia. Lo anterior son citas de las mediciones que el propio repositorio dejó escritas, no
  mediciones mías. Ver §9.

### 5.5 · Tamaño de objetivo — §2.5.8 (AA, 24×24 px CSS)

`.ds-icon-btn` mide **28 × 28 px** (`primitives.css:1069-1070`): cumple con margen. Toda acción de
fila usa esa primitiva. Los enlaces de la barra de sub-vistas del expediente deben tener al menos
24 px de alto efectivo — se consigue con el `padding` de la pestaña, y es lo que hay que verificar
si alguien la comprime en pantalla estrecha.

### 5.6 · Formularios — §3.3.1 (A), §3.3.3 (AA)

Se aplica la convención documentada del repositorio, sin sustituirla:

1. `<label for>` real en todo control. La frase del editor de efectos (§3.6) **no** sustituye a la
   etiqueta: cada `<select>` lleva la suya en `.ds-sr-only`.
2. Error asociado con **`aria-describedby`** apuntando al `id` del mensaje, y `aria-invalid="true"`
   en el control. ⚠️ La ausencia de `aria-describedby` es un hueco sistémico verificado de los dos
   fronts; **estas pantallas nuevas no lo heredan**: se implementa desde el principio. Es más
   barato hacerlo bien una vez que corregirlo en 30 features después.
3. El texto del error en línea y el del `ErrorSummary` son **literalmente el mismo string** (GOV.UK,
   *Validation pattern*). `toSummaryItems` ya está construido para eso.
4. **Nunca validación prematura**: el error solo aparece tras `@blur` del campo o tras un
   `validate()` fallido del formulario.
5. §3.3.3 *Error Suggestion*: el mensaje dice qué hacer. «Introduce un día entre 1 y 28», no
   «Valor inválido».

### 5.7 · Otros criterios que tocan estas pantallas

- **§2.4.6 Headings and Labels (AA).** Un `<h1>` por pantalla. En el expediente, el `<h1>` es el
  número de contrato (identifica el expediente); cada sub-vista abre con `<h2>`.
- **§2.4.2 Page Titled (A).** `document.title` por ruta, vía `meta.title` del router — R08 de
  `reglas-de-interfaz.md`. Para el expediente: «SUS-2026-00184 · Lo contratado · VetSoftware».
- **§1.3.1 Info and Relationships (A).** Las cifras de las capacidades usan `<progress>` con
  `<label>`, no un `div` con `width: 70%`.
- **§2.2.2 Pause, Stop, Hide.** El esqueleto de carga de `AppTable` anima. `prefers-reduced-motion`
  está apagado globalmente en `src/assets/styles/base.css:108` en esta consola (más la regla
  específica de `primitives.css:1678`); se hereda y **no se añade una regla local**.
- **§1.4.10 Reflow (AA).** Las tablas de dinero son anchas. `.ds-table-scroll` (`primitives.css:737`)
  las desplaza en vez de recortarlas — R15 de `reglas-de-interfaz.md`, ya sujeta con test. Aplicar
  a todas las tablas nuevas.

---

## 6 · Coherencia con el design system

### 6.1 · Lo que se reutiliza, sin excepción

Regla de partida: **un componente de más es deuda**, y `stylelint-plugins/no-duplicate-primitive.mjs`
(FE-08) rechaza el `<style>` de un SFC que reescriba una primitiva. Además `css-budget.mjs` es un
trinquete (`maxStyleMinusScript: 0`, `maxDuplicateGroups: 0`, `maxSfcLines: 500`,
`maxOversizedSfc: 0`): **ninguna propuesta de aquí puede implicar subir esos números.**

| Necesidad | Lo que ya existe | Ruta |
|---|---|---|
| Listado con carga / error / vacío | `AppTable` (4 ramas, esqueleto, traza copiable) | `src/components/ui/AppTable.vue` |
| Paginación | `AppPagination` + `useServerPaged` + `useQuerySync` | `src/components/ui/`, `src/composables/` |
| Distintivo de estado | `AppBadge` (4 tonos medidos) | `src/components/ui/AppBadge.vue` |
| Modal | `ModalShell` (`role="dialog"`, `aria-modal`, `aria-labelledby`, Escape, foco inicial) | `src/components/ui/ModalShell.vue` |
| Confirmación destructiva | `useConfirmDialog` con `message` + `consequence` + `confirmLabel` | `src/composables/useConfirmDialog.ts` |
| Resumen de errores | `ErrorSummary` + `toSummaryItems` | `src/components/feedback/ErrorSummary.vue` |
| Avisos | `useToast()` con `errorFrom(titulo, error)` | `src/composables/useToast.ts:42` |
| Carga | `PawLoader` — **el único** | `src/components/feedback/PawLoader.vue` |
| Cambios sin guardar | `useUnsavedChangesGuard` | `src/composables/` |
| Campos | `AppInput`, `AppSelect` (con `combobox`/`listbox`/`option`), `AppTextarea`, `AppCheckbox` | `src/components/ui/` |
| Vacío accionable | `AppEmptyState` (con slot de salida) | `src/components/feedback/AppEmptyState.vue` |
| Enlace activo con `aria-current` | patrón `<RouterLink custom>` + `isActive` | `AppSidebar.vue:224-247` |

Primitivas CSS que se consumen tal cual, **sin reescribirlas**: `.ds-num` (1296), `.ds-table` +
`.ds-table-scroll` (1159, 737), `.ds-tab--active` (1422), `.ds-pill` + `.ds-status-dot` (1349,
1366), `.ds-amount--pos/neg` (1321, 1326), `.ds-row-clickable` / `.ds-row-hover` (1400), `.ds-empty`
(444), `.ds-banner--{error,warning,success,info}` (211-229), `.ds-detail-grid` (620),
`.ds-error-summary` (1692), `.ds-sr-only` (1591), `.ds-skeleton` (1653), `.ds-col-actions` (1384),
`.ds-icon-btn` (1066), `.ds-stack`, `.ds-head`, `.ds-block-head`, `.ds-kicker`.

> **Contrato de las primitivas, del propio `primitives.css` (revisión final, 3ª pasada):** *«se
> diseñaron para REEMPLAZAR una regla local, no para competir con ella. Adoptarlas significa BORRAR
> la regla scoped que sustituyen.»* Si una primitiva necesita ganarle a algo vivo, esa regla viva es
> el defecto — no el peso de la primitiva. **No se usa `!important`** (R07).

### 6.2 · Lo nuevo — tres componentes, cada uno justificado

Solo tres. Cada uno con por qué no bastaba lo que hay y a cuántas pantallas alcanza.

#### `PlatformSetupChecklist.vue` — `src/components/feedback/`

- **Por qué no basta `AppEmptyState`.** Tiene `title`, `description` y **un** slot de acción. Aquí
  hacen falta seis pasos con estado independiente y destino propio cada uno.
- **Alcance:** ≥ 4 pantallas (`/catalogo-comercial`, `/cotizaciones`, `/suscripciones`,
  `/configurador/probar`) más el fallo del alta de empresa. Sin componente, seis copias del mismo
  bloque y el gate de duplicados acabaría marcándolo.
- **Construcción:** `ds-empty--boxed` + `ds-stack` + `<ol>` + `ds-pill` por paso. Cero CSS nuevo:
  toda la geometría sale de primitivas. Dos modos por prop: `variant: 'full' | 'compact'`.
- **Semántica:** `role="status"`, `aria-live="polite"`, recuento también en el `<h2>` visible.

#### `DocumentSheet.vue` — `src/components/ui/`

- **Por qué no basta `ds-card`.** Es la materialización de la decisión §3.2. Envuelve el chasis de
  documento: regla superior, número como titular, sello «Documento · solo se agrega», los datos en
  `<dl>` sobre `ds-detail-grid`, y un slot de acciones que **solo acepta verbos de añadir**.
- **Alcance:** 6 tipos de documento (cotización enviada, otrosí, línea, cargo, cuenta de cobro,
  pago) en 5 pantallas. Sin él, la diferencia documento/formulario dependería de que seis
  implementadores distintos la recordaran, que es precisamente el fallo que se quiere evitar.
- **Construcción:** `ds-frame` (275) + `ds-detail-head` (535) + `ds-detail-grid` (620) +
  `ds-pill` (1349). Cero color propio.
- **Contrato:** props `documentNumber`, `kindLabel`, `sealText`; slots `meta` (el `<dl>`),
  `body`, `actions`, `chain` (la cadena de corrección). **No expone ninguna prop `editable`.**

#### `EffectSentence.vue` — `src/features/configurator/components/` · *P3, negociable*

- **Por qué.** §3.6: tres `<select>` con códigos es donde un comercial se equivoca y se cotiza de
  menos. La frase con huecos es la mitigación.
- **Alcance:** una sola pantalla. Es el más débil de los tres y por eso va en P3. Si el
  implementador encuentra que tres `AppSelect` etiquetados en una fila con un `aria-describedby`
  que lea la frase resultante consigue lo mismo, **es una alternativa aceptable** — el requisito es
  que la fila se lea como una frase, no el componente.

#### Lo que se decidió NO crear

| Descartado | Por qué |
|---|---|
| `AppTabs.vue` (patrón Tabs del APG) | Las sub-vistas son rutas (§2.2). Un `<nav>` de `RouterLink` no necesita el contrato de teclado del `tablist`, y el patrón exacto ya está resuelto en `AppSidebar.vue:224-247`. |
| Un componente de línea de tiempo / Gantt | La tabla con `onDate` responde la misma pregunta (§3.3). Una barra sin nombre accesible es un problema nuevo. |
| Un `AppDateInput` | `<input type="date">` nativo trae calendario, teclado y localización. La consola no tiene primitiva de fecha (el tenant sí, `DateInput`): **no es el momento de abrir esa divergencia por un solo control.** |
| Un `AppTimeline` para `/historia` | Es una `<ol>` con `ds-stack`. |
| Una variante nueva de `AppBadge` | §5.2: las distinciones nuevas van por texto e icono, no por un quinto tono. |

### 6.3 · Nota estructural, para el registro

Estas pantallas añaden componentes al catálogo `App*` del admin (`src/components/ui/`). El tenant
usa prefijo `Base*` y los dos catálogos **solo solapan en `ModalShell`** (gemelo byte a byte, no
declarado en la tabla TR-02). Cada componente `App*` nuevo ensancha esa divergencia. No es motivo
para no crearlos —el tenant no tiene ninguna de estas pantallas ni debe tenerlas— pero conviene que
quede escrito: **la unificación de los dos catálogos de primitivas sigue siendo la recomendación de
fondo del sistema**, y cada adición la encarece un poco.

---

## 7 · Prioridad de implementación y paralelización

**Criterio de orden**: primero lo que desbloquea a otros, luego lo que hoy obliga a usar un cliente
HTTP a mano, y al final lo que solo mejora.

### Onda 1 — arranca ya, cinco tareas **totalmente independientes**

Ninguna comparte fichero con otra. Cinco instancias en paralelo.

| # | Tarea | Rutas | Depende de | Bloquea a |
|---|---|---|---|---|
| **W1-A** | **Ámbito de empresa + formato compartido.** Envío condicional de `X-Company-Id`, `src/composables/format.ts`, inventario de permisos. | — | — | **toda la onda 2** |
| **W1-B** | **Puesta en marcha.** `PlatformSetupChecklist` + su cableado en 4 sitios. | 6 GET ya existentes | — | nada (pero cambia la percepción de todo) |
| **W1-C** | **Configurador**, las dos sub-vistas. | 9 | — | nada |
| **W1-D** | **Cotizaciones**, lista + detalle + acciones. | 7 | — | nada |
| **W1-E** | **Cobranza**, cuatro pestañas + registrar factura externa. | 4 + 5 `/system/**` | — | nada |
| **W1-F** | **Facturación de plataforma.** | 3 | — | nada |

> ⚠️ **W1-A no la hace `front-feature`.** Toca `src/services/http/http.client.ts`, gemelo TR-02
> (su cabecera lo declara en las líneas 42-47). **Va por `front-parity`**, y hay que decidir a la
> vez qué hace el front del tenant con esa misma rama del código. Es la tarea que hay que arrancar
> **primero**, porque es la única que bloquea a otras y la única con una frontera de agente.

W1-C, W1-D, W1-E y W1-F son viables **sin** W1-A: sus rutas son globales, o llevan `companyId` en la
URL, o resuelven con `currentCompanyIdOrNull()` (§1.1). Ese es todo el valor de haber hecho esa
clasificación antes de escribir nada.

### Onda 2 — el expediente del contrato. Necesita W1-A

| # | Tarea | Rutas | Depende de |
|---|---|---|---|
| **W2-A** | **Armazón del expediente**: rutas, cabecera con identidad de empresa, barra de sub-vistas, banner de estado, `/resumen` | `GET /subscriptions/{id}`, `PATCH /{id}/status`, `PATCH /{id}/cancel` | W1-A |
| **W2-B** | `/contratado` con `onDate` + las tres acciones de línea | `GET /{id}/items?onDate=`, `POST /{id}/items`, `POST /{id}/items/quantity`, `PATCH /{id}/items/remove` | **W2-A** |
| **W2-C** | `/historia` | `GET /{id}/amendments`, `GET /{id}/status-history` | **W2-A** |
| **W2-D** | `/acceso` | `GET /entitlements`, `GET /entitlements/access`, `POST /entitlements/recalculate` | **W2-A** |
| **W2-E** | `/dinero` + registrar pago | `GET /subscription-billing/charges`, `/documents`, `POST /subscription-payments` | **W2-A** |
| **W2-F** | `/cobranza` del contrato | `GET/POST /dunning-events` | **W2-A** |

**W2-A es un cuello de botella real y es corto.** Una vez esté, **B–F van en paralelo**: cada una
escribe su propia sub-vista y su propio módulo de API. Cinco instancias.

### Onda 3 — completar y pulir

| # | Tarea | Por qué puede esperar |
|---|---|---|
| **W3-A** | Los tres puentes del catálogo (§4.1) | Bloquea el arranque *funcional* (paso 2 de la puesta en marcha), pero no bloquea ninguna pantalla. Súbelo a onda 1 si el objetivo inmediato es sembrar el catálogo. |
| **W3-B** | `DocumentSheet` aplicado retroactivamente a los documentos ya pintados en W1 | En W1 se pintan con `ds-card`; migrarlos es cosmético y de bajo riesgo. |
| **W3-C** | `EffectSentence` | La alternativa de tres selects etiquetados es aceptable (§6.2). |
| **W3-D** | Enlace profundo de la cadena cargo→otrosí→línea en los dos sentidos | Alto valor, pero necesita W2-B y W2-E terminadas. |

### Resumen para repartir

```
YA (paralelo, 6 instancias):    W1-A(parity) │ W1-B │ W1-C │ W1-D │ W1-E │ W1-F
DESPUÉS de W1-A (1 instancia):  W2-A
DESPUÉS de W2-A (5 paralelo):   W2-B │ W2-C │ W2-D │ W2-E │ W2-F
CUANDO SE PUEDA:                W3-A │ W3-B │ W3-C │ W3-D
```

**Regla de no colisión**: ninguna instancia toca `src/router/index.ts` a la vez que otra. Cada
tarea aporta su propio `src/router/routes/<feature>.routes.ts` y **una sola** instancia (W1-B, la
más corta) registra los seis imports de golpe al final de la onda 1, con la lista ya acordada aquí.
`AppSidebar.vue` lo mismo: **un solo cambio, en W1-B**, con las dos entradas nuevas y el reorden
de §2.

---

## 8 · Lo que dejo fuera a propósito

| Fuera | Por qué |
|---|---|
| **Todo lo del tenant**: el configurador que ve Ana, «Ampliar mi plan», el aviso de solo lectura dentro de su app | Otro repositorio (`VetSoftwarePublicFront`) y no entra en el encargo. |
| **Extracción de literales a i18n** | No existe `vue-i18n` en ninguno de los dos fronts; todo el texto está en español en los templates. Es un proyecto en sí, no un efecto colateral de estas pantallas. |
| **Tema oscuro** | No existe hoy y abrirlo obliga a re-medir la rampa OKLCH entera. |
| **Línea de tiempo gráfica del contrato** | §3.3. La tabla con `onDate` responde la pregunta con cero componentes nuevos. |
| **Pantalla para `POST /quotes/expire-overdue`** | §2.1. Es un trabajo programado; un botón es cómo se ejecuta dos veces. |
| **Formulario de «crear suscripción»** (`POST /subscriptions`) | §2.1. El contrato nace con la empresa o con la aceptación de la cotización. |
| **Trampa de foco en `ModalShell`** | Hueco sistémico de los dos fronts, no de estas pantallas. Se hereda; corregirlo es una tarea de `front-parity` sobre un gemelo, y arreglarlo aquí lo dejaría divergente. |
| **Puertas de accesibilidad en CI** (`axe-core`, `eslint-plugin-vuejs-accessibility`) | No existe ninguna hoy en ninguno de los dos repos, y `eslint.config.ts` no lo cambia una auditoría de pantalla. Ya está abierto en [admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44). |
| **Migrar a Reka UI / Vuetify / cualquier librería** | Serían 405 SFC reescritos. La capa propia funciona y tiene sus gates. |

---

## 9 · Comprobaciones — qué medí y qué no

**Hecho, leyendo:**

- Las 366 rutas de `VetSoftware/api/openapi.json`, clasificadas por familia, con sus parámetros,
  DTO de petición y DTO de respuesta. El script de extracción es de un solo uso y no se versionó.
- El alcance de empresa de cada ruta, leyendo `Authz.java:48-65,155-175`,
  `SubscriptionController.java`, `QuoteController.java`, `EntitlementController`,
  `SubscriptionPaymentController`, `DunningEventController`, `SubscriptionBillingController` y
  `SystemSubscriptionBillingController`.
- Los campos de 15 DTO de respuesta, incluidos sus `enum`.
- Las tres features esqueleto completas y su cobertura real de rutas.
- `AppSidebar.vue`, `AppTable.vue`, `AppBadge.vue`, `AppEmptyState.vue`, `ErrorSummary.vue`,
  `SubscriptionStatusBadge.vue`, `SubscriptionOverlapsPanel.vue`, `BillingDocumentsTable.vue`,
  `http.client.ts`, `src/constants/permissions.ts`, `src/router/index.ts` y las 23 rutas.
- El inventario de familias de `primitives.css` (132 raíces `ds-*`) y las secciones concretas que
  cito, con su número de línea.
- El documento del modelo, completo.

**Comprobado con grep, con el comando al lado:**

- `grep -rn "X-Company-Id" src/` → **0**. La consola no envía la cabecera.
- `grep -rn "dependencies\|sub-modules" src/features/commercial-catalog/` → **0**. Los tres puentes
  no tienen editor.

**NO ejecutado. No lo doy por pasado:**

- ❌ **Ninguna medición de contraste.** No corrí `ds:audit`, ni un cálculo de luminancia, ni
  WebAIM. Los ratios que cito (3,55:1 de `--warm-450`, «medidos contra §1.4.3» de los tonos de
  `AppBadge`) son **citas de los comentarios del propio repositorio**, no mediciones mías.
- ❌ No levanté el backend ni el dev server. Ninguna respuesta real fue observada.
- ❌ No corrí `npm run quality`, ni Vitest, ni Playwright, ni el presupuesto de CSS.
- ❌ No verifiqué qué `@PreAuthorize` exige cada una de las 54 rutas ni si el rol de
  superadministrador los tiene — es el mismo hueco que ya declara [#145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145)
  en su sección «Qué NO comprobé». Sigue abierto y es el issue **B-4**.
- ❌ No comprobé si `/quotes/expire-overdue` está agendado en algún `@Scheduled`.
- ❌ No hay ninguna previsualización real de estas pantallas: nada de lo de aquí está renderizado.

---

## 10 · Issues propuestos

Buscados antes con `gh issue list --repo kefaroTech/vetsoftware-admin-web --state all --search
"suscripciones OR subscriptions OR cotizacion OR configurador OR billing"`. Resultado: solo el
**#145** (abierto) y los cerrados #91 y #110, ninguno duplica lo que sigue.

**No abro ninguno.** Van redactados para que los decida un humano.

### En `kefaroTech/vetsoftware-backend`

- **B-1 · La lista de plataforma no sabe el nombre de la empresa.**
  `SubscriptionResponse`, `BillingDocumentResponse` y `SubscriptionPaymentResponse` exponen
  `companyId: integer` y nada más, mientras `QuoteSummaryResponse` sí trae
  `company: CompanySummary {id,name,identifier}` y `DunningEventResponse` trae resúmenes anidados.
  El contrato es inconsistente consigo mismo. Impacto: la lista de documentos esperando factura
  externa —el trabajo mensual de una persona— se lee como una columna de números opacos
  (`BillingDocumentsTable.vue:96`, `SubscriptionsAdminView.vue:97`). Petición: añadir
  `company: CompanySummary` a los tres, siguiendo el precedente de `QuoteSummaryResponse`.

- **B-2 · El configurador no tiene estado de borrador y el precio sí.**
  `price_lists` tiene `DRAFT → PUBLISHED → ARCHIVED` con `PATCH /price-lists/{id}/publish`, por la
  razón que el modelo explica: no cambiar retroactivamente lo que se ofreció. Las tres tablas del
  configurador no tienen `status` ni publicación, así que un `PUT /configurator/effects/{id}`
  cambia el cuestionario en vivo para el siguiente prospecto. Un efecto mal puesto es cotizar de
  menos, sin red. Petición: `status` + publicación en el configurador, con el mismo patrón que
  `price_lists`.

- **B-3 · `documents/awaiting-external` y `/overdue` no admiten orden ni filtro.**
  Solo `page` y `pageSize`. Es la lista de trabajo del cierre de mes y no se puede ordenar por
  antigüedad ni filtrar por empresa. Ordenar en cliente 20 de 300 filas mentiría sobre cuál es el
  más viejo. Petición: `sort` (por `createdDate`/`dueDate`) y filtro por `companyId`.

- **B-5 · ¿Está agendado `POST /quotes/expire-overdue`?**
  Si no lo está, las cotizaciones no caducan solas y `valid_until` no se cumple — *«alguien aparece
  en 2029 con una cotización de 2026 y tiene razón»*. **No comprobado**; se pregunta antes de
  afirmar. La consola no le va a poner un botón (§2.1).

- **B-6 · ¿Se detectan los ciclos indirectos entre dependencias de artículos?**
  El modelo lo lista como regla que garantiza el código: *«El configurador entra en bucle y no se
  puede cotizar.»* Si se detecta, el `ProblemDetail` debería nombrar la cadena concreta para que la
  consola pueda mostrarla. **No comprobado.**

- **B-7 · No hay previsualización del prorrateo antes de confirmar un cambio de contrato.**
  `POST /subscriptions/{id}/items` y `/items/quantity` devuelven el resultado ya aplicado. El
  operador confirma un cargo sin saber el importe, con Ana al teléfono. El modelo insiste en que un
  prorrateo debe poder reconstruirse (`proration_days`/`period_days`), pero no hay forma de verlo
  antes. Petición: un `POST …/items/preview` en seco.

### En `kefaroTech/vetsoftware-admin-web`

- **B-4 · Los permisos de las 54 rutas de suscripciones no están inventariados en el front.**
  `src/constants/permissions.ts` tiene **una** constante (`company.create`). Sin el inventario, o
  se ocultan acciones que el operador sí puede hacer, o se pintan las que no y fallan con 403 al
  pulsar. Es el mismo hueco que #145 declara sin cerrar. Bloquea el criterio «sin permiso» de §4.

- **B-8 · Las tres tablas puente del catálogo no tienen editor: 9 rutas con 0 consumidores.**
  `grep -rn "dependencies\|sub-modules" src/features/commercial-catalog/` → 0. La más grave es
  `catalog_item_sub_modules`: sin ella, vender «Historia clínica» no abre ninguna pantalla en la
  app del cliente. #145 cuenta `/catalog-items` como consumido, y por prefijo acierta; por función,
  no. Es el paso 2 de la puesta en marcha (§3.7) y la tarea **W3-A** (subible a onda 1).

- **B-9 · Tres formatos de fecha e importe conviviendo en la consola.**
  `BillingDocumentsTable.vue:29-32` formatea importes sin símbolo de moneda,
  `CommercialCatalogView.vue:115-121` con divisa, y `SubscriptionsAdminView.vue:38-40` **no formatea
  la fecha**: devuelve el ISO crudo al usuario. El tenant tiene `composables/format.ts` y la consola
  no. Parte de la tarea **W1-A**.

### Comentario que hay que dejar en el #145

El [#145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145) es el inventario correcto,
pero su plan de implementación arranca por lo que **no se puede hacer todavía**. El comentario
propuesto dice, en resumen:

1. Su prioridad 1 —«/subscriptions: gestión de líneas y cancelación sobre la ficha que ya existe»—
   **no es implementable hoy**: las diez rutas resuelven la empresa con `Authz.currentCompanyId()`,
   que para un system user exige la cabecera `X-Company-Id`, y la consola no la envía en ningún
   sitio. Es el prerrequisito real y es una tarea de paridad, no de feature.
2. Su prioridad 2 —configurador y cotizaciones— **sí es implementable ya y sin ningún
   prerrequisito**, igual que cobranza y la configuración de plataforma. Debería ir primero por eso.
3. Su prioridad 3 —`/entitlements`— **no debe ser una pantalla**: es tabla derivada y es
   company-scoped, así que una lista global es imposible. Su sitio es una sub-vista del expediente.
4. Falta una fila en la tabla del recuento: los tres puentes de `/catalog-items` (dependencias,
   componentes, submódulos) tienen 9 rutas y 0 consumidores, dentro de una familia contada como
   «sí».
5. Enlace a esta especificación y al reparto en ondas de §7.

---

## Fuentes

Consultadas para este documento. Las de norma se citan por criterio en el texto.

**Norma**
- WCAG 2.2 (Recommendation, republicada 2024-12-12) — https://www.w3.org/TR/WCAG22/
- ARIA Authoring Practices Guide, índice de patrones (30 patrones, verificado) —
  https://www.w3.org/WAI/ARIA/apg/patterns/
- Contraste mínimo §1.4.3 — https://www.w3.org/TR/WCAG22/#contrast-minimum
- No-text Contrast §1.4.11 — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Target Size Minimum §2.5.8 — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Tutorial de formularios del W3C — https://www.w3.org/WAI/tutorials/forms/

**Usabilidad**
- GOV.UK Design System, *Validation pattern* y *Error summary* —
  https://design-system.service.gov.uk/patterns/validation/ ·
  https://design-system.service.gov.uk/components/error-summary/
- NN/g, *Empty State Interface Design* —
  https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, *Error Message Guidelines for Forms* —
  https://www.nngroup.com/articles/errors-forms-design-guidelines/
- Heurísticas de Nielsen — https://www.nngroup.com/articles/ten-usability-heuristics/

**Del propio repositorio** (fuente de verdad por encima de cualquier documentación)
- `VetSoftware/api/openapi.json`
- `models/modelo-datos-suscripciones.html`
- `VetSoftwareFront/docs/ux/reglas-de-interfaz.md` (R03, R05, R06, R07, R08, R15)
- `VetSoftwareFront/docs/ux/patron-de-mensajes.md` (§4, canal y `role`)
- `VetSoftwareFront/AGENTS.md` (trampa de especificidad; FE-08)
- `VetSoftwareFront/src/assets/styles/primitives.css` y `tokens.css`
