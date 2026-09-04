# Plataforma, empresas y suscripciones — auditoría visual de las pantallas

**Ámbito:** el bloque comercial de la consola: `/empresas` y su expediente de diez pestañas,
`/modulos`, `/submodulos`, `/permisos-base`, `/roles-base`, `/permisos-roles-base`, `/limites/*`,
`/catalogo-comercial` y la ficha de artículo, `/cotizaciones` (+ `/:id`, `/nueva`),
`/suscripciones` y el expediente de contrato, `/pruebas/*`, y las tres pantallas de acceso
(`/solicitar-acceso`, `/aprobar-acceso`, `/aceptar-invitacion`).

**Árbol:** worktree `MainVetSoftware-uxaudit/admin-web`, rama `audit/ux-screens-admin`, HEAD
`f9ec359`. **No se tocó `src/`.**

**Material:** las capturas de `_capturas/admin/{escritorio,portatil,tablet-v,tablet-h,movil}` y
`$SCRATCH/uxa-metricas-admin.json`. **Nada se ejecutó**: ni servidor de desarrollo, ni Playwright,
ni `quality`, ni `ds:audit`, ni `axe`. Ningún ratio de contraste de este informe fue medido en esta
sesión; los que se citan vienen de comentarios ya verificados del árbol. Las medidas de línea son
la aproximación declarada por la rúbrica (`ancho ÷ (0,5 × font-size)`), no una medición del
navegador.

**Autoridad, por orden:** WCAG 2.2 A/AA → `reglas-de-interfaz.md` (R01–R15),
`patron-de-mensajes.md`, `armazon-tablet-especificacion.md` →
`suscripciones-consola-ampliacion-especificacion.md` §I2–I11 y
`dinero-consola-auditoria-de-conjunto.md` para sus zonas → `tokens.css`/`primitives.css` →
literatura. La rúbrica de maquetación es `public-web/docs/ux/uxa-rubrica-maquetacion.md`.

**Lo sistémico del armazón no se repite aquí.** `uxa-armazon-y-primitivas-admin.md` ya cubre H01–H12
(identidad del pie del sidebar, R04 y los botones «Editar»/«Eliminar» duplicados, `.ds-table-scroll`
sin teclado, `AppSelect`, `<h1>` ausentes, `document.title`, la campana, el foco al paginar,
`required` como asterisco, `AppCheckbox`). Cuando una de esas cosas aparece en una captura de este
bloque se cita por su número y **no consume cupo**.

---

## 0 · Qué NO se pudo auditar, y por qué

Esto va primero porque cambia la lectura de todo lo demás.

| Pantalla | Estado | Causa |
|---|---|---|
| **`/empresas/:id/*`, modo `lleno`, las 10 pestañas, los 5 viewports** | **No auditable** | Las 10 capturas `__lleno` son **byte a byte idénticas** (md5 `554c4b8a…`): todas muestran el mismo banner de error. El arnés sirvió la empresa #3 para la URL `/empresas/1`, y la defensa de `useCompanyRecord.ts:71` se disparó. El expediente **sí** se auditó con el modo `vacio`, que sirve la empresa correcta. |
| **`/suscripciones/:companyId/:id/*`, las 7 pestañas, los 2 modos, los 5 viewports** | **No auditable** | Las 14 capturas son idénticas (md5 `fa187b51…`) y **están completamente en blanco**: solo sidebar y barra superior. `SubscriptionRecordHeader.vue:87` lanzó `Cannot read properties of undefined (reading 'toLowerCase')` y no hay frontera de error que lo contenga. El disparador es del arnés (le pasó un artículo de catálogo donde esperaba un contrato); **la consecuencia no lo es** → hallazgo P-01. |
| `/empresas` `__modal` (5 viewports) | **No auditable** | La captura no contiene ningún diálogo: es el listado sin el botón «Nueva empresa» de la barra superior. El modal no llegó a abrirse. |
| `/membresias`, `/membresias/:id`, `/membresias-submodulos`, `/membresias-submodulos/:id` | **Sin pantalla que auditar** | Son cuatro `redirect` puros a `/catalogo-comercial` (`memberships.routes.ts:6-14`, `membership-sub-modules.routes.ts:6-14`). La ausencia de captura es correcta, no una laguna. |
| `/limites` y `/pruebas` (raíces) | Cubiertas | Redirigen a `ejes` y a `vencimientos` (`limits.routes.ts:51`, `trials.routes.ts:49`), que sí tienen captura. |
| `tablet-h` (1024×768) | **Completa para este bloque** | Las 8 diferencias frente a `escritorio` son las capturas `__modal`, que solo existen en `escritorio`. |

**Marca de borde de media query.** `portatil` (1280) y `tablet-v` (768) caen sobre bordes de
`@media` según §2.2 de la rúbrica. Ningún hallazgo de este informe se apoya únicamente en esos dos
viewports. Los defectos a **390 px** salen como `nota` por §2.3 (la consola solo promete 768 hacia
arriba, `armazon-tablet-especificacion.md` §3).

---

## 1 · Hallazgos

### P-01 · [bloqueante] Un fallo de render borra la región o la pantalla entera, sin mensaje, sin reintento y sin ceder el esqueleto

> **Ficheros:** `src/main.ts:13-23` (no hay `app.config.errorHandler`) · `SubscriptionRecordHeader.vue:87`
> · `src/features/companies/components/record/summary/ContractCard.vue:65`
> · `src/features/commercial-catalog/composables/useCatalogItemLimits.ts:50`
> · `src/features/subscriptions-admin/views/SubscriptionsAdminView.vue:103-116`
> **Criterio:** R05 regla 1 (el error se pinta antes que el vacío) · R06 (el indicador de espera
> tiene que ceder) · NN/g, *Do not default to totally empty states* · Nielsen §1 *Visibility of
> system status* y §9 *Help users recognize, diagnose, and recover from errors*
> **Capturas:** `escritorio/suscripciones-7-1-resumen__lleno.png` (y sus 13 gemelas) ·
> `escritorio/suscripciones__lleno.png` · `escritorio/catalogo-comercial-articulos-1__lleno.png`

**No hay ni una frontera de error en toda la consola.** `grep -rn "errorCaptured\|errorHandler"
src/` devuelve **cero**. Vue, ante una excepción en `render`, desmonta el subárbol y sigue. El
resultado no se parece a un fallo: se parece a que la pantalla no tiene nada.

Tres formas distintas del mismo defecto, las tres fotografiadas:

1. **Pantalla entera en blanco.** `suscripciones-7-1-*__{lleno,vacio}.png` — las **catorce**
   capturas del expediente de contrato son la misma imagen: sidebar, barra superior, y **toda
   la columna de contenido en blanco**. Ni título, ni pestañas, ni error. La causa está en una sola línea:

   ```vue
   <!-- SubscriptionRecordHeader.vue:87 -->
   Ciclo {{ BILLING_CYCLE_LABEL[subscription.billingCycle].toLowerCase() }} · periodo
   ```

   Un enum que el mapa no conoce —o que llega `null`, y el contrato del backend **no declara
   nulabilidad en ninguno de sus 650+ esquemas**— devuelve `undefined`, y `.toLowerCase()` sobre
   `undefined` lanza. `ContractCard.vue:65` repite la misma expresión, y es la tarjeta principal de
   `/empresas/:id/resumen`.

2. **Cabecera de tabla flotando sobre nada, contradiciendo su propio contador.**
   `suscripciones__lleno.png`: el bloque dice **«137 contratos registrados»** y debajo hay una fila
   de cabecera (`CONTRATO · EMPRESA · ESTADO · VIGENCIA · CICLO · PERIODO ACTUAL · PRÓXIMO COBRO ·
   RENOVACIÓN`) y **cero filas, cero esqueleto, cero estado vacío y cero paginación**. El código
   está bien cableado (`:empty="subscriptions.length === 0"`, `AppTable.vue:197` pinta el `#empty`),
   así que la única explicación compatible con lo que se ve es que el contenido del `<tbody>`
   —`PlatformSetupChecklist variant="compact"`, `SubscriptionsAdminView.vue:103`— lanzó y se llevó
   el cuerpo por delante dejando el `<thead>`.

3. **Esqueleto eterno — RETIRADO: era el arnés, no el producto.** La captura
   `catalogo-comercial-articulos-1__lleno.png` mostraba los paneles «Qué pantallas abre» y
   «Techos de fábrica» en esqueleto permanente, con `dimensions.value.map is not a function`.
   La causa no estaba en `useCatalogItemLimits.ts:50`: el contrato declara `GET /limit-dimensions`
   como `array` y el front lo consume bien. Quien servía un objeto de página era el arnés de
   capturas, cuyo inventario de endpoints no reconocía las llamadas cuya URL viene de una
   constante y caía a un respaldo que adivinaba «página». Corregido en `e2e/uxaudit/arnes.ts`:
   las dos pantallas pintan ahora 25 y 55 filas con cero errores de forma.

   Lo que sí se sostiene es la frase del panel: **«Este artículo ya abre todas las pantallas
   vendibles del sistema»** se afirma sin esperar a que la tabla haya cargado. Ya no coincide con
   un esqueleto, pero sigue siendo una conclusión emitida antes que el dato.

Un esqueleto que no cede es **peor** que un error: el operador espera indefinidamente una tabla que
nunca va a llegar. Es exactamente lo que R06 y los umbrales de NN/g (10 s como techo de atención)
existen para impedir.

**Arreglo, en tres piezas y por orden de coste:**

1. **Frontera de error de aplicación.** `app.config.errorHandler` en `src/main.ts` que envíe el
   error a la telemetría, y **un `onErrorCaptured` en `AppLayout.vue`** que sustituya el `<slot>`
   por el banner de error ya existente (`.ds-banner.ds-banner--error` con `role="alert"`, el mismo
   marcado de `AppTable.vue:150-160`), con el texto de `patron-de-mensajes.md` §6 y un botón
   «Recargar la pantalla». Nada de CSS nuevo: la primitiva está.
2. **`onErrorCaptured` también en `AppTable.vue`**, que ponga la tabla en su rama de error (rama 1,
   `:148`) en vez de dejar la cabecera huérfana. Con eso el caso 2 y el 3 se convierten en un error
   legible con su «Reintentar».
3. **Las dos líneas que lanzan hoy**: `BILLING_CYCLE_LABEL[x]?.toLowerCase() ?? '—'` en
   `SubscriptionRecordHeader.vue:87` y `ContractCard.vue:65`; `Array.isArray(result) ? result : []`
   en `catalog-item-limits.store.ts:61`. Son tres líneas y quitan tres pantallas en blanco.

**Verificación posterior:** una spec de Vitest que monte `SubscriptionRecordHeader` con
`billingCycle: 'LO_QUE_SEA'` y afirme que la cabecera se pinta con `—` en vez de lanzar; y una
`toMatchAriaSnapshot` de Playwright sobre `/suscripciones/:c/:id/resumen` que exija un `heading`
—hoy el árbol de accesibilidad de esa ruta está vacío.

---

### P-02 · [grave] Ninguna barra de pestañas de la consola señala en cuál estás — la trampa de especificidad, seis veces

> **Ficheros:** `CompanyRecordNav.vue:70-71` · `SubscriptionRecordNav.vue:75-76` ·
> `LimitsView.vue:85-86` · `TrialsView.vue:108-109` · `BillingOperationsView.vue:102-103`,
> todos contra `primitives.css:1444-1447`
> **Criterio:** la doctrina de especificidad del propio repo (`AGENTS.md:103-122`) · Nielsen §1
> *Visibility of system status* · WCAG 2.2 §2.4.8 *Location* (AAA, como umbral, no como
> incumplimiento)
> **Capturas:** `escritorio/empresas-1-resumen__vacio.png`, `escritorio/empresas-1-cartera__vacio.png`,
> `tablet-v/empresas-1-cupos__vacio.png` — las diez pestañas del mismo gris en las tres

En `empresas-1-cartera__vacio.png` el contenido es «Cartera» y **la pestaña «Cartera» se ve
exactamente igual que las otras nueve**. En `empresas-1-resumen__vacio.png`, igual con «Resumen».
No es un problema de tono: **no hay ninguna diferencia visual**.

La causa es el caso de libro que `AGENTS.md:103-122` documenta:

```css
/* CompanyRecordNav.vue:67-75 — scoped ⇒ .tab[data-v-…] pesa (0,2,0) */
.tab {
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
}
```
```css
/* primitives.css:1444 — pesa (0,1,0) y PIERDE */
.ds-tab--active {
  border-bottom-color: var(--amatista-600);
  color: var(--amatista-700);
}
```

Y la primitiva lo avisa por escrito en su propio comentario (`primitives.css:1441-1443`): sus cuatro
copias originales se aplicaban sobre **`.tab.active`**, dos clases, (0,2,0) → (0,3,0) en `scoped`.
Los seis consumidores actuales la aplican con **una sola clase**. El comentario de
`CompanyRecordNav.vue:64-65` —«el color del estado activo lo pone `.ds-tab--active`, no esta regla»—
describe una intención que la cascada no cumple.

`aria-current="page"` **sí** se emite (`CompanyRecordNav.vue:46`), así que un lector de pantalla
sabe dónde está y un usuario con vista no. Es el reparto exactamente inverso al habitual.

**Alcance: 31 rutas.** Expediente de empresa (10) · expediente de contrato (7) · `/cobranza/*` (8) ·
`/limites/*` (4) · `/pruebas/*` (2).

**Arreglo — sin tocar `primitives.css` y sin CSS nuevo.** En los cinco SFC, quitar `color` y
`border-bottom-color` de la regla base del `scoped` y dejar solo geometría, tal y como manda la
doctrina:

```css
.tab {          /* o .pestana */
  display: inline-flex;
  align-items: center;
  padding: var(--space-10) var(--space-2);
  border-bottom: 2px solid transparent;   /* se queda: es geometría */
  font-size: var(--text-body);
  text-decoration: none;
  white-space: nowrap;
}
```

y llevar el color de reposo al marcado con la clase de tono correspondiente, igual que el resto del
sistema. Si se prefiere no tocar cinco ficheros: **aplicar la primitiva sobre dos clases** —
`:class="{ 'ds-tab--active': isActive, active: isActive }"` y reforzar en `primitives.css` a
`.ds-tab--active.active` — pero eso es `primitives.css`, o sea **gemelo TR-02 y trabajo de
`front-parity`**, y hay que replicarlo en el tenant. La primera opción es de `front-feature` y no
toca ningún gemelo.

**Verificación posterior:** `e2e/` — navegar a `/empresas/1/cartera` y afirmar que
`getByRole('link', { name: 'Cartera' })` tiene `color` distinto del de `getByRole('link', { name:
'Fiscal' })`. Un `toMatchAriaSnapshot` **no** lo detecta: el `aria-current` ya está bien.

---

### P-03 · [grave] Cuando el expediente de empresa falla, se lleva por delante la navegación y ofrece la acción que su propio mensaje descarta

> **Ficheros:** `src/features/companies/views/CompanyRecordLayout.vue:57-73` ·
> `src/features/companies/composables/useCompanyRecord.ts:71-76`
> **Criterio:** `patron-de-mensajes.md` §6 regla 2 (si dice «inténtalo de nuevo», hay un botón que
> lo intenta — y su recíproco) · Nielsen §3 *User control and freedom* y §9 · WCAG 2.2 §3.3.3
> *Error Suggestion* (AA)
> **Captura:** `escritorio/empresas-1-resumen__lleno.png` y sus 9 gemelas idénticas

El mensaje dice, literalmente: *«El servidor devolvió la empresa #3 y la URL pide la #1. **Ábrela
desde la lista de empresas.**»*

Y en pantalla hay **un solo botón: «Reintentar»**, que vuelve a llamar a `openRecord(1)` y
—tratándose de una discrepancia determinista de identidad, no de un fallo de red— **está garantizado
que falla otra vez**. La acción que el texto recomienda, ir a la lista, **no tiene control**: la
rama de error de `CompanyRecordLayout.vue:57` sustituye a todo, así que también desaparecen el
enlace «← Empresas», la cabecera de identidad y las diez pestañas. Solo queda el sidebar.

Es el simétrico de **D-08** (`dinero-consola-auditoria-de-conjunto.md:566`, «Reintentar» sobre un
403): allí se ofrece reintentar lo que no se puede reintentar; aquí, además, se retira lo que sí
resolvería.

**Arreglo.** Separar las dos ramas de error, que hoy comparten pintado:

- **Fallo transitorio** (`catch` de `useCompanyRecord.ts:79`, red/5xx): se queda como está —banner,
  traza y «Reintentar».
- **Discrepancia de identidad** (`useCompanyRecord.ts:71`): **no** lleva «Reintentar». Lleva
  `<RouterLink class="ds-btn ds-btn--ghost ds-btn--sm" :to="{ name: ROUTE_NAMES.COMPANIES_LIST }">
  Ir a la lista de empresas</RouterLink>`, que es la acción que el texto ya nombra.
- **En las dos ramas**, sacar el enlace de vuelta fuera del `v-if`: mover el `← Empresas` de
  `CompanyRecordHeader` al armazón, por encima del banner. Un expediente que falla tiene que dejar
  salir.

Modelar el tipo del error en el store (`kind: 'transient' | 'identity'`) en vez de decidir por el
texto del mensaje.

---

### P-04 · [grave] La primitiva de banner no tiene tope de medida: la prosa que hay que leer para trabajar sale a ~158 caracteres por línea

> **Fichero:** `src/assets/styles/primitives.css:196-205` (`.ds-banner`, sin `max-inline-size`)
> **Criterio:** WCAG 2.2 §1.4.8 *Visual Presentation* — *«Width is no more than 80 characters or
> glyphs»* (AAA, umbral de rúbrica) · rúbrica §3.6: `> 80` es `menor`, y **`grave` cuando es texto
> que hay que leer para trabajar**
> **Capturas:** `escritorio/empresas-1-cartera__vacio.png` (el aviso de acuse de entrega) ·
> `escritorio/catalogo-comercial-articulos-1__lleno.png` (el aviso de «reglas del configurador»)

En `empresas-1-cartera__vacio.png` el aviso ámbar ocupa **de x=300 a x=1385**. Descontando relleno
(14 px × 2), icono (16) y hueco (8) quedan **≈ 1.033 px de texto a `--text-body` = 13 px**
(`tokens.css:199`) → **≈ 158 caracteres por línea**, casi el doble del techo de §1.4.8. Y lo que
dice no es decorativo:

> «Un hito anotado no es un acuse de entrega. El contrato no publica el estado de entrega de un aviso
> —ni acuse, ni rebote, ni lectura—, así que un correo que rebotó y uno que se leyó se cuentan aquí
> exactamente igual. Antes de sostener una restricción ante una reclamación, comprueba por fuera que
> los avisos llegaron: esta pantalla puede probar que se mandaron, no que se recibieran.»

Es la advertencia que impide degradar una cuenta sin prueba de entrega —la regla D-23/D-35 que
`suscripciones-consola-ampliacion-especificacion.md` §I6 califica de bloqueo explícito—. Si se lee
en diagonal porque la línea es larga, se pierde dinero o se pierde un litigio.

**Y la contradicción está en la misma captura.** Justo debajo, la lista «Lo que esta pestaña todavía
no muestra» **sí** está limitada a ≈ 520 px (≈ 78 caracteres). Dos disciplinas de medida distintas,
a 300 px de distancia vertical, en la misma pantalla.

**Alcance: 115 usos de `ds-banner--warning`/`--info` en la consola**, de los cuales 53 SFC están en
este bloque. Solo **17 de 101 SFC** de `src/features` limitan la medida en `ch`.

**Arreglo — una declaración, en el sitio correcto.** En `primitives.css`, dentro de `.ds-banner`:

```css
/* §1.4.8: la línea de un banner es prosa que hay que leer, no una fila de tabla.
   El tope va en `ch` y no en px porque tiene que seguir al tamaño de letra. */
max-inline-size: 78ch;
```

`max-inline-size` no compite con nada y no cambia el ancho de los banners cortos, que son la
mayoría. **Ojo: `primitives.css` es gemelo TR-02 → esto es de `front-parity` y hay que replicarlo
byte a byte en `public-web`.** Cuenta como una declaración nueva en un fichero global, así que no
mueve `maxStyleMinusScript` ni `maxDuplicateGroups`.

---

### P-05 · [grave] El marcador de hueco imprime la palabra «undefined» al operador, 25 veces en una sola captura

> **Ficheros:** `src/features/commercial-catalog/composables/useCatalogItemBridges.ts:155` ·
> mismo molde en `useTierSimulator.ts:71`, `PriceListPricesPanel.vue:125`,
> `BundleComponentForm.vue:154`, `HintsWithHintTable.vue:69`, `useCompanyTrial.ts:173-174`
> **Criterio:** R14 (hueco honesto antes que dato inventado) · Nielsen §9 · el marcador `—` que
> `composables/format.ts` ya establece como convención de la casa
> **Captura:** `escritorio/catalogo-comercial-articulos-1__lleno.png`, columna «REGLA» de «Reglas
> del configurador»

Veinticinco filas seguidas que dicen **`Artículo #undefined`**. La plantilla es:

```ts
// useCatalogItemBridges.ts:155
return found ? `${found.code} · ${found.name}` : `Artículo #${id}`
```

La rama de respaldo asume que `id` existe. Cuando no existe —y el contrato del backend **no declara
`nullable` en ninguno de sus 650+ esquemas**, así que el cliente no puede saberlo por el tipo— la
interpolación produce la cadena literal `undefined` y la pinta.

`undefined` no es un hueco honesto: es ruido de implementación filtrado a la interfaz. Y en la misma
pantalla la columna «REGLA» está **completamente vacía** en las 25 filas, mientras que
`permisos-roles-base__lleno.png` sí usa `—` en sus columnas sin dato. **Tres tratamientos del dato
ausente conviviendo**: `—`, la celda vacía, y la palabra `undefined`.

**Y no es el único vocabulario de la nada en esa captura.** La cabecera del artículo dice, en seis
casillas: `TIPO: —`, `CAPACIDAD: No aplica`, `NÚCLEO: No`, `CANTIDAD: — sin tope`.

**Arreglo.**

1. Guardar la interpolación en los seis sitios: `id == null ? '—' : \`Artículo #${id}\``. Mejor
   todavía, una función única en `src/composables/format.ts` —que **no** es gemelo TR-02, lo dice
   `format.ts:24-32`— junto al marcador que ya vive ahí:
   ```ts
   /** Referencia a una entidad por id cuando no se ha podido resolver su nombre.
    *  Devuelve el marcador de hueco si el id no llegó: `#undefined` en pantalla
    *  es ruido de implementación, no un hueco honesto (R14). */
   export function refById(prefijo: string, id: number | null | undefined): string
   ```
2. Un lint de repo que prohíba `#${` y `#{{` sin guarda en plantillas es desproporcionado; en su
   lugar, una spec de Vitest por composable que le pase `undefined` y exija `—`.

---

### P-06 · [menor] La misma empresa es «Activa» en el listado y «Habilitada» en su expediente, a un clic de distancia

> **Ficheros:** `src/features/companies/views/CompaniesListView.vue:230` vs
> `src/features/companies/components/record/CompanyRecordHeader.vue:46`
> **Criterio:** Nielsen §4 *Consistency and standards* ·
> `suscripciones-consola-ampliacion-especificacion.md` §I2, que avisa **por escrito** de que «activa»
> es la palabra que hay que evitar
> **Capturas:** `escritorio/empresas__modal.png` (badges «Activa» / «Deshabilitada») ·
> `escritorio/empresas-1-resumen__vacio.png` (badge «Habilitada»)

Es el mismo booleano `company.enabled` rotulado dos veces:

```vue
<!-- CompaniesListView.vue:230 -->  :label="company.enabled ? 'Activa' : 'Deshabilitada'"
<!-- CompanyRecordHeader.vue:46 --> :label="company.enabled ? 'Habilitada' : 'Deshabilitada'"
```

El negativo coincide y el positivo no, que es la peor de las tres combinaciones posibles: en el
listado el operador lee el par **«Activa» / «Deshabilitada»**, que no es un par de antónimos, así que
las dos etiquetas no se leen como los dos extremos de un mismo eje.

Y hay un motivo de dominio para elegir «Habilitada» y no «Activa», ya escrito en el plano:
`commercial_state` —`PAYING` / `FREE` / `TRIAL_ONLY` / `CHURNED`— es una dimensión **distinta** de
`enabled`, y §I2 lo dice con todas las letras: *«No es "activa"»*. Gastar la palabra «activa» en el
interruptor de acceso hace imposible usarla después para lo que significa.

**Arreglo.** `CompaniesListView.vue:230` pasa a `'Habilitada' : 'Deshabilitada'`. Un literal.

---

### P-07 · [menor] Los doce enlaces con forma de botón salen subrayados: un botón y un enlace-botón no se parecen

> **Ficheros:** `src/assets/styles/primitives.css` `.ds-btn` (sin `text-decoration`) ·
> `src/assets/styles/base.css` (sin reset de `a`; `grep text-decoration src/assets/styles/` devuelve
> **una sola** ocurrencia, y es para *añadir* subrayado)
> **Criterio:** Nielsen §4 · R11 en su espíritu (un estado no se pinta de dos maneras)
> **Captura:** `escritorio/cotizaciones__lleno.png` — «Actualizar» (un `<button>`) sin subrayar,
> «Nueva cotización» (un `RouterLink`) subrayado, **en la misma fila `.ds-head`, a 90 px**

Doce sitios de la consola montan un `RouterLink` con `class="ds-btn …"`. Como no hay reset de `a` en
la capa base y `.ds-btn` no declara `text-decoration`, el navegador aplica su subrayado por defecto
**dentro del botón relleno**.

El caso más visible es el de la captura, porque los dos controles son adyacentes y hacen cosas del
mismo rango. También pasa en el estado vacío de `/cotizaciones` (`QuotesListView.vue:130`).

**Arreglo.** Una declaración en `.ds-btn`:

```css
/* Doce consumidores son `RouterLink`, y sin esto heredan el subrayado del UA
   dentro del botón relleno. */
text-decoration: none;
```

**`primitives.css` es gemelo TR-02 → `front-parity`**, con réplica byte a byte en `public-web` (que
tiene el mismo `.ds-btn` y su propio censo de enlaces-botón, no medido aquí).

---

### P-08 · [menor] En la pantalla que concede control total de la plataforma, el nombre y el motivo del solicitante salen en blanco — y el mismo `<dl>` trata la ausencia de dos formas

> **Fichero:** `src/features/platform-access/views/AprobarAccesoView.vue`, el `<dl class="datos">`
> del ramal `estado === 'form'`
> **Criterio:** R14 · WCAG 2.2 §3.3.2 *Labels or Instructions* (A) en su lectura de «la información
> necesaria para decidir está presente» · Nielsen §1
> **Captura:** `escritorio/aprobar-acceso__lleno.png`

La pantalla dice *«Tu decisión es definitiva»* y muestra:

```
NOMBRE
CORREO    uxa.prueba.03@ejemplo.invalid
MOTIVO
```

**NOMBRE y MOTIVO están vacíos.** No dicen `—`, no dicen «no facilitado»: no dicen nada. El operador
no puede distinguir «el solicitante no puso nombre» de «esta pantalla no cargó bien», y sobre esa
ambigüedad tiene que decidir si crea una cuenta con control total de todos los tenants.

Y en el mismo `<dl>`, cuatro filas, **dos políticas de ausencia**: `Solicitada` se **oculta** con
`v-if="solicitadaEl"`, mientras `Nombre`, `Correo` y `Motivo` renderizan un `<dd>` vacío.

**Arreglo.**

1. Una sola política en el `<dl>`: `{{ solicitud?.fullName || '—' }}` en las cuatro filas, y quitar
   el `v-if` de `Solicitada` (una fila que aparece y desaparece cambia la altura del diálogo entre
   dos solicitudes y mueve los botones bajo el cursor).
2. Si `fullName` o `reason` faltan en la respuesta —no solo están vacíos—, **la pantalla debería
   negarse a aprobar**: `patron-de-mensajes.md` tiene el molde de «esto no se puede hacer, y no es
   un fallo» (`suscripciones-consola-ampliacion-especificacion.md` §3.6). Decidir sobre una ficha
   incompleta es peor que no poder decidir.
3. **Menor, del mismo ficha:** el código de verificación gatea **las dos** acciones (bien), pero solo
   «Aprobar» abre confirmación (`AprobarAccesoView.vue`, comentario de `:acciones`). Rechazar
   también es definitivo. O las dos confirman, o ninguna.

---

### P-09 · [menor] Las reglas de la contraseña no existen hasta que empiezas a teclearla

> **Fichero:** `src/components/ui/PasswordChecklist.vue` — `<div v-if="value.length > 0" …>`
> **Criterio:** WCAG 2.2 §3.3.2 *Labels or Instructions* (A): las instrucciones se proporcionan
> **cuando el contenido requiere entrada del usuario**, no después de empezar a introducirla ·
> NN/g, *Errors in form design*
> **Captura:** `escritorio/aceptar-invitacion__lleno.png`

La pantalla es «Crea tu contraseña» y en ella no hay **ni una palabra** sobre qué contraseña se
acepta: ni el mínimo de 12, ni el máximo de 100, ni un texto de ayuda. `PASSWORD_MIN = 12`
(`PasswordChecklist.vue:18`) está muy bien razonado —NIST SP 800-63B, cuenta privilegiada, sin reglas
de composición— y **el usuario no se entera hasta que pulsa la primera tecla**.

Camino real: el administrador escribe una contraseña de 9 caracteres, la repite en «Confirmar», pulsa
«Crear contraseña y activar» y solo entonces descubre el requisito. Es exactamente el fallo que la
guía de formularios previene.

El razonamiento del comentario (`:51-54`) es correcto pero responde a otra pregunta: prohíbe pintar
**errores** antes de tiempo. Una **instrucción** no es un error y puede estar desde el primer
milisegundo.

La misma familia de tres pantallas ya lo hace bien dos veces: `/solicitar-acceso` pone hint bajo
«Correo electrónico» y contador «0/500» bajo «Motivo»; `/aprobar-acceso` pone «Los 6 dígitos que te
enviamos por correo». `/aceptar-invitacion` es la excepción.

**Arreglo.** Quitar el `v-if` y que la lista se pinte siempre, con las dos reglas en estado
«pendiente» mientras el campo está vacío. `role="status" aria-live="polite"` se queda: anuncia el
cambio de estado, no la aparición. Alternativa mínima si se prefiere no cambiar el componente:
`hint="Al menos 12 caracteres."` en el `AppInput` de `AceptarInvitacionView.vue:242`, que además
queda asociado por `aria-describedby`, cosa que la lista de fuera del campo no está.

---

### P-10 · [menor] `/empresas/:id/resumen`: la rejilla estira seis tarjetas a la altura de la más larga, y la más larga es una nota de desarrollo

> **Ficheros:** `src/features/companies/views/CompanySummaryView.vue` y sus tarjetas
> (`record/summary/*.vue`)
> **Criterio:** rúbrica §3.2(b) (relación dentro/entre grupos) y §3.4(c) (cuánta información por
> pantalla) · `suscripciones-consola-ampliacion-especificacion.md` §I2, que especifica **seis
> tarjetas compactas en 3 × 2**
> **Captura:** `escritorio/empresas-1-resumen__vacio.png`

La captura contra el plano:

- **Se especificó 3 × 2**; a 1440 sale **4 + 2**. Las dos de la segunda fila («Cupos», «Acceso»)
  quedan bajo las dos primeras, con la mitad derecha de la pantalla vacía.
- **La primera fila mide ~540 px de alto** porque una de las cuatro tarjetas la estira. «Contrato»,
  «Cartera» y «Ventana de prueba» tienen dos barras de contenido y **más de 400 px de vacío**, con
  su enlace («Ver la cartera», «Ver la prueba») anclado abajo del todo, a media pantalla de su
  título. El emparejamiento visual de la ley de proximidad se rompe: el enlace está más cerca de la
  fila siguiente que del dato que califica.
- Quien la estira es «Estado comercial», con **cuatro párrafos de nota de construcción**:
  *«Este dato todavía no existe… Falta para cerrarlo: El contrato del backend no expone
  «commercial_state» en ninguna respuesta: ni en «CompanyResponse» ni en otra.»*

El **hueco honesto de R14 es correcto**; el problema es de dosis y de sitio. Un agente de soporte
con un cliente al teléfono no necesita el nombre del DTO que falta en el backend. Y el patrón se
repite en la pestaña «Cartera», con la sección «**Lo que esta pestaña todavía no muestra**» y sus
tres viñetas largas, colocadas al mismo nivel visual que el contenido real.

**Arreglo, en tres pasos y sin CSS nuevo:**

1. **Que la altura no se contagie.** `align-items: start` en la rejilla del resumen: seis tarjetas
   con su altura natural en vez de seis con la del párrafo más largo.
2. **Comprimir el hueco a una línea y un desplegable.** La tarjeta muestra
   *«Este dato todavía no existe.»* + `<details><summary>Por qué</summary>` con el resto. Un
   `<details>` no necesita CSS ni JS y `patron-de-mensajes.md` ya distingue el aviso de su
   justificación.
3. **La escaleta de lo no construido baja de rango.** La sección «Lo que esta pestaña todavía no
   muestra» pasa a `<details>` al pie de la pestaña, no a un `<h2>` en el flujo principal.

---

### P-11 · [menor] `<h1>` y `<h2>` con la misma clase: la jerarquía visual de la pantalla es plana

> **Ficheros:** `QuotesListView.vue:69` (`<h1 class="ds-title">`) y `:94`
> (`<h2 id="embudo-titulo" class="ds-title">`) · `SubscriptionsAdminView.vue` (mismo patrón) ·
> `PlatformBillingConfigView.vue` (fuera de este bloque)
> **Criterio:** rúbrica §3.4(b) · WCAG 2.2 §1.3.1 *Info and Relationships* (A) en su lectura de que
> la estructura transmitida programáticamente debería tener también su presentación
> **Capturas:** `escritorio/cotizaciones__lleno.png` («Cotizaciones» y «Embudo» del mismo tamaño) ·
> `escritorio/suscripciones__lleno.png` («Suscripciones», «Contratos» y «Vigilancia de solapes», los
> tres iguales)

`.ds-title` es `--text-h3` = 18 px (`primitives.css:597`, `tokens.css:203`) y lo llevan los dos
niveles. En `suscripciones__lleno.png` hay **tres encabezados del mismo tamaño, peso y color**, dos
de los cuales cuelgan del primero. El marcado es correcto (`h1` → `h2`); solo la presentación
miente.

Fuera de estos tres ficheros el resto de la consola no tiene el problema: 50 vistas usan
`.ds-title` para su `<h1>` **sin** un `<h2>` de la misma clase, y los dos expedientes usan
`.ds-display--xs` (`CompanyRecordHeader.vue:42`, `SubscriptionRecordHeader.vue:59`) para el sujeto,
que es el reparto correcto según §3.4(b) y **no** hay que tocar.

**Arreglo.** Un `.ds-title--sm` en `primitives.css` con `--text-body-lg`, o —más barato y sin tocar
gemelo— que los `<h2>` de sección de esas tres vistas usen la clase de rótulo de bloque que ya existe
(`.ds-block-head` la envuelve; basta con bajar el `<h2>` a la primitiva de subtítulo de bloque). Si
la clase adecuada no existe, se decide una y **se pide a `front-parity`**, no se escribe en el
`scoped`.

---

### P-12 · [nota] `/cotizaciones/nueva`: la única etiqueta obligatoria de la pantalla escrita a mano, y sin el espacio que ponen las otras cinco

> **Fichero:** `src/features/quotes/components/QuoteForm.vue:302` y `:423-425`
> **Criterio:** FE-08 / `vetsoftware/no-duplicate-primitive` en su espíritu (no se reescribe lo que
> la primitiva ya hace) · Nielsen §4 · **instancia de H09** del informe de armazón (el `required` que
> solo es un asterisco de color), que **no se reabre**
> **Captura:** `escritorio/cotizaciones-nueva__vacio.png`

El formulario está bien construido y **no tiene nada más que reprochar**: agrupación clara en tres
bloques («A quién se cotiza», «Condiciones de la oferta», «Qué se ofrece»), una sola acción primaria,
el patrón de validación de la casa completo (validador puro → `computed errors` → mapa `touched` →
error solo tras `@blur` → `defineExpose({ validate })` → `ErrorSummary` con texto literalmente
idéntico, documentado en `QuoteForm.vue:28-32`), y un pie que explica por qué los importes no se
suman en cliente.

Queda un detalle: **`Vigente hasta*` es la única etiqueta de la pantalla sin espacio antes del
asterisco.** Las otras cinco («Nombre del prospecto \*», «Tarifa \*», «Ciclo de facturación \*»,
«Artículo de la línea 1 \*», «Cantidad de la línea 1 \*») lo llevan porque lo pone `AppInput`. Ésta
lo escribe a mano (`:302`) con su propia clase local `.obligatorio` (`:423`), que duplica lo que la
primitiva ya hace y produce una desalineación tipográfica visible entre etiquetas hermanas.

**Arreglo.** Adoptar la marca de obligatorio de `AppInput` en esa etiqueta y retirar `.obligatorio`
del `<style scoped>`. El presupuesto de CSS baja, que es la única dirección que el trinquete permite.

**Lo que NO se reporta, y conviene dejarlo escrito:** que el campo de fecha sea un
`<input type="date">` nativo —el único control de la pantalla con cromo del navegador— **es una
desviación deliberada y con motivo escrito** (`QuoteForm.vue:34-36`: «esta consola no tiene primitiva
de fecha… y abrir esa divergencia por un solo control no está justificado»). Es la salida legítima
del repo y no es un defecto. El control, además, lleva `.ds-field`, `.ds-focus-ring`, la clase de
tono, `aria-invalid` y `aria-describedby` (`:308-312`): está tan bien vestido como los demás.

---

## 2 · Qué se propone implementar, en qué orden y de quién es

Ninguna de estas fichas toca `src/`: este documento es la especificación.

### 2.1 Lo que NO toca un gemelo TR-02 — `front-feature` (admin-web)

| # | Cambio | Ficheros | Coste |
|---|---|---|---|
| 1 | **P-01.3** — guardar las tres expresiones que lanzan | `SubscriptionRecordHeader.vue:87`, `ContractCard.vue:65`, `catalog-item-limits.store.ts:61` | 3 líneas |
| 2 | **P-06** — «Activa» → «Habilitada» | `CompaniesListView.vue:230` | 1 literal |
| 3 | **P-09** — quitar el `v-if` de la lista de requisitos | `PasswordChecklist.vue` | 1 línea |
| 4 | **P-02** — quitar `color` y `border-bottom-color` de la regla base de las cinco barras de pestañas y llevar el reposo al marcado | los 5 SFC de P-02 | media jornada |
| 5 | **P-03** — partir la rama de error del expediente y sacar el enlace de vuelta del `v-if` | `CompanyRecordLayout.vue`, `useCompanyRecord.ts`, `companies.store.ts` | media jornada |
| 6 | **P-08** — política única de ausencia en el `<dl>` de aprobación | `AprobarAccesoView.vue` | 1 hora |
| 7 | **P-05** — `refById()` en `format.ts` (**no** es gemelo, `format.ts:24-32`) y sus 6 llamadas | `format.ts` + 6 | 2 horas |
| 8 | **P-01.1/2** — `errorHandler` global + `onErrorCaptured` en `AppLayout` y en `AppTable` | `main.ts`, `AppLayout.vue`, `AppTable.vue` | 1 jornada |
| 9 | **P-10** — `align-items: start` + `<details>` para el hueco declarado | `CompanySummaryView.vue`, `CompanyPortfolioView.vue` | 2 horas |
| 10 | **P-12** — adoptar la marca de obligatorio de `AppInput` y retirar `.obligatorio` | `QuoteForm.vue` | 1 hora |

### 2.2 Lo que sí toca un gemelo TR-02 — `front-parity`, con réplica byte a byte en `public-web`

| # | Cambio | Fichero | Nota |
|---|---|---|---|
| A | **P-04** — `max-inline-size: 78ch` en `.ds-banner` | `primitives.css:196` | Una declaración. Afecta a 115 usos en la consola y a los suyos en el tenant, **que no se han contado en esta sesión**. |
| B | **P-07** — `text-decoration: none` en `.ds-btn` | `primitives.css` | Idem: hay que censar los enlaces-botón del tenant antes. |
| C | **P-11** — decidir si hace falta un escalón entre `.ds-title` y `.ds-meta` | `primitives.css` | Solo si no se puede resolver con una primitiva existente. |

**Ninguno de los tres sube un número de `css-budget.config.json`.** A y B añaden una declaración a
una raíz que ya existe; C, si se hace, retira declaraciones de tres `scoped`.

### 2.3 Cuerpos de issue propuestos — para que decida el humano, no para abrirlos

**admin-web · «Un fallo de render deja la pantalla en blanco sin decir nada»** *(bloqueante)*
> Las 14 capturas del expediente de contrato (`/suscripciones/7/1/*`) están **completamente en
> blanco**, y las dos tablas de `/catalogo-comercial/articulos/1` se quedan en esqueleto para
> siempre. La causa común es que **no hay ninguna frontera de error en la consola**
> (`grep -rn "errorCaptured\|errorHandler" src/` → 0): Vue desmonta el subárbol y el usuario ve un
> hueco. Añadir `app.config.errorHandler` en `main.ts`, `onErrorCaptured` en `AppLayout.vue` y en
> `AppTable.vue`, y guardar las tres expresiones que hoy lanzan
> (`SubscriptionRecordHeader.vue:87`, `ContractCard.vue:65`, `catalog-item-limits.store.ts:61`).
> Evidencia: `_capturas/admin/escritorio/suscripciones-7-1-resumen__lleno.png`,
> `catalogo-comercial-articulos-1__lleno.png`, `suscripciones__lleno.png`.

**admin-web · «Ninguna barra de pestañas señala la pestaña activa»** *(grave)*
> `.ds-tab--active` (`primitives.css:1444`) pesa (0,1,0) y la regla base de cada barra, en `scoped`,
> pesa (0,2,0) y le gana: el estado activo **no se pinta nunca**. Afecta a las 6 barras de la
> consola y a **31 rutas** (expediente de empresa 10, de contrato 7, `/cobranza/*` 8, `/limites/*` 4,
> `/pruebas/*` 2). `aria-current="page"` sí funciona, así que el defecto solo lo sufre quien ve.
> Es el caso exacto que documenta `AGENTS.md:103-122`. Evidencia:
> `_capturas/admin/escritorio/empresas-1-cartera__vacio.png`.

**Antes de abrirlos**, buscar duplicado con
`gh issue list --repo <owner>/admin-web --state all --search "pestaña activa especificidad"` y
`… --search "error boundary render en blanco"`. **No se ejecutó** en esta sesión.

---

## 3 · Lo que se miró y salió limpio — para que nadie lo vuelva a mirar

- **Desbordamiento horizontal:** cero en las 5 × 2 × ~55 capturas de este bloque
  (`documento.desbordaHorizontal` en el JSON). Ninguna tabla recortada; las anchas se desplazan
  dentro de `.ds-table-scroll`, que es lo que R15 pide.
- **Objetivos táctiles:** tras triar los falsos positivos del JSON (enlaces en línea, la caja interna
  de `AppInput`, `input.ds-sr-only`), **no queda ningún objetivo por debajo de 24 × 24** en este
  bloque. Los tres enlaces del pie de las pantallas de acceso (`Privacidad` 59,8 × 18, `Términos`
  52,5 × 18, `Soporte` 45 × 18) **pasan la excepción de espaciado de §2.5.8**: sus centros distan
  ≥ 60 px y los círculos de 24 px de diámetro no se cortan. Los pares lápiz/papelera de las tablas
  distan 34 px entre centros: también pasan. Los `.ds-icon-btn` de 28 × 28 en banda táctil son el
  `menor` sistémico que la rúbrica §3.5 ya registró; no se reabre.
- **Alineación de las columnas de dinero:** **D-03 está implementado**. `AppTable.vue:75` acepta
  `AppTableHeader = string | { label, align }`, emite `scope="col"` y aplica `.ds-num`. En
  `cotizaciones__lleno.png` la cabecera «TOTAL» está alineada a la derecha sobre cifras alineadas a
  la derecha. La `MoneyCaption` («Importes en pesos colombianos (COP)») aparece correctamente en
  `catalogo-comercial-articulos-1__lleno.png`. **No hay ninguna columna numérica alineada a la
  izquierda en este bloque.**
- **Consistencia de los CRUD gemelos** (`/modulos`, `/submodulos`, `/permisos-base`, `/roles-base`,
  `/permisos-roles-base`): **son consistentes**. Los cinco montan el mismo esqueleto —`<h1
  class="ds-title">`, botón primario en la cabecera, buscador con etiqueta visible, `AppTable` con
  dos ramas de vacío distintas (catálogo vacío vs búsqueda sin resultados, que es el defecto F5 de
  `patron-de-busqueda-en-listado.md` §4 **evitado**), y el par lápiz/papelera por fila. No hay
  divergencia que reportar.
- **Altura de arranque de las pestañas del expediente de empresa:** idéntica en las diez. El `<h2>`
  de la pestaña cae a y=295 tanto en `/resumen` como en `/cartera` a 1440. La caja de contenido es
  la misma. **La pregunta del encargo se responde que sí.**
- **De qué empresa es el expediente:** se ve sin volver atrás en las diez pestañas y en los cuatro
  viewports completos —nombre, NIT, ciudad, id y fecha de alta, más el badge de estado— porque
  `CompanyRecordLayout.vue:77` monta la cabecera fuera del `RouterView`. **Bien resuelto**, y es lo
  que §I2 pedía. La única excepción es la rama de error → P-03.
- **`/cotizaciones/nueva`:** el botón «Crear borrador» queda 185 px por debajo del pliegue a
  1440 × 900. En un formulario de tres bloques eso es inherente y no se reporta; la agrupación y el
  ritmo son correctos y la acción primaria es única.
- **Nombres largos:** el registro de prueba «UXA Nombre de prueba deliberadamente larguisimo para
  forzar elipsis y recorte» se pinta completo en el listado de empresas y en la cabecera de la ficha
  de artículo, sin recorte, sin elipsis y sin desbordar.

---

## 4 · Lo que este informe NO comprobó

- **Ningún ratio de contraste se midió.** Ni el texto, ni los bordes de campo, ni el anillo de foco,
  ni los badges de estado (`Activa`/`Deshabilitada` verde y ámbar), ni los enlaces indigo sobre
  texto gris de las pantallas de acceso —que es el candidato más claro a §1.4.1 *Use of Color* (A)
  y **queda pendiente de medición**.
- **No se corrió `axe`, ni Lighthouse, ni `toMatchAriaSnapshot`.** No hay puerta de accesibilidad en
  el pipeline (admin-web #44) y este informe no la sustituye.
- **No se levantó el servidor, ni Playwright, ni `quality`, ni `ds:audit`**: había una pasada de
  capturas en curso en este worktree.
- **El árbol de accesibilidad de las 14 rutas en blanco no se pudo inspeccionar**, por la misma razón
  por la que están en blanco.
- **No se contaron los consumidores de `.ds-banner` ni de los enlaces-botón en `public-web`.** Las
  fichas P-04 y P-07 tocan gemelos TR-02 y `front-parity` necesita ese censo antes de replicar.
- **No se abrió ningún issue ni se buscaron duplicados en GitHub.**
