# Consola de plataforma · Las pantallas de la ampliación (capas I–P)

> **Qué es esto.** La continuación de
> [`suscripciones-consola-especificacion.md`](suscripciones-consola-especificacion.md), que cubrió
> las capas **A–H** del modelo — lo que ya está construido en el backend. Aquí están las pantallas
> que exigen las **siete capas nuevas** (I a P): prueba gratuita con ventana, límites, cobrar en
> Colombia, la prueba documental, la contabilidad, el puente al contador y el cumplimiento con la
> medición.
>
> **Fuente única:** `models/modelo-datos-suscripciones.html`, revisión del 26-08-2026 — 96
> decisiones (D-01…D-96), 52 tablas nuevas, 13 reescritas. Cuando este documento cita `D-nn` o el
> nombre de una tabla o columna, es de ahí.
>
> **Alcance, recortado por el dueño el 27-08-2026:** **solo `VetSoftwareFront`, la consola de
> plataforma.** Todo lo de `VetSoftwarePublicFront` queda fuera y está enumerado en el §9 para que
> no se pierda.
>
> **Frontera de este documento:** especifica; no implementa. Nada de `src/` se toca aquí.
>
> **No gemelo — y no lo enlaces desde el README.** Igual que su antecesor, este documento es
> **exclusivo de la consola de plataforma**. Y `docs/ux/README.md` declara en su sección «Gemelo por
> contenido» que él y `reglas-de-interfaz.md` son **idénticos byte a byte en los dos fronts**:
> añadir ahí un enlace a este fichero **rompe esa paridad**. Si algún día se quiere indexar, se hace
> con una sección «Documentos propios de este repo» **añadida a los dos README a la vez**, y eso es
> trabajo de `front-parity`.
>
> Fecha: 2026-08-27 · Alcance recortado a la consola el mismo día.
> Issue de inventario: [admin-web #145](https://github.com/kefaroTech/vetsoftware-admin-web/issues/145).

---

## Contenido

- [0 · Para quién se diseña, y qué cambia respecto de A–H](#0--para-quién-se-diseña-y-qué-cambia-respecto-de-ah)
- [1 · Once hechos verificados que condicionan todo el diseño](#1--once-hechos-verificados-que-condicionan-todo-el-diseño)
- [2 · Navegación propuesta](#2--navegación-propuesta)
- [3 · Las nueve decisiones transversales](#3--las-nueve-decisiones-transversales)
- [4 · Inventario de pantallas](#4--inventario-de-pantallas)
- [5 · Pantalla por pantalla](#5--pantalla-por-pantalla)
- [6 · Accesibilidad WCAG 2.2 AA](#6--accesibilidad-wcag-22-aa)
- [7 · Coherencia con el design system](#7--coherencia-con-el-design-system)
- [8 · Orden de construcción y paralelización](#8--orden-de-construcción-y-paralelización)
- [9 · Fuera de alcance](#9--fuera-de-alcance)
- [10 · Decisiones que tomé yo](#10--decisiones-que-tomé-yo)
- [11 · Comprobaciones — qué medí y qué no](#11--comprobaciones--qué-medí-y-qué-no)
- [12 · Issues propuestos](#12--issues-propuestos)

---

## 0 · Para quién se diseña, y qué cambia respecto de A–H

La consola A–H la usaban **comercial** (cotizar, contratar) y **soporte** (mirar un contrato). La
ampliación mete tres usuarios más en la misma consola, y sus tareas no se parecen:

| Quién | Qué viene a hacer | Cuánto tiempo tiene | Qué le duele si sale mal |
|---|---|---|---|
| **Comercial** | negociar un techo, abrir una ventana de prueba, ver a quién llamar | minutos, con el cliente al teléfono | pierde la venta |
| **Soporte** | entender por qué una cuenta está bloqueada y corregir un contador mal migrado | con el cliente enfadado esperando | escribe en producción por SQL, que es exactamente lo que este modelo existe para impedir |
| **Administración / contabilidad** | cuadrar el mes, conciliar con el facturador, cerrar el periodo | una tarde al mes | una declaración con un número que nadie puede reconstruir |
| **Dirección** | ingreso recurrente, altas y bajas, población gratuita, coste por cliente | una vez al mes | decide precios a ciegas |

**La consecuencia de diseño, y gobierna todo lo que sigue:** casi ninguna pantalla nueva es un CRUD.
Son **operaciones con consecuencia** —subir un techo, corregir un contador, conceder un módulo,
devolver dinero, cerrar un periodo— y todas comparten la misma forma: *motivo obligatorio de lista
cerrada + texto libre, firma nominal, confirmación que dice la consecuencia en pesos o en cuentas,
y un hecho que se escribe y no se puede deshacer*. Eso no es burocracia: es lo único que separa esta
consola del `UPDATE` a mano que hoy es la única vía.

---

## 1 · Once hechos verificados que condicionan todo el diseño

Todos comprobados leyendo el árbol, no supuestos. Si algo cambia, cambia el diseño.

### 1.1 · **Ninguna de las capas I–P tiene backend.** Cero endpoints.

Verificado: `find src/main/java/com/vetsoftware/app -maxdepth 1 -type d` en `VetSoftware` devuelve
los módulos de A–H (`catalogitem`, `pricelist`, `configurator`, `quote`, `subscription`,
`subscriptionbilling`, `subscriptionpayment`, `entitlement`, `dunning`, `platformbillingconfig`) y
**ninguno** de `limitdimension`, `trialwindow`, `paymentrefund`, `paymentattempt`,
`accountingperiod`, `withholding`, `legaldocument`, `uvt`, `holiday`.

**Qué significa para esta especificación:** cada ficha de pantalla lleva sus endpoints **propuestos**,
no observados. Es la diferencia con la spec de A–H, donde las 366 rutas existían y solo había que
clasificarlas. Aquí el contrato HTTP hay que negociarlo con backend antes de escribir una línea de
Vue, y esta especificación es la propuesta.

### 1.2 · `company_capacities` existe y **no tiene endpoint de lectura propio**

`CompanyCapacityResponse` y `AdjustCompanyCapacityUsageUseCase` existen
(`app/entitlement/…/response/CompanyCapacityResponse.java`,
`app/entitlement/application/usecase/AdjustCompanyCapacityUsageService.java`), pero el único puerto
HTTP del módulo es `CompanyEntitlementController` con cuatro rutas:
`GET /entitlements/access`, `GET /entitlements`, `POST /entitlements/recalculate` y nada más.
Las capacidades viajan **anidadas dentro de `GET /entitlements/access`**
(`CompanyEntitlementController.java:88`).

**Consecuencia:** la pantalla de cupos de una empresa **ya tiene de dónde leer hoy** —esa es la
única pieza de la capa J que no arranca de cero—, pero solo con las cuatro unidades viejas
(`USER`, `BRANCH`, `TERMINAL`, `STORAGE_GB`) y sin `enforcement`, `warn_threshold`, `limit_source`,
`period_key` ni `over_limit_since`. La pantalla se puede empezar con lo que hay y se completa
cuando llegue la capa J.

### 1.3 · La corrección de consumo **aterriza en un puerto que ya admite al cliente**

El propio modelo lo avisa, y lo confirmo: `AdjustCompanyCapacityUsageUseCase` vive en el módulo
`entitlement`, cuyo controlador resuelve la empresa con `Authz.currentCompanyId()`. Si D-12 se
implementa sobre ese puerto, **la administradora de la clínica recupera su cupo cada vez que topa**.

**Consecuencia de diseño, y es dura:** la corrección de contador **no es un botón en la pantalla de
cupos**. Es un caso de uso nuevo, `POST /system/company-capacities/{id}/adjust`, bajo `/system/**`
—el prefijo que esta consola ya usa para lo que solo puede hacer plataforma
(`SystemSubscriptionBillingController`, `SystemDunningEventController`)— y con motivo y firma
obligatorios. Va en el issue **B-10**.

### 1.4 · La consola **no envía `X-Company-Id`**, y ahora sí lo necesita

`grep -rn "X-Company-Id" src/` en `VetSoftwareFront` devuelve **cinco comentarios y ninguna
implementación**: `billing-operations.api.ts:13`, `PaymentsTable.vue:24`,
`billing-operations.types.ts:51,113`, `OverdueDocumentsView.vue:20`. Todos dicen lo mismo — *esta
ruta no la puedo usar porque exigiría la cabecera*.

En A–H se pudo esquivar: las rutas eran globales o llevaban `companyId` en la URL. En la ampliación
**no se puede**: los cupos, la ventana de prueba, las autorizaciones de datos y el perfil fiscal son
todos *company-scoped*. **W1-A sigue siendo el cuello de botella y sigue sin hacerse.** Es tarea de
`front-parity` (toca `http.client.ts`, gemelo TR-02).

### 1.5 · El expediente del contrato ya existe, con seis sub-vistas y **URL de dos parámetros**

`/suscripciones/:companyId(\d+)/:id(\d+)/{resumen,contratado,historia,acceso,dinero,cobranza}`
(`src/router/routes/subscriptions-admin.routes.ts:90-113`). Las sub-vistas son rutas hijas con
carga diferida, no pestañas de componente, y el patrón está escrito y sujeto con prueba.

**Consecuencia:** las sub-vistas nuevas del contrato (`/prueba`) **se añaden a ese array**, no se
inventa otro chasis. Y la ficha de empresa nueva (§5.H) **copia ese patrón**, no inventa un tercero.

### 1.6 · `/empresas/:id` es hoy **un formulario de edición**, no un expediente

`CompanyDetailView.vue` son 82 líneas: `CompanyForm` + un banner de «empresa deshabilitada». No hay
contrato, ni cupos, ni cartera, ni estado comercial. Es la pantalla que soporte abre primero y la
que menos le sirve.

### 1.7 · El catálogo y el configurador **están construidos**, y les faltan piezas concretas

Verificado: `commercial-catalog/components/` tiene los once componentes (artículo, precios con
`tierMin`/`tierMax`, listas con `publishPriceList`/`archivePriceList`, los tres puentes:
`CatalogItemSubModulesPanel`, `CatalogItemDependenciesPanel`, `BundleComponentsPanel`).
`configurator/components/` tiene `EffectSentence`, `QuestionnaireRunner` y `SelectionDiff`.
`PriceListController` expone `PATCH /{id}/publish`, `PATCH /{id}/archive` y `PATCH /{id}/enable`.

Lo que **no** existe en ninguno de los dos: despublicar, la cobertura verificada contra artículos
activos, la vigencia por fecha (D-73), el simulador de tramos acumulativos (D-66), la política de
prueba por artículo, los cupos de fábrica, el congelado de composición (D-76) y la prioridad de
efectos del configurador.

### 1.8 · La lista de comprobación son **siete pasos y siete consultas desde el navegador**

`usePlatformSetup.ts:311-390` construye los siete pasos con siete sondas hechas por el navegador del
operador, y `platform-setup.types.ts:69-77` los enumera. El diseño de los tres estados
(`done`/`pending`/`unknown`) es correcto y **no hay que tocarlo**: `unknown` existe justamente
porque una sonda puede fallar y pintar eso como `pending` mandaría al operador a crear algo que
quizá ya existe.

Sus dos límites, escritos en el propio documento del modelo: **no hay sonda de servidor** —un
despliegue arranca sano con el catálogo vacío y nadie se entera hasta que alguien abre esa
pantalla— y **no cubre** festivos, unidad tributaria, ejes de límite ni textos legales.

### 1.9 · «Cobranza» son cuatro pestañas y le van a caer seis más

`/cobranza/{pendientes,vencidos,pagos,mora}` (`billing-operations.routes.ts:45-67`). La ampliación
trae documentos, aplicaciones, notas crédito, devoluciones, intentos, conciliación, liquidaciones,
reversiones y saldos a favor. **Diez pestañas en una barra no es una barra: es un menú mal puesto.**
Ver §2.

### 1.10 · **Un solo rol de plataforma** gobierna 216 operaciones (D-94)

Decidido dejarlo como está *por ahora*, con el disparador escrito: el día que entre la cuarta
persona —o el primer externo, empezando por el contador de D-84— hay que separarlo antes. Y la
infraestructura ya existe construida: las tablas de permisos por persona tienen su formulario y
**ninguna comprobación las lee**.

**Consecuencia de diseño:** ninguna pantalla de esta especificación puede apoyarse en un permiso
para esconder una operación peligrosa. **La barandilla es el motivo y la firma, no el rol.** Y
donde el documento nombra a un actor distinto —el contador externo que cierra periodos— la pantalla
**declara el rol que hará falta** en vez de fingir que existe.

### 1.11 · Los barridos son nueve, y **listan filas de todas las empresas**

Pruebas por vencer, cupos por reiniciar, mora, descuentos que suceden, saldos que caducan, avisos
por enviar, cobros por reintentar, certificados que faltan y documentos atascados.

**Consecuencia:** cada uno de esos nueve es una **lista de trabajo de plataforma** y merece pantalla
o pestaña propia — son literalmente las nueve preguntas que un operador se hace cada mañana. Pero
ninguna de ellas puede reutilizar un endpoint que el cliente también consuma. Se piden bajo
`/system/**`.

---

## 2 · Navegación propuesta

El menú de hoy son cuatro grupos. La ampliación **no añade un quinto grupo por capa** — eso sería
exponer el modelo. Añade **dos grupos** y reordena dentro de los existentes, porque hay exactamente
dos tareas nuevas que no caben en ninguna de las de hoy: *gobernar lo que se vende y lo que se
regala* (límites y pruebas) y *cuadrar el dinero con el mundo exterior* (conciliación, contabilidad,
fiscal).

```
General
  Dashboard                          /dashboard                          (existe)
  Empresas                           /empresas                           (existe · lista)
    └ expediente                     /empresas/:id/*                     ← NUEVO (8 sub-vistas)
  Empleados                          /empleados                          (existe)

Suscripciones                                                            (grupo existe)
  Catálogo y precios                 /catalogo-comercial                 (existe · se completa)
  Configurador                       /configurador                       (existe · se completa)
  Cotizaciones                       /cotizaciones                       (existe)
  Contratos                          /suscripciones                      (existe)
    └ expediente                     /suscripciones/:cid/:id/*           (existe · +1 sub-vista)
  Cobranza                           /cobranza/*                         (existe · se reparte)

Límites y pruebas                                                        ← GRUPO NUEVO
  Ejes de límite                     /limites/ejes                       ← NUEVO
  Excepciones negociadas             /limites/excepciones                ← NUEVO
  Cuentas desbordadas                /limites/desbordadas                ← NUEVO
  Ventanas de prueba                 /pruebas                            ← NUEVO
  Concesiones manuales               /accesos/concesiones                ← NUEVO

Dinero                                                                   ← GRUPO NUEVO
  Cobranza                           /cobranza/*                         (se mueve aquí)
  Documentos de cobro                /documentos                         ← NUEVO
  Conciliación                       /conciliacion/*                     ← NUEVO (3 pestañas)
  Contabilidad                       /contabilidad/*                     ← NUEVO (2 pestañas)
  Fiscal propio                      /fiscal/*                           ← NUEVO (3 pestañas)

Informes                             /informes/*                         ← NUEVO (1 entrada, 7 vistas)

Configuración
  … (sin cambios)
  Catálogos anuales                  /catalogos-anuales/*                ← NUEVO (5 pestañas)
  Textos legales                     /textos-legales                     ← NUEVO

Sistema
  Configuración                      /configuracion                      (existe)
  Facturación de plataforma          /configuracion/facturacion          (existe)
  Incidentes y caídas                /incidentes/*                       ← NUEVO (2 pestañas)
```

**Recuento: 52 tablas nuevas o reescritas → 13 entradas de menú nuevas.**

### 2.1 · Qué NO merece entrada de menú, y por qué

| Tabla / familia | Dónde vive en su lugar | Razón |
|---|---|---|
| `catalog_item_limits` (techos de fábrica) | Sección dentro del artículo, `/catalogo-comercial/articulos/:id` | Es una propiedad del artículo, como su precio y sus submódulos. Sacarla al menú obligaría a elegir el artículo dos veces. |
| `subscription_item_limits` (techo congelado) | Columna de `/suscripciones/:cid/:id/contratado` | Es la copia congelada de la línea. No es un registro que nadie visite: es un dato de la línea. |
| `company_limit_events` (bitácora de cupo) | Sub-vista `/empresas/:id/cupos` **y** feed en `/limites/desbordadas` | Nadie navega a «eventos de límite» en abstracto. O estás mirando una empresa, o estás haciendo la lista de a quién llamar. |
| `company_entitlement_snapshots` | Selector de fecha en `/suscripciones/:cid/:id/acceso` | La pregunta no es «dame las fotos», es «¿qué veía esta empresa el 3 de marzo?». Un `<input type=date>` sobre la pantalla que ya existe. |
| `company_trial_grants` | Dentro de `/pruebas/:companyId` y de `/empresas/:id/prueba` | Una concesión no existe sin su ventana. |
| `billing_document_status_history` | Bloque del detalle del documento | Gemela de `subscription_status_history`, que ya vive dentro del expediente. Misma decisión. |
| `subscription_billing_document_taxes` | Bloque del detalle del documento | Es el desglose de **ese** documento. |
| `data_processors`, `data_retention_rules` | `/configuracion` (bloques) | Seis filas y una tabla de reglas. No sostienen una entrada de menú. |
| `uvt_values`, `smmlv_values`, `public_holidays`, `vat_filing_periods`, `withholding_rate_rules` | **Una** entrada, `/catalogos-anuales`, cinco pestañas | Cinco tablas anuales sin dependencias entre sí, con la misma tarea: *«¿está sembrado el año que viene?»*. Cinco entradas de menú para eso es exponer el esquema. |
| `bank_receipts` | Bloque de `/conciliacion/liquidaciones` | Es la última milla de la conciliación, no un maestro. |
| `accounting_exports` | `/contabilidad/exportaciones` (pestaña) | Doce filas al año. |
| `acquisition_spend`, `company_service_costs`, `company_activity_months` | `/informes/*` | Son el insumo de un informe, no un CRUD que alguien visite. Salvo el gasto de adquisición, que **sí** hay que teclear: va como formulario dentro de `/informes/adquisicion`. |
| `company_usage_events` | Desglose dentro del cargo de excedente | §3.4. Y con la regla del identificador crudo. |

### 2.2 · Por qué «Cobranza» se parte y se muda

Hoy `/cobranza` tiene cuatro pestañas y le tocarían diez. Se reparte por **quién hace la tarea**,
que es lo que de verdad separa estas pantallas:

- **`/cobranza/*` — quien persigue el cobro.** Pendientes, vencidos, pagos, mora, **intentos**,
  **reversiones**. Seis pestañas. Todas responden «¿a quién hay que cobrarle y por qué no ha
  pagado?».
- **`/documentos` — quien emite.** Los documentos de cobro con su circuito, sus aplicaciones, sus
  notas crédito y sus devoluciones. Responde «¿qué se le cobró y con qué se saldó?».
- **`/conciliacion/*` — quien cuadra.** Facturador externo, liquidaciones de pasarela, saldos a
  favor. Tres pestañas. Responde «¿cuadra lo mío con lo de fuera?».

Tres tareas, tres pantallas, y ninguna con más de seis pestañas — que es el techo por encima del
cual una barra de pestañas deja de leerse de un vistazo.

---

## 3 · Las nueve decisiones transversales

### 3.1 · La forma de una operación con firma

**Nueve pantallas de esta especificación** hacen lo mismo con cosas distintas: subir un techo,
revocar una excepción, corregir un contador, conceder un módulo, abrir una ventana, devolver dinero,
condonar una deuda, cerrar un periodo, registrar una cesión. Todas comparten forma, y hay que
escribirla **una vez**:

```
┌─ Modal (ModalShell) ──────────────────────────────────────────┐
│ H2: <Verbo> <objeto> · <sujeto con nombre>                    │
│                                                                │
│ ── Qué cambia ──────────────────────────────────────────────  │
│  Antes:  300 mascotas  (de fábrica)                            │
│  Después: 500 mascotas (excepción negociada)                   │
│  Desde: 27/08/2026    Hasta: sin fecha (rige hasta revocarse)  │
│                                                                │
│ ── Por qué ─────────────────────────────────────────────────  │
│  [Motivo *]  ▼ Retención comercial                             │
│              (lista cerrada — permite agrupar en el informe)   │
│  [Detalle *] ______________________________________________    │
│              Llamada del 14/03, aprobada por Dirección Comer…  │
│              min. 15 caracteres · queda escrito para siempre   │
│                                                                │
│ ── Quién ───────────────────────────────────────────────────  │
│  Firma: Orlando Velásquez · orlidiaz@hotmail.com               │
│  (el usuario en sesión, no editable — es la firma)             │
│                                                                │
│ ⚠ Esta operación no se puede deshacer. Corregirla es escribir  │
│   otra que la compense, y las dos quedan.                      │
│                                                                │
│              [ Cancelar ]  [ Subir el techo a 500 ]            │
└────────────────────────────────────────────────────────────────┘
```

Cinco reglas, todas con criterio detrás:

1. **El botón dice la operación, no «Aceptar».** NN/g, *Ten Usability Heuristics* §6 —
   reconocimiento antes que recuerdo. «Subir el techo a 500» se puede leer con el diálogo entero
   fuera de foco; «Aceptar» exige recordar qué había arriba.
2. **Motivo en dos columnas: código de lista cerrada + texto libre.** Es la convención de nombres
   que el modelo fija literalmente («Motivo: siempre dos columnas»). El código permite agrupar el
   informe de a quién se le han hecho excepciones; el texto permite defenderla seis meses después.
   **Los dos obligatorios.** Un texto libre de tres caracteres no es un motivo: el mínimo es 15.
3. **La firma se muestra y no se elige.** Es el usuario en sesión. Un selector de «quién autoriza»
   convierte la firma en una afirmación.
4. **Antes / después, con la unidad y la procedencia.** El operador tiene que poder leer la
   consecuencia sin abrir otra pantalla. WCAG 2.2 §3.3.4 *Error Prevention (Legal, Financial, Data)*
   (AA) exige que las operaciones financieras sean reversibles, verificables o confirmadas: aquí no
   son reversibles por diseño, así que la única salida conforme es **confirmar mostrando qué se
   confirma**.
5. **La irreversibilidad se dice, no se insinúa.** Y con la razón: «se compensa con otra, y las dos
   quedan». Sin la razón parece una limitación técnica; con ella, se entiende que es la garantía.

### 3.2 · Un techo se pinta siempre con su procedencia

`company_capacities.limit_source` guarda la precedencia ya resuelta:
`COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE`. **Ningún número de techo se pinta
solo.** La forma canónica, en las cuatro pantallas donde aparece:

> **Mascotas registradas** · 412 de 500
> Techo de **500** porque hay una excepción negociada del 14/03/2026 → *ver la excepción*

Y con dos casos que hay que escribir bien porque son los que producen la llamada:

- **`NONE`.** No es «ilimitado». El modelo es explícito: *que no haya fila significa techo cero,
  jamás ilimitado*. Pero D-74 lo corrige a medias: si el eje nació **después** del contrato, sin
  fila significa **sin techo**, porque quien firmó antes no aceptó ese límite. Son dos «no hay
  fila» con significados opuestos, y la pantalla tiene que distinguirlos:
  - *«Sin cupo asignado — esta empresa no puede crear ninguna. Falta el techo en su contrato.»*
  - *«Sin techo — el eje "Citas" nació el 01/09/2026, después de este contrato.»*
- **Desbordado (`over_limit_since`).** No es un error del cliente. La frase, literal:
  *«412 mascotas sobre un cupo de 100 desde el 30/09/2026. Conserva y edita las que tiene; no puede
  crear la 413 hasta ampliar o bajar de 100.»* — que es D-13 palabra por palabra.

### 3.3 · Los contadores acumulativos se llaman por su nombre

D-11 corregido por D-61: en mascotas y propietarios, borrar libera plaza **a los treinta días**.
El modelo lo dice con una precisión que hay que respetar en el rótulo: *«ya no son mascotas
registradas históricamente, son las que hay»* — pero **la interfaz tiene que decir el retardo en el
momento de borrar, no en la letra pequeña**.

En la consola de plataforma eso se traduce en dos cosas:

- El contador se rotula **«Mascotas»**, con la nota **«borrar libera la plaza a los 30 días»**
  junto al número, no en un tooltip. Un tooltip no existe para quien navega con teclado sin
  detenerse, y esto es la explicación de por qué el número no baja.
- La bitácora (`company_limit_events`) muestra las plazas **en enfriamiento** como una fila propia:
  *«3 plazas se liberan el 26/09/2026»*. Sin eso, soporte no puede responder «borré cinco y sigo
  en el tope» más que abriendo la base.

### 3.4 · El desglose de un excedente: **número de documento y fecha, nunca el identificador crudo**

Es una regla del propio modelo —«el desglose que ve el cliente enseña número de documento y fecha,
nunca el identificador crudo: con él y una cabecera se salta al expediente clínico»— y **vale igual
en esta consola**, por tres razones que conviene escribir:

1. **El componente es el mismo.** El desglose de un cargo `OVERAGE` que se pinta aquí es el que
   mañana pinta el tenant. Si aquí lleva `usage_invoice_id` en el DOM, ahí también, y la fuga es
   del cliente.
2. **La consola no tiene contexto clínico.** Un operador que salta de una pantalla de dinero a un
   expediente clínico lo hace sin motivo registrado. D-91 dice que soporte **sí** puede entrar y que
   **queda constancia, incluidas las lecturas**. Un enlace crudo desde el desglose es exactamente el
   camino sin rastro que D-91 existe para cerrar.
3. **Un identificador no responde la pregunta.** La reclamación es «yo no emití 137». Lo que la gana
   es una lista de 137 números de factura con su fecha. El identificador interno no le dice nada ni
   al cliente ni al operador.

La forma:

```
Excedente de facturación · septiembre 2026
  Medido 137 · incluidas 100 · facturables 37 · 500 c/u → 18.500

  FE-2026-01043   03/09/2026
  FE-2026-01044   03/09/2026
  …                                                    [ Ver las 37 ]

  ¿Necesitas abrir uno de estos documentos en la clínica?
  [ Abrir con motivo ]  ← escribe la constancia de acceso (D-91)
```

El botón **no** es un enlace: abre el modal de §3.1 con motivo obligatorio, y solo entonces navega.
Ese es el único camino desde una pantalla de dinero hacia un dato de la clínica.

### 3.5 · Documento y formulario no se pintan igual

Se hereda de A–H §3.2 sin cambios y se extiende a las nuevas: un **documento** —una liquidación de
pasarela, un certificado de retención, una conciliación, un asiento resumen— se pinta con
`<dl class="ds-detail-grid">`, no con `<input disabled>`. Un input gris dice «editable, pero ahora
no»; aquí no hay ninguna operación de edición que exista, porque **estas tablas no se editan
jamás**.

**El corolario que sí es nuevo:** una tabla del bloque del dinero **no lleva botón de eliminar, en
ninguna fila, nunca.** Donde el operador esperaría «borrar» hay «revertir» o «compensar», y el
rótulo dice qué escribe: *«Contra-aplicar»*, *«Emitir nota crédito»*, *«Registrar devolución»*.
Un icono de papelera en una fila de `billing_document_applications` es una promesa que el esquema no
puede cumplir, y descubrirlo cuando el servidor responde 409 es la peor forma de aprenderlo.

### 3.6 · Cómo se dice «esto no se puede hacer, y no es un fallo»

Cuatro operaciones que un operador va a buscar y **no van a existir nunca**, por decisión:

| Lo que buscará | Dónde lo buscará | Qué dice la pantalla |
|---|---|---|
| Extender una prueba | `/pruebas/:companyId` | *«Una prueba no se extiende. La ventana es el techo con el que todo lo demás casa, y moverla es un error de la base de datos, no una regla que alguien recuerde (D-54). Si hace falta dar otra oportunidad, se abre una ventana nueva — y los módulos que ya probó siguen sin poder regalarse.»* Con el botón **«Abrir una ventana nueva»** al lado, que es la salida real. |
| Volver a conceder una prueba ya consumida | ídem | *«Este artículo ya se probó el 01/09/2026 y terminó en CONVERTED. Un artículo no se regala dos veces a la misma empresa, jamás (D-03).»* Sin botón. |
| Borrar un cargo, un pago o una aplicación | `/documentos/:id` | §3.5. |
| Editar una lista de precios publicada | `/catalogo-comercial` | *«Publicar congela la lista y sus precios. Subir precios es publicar una lista nueva.»* — ya está bien resuelto hoy y **no hay que tocarlo**. |

La regla que las une: **una operación que no existe se explica en el sitio donde se buscaría, con la
razón y con la alternativa.** Un botón deshabilitado no vale — no dice por qué y no se puede
enfocar para leer un `title`. Es el mismo criterio que `SubscriptionSummaryView.vue:184-187` ya
aplica bien: *«Un contrato terminado no cambia de estado ni se reabre: si la empresa vuelve, se
firma uno nuevo desde su cotización.»*

### 3.7 · Los nueve barridos se pintan como listas de trabajo, no como informes

Las nueve listas de §1.11 comparten estructura y hay que escribirla una vez:

- **Cabecera con el número y la fecha de corte:** *«17 pruebas vencen en los próximos 7 días · datos
  a 27/08/2026 09:14»*. Sin la hora de corte, el operador no sabe si está mirando algo de hace
  cinco minutos o de hace un día.
- **Ordenables por urgencia, y ordenadas por urgencia por defecto.** Lo más cercano a vencer, arriba.
- **La acción de la fila es la acción de la tarea**, no «ver detalle»: *Reintentar el cobro*,
  *Registrar el certificado*, *Registrar la factura externa*.
- **Vacío positivo.** *«No hay ningún cobro pendiente de reintento.»* — no «Sin resultados». NN/g,
  *Empty State Interface Design*: un vacío que es una buena noticia tiene que leerse como una buena
  noticia.
- **Y el vacío que NO es positivo se distingue.** Si la lista de pruebas por vencer está vacía
  *porque no hay ninguna ventana abierta en todo el sistema*, eso no es «todo en orden»: es la capa
  I desplegada apagada, que es un defecto conocido del propio modelo. La pantalla lo dice y enlaza a
  la puesta en marcha. Es la misma regla que ya gobierna `PlatformSetupChecklist`:
  *lista vacía + sin filtro + recurso que es prerrequisito → no es «sin resultados», es «falta un
  paso»* (`platform-setup.types.ts:11-12`).

### 3.8 · Dos números que nunca se pintan juntos sin decir cuál manda

El modelo cierra con una frase que es de interfaz tanto como de datos: *«el contador sirve para
avisar y para bloquear en el acto; los hechos son la verdad que se factura»*.

Donde la consola pinte los dos —la pantalla de cupos de una empresa— van con esa jerarquía escrita:

> **Facturas emitidas · septiembre** — 137 de 100
> El contador dice **137**. Los hechos registrados son **137**. ✓ cuadran.
>
> …o bien:
>
> El contador dice **137** y los hechos registrados son **134**. **Se factura 134.**
> El contador es una caché y puede desviarse; el desvío se corrige con un reconteo.
> [ Recontar ahora ]

Sin esa frase, una discrepancia de tres es una ambigüedad que nadie sabe resolver. Con ella, es un
defecto con lado correcto.

### 3.9 · La constancia de acceso de soporte (D-91) se pinta **dentro** de la empresa

No es un log de sistema en un rincón. Es una sub-vista de la ficha de la empresa,
`/empresas/:id/accesos`, y muestra **quién de plataforma entró, cuándo, a qué y con qué motivo —
incluidas las lecturas**. Dos razones:

1. Es la pregunta que la clínica hará, y la hará sobre **su** empresa. Buscarla en un feed global
   filtrado por empresa es la respuesta correcta a la pregunta equivocada.
2. Ponerla ahí la hace visible para el propio operador antes de entrar, y eso es la mitad del
   efecto. Un registro que solo se mira después de la queja no disuade a nadie.

---

## 4 · Inventario de pantallas

**56 pantallas.** `E` = existe · `E+` = existe y se completa · `N` = nace de cero.
**Bloqueante para vender** = sin ella no se puede cobrar el primer peso, o se puede cobrar mal.

### A · Puesta en marcha

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| A1 | Lista de comprobación ampliada | componente, 4 sitios | **E+** | **Sí** |
| A2 | Sonda de servidor de la puesta en marcha | `/dashboard` (bloque) | **N** | No |

### B · Límites

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| B1 | Ejes de límite — lista | `/limites/ejes` | **N** | **Sí** |
| B2 | Eje de límite — detalle | `/limites/ejes/:id` | **N** | **Sí** |
| B3 | Techos de fábrica del artículo | `/catalogo-comercial/articulos/:id` (sección) | **N** | **Sí** |
| B4 | Propagación de una mejora de cupo (D-75) | modal desde B3 | **N** | No |
| B5 | Excepciones negociadas — lista | `/limites/excepciones` | **N** | No |
| B6 | Negociar / revocar una excepción | modal | **N** | No |
| B7 | Cuentas desbordadas — la lista de a quién llamar | `/limites/desbordadas` | **N** | No |
| B8 | Cupos de una empresa | `/empresas/:id/cupos` | **N** | **Sí** |
| B9 | Corregir un contador (D-12) | modal desde B8 | **N** | **Sí** |
| B10 | Bitácora de cupo | bloque en B8 + feed en B7 | **N** | No |

### C · Prueba gratuita

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| C1 | Ventanas de prueba — lista | `/pruebas` | **N** | **Sí** |
| C2 | Ventana de una empresa y sus concesiones | `/pruebas/:companyId` | **N** | **Sí** |
| C3 | Abrir una ventana nueva (campaña) | modal | **N** | No |
| C4 | Pruebas por vencer — barrido | `/pruebas/por-vencer` | **N** | No |
| C5 | Desenlaces por artículo — conversión | `/informes/conversion-prueba` | **N** | No |
| C6 | La prueba dentro del contrato | `/suscripciones/:cid/:id/prueba` | **N** | No |

### D · Acceso y concesiones

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| D1 | Acceso del contrato | `/suscripciones/:cid/:id/acceso` | **E+** | No |
| D2 | Conceder un módulo a mano (D-92) | modal desde D1 | **N** | No |
| D3 | Concesiones manuales — registro global | `/accesos/concesiones` | **N** | No |
| D4 | Qué veía esta empresa el día X (snapshots) | selector en D1 | **N** | No |

### E · Catálogo y precios

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| E1 | Catálogo y precios | `/catalogo-comercial` | **E** | — |
| E2 | Cobertura de precios verificada contra artículos activos | banner en E1 | **N** | **Sí** |
| E3 | Despublicar una lista | acción en E1 | **N** | **Sí** |
| E4 | Vigencia por fecha y aviso de solape (D-73) | bloque en E1 | **N** | **Sí** |
| E5 | Simulador de tramos acumulativos (D-66) | bloque en E1 | **N** | **Sí** |
| E6 | Política de prueba del artículo | sección en `/…/articulos/:id` | **N** | **Sí** |
| E7 | Composición congelada — aviso de contratos vivos (D-76) | banner en `/…/articulos/:id` | **N** | **Sí** |
| E8 | Dependencias: documentación, no barandilla | aviso en el panel existente | **N** | No |
| E9 | Migrar contratos de tarifa | `/catalogo-comercial/migracion` | **N** | No |

### F · Configurador

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| F1 | Cuestionario | `/configurador/cuestionario` | **E** | — |
| F2 | Probar el cuestionario | `/configurador/probar` | **E** | — |
| F3 | Prioridad de los efectos | bloque en F1 | **N** | No |

### G · Dinero

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| G1 | Cobranza — pendientes / vencidos / pagos / mora | `/cobranza/*` | **E** | — |
| G2 | Documentos de cobro — lista con circuito | `/documentos` | **N** | **Sí** |
| G3 | Documento de cobro — detalle | `/documentos/:id` | **N** | **Sí** |
| G4 | Aplicaciones — qué salda qué (6 orígenes) | bloque en G3 | **N** | **Sí** |
| G5 | Registrar una retención con su certificado | modal desde G4 | **N** | **Sí** |
| G6 | Contra-aplicar una aplicación equivocada | modal desde G4 | **N** | No |
| G7 | Emitir nota crédito | modal desde G3 | **N** | **Sí** |
| G8 | Devoluciones | `/documentos/devoluciones` | **N** | No |
| G9 | Intentos de cobro fallidos y reintento | `/cobranza/intentos` | **N** | **Sí** |
| G10 | Reversiones de pago | `/cobranza/reversiones` | **N** | No |
| G11 | Saldos a favor — libro de asientos | `/conciliacion/saldos` | **N** | No |

### H · Conciliación

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| H1 | Conciliación con el facturador externo | `/conciliacion/facturador` | **N** | **Sí** |
| H2 | Liquidaciones de pasarela | `/conciliacion/liquidaciones` | **N** | No |
| H3 | Documentos sin factura externa pasados N días | pestaña en H1 | **N** | **Sí** |

### I · La empresa vista desde soporte

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| I1 | Empresas — lista | `/empresas` | **E** | — |
| I2 | Expediente: resumen | `/empresas/:id/resumen` | **N** | No |
| I3 | Expediente: datos (el formulario de hoy) | `/empresas/:id/datos` | **E** | — |
| I4 | Expediente: cupos | `/empresas/:id/cupos` | = B8 | **Sí** |
| I5 | Expediente: prueba | `/empresas/:id/prueba` | = C2 | **Sí** |
| I6 | Expediente: cartera | `/empresas/:id/cartera` | **N** | No |
| I7 | Expediente: perfil fiscal | `/empresas/:id/fiscal` | **N** | **Sí** |
| I8 | Expediente: accesos de soporte (D-91) | `/empresas/:id/accesos` | **N** | No |
| I9 | Expediente: datos personales del titular | `/empresas/:id/datos-personales` | **N** | No |
| I10 | Expediente: archivo y restauración | `/empresas/:id/archivo` | **N** | No |
| I11 | Cesión del contrato (D-62) | `/empresas/:id/cesion` | **N** | No |

### J · Catálogos anuales y textos legales

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| J1 | Unidad de valor tributario | `/catalogos-anuales/uvt` | **N** | **Sí** |
| J2 | Salario mínimo | `/catalogos-anuales/salario-minimo` | **N** | No |
| J3 | Festivos colombianos | `/catalogos-anuales/festivos` | **N** | **Sí** |
| J4 | Periodicidad de IVA | `/catalogos-anuales/periodicidad-iva` | **N** | No |
| J5 | Tarifas de retención esperadas | `/catalogos-anuales/retenciones` | **N** | **Sí** |
| J6 | Textos legales versionados | `/textos-legales` | **N** | **Sí** |
| J7 | Aceptaciones de un texto | `/textos-legales/:id/aceptaciones` | **N** | No |

### K · Contabilidad y fiscal propio

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| K1 | Periodos contables — cerrar y reabrir | `/contabilidad/periodos` | **N** | **Sí** |
| K2 | Reconocimiento de ingreso | `/contabilidad/reconocimiento` | **N** | **Sí** |
| K3 | Mapeo de cuentas | `/contabilidad/mapeo` | **N** | No |
| K4 | Exportaciones al contador | `/contabilidad/exportaciones` | **N** | No |
| K5 | Retenciones que te practicaron y sus certificados | `/fiscal/retenciones` | **N** | **Sí** |
| K6 | Retenciones a proveedores | `/fiscal/proveedores` | **N** | No |
| K7 | Declaraciones presentadas | `/fiscal/declaraciones` | **N** | No |

### L · Informes de dirección

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| L1 | Ingreso recurrente | `/informes/ingreso-recurrente` | **N** | No |
| L2 | Altas y bajas | `/informes/altas-bajas` | **N** | No |
| L3 | Cuánto se ha regalado en descuentos | `/informes/descuentos` | **N** | No |
| L4 | Población gratuita | `/informes/poblacion-gratuita` | **N** | No |
| L5 | Coste por cliente y margen | `/informes/coste-por-cliente` | **N** | No |
| L6 | Gasto de adquisición (y su formulario) | `/informes/adquisicion` | **N** | No |
| L7 | Conversión de prueba por artículo | `/informes/conversion-prueba` | = C5 | No |

### M · Incidentes

| # | Pantalla | Ruta | Estado | Bloq. |
|---|---|---|---|---|
| M1 | Incidentes de seguridad y su reporte | `/incidentes/seguridad` | **N** | No |
| M2 | Caídas de la emisión fiscal | `/incidentes/emision` | **N** | No |

**Resumen: 8 existen, 4 existen y se completan, 44 nacen de cero. 24 son bloqueantes para vender.**

---

## 5 · Pantalla por pantalla

Las fichas completas son las que el dueño marcó. El resto va en forma condensada, con lo suficiente
para que `front-feature` no tenga que volver a preguntar.

### A1 · Lista de comprobación de puesta en marcha, ampliada **(existe · se amplía)**

**Qué es hoy.** Siete pasos —seis obligatorios— construidos en `usePlatformSetup.ts:311-390`, con
tres estados y textos fijados en `PLATFORM_SETUP_TEXTS` (`platform-setup.types.ts:117-137`) para que
sean idénticos en los cuatro sitios donde aparece. **Ese diseño es correcto y no se toca.**

**Qué se le añade.** Seis pasos, y el orden sigue siendo el de dependencia real:

| # | Paso | Obligatorio | Qué comprueba | Dónde se hace |
|---:|---|:---:|---|---|
| 1 | Al menos un artículo `ACTIVE` en el catálogo | Sí | existe (`catalog-item`) | `/catalogo-comercial` |
| **2** | **Los ocho ejes de límite sembrados** | **Sí** | los 8 `code` de D-10 existen, cada uno con `measure_kind`, su submódulo y sus días de enfriamiento | `/limites/ejes` |
| 3 | Cada artículo `MODULE` activo tiene sus submódulos puenteados | Sí | existe (`sub-modules`) | `/catalogo-comercial` |
| 4 | Una lista de precios `PUBLISHED` **y vigente por fecha** | Sí | existe (`price-list`) — **cambia con D-73**: hoy comprueba el puntero, tiene que comprobar la fecha | `/catalogo-comercial` |
| 5 | Precio para cada artículo activo en esa lista | Sí | existe (`catalog-prices`) — **cambia**: hoy la cobertura agrupa sobre los precios escritos, tiene que verificarse contra los artículos activos (§E2) | `/catalogo-comercial` |
| 6 | Configuración de facturación con lista por defecto | Sí | existe (`billing-config`) | `/configuracion/facturacion` |
| **7** | **Días de prueba por defecto distintos de cero** | **Sí** | `platform_billing_config.default_trial_days > 0` | `/configuracion/facturacion` |
| **8** | **La identidad fiscal de VetSoftware** | **Sí** | razón social y NIT del fabricante del software — va impresa en cada factura de cada cliente | `/configuracion/facturacion` |
| 9 | Una secuencia de numeración `DC` | Sí | existe (`document-sequence`) | `/configuracion/facturacion` |
| **10** | **Los catálogos anuales del año en curso y del siguiente** | **Sí** | UVT, festivos y tarifas de retención del año actual **y del que viene** | `/catalogos-anuales` |
| **11** | **Los textos legales publicados** | **Sí** | términos, política de tratamiento y **contrato de encargo** (D-88) — este último es obligatorio en el alta | `/textos-legales` |
| **12** | **El primer periodo contable abierto** | **Sí** | existe una fila `OPEN` en `accounting_periods` | `/contabilidad/periodos` |
| 13 | Cuestionario con al menos una pregunta | No | existe (`questionnaire`) | `/configurador/cuestionario` |
| **14** | **Techos de fábrica de los artículos** | **No** | cada artículo `MODULE` activo con escalón gratuito tiene su `catalog_item_limits` | `/catalogo-comercial` |
| **15** | **Los encargados del tratamiento** | **No** | 5–6 filas: facturador, pasarela, correo, alojamiento, contador externo | `/configuracion` |

**De 7 pasos (6 obligatorios) a 15 pasos (12 obligatorios).**

**Lo que hay que corregir del texto fijo, y es importante:** `PLATFORM_SETUP_TEXTS.count` dice hoy
`«{n} de {total} pasos obligatorios completados»` con la llamada `count(done, total)` — está bien
parametrizado y **no hay que tocar la función**, solo el número que se le pasa. Pero el comentario
de la línea 119 dice literalmente `/** «{n} de 6 pasos obligatorios completados». */`: hay que
actualizarlo, porque un comentario que dice 6 cuando son 12 es la clase de descuido que hace dudar
de todo lo demás.

**Y el paso 10 tiene una regla propia que no tienen los demás: caduca solo.** El 1 de enero, un
sistema sin los festivos del año nuevo empieza a acortar en silencio todo plazo en días hábiles.
Por eso el paso comprueba **dos** años, no uno, y su rótulo lo dice: *«2026 completo · 2027 sin
sembrar — todo plazo en días hábiles se acortará en silencio a partir del 1 de enero»*.

**Estados vacíos y de error.** Se hereda el diseño de tres estados sin cambios. `unknown` con su
`reason` sigue siendo obligatorio para cada sonda nueva.

**A2 · La sonda de servidor.** Hoy son quince consultas desde el navegador del operador. Eso
significa que un despliegue arranca con el catálogo vacío y **nadie se entera** hasta que alguien
abre la pantalla. La propuesta: `GET /system/platform-setup` devuelve los quince pasos ya resueltos
en el servidor, y la consola pinta lo que le den. Beneficio doble: quince peticiones pasan a una, y
el mismo endpoint puede alimentar una alarma. **Issue B-11.**

---

### B1–B2 · Ejes de límite **(nace de cero)** · `/limites/ejes`

**Propósito.** *«Vender un límite nuevo tiene que ser insertar una fila, no una migración de
esquema.»* Esta es la pantalla que hace verdad esa frase. Es el paso 2 de la puesta en marcha y
**bloquea la capa J entera**: sin ejes no hay techos, sin techos no hay escalón gratuito.

**Qué muestra.** `limit_dimensions`: `code`, `name`, `measure_kind`, `sub_module_id`, los días de
enfriamiento, y —columna calculada en cliente— **cuántos artículos del catálogo lo usan** y
**si alguien lo cuenta de verdad**.

| Columna | Origen | Nota de diseño |
|---|---|---|
| Código | `code` | monoespaciado; es el nombre que usa el código |
| Nombre | `name` | el que ve el cliente |
| Clase de medida | `measure_kind` | `STOCK` «dar de baja libera plaza» · `CUMULATIVE` «borrar libera a los N días» · `FLOW` «vuelve a cero cada periodo». **Nunca la sigla sola:** la frase completa, porque confundirlas es el error clásico que el modelo persigue |
| Módulo | `sub_module_id` | «cuelga de Historia clínica» o «—» si es global |
| Enfriamiento | columna nueva | solo con `CUMULATIVE`; obligatorio ahí y prohibido fuera |
| Artículos que lo usan | derivado | 0 → el eje está sembrado y nadie lo vende |
| **¿Se cuenta?** | **manual, seed** | **La columna más importante de la pantalla.** Ver abajo |

**La columna «¿Se cuenta?» y por qué existe.** El modelo verifica operación por operación que
**cinco de los ocho ejes no los incrementa nadie**: mascotas, propietarios, citas, facturas y
almacenamiento. *«Un cupo que no se incrementa es peor que no tenerlo, porque informa mal y se
factura igual.»* Un eje sin instrumentar es un cobro por una promesa que el sistema no puede
cumplir ni desmentir.

La pantalla lo pinta como un badge de tono `danger` con el texto **«Sin instrumentar»** y una frase
bajo la tabla:

> ⚠ **Cinco de los ocho ejes no los cuenta nadie todavía.** Un cupo sin instrumentar informa mal y
> se factura igual. No vendas un techo sobre estos ejes hasta que exista quien los cuente.

Y —decisión mía, §10— **el formulario de techo de fábrica (B3) rechaza un eje sin instrumentar**,
con ese mismo texto. Es la única barandilla que la interfaz puede poner ante un defecto que el
esquema no ve.

**Acciones.** Crear · editar nombre y submódulo · editar días de enfriamiento.
**Lo que NO se puede:** cambiar `measure_kind` de un eje que ya tiene artículos vendidos — la clave
foránea que copia la clase de medida al techo de fábrica lo convierte en un error del motor. La
pantalla lo dice antes, no después: el selector se pinta como hecho (`<dl>`), con la frase
*«No se puede cambiar: 3 artículos ya lo tienen vendido con esta clase.»*

**Estado vacío.** Es el caso normal el primer día, y **no es «sin resultados»**:
> **No hay ningún eje de límite.** Sin ejes no se puede vender un cupo, y el escalón gratuito no
> existe. Son ocho y están enumerados en D-10. *(botón)* **Sembrar los ocho ejes de D-10**

Ese botón —decisión mía— es un `POST /system/limit-dimensions/seed` idempotente. Teclear ocho ejes
con su clase de medida a mano en cada entorno es exactamente cómo los entornos divergen, que es el
defecto que el propio modelo denuncia sobre el catálogo comercial.

**Error.** `ds-server-error` con traza (R05).

**Endpoints propuestos.**
`GET /system/limit-dimensions` · `GET /system/limit-dimensions/{id}` ·
`POST /system/limit-dimensions` · `PUT /system/limit-dimensions/{id}` ·
`POST /system/limit-dimensions/seed` · `GET /system/limit-dimensions/{id}/usage`

---

### B3 · Techos de fábrica del artículo **(nace de cero)** · sección en `/catalogo-comercial/articulos/:id`

**Propósito.** Qué trae un artículo de serie por cada eje. Es el suelo del escalón gratuito.

**Dónde vive y por qué ahí.** Dentro del artículo, junto a «Qué pantallas abre» y a sus precios.
Es una propiedad del artículo; sacarla al menú obligaría a elegir el artículo dos veces. El patrón
de sección ya existe: `BridgeSection.vue` + `CatalogItemSubModulesPanel.vue`.

**Qué muestra, por eje** (`catalog_item_limits`):

| Campo | Regla de interfaz |
|---|---|
| `mode` | `FULL` «sin techo» · `LIMITED` «con techo». La base exige cantidad si es `LIMITED` y la prohíbe si es `FULL` — el formulario **muestra u oculta** el campo cantidad, no lo deshabilita |
| `limit_quantity` | entero positivo, con la unidad al lado: «100 mascotas» |
| `enforcement` | `WARN` · `BLOCK` · `READ_ONLY` · `OVERAGE`. **Como radios con la consecuencia escrita**, no como select: son cuatro comportamientos distintos y el operador tiene que leerlos todos antes de elegir |
| `overage_unit_amount` | solo con `OVERAGE`, obligatorio ahí. **Y la base rechaza `OVERAGE` sobre un eje `CUMULATIVE`** — el formulario lo impide antes, con la razón: *«Cobrar por unidad sobre un contador que no libera al borrar significa que el cliente paga cada mes, para siempre, por registros que ya borró.»* |
| `warn_threshold` | porcentaje. **El valor por defecto es 80 y hay que ofrecer los tres de D-59**: al escalón gratuito se le avisa al 60, al 80 y al 90 |
| `trial_mode` / `trial_limit_quantity` | el techo **durante** la prueba. Por defecto `FULL`, y la razón va escrita bajo el campo: *«Para lo que sirve una prueba es para migrar los datos que ya tiene. Con cupo desde el día 0, no convierte.»* (D-06) |

**Confirmación.** Editar un techo de fábrica **no** exige firma — es catálogo, no una excepción a un
cliente. Lo que sí exige es el aviso de §E7: si el artículo tiene contratos vivos, el cambio **no
les afecta** (el techo se congela al firmar), y eso hay que decirlo o el operador creerá que acaba
de subirle el cupo a cuarenta clínicas.

**B4 · Propagar una mejora (D-75).** Cuando el techo **sube**, sí se puede propagar a los contratos
vivos —los recortes no—. Es una operación con su propia confirmación, y **no se hace con la tabla
de excepciones negociadas**: usarla para esto abriría cuarenta filas con motivo y firma para
documentar algo que no negoció nadie, y vaciaría de significado el informe de a quién se le han
hecho excepciones. Modal:

> **Propagar el cupo nuevo · Historia clínica · Mascotas**
> De **100** a **200**. Afecta a **41 contratos vivos** que hoy tienen el cupo de fábrica.
> No afecta a los **3** que tienen una excepción negociada por encima.
> Las bajadas no se propagan nunca: lo congelado al firmar se respeta.
> `[ Cancelar ]  [ Propagar a 41 contratos ]`

**Endpoints propuestos.**
`GET /catalog-items/{id}/limits` · `PUT /catalog-items/{id}/limits/{dimensionId}` ·
`DELETE /catalog-items/{id}/limits/{dimensionId}` ·
`POST /system/catalog-items/{id}/limits/{dimensionId}/propagate`

---

### B5–B6 · Excepciones negociadas **(nace de cero)** · `/limites/excepciones`

**Propósito.** *«Cuando le subes el techo a un cliente por una llamada de retención, eso es una
decisión comercial y merece un papel, no un `UPDATE` a mano.»*

**Qué muestra.** `company_limit_overrides`, con la empresa resuelta a nombre (issue **B-1** de la
spec anterior sigue abierto: las respuestas de plataforma traen `companyId` y nada más).

Columnas: empresa · eje · techo pactado · desde / hasta · **motivo** (código + detalle) · quién la
concedió · estado (vigente / caducada / revocada) · quién la revocó y por qué.

**Filtros.** Empresa · eje · estado · rango de fechas. Y **uno que es la tarea**: «vigentes hoy»,
que es la vista por defecto.

**Acciones.**
- **Negociar una excepción** → modal de §3.1. Antes/después con la procedencia del techo actual.
  **La base impide dos excepciones abiertas sobre el mismo eje** (índice único sobre
  `alive_company_marker` + eje): el formulario lo comprueba antes y, si ya hay una, ofrece
  **cerrar la vigente y abrir otra** —que es lo que el modelo manda: *«Cambiar el pacto no edita la
  fila: la cierra y abre otra.»*— con las dos operaciones en una sola confirmación.
- **Revocar** → modal con motivo obligatorio propio (`revoked_reason`).
- **Lo que NO se puede:** editar una excepción vigente. Se cierra y se abre otra.

**Un aviso que la pantalla tiene que dar y nadie espera:** cancelar el contrato **cierra las
excepciones** (D-65). Si no, negociar 300 mascotas, cancelar y volver al plan gratuito entra con las
300 gratis. En la ficha de la excepción va la frase: *«Se cerrará sola si la empresa cancela.»*

**Estado vacío.** *«No se le ha subido el techo a nadie.»* — positivo, sin llamada a la acción.

**Endpoints propuestos.**
`GET /system/limit-overrides` · `POST /system/limit-overrides` ·
`PATCH /system/limit-overrides/{id}/revoke` · `GET /companies/{id}/limit-overrides`

---

### B7 · Cuentas desbordadas **(nace de cero)** · `/limites/desbordadas`

**Propósito.** Es, literalmente, **la lista de a quién llamar**. Sale de `over_limit_since`, la
columna que el modelo justifica así: *«Ana termina la prueba con 400 mascotas y un cupo gratis de
100: no ha hecho nada mal y hoy no se entera de nada hasta que, semanas después, recibe un portazo
sin aviso.»*

**Qué muestra.** Una fila por empresa y eje desbordada: empresa · eje · consumo · techo · **desde
cuándo** · de dónde sale el techo · cuántas veces ha topado este mes.

**Ordenada por `over_limit_since` ascendente por defecto** — quien lleva más tiempo desbordado
primero. Es la definición de la tarea.

**Segunda pestaña: «cerca del techo».** Los que están al 60, 80 y 90 % — los tres umbrales de D-59.
Con la clase de plan al lado, porque la acción es distinta: al que paga se le ofrece ampliar, al
gratuito se le pide la tarjeta.

**Tercera pestaña: «portazos».** El feed de `company_limit_events` con `LIMIT_BLOCKED`. El modelo lo
llama *«a la vez el registro probatorio y la mejor señal de venta del producto — y que casi ningún
SaaS tiene»*. Filtrable por eje y por semana.

**Acciones de la fila.** *Negociar una excepción* (→ B6, con empresa y eje ya rellenos) ·
*Ver los cupos de la empresa* (→ B8).

**Endpoints propuestos.**
`GET /system/capacities/over-limit` · `GET /system/capacities/near-limit?threshold=` ·
`GET /system/limit-events?eventType=LIMIT_BLOCKED`

---

### B8–B10 · Cupos de una empresa **(nace de cero)** · `/empresas/:id/cupos`

**Propósito.** La pantalla que soporte abre cuando la clínica llama diciendo «no me deja crear».
Tiene que responder en un vistazo: *qué eje, cuánto lleva, cuál es el techo, de dónde sale ese techo,
y qué pasa al llegar.*

**Qué muestra.** Una tarjeta por eje (`company_capacities` + `limit_dimensions`):

```
┌───────────────────────────────────────────────────────────────┐
│ Mascotas                                    412 / 500   82 %  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                    │
│                                                                │
│ Techo de 500 porque hay una excepción negociada del 14/03      │
│                                          → ver la excepción    │
│ Al llegar: se bloquea la creación                              │
│ Se avisa al 80 % · ya avisado el 12/08                         │
│ Acumulativo — borrar libera la plaza a los 30 días             │
│   3 plazas se liberan el 26/09/2026                            │
│ Recontado el 27/08/2026 03:00 · el contador y los hechos       │
│ cuadran (412 = 412)                                            │
│                                                                │
│                    [ Recontar ]  [ Corregir el consumo ]       │
└───────────────────────────────────────────────────────────────┘
```

Ocho hechos por tarjeta, y ninguno es decorativo: cada uno responde una pregunta que hoy solo se
responde abriendo la base.

**La barra de progreso no es el dato.** WCAG 2.2 §1.4.1 *Use of Color* (A): el porcentaje va escrito
al lado y el estado va en texto, no solo en el color de la barra. Y §1.4.11 *Non-text Contrast* (AA):
la barra necesita 3:1 contra su canal — se usa `ds-tone--accent-solid` sobre `--warm-100`, que ya
está medido en el repositorio; **no se inventa un color de barra**.

**B9 · Corregir el consumo (D-12).** La operación por la que hoy soporte escribe en producción.
Modal de §3.1, con dos particularidades:

1. **No sobrescribe el contador.** Escribe un hecho compensatorio (`company_limit_events`,
   `USAGE_ADJUSTED`) con los tres números del momento y el motivo. El modal lo dice:
   *«El contador no se sobrescribe: se escribe un hecho que lo compensa, para que la cifra siga
   siendo demostrable.»*
2. **Motivo de lista cerrada**, y el que existe de verdad: *«Migración con duplicados»*,
   *«Reconteo manual»*, *«Corrección de un defecto»*, *«Otro»*. Con detalle obligatorio.

**Y el aviso de §1.3, que es de seguridad:** esta operación **no puede** ir por el puerto de
`entitlement`, que resuelve la empresa desde la sesión. Va por `/system/**`. Si `front-feature` la
cablea al puerto existente, la administradora de la clínica recupera su cupo cada vez que topa.

**B10 · La bitácora.** Bloque bajo las tarjetas: los últimos N eventos con tipo, los tres números,
la procedencia del techo y el actor. Con filtro por eje.

**Estados.** Vacío: *«Esta empresa no tiene ningún cupo asignado.»* — y eso **no es normal**:
enlaza al contrato, porque significa que el recálculo no ha corrido o que el contrato no tiene
líneas de capacidad. Error: `ds-server-error` con traza.

**Endpoints propuestos.**
`GET /system/companies/{id}/capacities` (hoy anidado en `GET /entitlements/access`) ·
`POST /system/companies/{id}/capacities/recount` ·
`POST /system/company-capacities/{id}/adjust` ·
`GET /system/companies/{id}/limit-events`

---

### C1–C6 · Prueba gratuita **(nace de cero)**

#### C1 · `/pruebas` — las ventanas

**Qué muestra.** `company_trial_windows`: empresa · desde / hasta · días concedidos · **días que
quedan** · campaña (`trial_campaign_code` vía `source_quote_id`) · concesiones vivas / consumidas ·
estado (abierta / cerrada).

**Dos pestañas y un contador**, porque son dos tareas: **«abiertas»** (la que se mira a diario) y
**«todas»**.

**El campo que hay que calcular en cliente y nadie enviará:** *días que quedan*. `end_date` es el
último día **incluido** —la base lo comprueba: fin = inicio + días − 1— y el código construido hoy
suma un día de más (defecto 19 del modelo). En la consola eso significa que **el número de días
restantes hay que calcularlo con la convención inclusiva y decirlo**: *«vence el 30/09 incluido —
quedan 4 días»*.

#### C2 · `/pruebas/:companyId` — la ventana y sus concesiones

Es la misma pantalla que `/empresas/:id/prueba`. Una vista, dos rutas.

**Arriba, la ventana** como documento (`<dl>`): del 1 al 30 de septiembre, 30 días, campaña
`FERIA-VET-2026`, abierta.

**Abajo, las concesiones** (`company_trial_grants`), una fila por artículo:

| Artículo | Concedida | Días | Vence | Política congelada | Desenlace |
|---|---|---:|---|---|---|
| Agenda | 01/09 | 30 | 30/09 | 30 días → `LIMITED` | — (viva) |
| Caja | 01/09 | 14 | 14/09 | 14 días → `LIMITED` | `CONVERTED` 15/09 |
| Inventario | 15/09 | **15** | 30/09 | 30 días → `LIMITED` | — (viva) |
| Facturación DIAN | — | — | — | **`NEVER_FREE`** | *nunca se probó* |

**La columna «Días» de Inventario es el corazón de la capa I** y la pantalla tiene que explicarla,
no solo mostrarla. Bajo la tabla:

> Inventario se añadió el día 15 de una ventana de 30 y recibió **los 15 que quedaban**, no 30
> nuevos. La ventana no se estira nunca (D-01).

**Acciones.** Ninguna sobre una concesión: *una prueba concedida no se puede desconceder* —la tabla
no tiene operación de borrado y la pantalla no tiene botón—. Sobre la ventana: **cerrarla**
(con firma) y, si está cerrada, **abrir una nueva** (C3).

**Los dos «no se puede» de §3.6 van aquí, escritos.**

#### C3 · Abrir una ventana nueva

Modal de §3.1. Con la advertencia que evita la pregunta siguiente:

> Una ventana nueva **no devuelve el derecho a probar lo ya probado**. Agenda, Caja e Inventario
> siguen sin poder regalarse a esta empresa. Lo que sí podrá probar: los 4 artículos que nunca
> probó.

Con la lista de esos cuatro, nombrada. Si son cero, el botón no se ofrece y se dice por qué.

#### C4 · `/pruebas/por-vencer` — el barrido

Forma de §3.7. Ventana de días configurable (7 por defecto). Columnas: empresa · artículo ·
vence · desenlace que le espera (`policy_trial_outcome`) · **si la cuenta está al día**.

**Esa última columna es la que hace útil la lista**, y sale de D-22: *el reloj no se pausa; en mora
no se convierte a pago, cae a gratuito limitado y queda marcado*. Un artículo `CONVERT_TO_PAID` de
una cuenta en mora **no va a convertir**, y esa es la llamada comercial de la semana. La pantalla
lo señala con un badge: **«vencerá en mora»**.

#### C6 · `/suscripciones/:cid/:id/prueba`

Séptima sub-vista del expediente. Se añade al array `subscriptionRecordTabs`. Muestra la ventana de
la empresa y **las líneas del contrato en modo `TRIAL`**, con su `charge_mode`, su `trial_end_date`
y la fila sucesora que ya está escrita esperando su fecha.

**Esa fila sucesora hay que pintarla, y es lo que más tranquiliza a soporte:** *«Al vencer, esta
línea se cierra y la que ya está escrita empieza el 01/10 en modo `FREE_LIMITED` con cupo de 100
mascotas. No depende de que ningún proceso corra.»*

**Endpoints propuestos.**
`GET /system/trial-windows` · `GET /companies/{id}/trial-window` ·
`GET /companies/{id}/trial-grants` · `POST /system/companies/{id}/trial-windows` ·
`PATCH /system/trial-windows/{id}/close` · `GET /system/trial-grants/expiring?days=` ·
`GET /system/trial-grants/outcomes`

---

### D2–D3 · Concesión manual de un módulo (D-92) **(nace de cero)**

**Por qué existe.** El modelo lo dice con una franqueza que conviene conservar: *«El valor existe en
el esquema, así que no tener pantalla no impide la operación — la traslada al único camino sin
rastro. Peor aún, el recálculo excluye expresamente esas filas, de modo que una concesión escrita a
mano sobrevive a todos los recálculos, para siempre, sin contrato, sin cargo y sin caducidad.»*

**Dónde vive.** Como acción en `/suscripciones/:cid/:id/acceso`, que ya existe
(`SubscriptionAccessView.vue`, 369 líneas). Es donde se ve el efecto.

**El modal** (§3.1) con **cuatro** campos y no tres:

| Campo | Regla |
|---|---|
| Submódulo | selector sobre los submódulos que la empresa **no** tiene. Con el módulo comercial al lado, para que se sepa qué se está regalando |
| Nivel de acceso | `FULL` o `READ_ONLY`. Radios con la consecuencia escrita |
| **Caduca el** | **obligatorio** — ver abajo |
| Motivo | código + detalle, obligatorios |

**La caducidad obligatoria es decisión mía (§10.1) y es la que convierte el agujero en excepción.**
El modelo dice que estas filas *sobreviven a todos los recálculos, para siempre*. Una concesión sin
fecha es un permiso perpetuo sin contrato que lo justifique — exactamente lo que el `UPDATE` a mano
producía. Con `valid_until` obligatorio, lo peor que puede pasar es un permiso de más durante un
plazo acotado y visible. El modal lo dice: *«Toda concesión manual caduca. Si hace falta más
tiempo, se concede otra vez y queda otra constancia.»* Máximo ofrecido: 90 días.

**Confirmación.** Con el efecto en la aplicación del cliente escrito:
> Esta empresa verá **Consultas** en su menú desde ahora y hasta el 30/09/2026. Esta concesión
> **no** la sostiene ningún contrato ni genera ningún cargo, y **sobrevive a los recálculos**.
> Queda registrada a tu nombre.

**Revocar.** Con motivo propio. Nunca se borra la fila.

**D3 · `/accesos/concesiones` — el registro global.** Todas las concesiones manuales del sistema,
vivas y caducadas: empresa · submódulo · nivel · concedida por · motivo · desde / hasta · estado.
Ordenada por caducidad ascendente.

Es la pantalla que hace la operación auditable, y sin ella la de arriba es solo un atajo más cómodo
que el SQL. **Las dos van juntas o no va ninguna.**

**Endpoints propuestos.**
`POST /system/companies/{id}/entitlements/grant` ·
`PATCH /system/entitlements/{id}/revoke` ·
`GET /system/entitlements/manual-grants`

---

### E2–E9 · Catálogo y precios **(existe · se completa)**

Ocho piezas sobre `/catalogo-comercial`, que ya funciona. **Ninguna reescribe lo que hay.**

**E2 · La cobertura verificada contra artículos activos.** El defecto: *«La comprobación de
cobertura de tramos es excelente —exige arranque en uno, encadenado sin salto y último tramo
abierto, y nombra el hueco— pero agrupa sobre los precios que hay. Un artículo al que se le olvidó
el precio no produce grupo y la publicación pasa limpia. Si el olvidado es el núcleo, ninguna empresa
puede registrarse.»*

De interfaz: el panel de precios de una lista `DRAFT` pinta **un banner de cobertura antes del botón
de publicar**, y enumera:

> **No se puede publicar: faltan 3 artículos.**
> · **Núcleo** (`CORE`) — sin ningún precio. ⚠ Sin él, **ninguna empresa puede registrarse**.
> · Historia clínica — sin precio anual
> · Usuario adicional — el tramo 11→ no está cubierto
>
> `[ Publicar ]` *(deshabilitado no; ausente: ver §3.6)*

Y el mensaje del banner **es el mismo texto** que devuelve el servidor al rechazar la publicación.
GOV.UK, *Validation pattern*: el mensaje del resumen y el del sitio donde se arregla tienen que ser
el mismo texto. Es la misma regla que `PLATFORM_SETUP_TEXTS` ya aplica.

**E3 · Despublicar.** Hoy publicar es terminal. *«Si se publica un artículo a 120.000 en vez de a
12.000 y se detecta a las tres horas con cuatro contratos firmados, no hay vuelta atrás.»*
La operación: **volver a `DRAFT` mientras nadie haya cotizado contra la lista.** Confirmación con el
recuento: *«0 cotizaciones y 0 contratos usan esta lista. Volverá a ser editable.»* Si hay alguno,
la operación no se ofrece y se dice cuántos y dónde verlos.

**E4 · Vigencia por fecha (D-73).** Hoy las fechas se escriben y **ninguna consulta las lee**; lo
que decide el precio es un puntero en la configuración. Dos consecuencias visibles que la pantalla
tiene que resolver:

- Cada lista lleva un badge de vigencia calculado **de la fecha**: `Vigente hoy` · `Programada para
  el 01/07/2027` · `Terminada el 31/12/2025` · `Borrador` · `Archivada`.
- **Banner de solape**, en rojo, si dos listas publicadas se pisan:
  *«Dos listas vigentes a la vez del 01/07 al 31/07. Dos comerciales pueden cotizar el mismo día al
  mismo cliente con dos precios válidos.»*

**E5 · Simulador de tramos (D-66).** El defecto más caro del sistema construido —*«unos diecisiete
millones al año, sin error y sin alarma»*—. La interfaz no lo arregla, pero **lo hace visible**: un
campo «cantidad» junto a la tabla de tramos que muestra el desglose acumulativo:

```
Usuario adicional · cantidad: [ 15 ]

  incluidos      2   ×        0  =        0
  tramo  3–10    8   ×   12.000  =   96.000
  tramo 11–      5   ×    9.000  =   45.000
                                   ─────────
                                    141.000

Acumulativo (D-66): cada tramo se cobra a su propio precio.
```

Con eso, un comercial que vea 135.000 en una cotización sabe que hay un defecto. Hoy no tiene con
qué saberlo.

**E6 · Política de prueba del artículo.** Tres campos nuevos en el formulario:
`trial_eligibility` (`ELIGIBLE` / `NEVER_FREE`, radios con consecuencia), `default_trial_days`
(entero, y es **a la vez el tope**: la etiqueta lo dice), `trial_outcome` (`CONVERT_TO_PAID` /
`LIMITED` / `READ_ONLY`, radios con la frase de qué pasa el día 31).

**Y una regla de formulario:** `NEVER_FREE` oculta los otros dos, no los deshabilita. Un módulo que
no se regala no tiene días de prueba, y un campo gris invita a preguntarse cuál.

**E7 · Composición congelada (D-76).** Banner en la ficha del artículo cuando tiene contratos vivos:

> **41 contratos vivos tienen este artículo.** Lo que compraron es lo que el módulo tenía el día que
> firmaron: quitarle una pantalla ahora **no** se la quita a ellos. Para cambiarlo de verdad, se
> publica un artículo nuevo.

Y en un paquete, la variante dura: *«Mientras alguien lo tenga contratado, no se puede editar su
composición.»* — con las acciones ausentes, no deshabilitadas.

**E8 · Dependencias: documentación, no barandilla.** El defecto: *«"Requiere", "recomienda" y
"excluye" existen como tabla y se usan únicamente dentro de su propio módulo. Ni el configurador, ni
la cotización, ni la ampliación, ni el recálculo las consultan.»* Hasta que se consulten, el panel
lleva un aviso `ds-banner--warning`:

> Estas relaciones **hoy no las comprueba nadie** al cotizar ni al contratar. Sirven de
> documentación. Se puede vender Facturación electrónica sin Caja y el contrato queda válido.

Es la aplicación de la regla del modelo: *«O son norma y hay que consultarlas en los tres sitios, o
son documentación y hay que decirlo en la consola — para que comercial no las tome por una
barandilla que no existe.»*

**E9 · Migrar contratos de tarifa.** `PRICE_LIST_MIGRATION` existe como tipo de otrosí y **no tiene
un solo caso de uso detrás**. Pantalla: elegir lista origen y destino, previsualizar cuántos
contratos y cuánto cambia el ingreso recurrente en total, confirmar con firma. Genera un otrosí por
contrato. **Lote grande: con confirmación que dice el número y sin ejecución en segundo plano
silenciosa.**

---

### F3 · Prioridad de los efectos del configurador **(nace de cero)**

**El defecto.** *«Se resuelven por identificador ascendente —decisión correcta contra el azar— pero
no hay ninguna columna que permita cambiar ese orden: lo que se añada hoy corre el último, para
siempre. Marcar más servicios produce un carrito más pequeño.»*

**La pantalla.** Bloque en `/configurador/cuestionario`: la lista de efectos **en el orden en que se
aplican**, reordenable. `EffectSentence.vue` ya pinta cada efecto como frase legible; se reutiliza.

**Accesibilidad, y es la parte que se hace mal siempre.** Un reordenamiento con arrastrar y soltar
es inoperable por teclado (WCAG 2.2 §2.1.1 *Keyboard*, A) y su alternativa por puntero tampoco vale
para lector de pantalla. El patrón conforme, y el que hay que escribir:

- Cada fila lleva **dos botones**, «Subir» y «Bajar», con nombre accesible que incluye el sujeto:
  `aria-label="Subir: añade Inventario si vende productos"` — regla **R04** del repositorio (el
  nombre accesible lleva el sujeto de la fila).
- Tras mover, **el foco se queda en el botón que se pulsó**, que ahora está en otra posición. Si el
  elemento llegó al extremo, el foco pasa al botón contrario de la misma fila y se anuncia.
- Un `aria-live="polite"` anuncia el resultado: *«"Añade Inventario" ahora es el 2 de 7.»* — WCAG
  2.2 §4.1.3 *Status Messages* (AA). `ToastStack` ya tiene la región; aquí hace falta una propia
  del bloque porque el mensaje es posicional y no un aviso.
- Arrastrar y soltar, si se implementa, es **además** de los botones, nunca en su lugar.

**Y un aviso que la pantalla debe dar:** *«El orden importa. Un efecto que quita Inventario después
de uno que lo añade deja sin Inventario a quien marque las dos cosas.»* Con el botón «Probar» al
lado, que ya existe.

---

### G2–G3 · Documentos de cobro **(nace de cero)** · `/documentos` y `/documentos/:id`

**Propósito.** La lista de trabajo de quien emite, y el documento que responde *«¿qué se le cobró y
con qué se saldó?»*.

**G2 · La lista.** Columnas: **número `DC`** · empresa · periodo · total · saldo · vencimiento ·
**estado del circuito** · factura externa.

**El estado del circuito es la columna, no un badge decorativo.** Cuatro valores con significado
operativo distinto:

| `issue_status` | Rótulo | Qué significa para el operador |
|---|---|---|
| `DRAFT` | Calculado | ni se mandó a facturar |
| `AWAITING_EXTERNAL` | **Esperando factura** | **la lista de trabajo del mes** |
| `EXTERNAL_REGISTERED` | Facturado | referencia capturada |
| `VOIDED` | Anulado | con la nota crédito que lo anuló, enlazada |

Pestañas por estado, con `AWAITING_EXTERNAL` por defecto — es la tarea. Ya existe algo parecido en
`AwaitingExternalView.vue` (168 líneas): **se replantea sobre esta pantalla, no se duplica.**

**Y una tercera pestaña que el modelo pide expresamente:** *«La consulta que importa no es la de las
diferencias: es la de los documentos sin factura externa pasados X días. Ese es dinero que
devengaste y que nadie facturó, y hoy no lo ve nadie.»* → §H3.

**G3 · El detalle.** Documento, no formulario (§3.5). Seis bloques:

1. **Cabecera** — número, tipo (`INVOICE` / `CREDIT_NOTE` / `DEBIT_NOTE`), periodo, estado,
   vencimiento, **a quién se emitió** (`company_billing_profiles` congelado: NIT, razón social,
   domicilio, correo de facturación). *La factura no dice «la empresa 42»: dice el perfil con el que
   se emitió.*
2. **Los cargos que lo componen** — con la agrupación de D-18: *«un renglón que diga "excedente de
   facturación, 37 unidades, 18.500", no 37 renglones idénticos»*. Con «ver el desglose» que abre
   §3.4.
3. **Desglose de impuestos** (`subscription_billing_document_taxes`) — una fila por tratamiento y
   tarifa, con la base y el importe. **Excluido y exento no se colapsan en «tarifa cero»**: son dos
   filas con dos rótulos.
4. **Qué lo salda** (`billing_document_applications`) → §G4.
5. **Factura externa** — número, CUFE, fecha fiscal, proveedor, quién capturó la referencia y
   cuándo. Con la conciliación (§H1) enlazada.
6. **Historia del documento** (`billing_document_status_history`) — de qué estado a cuál, cuándo,
   quién y por qué. Gemela de la que ya existe para el contrato.

**Acciones.** Registrar factura externa (existe) · Emitir nota crédito (§G7) · Anular.
**Ninguna acción de edición de importes.** Una vez registrada la factura externa, los tres totales
no vuelven a cambiar nunca.

---

### G4–G6 · Aplicaciones — qué salda qué **(nace de cero)**

**El caso que lo justifica, y hay que enseñárselo al operador en la propia pantalla:** *«Ana debe
213.010. Su contadora le practica retención y le gira 205.850. El sistema aplica, deja 7.160 de
saldo vivo, empieza la mora, se agotan los cinco días de gracia y Spa Ana Pet cae a solo lectura por
una deuda que fiscalmente no existe.»*

**Qué muestra.** Una fila por aplicación, con **los seis orígenes** y el rótulo que los distingue:

| `source_kind` | Rótulo | Qué exige además |
|---|---|---|
| `PAYMENT` | Pago | el pago, enlazado |
| `CREDIT_NOTE` | Nota crédito | el documento que la originó |
| `WITHHOLDING` | **Retención** | tipo, base, tarifa, municipio si es ICA, año gravable, **y el certificado** |
| `CUSTOMER_CREDIT` | Saldo a favor | de qué lote salió (D-71) |
| `ROUNDING` | Residuo de redondeo | con el tope duro visible |
| `WRITE_OFF` | Castigo | quién lo autorizó y por qué |

Y el saldo al pie, con la aritmética escrita: **total − aplicado = saldo**. No un número suelto.

**Una regla de rótulo que evita una discusión contable:** la fila de retención **no dice
«descuento»**. Dice *«Retención en la fuente — plata tuya que fue directa a la DIAN»*. El modelo
insiste: *una retención no reduce el ingreso; baja la cartera y sube un activo*.

**G5 · Registrar una retención.** Formulario con: tipo (renta / IVA / ICA), base gravable, tarifa
(**cuatro decimales** — las municipales se expresan por mil), municipio (obligatorio solo en ICA),
año gravable, y el certificado (referencia + fichero) o la marca de «pendiente de recibir».

**Con la tarifa esperada precargada** desde `withholding_rate_rules` según la naturaleza del
servicio de las líneas del documento. Si no hay regla vigente para ese supuesto, **el campo se deja
vacío y se dice por qué** — no se pone cero, que es el fallo que el modelo describe: *«si divergen
en un valor, la retención esperada sale cero y nadie se entera»*.

**G6 · Contra-aplicar.** No se borra: se crea una fila con `reversal_of_id`. El botón dice
«Contra-aplicar» y el modal explica: *«No se elimina la aplicación: se crea otra que la deshace, y
las dos quedan.»*

---

### G7 · Emitir nota crédito **(nace de cero)**

Modal de §3.1 desde el detalle del documento. Motivo de lista cerrada. **Con la comprobación que la
base no puede hacer y el modelo exige al código:** no se puede aplicar una nota crédito a un
documento con saldo cero — la cartera se iría por debajo de cero. Si el saldo es cero, el modal
explica que el crédito nacerá como **saldo a favor** del cliente (un pasivo), no como cartera
negativa, y pide confirmación de eso.

Encadena con `corrects_document_id` y la relación se pinta en los dos documentos.

---

### G8 · Devoluciones **(nace de cero)** · `/documentos/devoluciones`

`payment_refunds`. *«Es la operación más delicada del negocio y la única sin documento propio.»*

Columnas: pago origen · empresa · importe · medio y destino · fecha · motivo (código + texto) ·
quién la autorizó · documento que la origina.

**Alta:** modal de §3.1 con **firma obligatoria** — *«Sacar plata exige firma igual que subirle el
techo a un cliente; hoy el modelo pide firma para lo segundo y no para lo primero.»*
Con la validación de que la suma de devoluciones parciales no supere el pago original, y el
remanente visible en el formulario.

**El caso que rompe la firma, y hay que preverlo:** un contracargo de la pasarela **no lo autoriza
nadie**. El formulario admite origen `GATEWAY_CHARGEBACK` sin autorizante nominal, con la
referencia del contracargo en su lugar. Sin esa rama, un contracargo no se puede registrar.

---

### G9 · Intentos de cobro fallidos y su reintento **(nace de cero)** · `/cobranza/intentos`

**Propósito.** Con la pasarela como única vía (D-48), cada renovación es un cobro automático que
puede rebotar, y hoy *«un rechazo no tiene dónde vivir: sin código, sin número de intento y sin nada
que programe el siguiente»*.

**Qué muestra.** `payment_attempts`: documento · empresa · importe · **nº de intento** ·
**clase de rechazo** · código crudo · cuándo se intentó · **cuándo toca el siguiente**.

**La clase de rechazo es la columna sobre la que se ramifica todo**, y son **tres familias, no dos**:

| `decline_kind` | Rótulo | Qué se ofrece |
|---|---|---|
| `SOFT` | **Blando** — fondos insuficientes, límite temporal | **Reintentar**. Cuatro intentos en dos semanas (D-68) |
| `HARD` | **Duro** — tarjeta perdida, robada, autorización revocada | **Ningún botón de reintento.** Se pide medio de pago nuevo |
| `CONFIG` | **Configuración — es nuestro** | Moneda no soportada, credencial mal puesta. **Se arregla, no se reintenta** |

**Y ese es todo el valor de la pantalla:** un botón «Reintentar» en una fila `HARD` quema intentos
contra una tarjeta muerta, y *«las redes multan el reintento excesivo y algunas pasarelas llegan a
bloquear la operación ellas mismas»*. La acción **no está** en esas filas — no deshabilitada,
ausente— y en su lugar hay la frase y el enlace a pedir medio de pago.

**El código crudo de la pasarela se ve aquí y solo aquí.** El modelo es explícito: al cliente,
*nunca el código de rechazo crudo, solo su clase*. En plataforma sí, y sin traducir: *«se guarda
crudo porque las pasarelas cambian su catálogo y una traducción hecha hoy envejece»*.

**Pestaña «por reintentar»** — el barrido de §3.7: los que tienen `next_attempt_at` vencido.

**Y una regla de conteo que la pantalla debe respetar:** el rótulo dice *«intento 3 de 4»*, no
«intento 3». El tope existe y el operador tiene que verlo antes de gastarlo.

---

### G10 · Reversiones de pago **(nace de cero)** · `/cobranza/reversiones`

`payment_reversal_requests`. Expediente, no lista de estados.

Muestra: pago · empresa · **origen** (`CONSUMER_CLAIM` reclamó el cliente / `GATEWAY_CHARGEBACK` lo
notificó la pasarela) · causal tasada · **las tres fechas** (cuándo tuvo conocimiento, cuándo llegó
la queja, cuándo se notificó al emisor) · **el plazo que vence** · tu oposición si la hubo ·
importe revertido · desenlace.

**El banner que gobierna la pantalla, y es una regla, no un adorno:**

> Una reversión **no dispara mora**. Es un derecho ejercido, no un impago.

Sin esa regla escrita en la pantalla, alguien la registrará como pago fallido y arrancará la
cobranza contra quien ejerció un derecho — que es literalmente el fallo que la tabla existe para
evitar.

**Ordenada por `deadline_at`.** El plazo se guarda como dato y no como cálculo precisamente para
poder listar lo que está a punto de vencer.

---

### H1–H3 · Conciliación **(nace de cero)** · `/conciliacion/*`

**H1 · Facturador externo.** `external_invoice_reconciliations`. **Los cuatro números enfrentados**,
en dos columnas, con la resta al lado:

```
                    Tu documento    Factura externa    Diferencia
Total                  213.010          213.012              +2
Impuesto                34.010           34.012              +2
                                                    WITHIN_TOLERANCE
```

*«El impuesto aparte a propósito: tú lo calculas una vez sobre la base agregada y el emisor externo
probablemente lo calcule línea a línea, y ahí es donde nace la diferencia de dos pesos.»*

Estados: `MATCHED` · `WITHIN_TOLERANCE` · `MISMATCH` · **`MISSING_EXTERNAL`**.
El último va en tono `danger` y **es el que se pinta primero**: *«el peor y el más fácil de no ver —
un cobro que nunca se facturó»*.

También muestra la **resolución de numeración** bajo la que se emitió, con su rango y su vigencia, y
**avisa antes de que se agote el rango o venza la resolución** — en vez de descubrirlo cuando una
factura no sale.

**Acciones.** Resolver una discrepancia con nota y firma; queda el periodo contable en el que se
resolvió.

**H3 · Documentos sin factura externa pasados N días.** Pestaña. Es *«dinero que devengaste y que
nadie facturó»*. Con el importe acumulado en la cabecera, que es el número que mueve a actuar.

**H2 · Liquidaciones de pasarela.** `gateway_settlements`. **Los cinco importes del lote**: bruto,
comisión, impuesto de la comisión, neto, **y el gravamen a los movimientos financieros** — que el
modelo pidió dos veces y la ficha se quedó en cuatro. Con `payment_count` y la comprobación de que
cuadra con los pagos enlazados: *«Si no cuadra, hay uno perdido — y esa comprobación es una
consulta, no una revisión a ojo.»*

Y el bloque del extracto (`bank_receipts`): contra qué entrada bancaria cuadró y cuándo cayó.

> ⚠️ **Fuga real si se descuida.** Es la advertencia literal del modelo y hay que escribirla en el
> código de esta pantalla: *«la liquidación agrupa los cobros de muchas clínicas en una fila. Si el
> detalle del pago de un cliente enseña su referencia y ese dato abre el lote, le estás mostrando
> los importes de las otras cincuenta y nueve.»* **`/conciliacion/*` es solo-plataforma, sin
> excepción, y `settlement_reference` no se expone en ninguna respuesta que el cliente pueda leer.**

**Y la pantalla admite importes negativos**, que hoy no caben: un lote con un contracargo es
negativo, y sin esa rama no se puede registrar.

---

### I2–I11 · La empresa vista desde soporte **(nace de cero)** · `/empresas/:id/*`

**El cambio de forma.** `/empresas/:id` deja de ser un formulario de edición y pasa a ser un
**expediente con ocho sub-vistas**, copiando el patrón de `SubscriptionRecordLayout` (§1.5):
`<RouterLink>` dentro de un `<nav>` con `aria-current="page"`, **no** `role="tablist"`.
El formulario de hoy se conserva íntegro y se muda a `/empresas/:id/datos`.

**I2 · `/resumen` — lo que soporte necesita en cinco segundos.**

```
Spa Ana Pet · NIT 900.123.456-7                    [ Deshabilitada ]

┌─ Contrato ────────────┬─ Estado comercial ───┬─ Cartera ────────┐
│ SUS-2026-00184        │ PAGANDO              │ 213.010 vencido  │
│ Vigente · mensual     │ desde el 15/09/2026  │ hace 6 días      │
│ Periodo 01–30/09      │                      │ Gracia: 5 días   │
│ → ver el contrato     │                      │ → ver la cartera │
├─ Ventana de prueba ───┼─ Cupos ──────────────┼─ Acceso ─────────┤
│ Cerrada el 30/09      │ 1 desbordado         │ 12 submódulos    │
│ 3 artículos probados  │ Mascotas 412/100     │ 1 concesión      │
│ → ver la prueba       │ → ver los cupos      │   manual         │
└───────────────────────┴──────────────────────┴──────────────────┘
```

**`commercial_state` es la pieza nueva y hay que rotularla bien.** No es «activa»: es
`PAYING` / `FREE` / `TRIAL_ONLY` / `CHURNED`, y el modelo explica por qué existe — *«sin esta
columna, una clínica de medio millón al mes y otra perpetuamente gratuita son las dos "activa", y el
ingreso medio por cliente sale tres veces más bajo de lo real»*. Rótulos en español, con la frase de
apoyo: **«Pagando»** · **«Gratuito con cupo»** · **«Solo prueba, nunca ha pagado»** · **«Se fue»**.

**I6 · `/cartera`.** Documentos de la empresa con su saldo, la mora con su reloj, los avisos
enviados con **acuse de entrega** (`delivery_status`) y los saldos a favor vivos por lote.

**El acuse es lo que decide si se puede degradar** (D-23/D-35): *ninguna cuenta baja a solo lectura
sin un aviso con entrega acreditada; un rebote no es un aviso*. La pantalla lo pinta como bloqueo
explícito cuando falta: *«No se puede degradar: el último aviso rebotó el 12/08. Corrige la
dirección antes.»* Y ofrece el escalado al otro canal autorizado, porque *la regla no puede tener
solo un final*: un moroso cuyo único canal está roto no se degrada jamás y la cuenta queda intocable.

**I7 · `/fiscal`.** `company_billing_profiles` con historia: NIT, tipo de persona, razón social o
**apellidos y nombres por separado** (el reporte anual los exige así y no se rellena hacia atrás),
domicilio, correo de facturación, régimen, si es agente de retención y **las tarifas que se espera
que aplique**. Cambiar un dato **cierra el perfil y abre otro**; la pantalla lo dice y muestra la
serie.

También: la **resolución de numeración de la clínica** (`company_invoicing_resolutions`) con su
rango y su aviso de agotamiento, y el **medio de pago** con el estado del mandato — *«una tarjeta
vencida y una domiciliación revocada se ven exactamente igual que un impago voluntario»*, así que la
pantalla las separa con tres estados distintos.

**I8 · `/accesos` — la constancia de D-91.** Quién de plataforma entró, cuándo, a qué empresa,
**qué leyó** y con qué motivo. Con filtro por persona y por fecha.

Es la exposición mayor del sistema: *«hoy un usuario de plataforma lee la historia clínica completa
de cualquier clínica cambiando una cabecera, y no queda ni una línea: el registro solo anota
escrituras»*. La pantalla no lo arregla —eso es backend— pero es **dónde se ve**, y su existencia es
la mitad del efecto disuasorio.

**I9 · `/datos-personales`.** Desde plataforma, y solo lo que le corresponde:
- **Autorizaciones** (`data_subject_authorizations`) — de solo lectura, con `controller_role`
  visible: `OWN` (la recogiste tú) vs `ON_BEHALF` (la recogió la clínica y tú solo la conservas).
  *«Exhibir la autorización equivocada ante la autoridad es peor que no tener ninguna»*, así que la
  columna va con rótulo largo, no con una sigla.
- **Solicitudes de titulares** (`data_subject_requests`) — con sus plazos, la prórroga y **la marca
  de "reclamo en trámite"** con su propio plazo más corto. Ordenadas por `deadline_at`. Aquí sí hay
  acción de plataforma: registrar la respuesta y su referencia.
- **Exportaciones** (`company_data_export_events`) — la bitácora que responde la acusación más cara
  que puede recibir el producto: *«el 14 de marzo, estando en mora, esta clínica se descargó su
  historia clínica entera»*. Con `subscription_status_at_time` en la fila, que es exactamente el
  campo que gana esa discusión. Solo lectura; **las fallidas también se muestran**, que son las que
  el cliente recordará.

**I10 · `/archivo`.** `company_archive_events` como serie de hechos, no como un estado que se
sobrescribe. Archivar y restaurar, las dos con firma y con `scope_note` — *«rara vez es todo, y
saber qué parte volvió evita la segunda llamada»*.

**I11 · `/cesion` (D-62).** Registrar la cesión del contrato cuando la clínica cambia de dueño.
Campos: desde cuándo responde el nuevo dueño, quién cedía y quién recibe (por documento), cuánta
deuda viaja, si las autorizaciones de datos se volvieron a pedir, y la firma de plataforma con su
motivo.

**Y la regla que hace que la pantalla no pueda completarse sola** —decisión mía, §10.4—: el campo
**«aceptación del comprador»** es obligatorio y **plataforma no puede firmarlo**. *«Quien recibe un
contrato no queda obligado por una firma ajena, y sin esta fila la cesión no es oponible a nadie.»*
Si no existe todavía, el formulario se guarda como **borrador** y muestra:

> Falta la aceptación del comprador. La cesión no se puede completar sin ella: una firma de
> plataforma no obliga a un tercero. *(botón)* **Generar el enlace de aceptación**

El flujo anónimo por el que el comprador acepta queda **fuera de este documento** por el recorte de
alcance —es superficie de tenant— y está anotado en §9. La consola genera el enlace y muestra su
estado; no lo sirve.

---

### J1–J7 · Catálogos anuales y textos legales **(nacen de cero)**

**Una entrada de menú, siete rutas.** `/catalogos-anuales/{uvt,salario-minimo,festivos,periodicidad-iva,retenciones}`
+ `/textos-legales`.

**El banner que gobierna las cinco anuales, y es la única razón por la que estas pantallas existen:**

> **Cobertura: 2026 completo · 2027 sin sembrar.** El 1 de enero, todo plazo en días hábiles se
> acortará en silencio y la retención se calculará con la unidad del año pasado.

**J1 · UVT.** Año · valor · resolución que lo fijó. *«Sin la resolución, el número es una
afirmación.»* Con la advertencia de que un año viejo **no se recalcula** con la unidad de este año.

**J2 · Salario mínimo.** Igual, más una columna que no suele modelarse y **hace falta hoy mismo**:
`status` vigente / **suspendida**. La cifra de 2026 está suspendida provisionalmente por un
tribunal. La pantalla lo pinta con tono `warning` y la referencia.

**J3 · Festivos.** *«El dato más pequeño del documento, y sostiene una regla sancionable.»*
Calendario por año, con nombre — *«para que la pantalla que lo muestre no sea un calendario mudo»*.
Carga masiva del año y edición fila a fila.

**J4 · Periodicidad de IVA.** Año · frecuencia · norma. Con la regla escrita en la pantalla: *«el
primer año es bimestral siempre, por ser responsable nuevo; después depende del umbral de
ingresos»*, y el aviso de que la clave de periodo cambia de granularidad y **no se puede derivar con
una fórmula fija**.

**J5 · Tarifas de retención esperadas.** `withholding_rate_rules`: tipo · **naturaleza del
servicio** · municipio · tarifa a **cuatro decimales** · base mínima en pesos y en UVT · vigencia.

**Y el aviso que evita el fallo silencioso:** la naturaleza del servicio es una lista cerrada
compartida por tres tablas, y *«si divergen en un valor, la búsqueda devuelve vacío, la retención
esperada es cero y no hay error»*. La pantalla comprueba que los valores usados en el catálogo
tienen regla, y enumera los que no:

> ⚠ **2 naturalezas de servicio sin tarifa de retención:** «consultoría» (usada por 1 artículo).
> Para esos artículos la retención esperada saldrá **cero** y el giro llegará corto sin ningún error.

**J6 · Textos legales.** `legal_document_versions`: código · clase · versión · **huella** ·
publicado por y cuándo · estado.

**Publicar es terminal**, como una lista de precios: *«Una versión publicada es inmutable.»*
El editor solo existe en borrador. La huella se muestra completa y monoespaciada — es lo que
convierte «aceptó la versión 4» en «aceptó este texto y no otro».

**Las clases que hay que cubrir, y son siete**, no dos: términos del servicio, política de
tratamiento de datos, **aviso del cupo acumulativo**, leyenda del documento de cobro, anexo de
permanencia, preaviso de prórroga y **contrato de encargo de datos con la clínica** — este último
es el que legitima que trates los datos de los dueños de mascotas y **es obligatorio en el alta**
(D-88). El selector los enumera con su nombre largo.

**J7 · Aceptaciones.** Quién aceptó esa versión, cuándo, desde dónde, en calidad de qué y con qué
huella. Es la prueba, y **de solo lectura sin excepción**.

---

### K1–K7 · Contabilidad y fiscal propio **(nacen de cero)**

**K1 · Periodos contables.** `accounting_periods`. Mes · estado (`OPEN` / `SOFT_CLOSED` / `LOCKED`)
· cerrado por y cuándo · reabierto por, cuándo y **por qué**.

**Dos cosas que la pantalla debe dejar claras:**
1. **La regla del hecho tardío**: *«un hecho de un periodo no abierto se registra en el primer
   periodo abierto, nunca hacia atrás»*. Va escrita en la cabecera, no en un tooltip.
2. **Quién puede cerrar.** D-84 dice que lo cierra el contador externo y **solo él** puede reabrir,
   y D-94 dice que hoy hay un solo rol. La pantalla **declara la brecha** en vez de fingirla:
   *«Hoy cualquier usuario de plataforma puede cerrar y reabrir. El rol de contador externo (D-84)
   no existe todavía — issue B-14. Mientras tanto, el motivo y la firma son toda la barandilla.»*

**K2 · Reconocimiento de ingreso.** `revenue_recognition_lines` por mes: cuánto se ganó, cuánto
sigue diferido. **Sin saldo corrido** — es una decisión del modelo y la pantalla la respeta: se
suma, no se guarda. Con el total del mes y el diferido acumulado calculados en la cabecera.

Va en el camino crítico por D-40: *«no porque no se pueda construir después, sino porque cada mes
facturado sin cierre es un mes que ya no se puede declarar con respaldo»*.

**K3 · Mapeo de cuentas.** `account_mappings` con las nueve clases de `mapping_kind`, no solo
artículos: `CATALOG_ITEM`, `TAX_OUTPUT`, `WITHHOLDING`, `GATEWAY_FEE`, `CUSTOMER_CREDIT`,
`IMPAIRMENT`, `WRITE_OFF`, `ROUNDING`, `BANK`. Y el catálogo de cuentas propio detrás, con clave
foránea — *«un código de cinco dígitos suelto es una cuenta inventada esperando a ocurrir»*.

**Aviso de cobertura**, igual que el de precios: *«Faltan 4 clases sin mapear: cartera, ingreso
diferido, dinero en tránsito, penalización. Sin cartera ningún asiento de facturación cuadra.»*

**K4 · Exportaciones.** Doce filas al año. Periodo · generado por y cuándo · total débito y crédito
· **huella** · fichero. Con la comprobación de cuadre **antes** de exportar, no después.

**Y el defecto que hay que prever en el diseño:** *«hoy la clave única por periodo permite exportar
un mes una sola vez, y un fichero rechazado no se puede rehacer»*. La pantalla necesita **versión**:
`2026-09 v1`, `2026-09 v2`, con el motivo de la regeneración. Va en el issue de backend.

**K5 · Retenciones y certificados.** `document_withholdings` + `withholding_certificates`, con **la
consulta de vigilancia que es una resta**: retenido contra certificado, por año y por cliente.

**La pestaña que es la tarea:** *«los que faltan por recibir»*, ordenada por proximidad al **último
día hábil de marzo** — la única fecha dura de todo el bloque fiscal, y la que se calcula con los
festivos de J3. *«Si el segundo está vacío y el año se acerca a su cierre, hay que ir a buscarlo.»*

**K6 · Retenciones a proveedores.** `supplier_withholdings`, con el **NIT del proveedor**, que hoy
no existe en ninguna parte: *«la pasarela es un nombre suelto en una columna de texto, y el reporte
anual de terceros se arma con el documento, no con el nombre»*.

**K7 · Declaraciones presentadas.** `tax_returns`: qué impuesto, qué periodo, cuándo, con qué
radicado, dónde está el archivo, las cifras presentadas y **hasta cuándo pueden revisarla**.
De esa fecha de firmeza sale la ventana de conservación de todo lo demás — incluido el detalle de
uso que sostiene los cargos por excedente.

---

### L1–L7 · Informes de dirección **(nacen de cero)** · `/informes/*`

Una entrada de menú, siete vistas. **Todas comparten forma:** un selector de periodo, una cifra
grande, una serie, y una tabla exportable. Y todas comparten una regla:

> **Un hueco honesto antes que un dato inventado** (regla **R14** del repositorio,
> `docs/ux/reglas-de-interfaz.md`). Si el dato no existe todavía —y la mitad de estos informes se
> apoyan en tablas que aún no se llenan—, la vista lo dice y enlaza a lo que falta. **No pinta un
> cero.**

| # | Informe | De dónde sale | El hueco de hoy |
|---|---|---|---|
| L1 | **Ingreso recurrente** | `company_activity_months.mrr_snapshot`, normalizado con `subscription_items.months_in_cycle` | Sin `months_in_cycle` congelado en la línea, una línea anual se suma como mensual y el MRR de un mes pasado cambia al consultarlo. **El informe no se puede hacer antes que esa columna.** |
| L2 | **Altas y bajas** | `subscription_items.origin`, `cancellation_requests.reason_code` | Hoy el motivo de baja es texto libre: *«a quinientos clientes ya no se agrupa»*. El informe agrupa por código y muestra el texto al abrir la fila. |
| L3 | **Cuánto se ha regalado** | `subscription_items.list_unit_amount` menos `unit_amount` | *«Con el precio de lista y el neto separados, el ingreso recurrente bruto y el neto dejan de ser el mismo número, y por fin se puede medir cuánto se está regalando.»* Con quién lo autorizó. |
| L4 | **Población gratuita** | `commercial_state = FREE` + `company_activity_months.active_days` | *«Un gratuito con veinte días activos es un candidato a comprar; uno con cero es un coste.»* Dos columnas, dos acciones distintas. |
| L5 | **Coste por cliente y margen** | `company_service_costs` + comisión de pasarela | Con `allocation_method` visible: *«un margen construido sobre repartos es una estimación, y hay que saber cuándo se está mirando una»*. Los repartos van marcados. |
| L6 | **Gasto de adquisición** | `acquisition_spend` (**con formulario**: es el único informe que exige teclear) + `quotes.source_channel` | Numerador y denominador juntos: coste por cliente y en cuántos meses se recupera. |
| L7 | **Conversión de prueba** | `company_trial_grants.outcome` | Por artículo: `CONVERTED` / `LIMITED` / `READ_ONLY` / `ABANDONED`. *«Es tu tasa de conversión, por módulo, con una sola consulta.»* Cruzada con `window_days` responde qué duración convierte mejor. |

**Accesibilidad de los gráficos, y no es opcional.** Si se pinta una serie, **la tabla de datos va
en la misma página**, no detrás de un desplegable: WCAG 2.2 §1.1.1 *Non-text Content* (A). Un
`<canvas>` con un `aria-label` que dice «gráfico de ingreso recurrente» no transmite ningún dato.
La decisión más barata y conforme: **la tabla es el informe y el gráfico es el adorno**, en ese
orden en el DOM.

---

### M1–M2 · Incidentes **(nacen de cero)** · `/incidentes/*`

**M1 · Incidentes de seguridad.** `security_incidents`. *«Un incidente que no se documentó en su
momento es indistinguible de uno que se ocultó.»*

Detectado / ocurrido —*«la distancia entre las dos es la primera pregunta que hace cualquiera que
revise»*—, clase, gravedad, personas alcanzadas, **plazo de reporte**, cuándo se reportó y con qué
radicado, contención, causa raíz.

**Las clínicas afectadas van en una tabla puente**, no en una lista dentro de una celda. Y esa lista
**es solo de plataforma**: *«el cliente ve que hubo una caída, nunca a cuántos alcanzó»*.

**Una honestidad que la pantalla debe conservar:** el plazo de reporte **no está confirmado**
—los quince días hábiles que suelen citarse vienen de una circular que no se pudo leer en fuente
oficial—. El campo existe; su valor por defecto **no se quema**. La pantalla lo pide y no lo
propone.

**M2 · Caídas de la emisión fiscal.** `external_invoicing_outages`. *«La reclamación más cara que
este producto puede recibir.»* Intervalo exacto, **de quién fue la causa** (emisor externo /
autoridad / red / **tuya**), a cuántas clínicas alcanzó, cuándo se les avisó, radicado del proveedor.

`cause_party` es lista cerrada, nunca texto libre: *«es la columna que separa un incidente de un
incumplimiento»*.

---

## 6 · Accesibilidad WCAG 2.2 AA

Solo lo que estas pantallas introducen y la spec de A–H no cubría.

### 6.1 · Los modales de firma son un patrón de diálogo, y hoy el chasis no atrapa el foco

`ModalShell` pone `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape condicionado y foco
inicial. **Lo que no hace es retener el foco** — hueco sistémico de los dos fronts, ya declarado.

Con nueve modales nuevos que **mueven dinero o acceso**, el cálculo cambia: un tabulador que se
escapa del diálogo a la pantalla de detrás, en un formulario donde el siguiente `Enter` transfiere
500.000 pesos, deja de ser una molestia. **WCAG 2.2 §2.4.3 *Focus Order* (A).**

**Recomendación, y es de `front-parity`, no de estas pantallas:** cerrar el foco en `ModalShell`
antes de que aterrice el primer modal de firma. Es un gemelo TR-02 byte a byte y arreglarlo aquí lo
dejaría divergente. **Issue F-1.**

### 6.2 · Motivo obligatorio: el error va asociado al campo

Nueve formularios con dos campos obligatorios cada uno. El repositorio **no tiene un solo
`aria-describedby`** — ni en el tenant ni en la consola. El error se pinta junto al input y **no
está asociado a él**, así que un lector de pantalla lo lee al recorrer la página y **no** al enfocar
el campo. **WCAG 2.2 §3.3.1 *Error Identification* (A).**

Lo que exige cada campo de motivo, sin excepción:

```html
<label for="motivo-detalle">Detalle del motivo</label>
<textarea id="motivo-detalle"
          aria-describedby="motivo-detalle-hint motivo-detalle-error"
          :aria-invalid="hasError || undefined"
          required></textarea>
<p id="motivo-detalle-hint" class="ds-hint">Mínimo 15 caracteres. Queda escrito para siempre.</p>
<p id="motivo-detalle-error" class="ds-field-invalid" v-if="hasError">
  Escribe por qué haces esta excepción. Una excepción sin motivo escrito no la puede defender nadie.
</p>
```

Con la convención del tenant, que es buena y hay que traer: validador puro → `computed errors` →
mapa `touched` → **el error solo aparece tras `@blur`** → `defineExpose({ validate })` → banner del
padre. **Nunca validación prematura**: un mensaje rojo mientras se escribe el primer carácter es la
razón número uno por la que la gente abandona un formulario (NN/g, *Errors in Forms*).

### 6.3 · Los importes y los estados no se comunican por color

**§1.4.1 *Use of Color* (A).** Se hereda de A–H y se extiende:

- Un importe negativo lleva signo, no solo color: `ds-amount--neg` existe y aporta el tono; **el
  signo lo pone el formateador**.
- Las clases de rechazo (`SOFT`/`HARD`/`CONFIG`) van con **palabra**, no con un punto de color.
  «Blando» / «Duro» / «Configuración — es nuestro».
- Los cuatro estados de conciliación llevan rótulo: «Cuadra» / «Dentro de tolerancia» / «Discrepa» /
  **«Sin factura externa»**.
- La barra de consumo de un cupo lleva el porcentaje escrito (§B8).

### 6.4 · Contraste — lo que hay que medir antes de entrar

**No he medido nada** (§11). Lo que hay que medir, con el número exacto que hay que superar:

| Elemento nuevo | Criterio | Umbral |
|---|---|---|
| Relleno de la barra de consumo contra su canal | §1.4.11 *Non-text Contrast* (AA) | **3:1** |
| Los tres colores de umbral (60/80/90 %) entre sí y contra el fondo | §1.4.11 | **3:1** |
| Badge «Sin instrumentar» (tono `danger`) | §1.4.3 (AA) | **4,5:1** texto |
| Texto de importe negativo (`--danger-*`) sobre `ds-card` | §1.4.3 | **4,5:1** |
| Borde de los `<input>` de importe y de tarifa | §1.4.11 | **3:1** |
| Anillo de foco sobre las filas de tabla clicables | §2.4.11 *Focus Appearance* (AA) | **3:1** contra la superficie real, y la superficie real de una fila con `ds-row-hover` **no** es la de la tarjeta |

La última es la que más se falla y es la que la regla **R03** del repositorio ya persigue:
*«anillo de foco medido: ≥ 3:1 contra la superficie real»*.

### 6.5 · Tamaño de objetivo — **§2.5.8 (AA, 24×24 px CSS)**

Tres sitios de riesgo en estas pantallas:

1. Los botones «Subir»/«Bajar» del reordenamiento de efectos (§F3) — son iconos pequeños en una
   fila densa.
2. Los iconos de acción de las tablas de dinero, que van en `ds-col-actions`.
3. Las celdas del calendario de festivos (§J3).

`ds-icon-btn` ya está dimensionado; **la excepción de espaciado del criterio solo aplica si el
objetivo tiene un área de exclusión de 24 px**, y en una tabla `ds-table--dense` no la tiene. Si
hace falta, la fila usa la variante normal, no la densa.

### 6.6 · Los estados que cambian se anuncian — **§4.1.3 (AA)**

- Reordenar un efecto → `aria-live="polite"` con la posición nueva (§F3).
- Recontar un cupo → el resultado va a la región educada, no a un toast que se va antes de leerse.
- Un reintento de cobro → `useToast()` con `errorFrom(titulo, error)`, **nunca el texto del error a
  mano**. Es regla del repositorio.
- La carga de una lista larga → `PawLoader`, y **solo** `PawLoader` (200 ms de retardo, 300 ms de
  visible mínimo). Nada de spinners de Lucide ni rotaciones CSS sueltas.

### 6.7 · Lo que estas pantallas heredan roto y no arreglan

Se declara para que no parezca un olvido: sin *skip link* (§2.4.1, A), sin `aria-current` en el
sidebar (§4.1.2, A) —aunque **el patrón sí está resuelto** en `AppSidebar.vue:224-247` y las
sub-vistas nuevas lo copian—, `<html lang="en">` en `index.html:2` de esta consola con la app
íntegra en español (§3.1.1, A), y **ninguna puerta de accesibilidad en CI**: ni `axe-core`, ni
`eslint-plugin-vuejs-accessibility`, ni Lighthouse. Ya está abierto en
[admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44).

---

## 7 · Coherencia con el design system

### 7.1 · Lo que se reutiliza, sin excepción

`AppLayout` · `AppTable` (con su orden de ramas: **error antes que vacío**) · `AppBadge` ·
`AppEmptyState` · `AppPagination` · `AppModal` / `ModalShell` · `AppInput` · `AppSelect` ·
`AppTextarea` · `AppCheckbox` · `ErrorSummary` · `PawLoader` · `ToastStack` ·
`SubscriptionStatusBadge` · `PlatformSetupChecklist`.

Y de `primitives.css`, verificadas presentes: `ds-card` · `ds-stack` · `ds-detail-grid` ·
`ds-detail-head` · `ds-block-head` · `ds-title` · `ds-label` · `ds-meta` · `ds-hint` ·
`ds-banner--{info,warning,error,success}` · `ds-btn--{primary,ghost,danger,danger-solid}` ·
`ds-table` / `ds-table--dense` / `ds-table-scroll` · `ds-tab--active` · `ds-pill` ·
`ds-status-dot` · `ds-amount--{pos,neg,neg-strong}` · `ds-num` · `ds-empty` · `ds-server-error` ·
`ds-field-invalid` · `ds-focus-ring` · `ds-sr-only` · `ds-tone--*`.

**`ds-amount--neg` y `ds-num` ya existen** y son exactamente lo que estas pantallas necesitan para
el dinero. No se inventa nada de importes.

### 7.2 · Lo nuevo — cuatro componentes, cada uno justificado

| Componente | Dónde se usa | Por qué no basta con lo que hay |
|---|---|---|
| **`SignedActionModal`** | 9 pantallas | Es el patrón de §3.1 entero: antes/después, motivo en dos columnas, firma, aviso de irreversibilidad. Repetirlo nueve veces garantiza que nueve diverjan, y el motivo obligatorio es una regla de negocio, no un formulario cualquiera. Envuelve `ModalShell`; **no lo sustituye**. |
| **`CapacityMeter`** | B7, B8, I2 | La tarjeta de §B8: barra + porcentaje escrito + procedencia del techo + qué pasa al llegar + enfriamiento. Son ocho hechos con reglas de rótulo propias (§3.2, §3.3) y aparecen en tres pantallas. Un `<progress>` suelto no lleva ninguno de los siete restantes. |
| **`ProvenanceLine`** | B7, B8, I2, expediente | *«Techo de 500 porque hay una excepción negociada del 14/03 → ver la excepción.»* Una línea, cuatro variantes (`COMPANY_OVERRIDE`/`SUBSCRIPTION`/`CATALOG_DEFAULT`/`NONE`) y dos casos de `NONE` con significados opuestos (§3.2). Es donde se comete el error, así que va en un sitio. |
| **`UsageBreakdown`** | G3, expediente | El desglose de §3.4, con la regla del identificador crudo **dentro del componente**. Que la regla viva en el componente y no en cada llamada es lo que impide que la próxima pantalla la olvide. |

**Ninguno lleva color en su `<style scoped>`.** La trampa de especificidad está documentada
(`AGENTS.md:103-122`): una primitiva global pesa `(0,1,0)` y la regla base de un componente en
`scoped` pesa `(0,2,0)` con su `[data-v-…]`, así que le gana siempre. **La base del componente solo
lleva geometría; el color viaja en `ds-tone--*` desde el marcado, incluido el estado por defecto.**

### 7.3 · Presupuesto de CSS y tamaño de fichero

`css-budget.config.json` fija `maxSfcLines: 500`, `maxOversizedSfc: 0`, `maxStyleMinusScript: 0`,
`maxDuplicateGroups: 0`. **Es un trinquete: los números solo bajan.** Nada de esta especificación
puede subirlos.

Con eso, tres pantallas están **en riesgo de pasarse de 500 líneas** y hay que partirlas desde el
primer día, no después:

- **B8 / `/empresas/:id/cupos`** — ocho tarjetas con ocho hechos cada una. `CapacityMeter` se lleva
  la mayor parte.
- **G3 / `/documentos/:id`** — seis bloques. Cada bloque, su componente.
- **I2 / `/empresas/:id/resumen`** — seis tarjetas de resumen. Un componente de tarjeta con slot.

---

## 8 · Orden de construcción y paralelización

**Criterio.** Primero lo que impide cobrar mal, después lo que hoy obliga a escribir en producción,
después lo que desbloquea vender, y al final lo que solo informa. Y una restricción dura de §1.1:
**ninguna pantalla nueva se puede terminar sin su endpoint**, así que cada onda arranca con su
contrato HTTP acordado.

**Continúa la numeración de la spec de A–H, que llegó a W3.**

### Onda 4 — lo que impide vender, y no depende de nadie

Cinco tareas independientes. Ninguna comparte fichero con otra.

| # | Tarea | Pantallas | Depende de | Por qué va primero |
|---|---|---|---|---|
| **W4-A** | **Ejes de límite** + semilla de los ocho | B1, B2 | endpoint | Paso 2 de la puesta en marcha. **Bloquea la capa J entera.** |
| **W4-B** | **Puesta en marcha ampliada** | A1 | W4-A, W4-D, W4-E (para las sondas) | Cambia la percepción de todo lo demás. Corta. |
| **W4-C** | **Catálogo: cobertura, despublicar, vigencia, tramos** | E2–E5 | — | **E2 es el defecto que impide registrar empresas si falta el precio del núcleo.** |
| **W4-D** | **Catálogos anuales** | J1–J5 | — | Sin UVT y festivos, ningún plazo ni ninguna retención se calcula bien. |
| **W4-E** | **Textos legales** | J6, J7 | — | *«Sin un texto escrito y versionado, ninguna aceptación se puede defender.»* Bloquea vender, no construir. |

> ⚠️ **W1-A sigue sin hacerse y ahora sí bloquea.** El envío condicional de `X-Company-Id`
> (`http.client.ts`, gemelo TR-02, tarea de **`front-parity`**) es prerrequisito de toda la onda 5.
> Hay que arrancarlo **antes que W4-A**, porque es el único con frontera de agente.

### Onda 5 — la empresa y sus cupos. Necesita W1-A y W4-A

| # | Tarea | Pantallas | Depende de |
|---|---|---|---|
| **W5-A** | **Armazón del expediente de empresa** — rutas, cabecera, barra de sub-vistas, `/resumen`, mudanza de `/datos` | I2, I3 | W1-A |
| **W5-B** | **Cupos + corrección de contador** | B8, B9, B10 | **W5-A**, W4-A |
| **W5-C** | **Ventanas de prueba** | C1, C2, C3, C6 | **W5-A** |
| **W5-D** | **Techos de fábrica + política de prueba del artículo** | B3, B4, E6, E7 | W4-A, W4-C |
| **W5-E** | **Excepciones negociadas + desbordadas** | B5, B6, B7 | W4-A |
| **W5-F** | **Concesión manual** | D2, D3 | **W5-A** |

**W5-A es un cuello de botella real y es corto** — es el mismo patrón que `SubscriptionRecordLayout`
ya resuelve. Una vez esté, **B–F van en paralelo**: cinco instancias.

### Onda 6 — el dinero

| # | Tarea | Pantallas | Depende de |
|---|---|---|---|
| **W6-A** | **Documentos de cobro: lista y detalle** | G2, G3 | — |
| **W6-B** | **Aplicaciones, retenciones, notas crédito** | G4, G5, G6, G7 | **W6-A** |
| **W6-C** | **Intentos y reintento** | G9 | — |
| **W6-D** | **Devoluciones y reversiones** | G8, G10 | W6-A |
| **W6-E** | **Conciliación con el facturador** | H1, H3 | W6-A |
| **W6-F** | **Liquidaciones de pasarela y saldos** | H2, G11 | — |
| **W6-G** | **Periodos contables y reconocimiento** | K1, K2 | — |
| **W6-H** | **Retenciones y certificados** | K5 | W4-D (tarifas y festivos) |
| **W6-I** | **Cartera y perfil fiscal de la empresa** | I6, I7 | **W5-A** |

W6-A es prerrequisito de B, D y E. El resto va en paralelo. **Ocho instancias posibles.**

### Onda 7 — cerrar

| # | Tarea | Pantallas | Por qué puede esperar |
|---|---|---|---|
| **W7-A** | Informes de dirección | L1–L7 | La mitad se apoya en tablas que aún no se llenan. **Pero la historia que falte no existirá**, así que las columnas van antes que los informes. |
| **W7-B** | Accesos de soporte, datos personales, archivo, cesión | I8–I11 | Alto valor legal, cero valor operativo hasta que haya clientes. |
| **W7-C** | Prioridad de efectos, dependencias, migración de tarifa | F3, E8, E9 | E8 es un aviso de una línea y **puede subir a la onda 4**. |
| **W7-D** | Mapeo de cuentas, exportaciones, fiscal propio | K3, K4, K6, K7 | D-49: *«es lo único aplazable de todo el documento»* — el auxiliar ya tiene todo para generarlo hacia atrás. |
| **W7-E** | Incidentes y caídas | M1, M2 | Imposible de añadir hacia atrás, pero no bloquea nada. |
| **W7-F** | Sonda de servidor de la puesta en marcha | A2 | Necesita W4-B terminada. |

### Resumen para repartir

```
ANTES QUE NADA (front-parity):  W1-A  ← X-Company-Id, gemelo TR-02
ONDA 4 (5 paralelo):            W4-A │ W4-C │ W4-D │ W4-E  →  W4-B al final
ONDA 5:  W5-A  →  (5 paralelo)  W5-B │ W5-C │ W5-D │ W5-E │ W5-F
ONDA 6:  W6-A  →  (8 paralelo)  W6-B │ W6-C │ W6-D │ W6-E │ W6-F │ W6-G │ W6-H │ W6-I
ONDA 7 (6 paralelo):            W7-A │ W7-B │ W7-C │ W7-D │ W7-E │ W7-F
```

**Regla de no colisión, heredada y reforzada.** Ninguna instancia toca `src/router/index.ts` a la
vez que otra: cada tarea aporta su `src/router/routes/<feature>.routes.ts` y **una sola** instancia
por onda registra los imports al final. `sidebar-nav.ts` lo mismo: **un solo cambio por onda**, con
las entradas ya acordadas en §2. Y `sidebar-nav.ts` está sujeto por
`tests/unit/sidebar-sin-cifras-inventadas.spec.ts`, así que el orden de §2 hay que reflejarlo ahí.

---

## 9 · Fuera de alcance

### 9.1 · Todo `VetSoftwarePublicFront` — retirado por el dueño el 27-08-2026

Se deja enumerado, no borrado, porque el modelo lo exige y hará falta:

| Pantalla del tenant | Qué la exige | Nota |
|---|---|---|
| **Panel de consumo del cliente** | **D-59, condición 1** — *«el tope tiene que estar visible dentro del producto en todo momento. Hoy hay contador y no hay panel»* | Es **irrenunciable** para que D-59 sea defendible. Sin ella, el bloqueo del plan gratuito llega por sorpresa y no se sostiene. |
| **Avisos al 60, 80 y 90 %** | **D-59, condición 2** | El umbral único al 80 no basta cuando al final no hay un cargo sino una puerta cerrada. |
| **Desbloqueo a un clic al registrar tarjeta** | **D-59, condición 3** | *«Un bloqueo cuya salida exige hablar con un humano es un bloqueo que dura días, y en esos días la clínica no factura.»* |
| **Asistente de contratación y carrito** | El producto entero se diseñó para eso | Configurador de seis preguntas → cotización → aceptación → pago. |
| **Conversión de gratis a pago sin hablar con nadie** | **D-58** | *«Con cuota de 179.000, meter tiempo comercial en cada conversión se come el margen antes que la comisión de pasarela.»* |
| **Ampliación de módulos** | D-58 | El caso de Ana a los ocho meses. |
| **Baja en autoservicio** | Ley 1480 art. 43.9 — *cancelar no puede costar más pasos que contratar* | Es obligación legal, no comodidad. |
| **Expediente de derechos del titular visto desde la clínica** | Ley 1581 | La consola solo ve la mitad de plataforma (§I9). |
| **Flujo anónimo de aceptación del comprador en la cesión** | **D-62** | La consola genera el enlace (§I11); servirlo es superficie de tenant. |

**El aviso que hay que dejar dicho, y es de negocio:** **D-59 no se puede activar sin las tres
condiciones**, y dos de las tres viven en el tenant. Bloquear el plan gratuito con la consola
terminada y la app del cliente sin panel de consumo es exactamente lo que el modelo llama *«la
decisión más delicada del documento»* ejecutada sin sus barandillas.

### 9.2 · Fuera por otras razones

| Fuera | Por qué |
|---|---|
| **Extracción a i18n** | No existe `vue-i18n` en ninguno de los dos fronts. Es un proyecto en sí. |
| **Tema oscuro** | Obliga a re-medir la rampa OKLCH entera. |
| **Migrar a Reka UI / Vuetify** | 405 SFC. La capa propia funciona y tiene sus gates. |
| **Puertas de a11y en CI** | `eslint.config.ts` no lo cambia una auditoría de pantalla. Ya está en admin-web #44. |
| **Trampa de foco en `ModalShell`** | Gemelo TR-02 → `front-parity`. Recomendado en §6.1 e issue F-1. |
| **El libro mayor completo** | **D-49**: la contabilidad oficial la lleva el contador externo. Aquí solo el puente (K3, K4). |
| **Fusión y escisión de empresas** | **D-62** las deja fuera de alcance, declaradas. |
| **Un rol separado para el contador externo** | **D-94** lo deja para cuando entre la cuarta persona. La pantalla declara la brecha (§K1). |
| **Ejecutar los nueve barridos desde un botón** | Un barrido masivo con botón en una consola es cómo se ejecuta dos veces. Se muestran sus resultados; se disparan por calendario. |

---

## 10 · Decisiones que tomé yo

El dueño estuvo ausente. Estas siete no estaban decididas y bloqueaban; elegí la opción más
defendible y la anoto para que se pueda revocar con un solo cambio.

**10.1 · La concesión manual (D-92) caduca obligatoriamente. Máximo 90 días.**
El modelo dice que estas filas *sobreviven a todos los recálculos, para siempre, sin contrato, sin
cargo y sin caducidad*. Una concesión perpetua sin contrato es lo que el `UPDATE` a mano producía;
construir la pantalla sin caducidad la haría más cómoda pero no menos peligrosa. Con `valid_until`
obligatorio, lo peor que pasa es un permiso de más durante un plazo acotado y visible.
*Revocable si negocio prefiere concesiones indefinidas; entonces hace falta una revisión periódica
obligatoria en su lugar.*

**10.2 · Los techos de fábrica se rechazan sobre un eje sin instrumentar.**
Cinco de los ocho ejes no los cuenta nadie. El modelo dice que *«un cupo que no se incrementa es
peor que no tenerlo»* y que hay que *«instrumentar antes de vender, o retirar de la venta lo que no
se cuenta»*. La interfaz no puede instrumentar, pero sí puede negarse a vender. Es la única
barandilla posible ante un defecto que el esquema no ve.

**10.3 · La corrección de consumo va por `/system/**`, nunca por el puerto de `entitlement`.**
No es una preferencia: `CompanyEntitlementController` resuelve la empresa con
`Authz.currentCompanyId()`. Si D-12 aterriza ahí, la administradora de la clínica recupera su cupo
cada vez que topa. Es un hallazgo del propio modelo que verifiqué contra el código (§1.3).

**10.4 · La cesión de contrato no se puede completar sin la aceptación del comprador.**
Plataforma no firma por un tercero. Sin `acceptance_id` la cesión queda en borrador y la pantalla lo
dice. Lo contrario —dejar que comercial marque una casilla de «el comprador aceptó»— convierte la
prueba en una afirmación, que es exactamente lo que el modelo persigue en todas partes.

**10.5 · La regla del identificador crudo se aplica también en la consola de plataforma.**
Confirmada por el coordinador y razonada en §3.4: el componente es el mismo que verá el tenant, la
consola no tiene contexto clínico, y un enlace crudo desde una pantalla de dinero es el único camino
hacia un dato clínico **sin la constancia que exige D-91**. El acceso existe, pero pasa por un modal
con motivo.

**10.6 · Los cinco catálogos anuales van en una entrada de menú, no en cinco.**
Cinco tablas sin dependencias entre sí, con la misma tarea: *«¿está sembrado el año que viene?»*.
Cinco entradas para eso es exponer el esquema, no la tarea — es el mismo criterio con el que la spec
de A–H fundió las nueve rutas del configurador en una pantalla.

**10.7 · «Cobranza» se parte en tres pantallas por tarea, no en diez pestañas.**
Perseguir el cobro, emitir, y cuadrar son tres trabajos con tres personas distintas detrás. Diez
pestañas en una barra no se leen de un vistazo, y el techo por debajo del cual sí se leen es seis.

---

## 11 · Comprobaciones — qué medí y qué no

**Hecho, leyendo:**

- `models/modelo-datos-suscripciones.html` **entero** — 4.336 líneas de texto extraído: las fichas
  de las capas A–P, las 96 decisiones, la tabla de quién puede tocar cada tabla, las nueve reglas de
  construcción, las nueve columnas generadas, los 21 hallazgos de auditoría, las 24 cosas construidas
  mal, el anexo legal y el anexo técnico de las reglas que la base no puede imponer.
- `VetSoftwareFront`: las 27 features, las 60 vistas, las 23 familias de rutas, `sidebar-nav.ts`
  completo, `CompanyDetailView.vue` completo, `platform-setup.types.ts` completo,
  `usePlatformSetup.ts:294-460`, `SubscriptionSummaryView.vue` completo,
  `SubscriptionMoneyView.vue` (partes), `subscriptions-admin.routes.ts:85-113`,
  `docs/ux/README.md`, y el índice + §2, §7, §8, §9, §10 de
  `docs/ux/suscripciones-consola-especificacion.md`.
- `VetSoftware` (backend): la lista de módulos de `app/`, los controladores de suscripciones,
  catálogo, precios, configurador y entitlements, con sus verbos y rutas.
- El inventario de raíces `ds-*` de `primitives.css`, extraído con `grep -o` — las 132 raíces.

**Comprobado con comando, con el comando al lado:**

- `grep -rn "X-Company-Id" src/` en `VetSoftwareFront` → **5 comentarios, 0 implementaciones**.
- `grep -rhn "@GetMapping|@PostMapping|…" PriceListController ConfiguratorAdminController
  CompanyEntitlementController` → los verbos citados en §1.7 y §1.2.
- `find src/main/java -ipath "*capacit*"` → `AdjustCompanyCapacityUsageService` existe;
  **ningún controlador propio**.
- `ls src/main/java/com/vetsoftware/app/` → ninguno de los módulos de las capas I–P existe (§1.1).
- `ls src/features/commercial-catalog/components/ src/features/configurator/components/` → los
  componentes citados en §1.7.

**NO ejecutado. No lo doy por pasado:**

- ❌ **Ninguna medición de contraste.** No corrí `ds:audit`, ni un cálculo de luminancia, ni WebAIM.
  Los umbrales de §6.4 son **los que hay que superar**, no medidas mías. La lista de §6.4 es trabajo
  pendiente, no un resultado.
- ❌ No levanté el backend ni el dev server. **Ninguna respuesta real fue observada.** Todos los
  endpoints de este documento son **propuestas**, no rutas verificadas — a diferencia de la spec de
  A–H, donde las 366 rutas existían (§1.1).
- ❌ No corrí `npm run quality`, ni Vitest, ni Playwright, ni el presupuesto de CSS. Nota conocida
  del proyecto: `npm run quality` **no corre `vue-tsc`** en admin-web, así que un error de tipos
  pasa las cinco puertas en verde.
- ❌ No comprobé qué `@PreAuthorize` exige cada ruta existente ni si el rol de superadministrador
  los tiene. Sigue siendo el hueco de admin-web #145.
- ❌ No leí `AppTable.vue`, `AppModal.vue` ni `ModalShell.vue` en esta pasada: me apoyo en lo que
  la spec de A–H ya verificó de ellos y en el inventario de primitivas.
- ❌ **No busqué duplicados de los issues propuestos con `gh`.** El bloqueo de facturación de Actions
  es reincidente en este proyecto y no quise gastar el turno; hay que buscarlos antes de abrir
  ninguno.
- ❌ Ninguna de estas pantallas está renderizada. No hay una sola previsualización real.

---

## 12 · Issues propuestos

**No abro ninguno.** Van redactados para que los decida un humano, y **sin verificar duplicados**
(§11).

### En `kefaroTech/vetsoftware-backend`

- **B-10 · La corrección de consumo no puede vivir en el puerto de `entitlement`.**
  `AdjustCompanyCapacityUsageUseCase` existe y no tiene controlador. Si se le pone uno en
  `CompanyEntitlementController`, la empresa la resuelve `Authz.currentCompanyId()` y el cliente
  podrá corregirse su propio contador. Hace falta `POST /system/company-capacities/{id}/adjust`,
  solo-plataforma, con motivo y firma, que **escriba un hecho compensatorio** en
  `company_limit_events` y **no sobrescriba** `used_quantity`. Lo advierte el propio modelo, capa F,
  tabla «Contadores y bitácora de cupo».

- **B-11 · Sonda de servidor de la puesta en marcha.**
  Hoy son 7 consultas desde el navegador del operador (15 con la ampliación). Un despliegue arranca
  con el catálogo vacío y nadie se entera. Propuesta: `GET /system/platform-setup` que devuelva los
  15 pasos ya resueltos, con `state` y `reason`, y que pueda alimentar una alarma.

- **B-12 · `company_capacities` necesita endpoint propio y las columnas de la capa J.**
  Hoy viaja anidado en `GET /entitlements/access` y solo con las cuatro unidades viejas. Faltan
  `enforcement`, `warn_threshold`, `limit_source`, `override_id`, `period_key` y `over_limit_since`
  — sin ellas la pantalla de cupos no puede decir de dónde sale un techo ni qué pasa al llegar.

- **B-13 · La cobertura de precios agrupa sobre lo escrito, no sobre los artículos activos.**
  Un artículo sin precio no produce grupo y la publicación pasa limpia. **Si el olvidado es el
  núcleo, ninguna empresa puede registrarse.** El mensaje de rechazo debe enumerar los artículos que
  faltan, con el mismo texto que la consola pintará en su banner (§E2).

- **B-14 · El rol de contador externo (D-84) no existe.**
  `accounting_periods.closed_by_system_user_id` apunta a los usuarios de plataforma, que lo ven
  todo. O el contador ve las historias clínicas de todas las clínicas, o la regla de D-33 es
  incumplible. Y falta en la lista de terceros que tratan datos, con su contrato de encargo.

- **B-15 · `accounting_exports` no se puede rehacer.**
  La clave única por periodo permite exportar un mes una sola vez. Un fichero rechazado por el
  contador no tiene forma de regenerarse. Hace falta versión y estado.

- **B-16 · Los cinco ejes sin instrumentar deben declararse en la respuesta.**
  `GET /system/limit-dimensions` debería devolver, por eje, si existe quien lo incremente. Sin ese
  dato la consola no puede impedir que se venda un cupo que nadie mide (§10.2), y el modelo es
  explícito: *«o se instrumenta, o se retira de la venta»*.

### En `kefaroTech/vetsoftware-admin-web`

- **F-1 · `ModalShell` no retiene el foco.**
  Pone `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape y foco inicial, y **no atrapa el
  foco**. WCAG 2.2 §2.4.3 (A). Con nueve modales nuevos que mueven dinero o acceso, deja de ser una
  molestia. **Es gemelo TR-02: la corrección va por `front-parity` y en los dos repos a la vez.**

- **F-2 · Ningún `aria-describedby` en todo el repositorio.**
  El error de un formulario no está asociado a su input. WCAG 2.2 §3.3.1 (A). *Blast radius*:
  todos los formularios de los dos fronts. Los nueve modales de firma de esta especificación no
  pueden entrar sin él, así que conviene resolverlo como patrón antes de la onda 5.

- **F-3 · `<html lang="en">` en `index.html:2` con la app íntegra en español.**
  WCAG 2.2 §3.1.1 (A). Una línea. El tenant ya lo tiene bien.

- **F-4 · El comentario de `PLATFORM_SETUP_TEXTS.count` dice «de 6 pasos» y serán 12.**
  `platform-setup.types.ts:119`. La función está bien parametrizada; el comentario no. Va con W4-B.

### Comentario que hay que dejar en `admin-web #145`

Que esta especificación existe, que continúa
`docs/ux/suscripciones-consola-especificacion.md` cubriendo las capas I–P, que el alcance se recortó
a la consola el 27-08-2026, y que **W1-A (el envío de `X-Company-Id`) sigue sin hacerse y ahora
bloquea la onda 5 entera**.

---

## Fuentes

**Del proyecto**
- `models/modelo-datos-suscripciones.html`, revisión del 26-08-2026 — fuente única del modelo.
- `VetSoftwareFront/docs/ux/suscripciones-consola-especificacion.md` — las capas A–H.
- `VetSoftwareFront/docs/ux/reglas-de-interfaz.md` — las quince reglas (R01–R15).
- `VetSoftwareFront/AGENTS.md:103-122` — la trampa de especificidad.
- `VetSoftwareFront/css-budget.config.json` — el trinquete.

**Norma y guía** (verificadas vivas el 2026-08-20; **no** re-consultadas en esta pasada)
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/ · Quick Reference — https://www.w3.org/WAI/WCAG22/quickref/
- §1.4.3 Contrast (Minimum) — https://www.w3.org/TR/WCAG22/#contrast-minimum
- §1.4.11 Non-text Contrast — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- §2.4.11 Focus Appearance — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- §2.5.8 Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- APG, patrones de componente — https://www.w3.org/WAI/ARIA/apg/patterns/
- Tutorial de formularios del W3C — https://www.w3.org/WAI/tutorials/forms/
- GOV.UK, *Validation pattern* — https://design-system.service.gov.uk/patterns/validation/
- GOV.UK, *Error summary* — https://design-system.service.gov.uk/components/error-summary/
- NN/g, *Ten Usability Heuristics* — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, *Errors in Forms* — https://www.nngroup.com/articles/errors-forms-design-guidelines/
- NN/g, *Empty State Interface Design* — https://www.nngroup.com/articles/empty-state-interface-design/
- Vue 3, guía de estilo — https://vuejs.org/style-guide/ · accesibilidad — https://vuejs.org/guide/best-practices/accessibility.html

---

*VetSoftware · consola de plataforma · capas I–P · 27 de agosto de 2026.*
*8 pantallas existen · 4 se completan · 44 nacen de cero · 24 bloquean la venta.*
