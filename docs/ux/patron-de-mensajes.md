# Patrón de mensajes — error, aviso, información y éxito

> **Estado:** especificación aprobada, sin implementar. Documento **gemelo byte a byte** en
> `VetSoftwareFront/docs/ux/` y `VetSoftwarePublicFront/docs/ux/` (ver `README.md` de este
> directorio). `T` = app del tenant (`VetSoftwarePublicFront`) · `C` = consola de plataforma
> (`VetSoftwareFront`). Toda ruta lleva su repositorio delante salvo los gemelos TR-02
> (`tokens.css`, `primitives.css`, `ToastStack.vue`, `PawLoader.vue`, `ModalShell.vue`).

## 0 · El hueco, con los números que lo miden

El sistema tiene cuatro tonos de mensaje y **solo sabe usar uno**.

| Clase                | Usos en `C` | Usos en `T` | Comando que lo reproduce |
| -------------------- | ----------- | ----------- | ------------------------ |
| `.ds-banner`         | 4           | 119         | `grep -ro "ds-banner\b" <repo>/src --include=*.vue \| wc -l` |
| `.ds-banner--error`  | 1           | 49          | ídem con `ds-banner--error` |
| `.ds-banner--warning`| **0**       | **0**       | ídem |
| `.ds-banner--success`| **0**       | **0**       | ídem |
| `.ds-banner--info`   | **0**       | **0**       | ídem |
| `.ds-error-summary`  | **0**       | **0**       | ídem |

Definidas en `primitives.css:211-237` (los cuatro tonos) y `:1633-1654` (el resumen). Los cuatro
tonos consumen tokens **ya medidos contra WCAG 2.2 §1.4.11 en A11Y-09** (`tokens.css:113-135`:
`--warning-border` 3,41:1, `--success-border` 3,47:1, `--info-border` sustituyó a `--amatista-200`
que medía 1,34:1). Es decir: **adoptar los tres tonos muertos no abre ningún riesgo de contraste
nuevo, ya está pagado.** No hay excusa técnica para que sigan a cero.

El coste real de esta ausencia no es estético. En `T` hay 15 llamadas a `warn()` y 25 a `info()`
frente a 86 a `success()`; en `C` hay **una** llamada a `warn()` y **una** a `info()` frente a 55 a
`success()`. Cuando el único tono disponible es el rojo, lo que pasa es lo que documenta el
hallazgo H1 de abajo: un rechazo de la DIAN sale como «Venta registrada».

`.ds-error-summary` está definido pero **su componente `ErrorSummary.vue` no existe todavía** en
ningún repo (`find … -name "ErrorSummary*"` → 0 resultados). Este documento **no lo especifica ni
lo redefine**: FORM-05 es su dueño. Aquí solo se declara cómo encaja (§4).

## 1 · La regla de decisión

Cuatro preguntas, **en este orden**. La primera que se responda «sí» fija el tono. No hay caso que
se decida por gusto.

1. **¿El sistema no pudo hacer lo que se le pidió, o el usuario está a punto de perder trabajo?**
   → **error**. Esto incluye el fallo de red, el 4xx/5xx, la validación que impide enviar, y el
   borrador que se va a descartar. No incluye «el usuario tendrá que hacer algo más luego».
2. **¿La acción se completó o se puede completar, pero deja una consecuencia que el usuario no vería
   por su cuenta y que no puede deshacer barato?** → **aviso**. Obligación fiscal pendiente, factura
   rechazada, cita que solapa, empresa deshabilitada, borrado irreversible que se va a confirmar.
   La prueba: *si el usuario cierra la pantalla ahora mismo sin leerlo, ¿alguien pierde dinero,
   incumple una norma o atiende mal a un animal?* Si sí, es aviso, no éxito.
3. **¿Hay una condición del contexto que cambia lo que el usuario debería hacer, pero no es fallo de
   nadie ni caduca?** → **información**. Alcance del listado recortado por permisos, sede en la que
   se está trabajando, modo de solo lectura, catálogo que se hereda de la plataforma.
4. **¿Terminó bien y no aplica nada de lo anterior?** → **éxito**, y por defecto **toast, no banner**
   (§2).

Las tres primeras preguntas describen **estados presentes**; la cuarta, un **evento pasado**. Esa es
también la frontera de canal.

## 2 · Canal: toast o banner

El criterio no es la severidad, es la **persistencia**: *¿el mensaje sigue siendo verdad treinta
segundos después de leerlo?*

| | **Toast** (`ToastStack.vue`, gemelo TR-02) | **Banner** (`.ds-banner--*`) |
| --- | --- | --- |
| Describe | un evento pasado y puntual | un estado presente de la pantalla |
| Vive | 3 s (9 s si es `errorFrom`, `useToast.ts:10`) | mientras la condición sea cierta |
| Acción | ninguna, o una opcional | **la acción que resuelve la condición** |
| Ubicación | esquina superior derecha, fuera del flujo | **junto a lo que describe**, en el flujo |

Tres reglas duras que se derivan de ahí:

- **Si el mensaje lleva un botón que hay que pulsar, es banner.** Un toast con acción caduca en tres
  segundos: se le pide al usuario que persiga un objetivo que se está encogiendo, que es literalmente
  lo peor que dice la ley de Fitts, y contradice NN/g *Ten Usability Heuristics* H3 (control del
  usuario). El único botón admisible en un toast es el de copiar la traza, que ya existe
  (`ToastStack.vue:49-58`) y es opcional por definición.
- **Un éxito rutinario NUNCA es banner.** Guardar, editar, activar, borrar una fila: toast y punto.
  El cartel de éxito persistente ensucia la pantalla en la que el usuario ya está trabajando y
  compite con el contenido (NN/g H8, diseño minimalista).
- **Un éxito es banner solo si el usuario tiene que llevarse un dato del resultado**: número de
  factura, comprobante, identificador de un lote. Ahí el mensaje sigue siendo útil pasados treinta
  segundos, y por tanto no es un toast.

## 3 · Cuándo NO poner nada

**Éxito cuyo resultado ya es visible en pantalla.** La fila que aparece en la tabla, el chip que
cambia de estado, el contador que sube: ya lo confirman. Un toast encima es redundante y entrena al
usuario a ignorar los toasts, que es precisamente lo que hace falta que no ocurra cuando salga uno
que importa. Regla: **si la mutación repinta la evidencia en la misma pantalla y en menos de un
segundo, no hay mensaje visual.**

**Pero «no poner cartel» no es «no anunciar».** Lo que es evidente mirando la pantalla no lo es para
quien la escucha. En ese caso la obligación se mantiene y se cumple con un anuncio invisible:

```html
<p class="ds-sr-only" role="status">{{ anuncio }}</p>
```

Es el patrón que la casa ya usa en `VetSoftwareFront/src/components/ui/AppTable.vue:58-60` y en
`VetSoftwarePublicFront/src/features/cuentas/views/CuentasListaView.vue:223`. **Criterio: WCAG 2.2
§4.1.3 Status Messages (AA)** — el cambio de estado debe estar disponible sin recibir el foco.

## 4 · La parte accesible: qué `role` y qué región viva

### 4.1 La tabla

| Tono | Canal por defecto | `role` | `aria-live` | Mueve el foco |
| --- | --- | --- | --- | --- |
| **Error** que impide la tarea | banner | `alert` | implícito `assertive` — **no lo escribas** | no |
| **Error** de envío de formulario | `ErrorSummary` (FORM-05) | `alert` | implícito | **sí**, al resumen |
| **Error** de campo | mensaje del campo | ninguno | `polite` en contenedor persistente | no |
| **Aviso** | banner | `status` | `polite` | no |
| **Información** presente al cargar | banner | ninguno | **ninguno** | no |
| **Información** que aparece por una interacción | banner | `status` | `polite` | no |
| **Éxito** rutinario | toast | ya lo pone `ToastStack` | ya `polite` | no |
| **Éxito** con dato que llevarse | banner | `status` | `polite` | no |

### 4.2 Los tres criterios que la explican, y que no son negociables

**a) `aria-live` describe el cambio, no la severidad.** Una región viva anuncia lo que aparece
*después* de que el lector ya haya recorrido el documento. Un banner informativo que está en el DOM
desde el primer render **no debe llevar región viva**: o se anuncia dos veces (una al leer la página,
otra por la región) o no se anuncia ninguna, según el lector. Es el error más común al adoptar este
patrón, y por eso está en la tabla como fila propia. WAI-ARIA 1.2, §*Live Region Roles*.

**b) Un éxito no interrumpe igual que un error, y esto es de norma, no de gusto.** `role="alert"`
es `aria-live="assertive"`: **corta la locución en curso**. Interrumpir a alguien que está leyendo la
ficha de un paciente para decirle «Guardado» le hace perder el punto de lectura y le obliga a
reconstruirlo. `role="status"` (`polite`) espera a que termine la frase y luego lo dice: la
información llega igual, sin destruir el contexto. WCAG 2.2 §4.1.3 exige que el mensaje **esté
disponible**, no que interrumpa; ARIA reserva `assertive` para lo que *«requiere la atención inmediata
del usuario»*. Un guardado correcto no la requiere: si el usuario no lo oye, no pierde nada; si no oye
un error, pierde el trabajo. Ése es el reparto y no admite matices.

Corolario operativo: **`assertive` es un presupuesto, no un adjetivo.** En este producto hay
exactamente un consumidor legítimo de `assertive` ya en marcha, el velo global
(`PageLoader.vue:10`), y **la incorporación de los tres tonos nuevos no puede añadir ninguno.**
Si al revisar el PR hay un `assertive` nuevo, está mal salvo que se justifique por escrito.

**c) El `role` va en el elemento que **persiste**, no en el que aparece.** Si el nodo con
`role="status"` se monta con `v-if` a la vez que su texto, muchos lectores no anuncian nada porque la
región no existía cuando cambió. Se declara el contenedor siempre presente y se conmuta **el texto de
dentro** — que es exactamente lo que ya hace bien `BaseField.vue:74-80` en `T` y lo que hay que
copiar. Esa nota, por cierto, corrige un dato de la auditoría de partida: **`T` sí tiene región viva
de campo**, FORM-02 la introdujo.

### 4.3 Encaje con lo que ya existe — no redefinir

- **`.ds-error-summary` / `ErrorSummary.vue` (FORM-05)** es el dueño del resumen tras el envío del
  formulario: título, lista de enlaces a los campos, foco movido al resumen. Este documento **no lo
  toca**. Lo único que añade es la coherencia de texto: *el mensaje del resumen y el del campo deben
  ser literalmente el mismo string* (GOV.UK, patrón de validación). Si divergen, el usuario cree que
  hay dos errores.
- **`ListBody.vue` (`T`, `:140-158`) y `AppTable.vue` (`C`, `:71-91`)** ya tienen su banner de error
  de listado con reintento y traza (EST-01 / EST-06). **No se rehacen.** Son la implementación de
  referencia del tono error: cualquier banner nuevo copia su estructura (icono `ds-banner-icon`,
  texto en `ds-flex-fill`, acción a la derecha).
- **`useToast()` / `errorFrom()`** siguen siendo el único camino para los avisos efímeros. Ningún
  banner nuevo escribe a mano el texto de un error de red: si viene de una petición, es
  `errorFrom(titulo, e)` y la traza viaja sola (TR-05).

### 4.4 Los banners a mano que ya existen y hay que reconducir

Cuatro componentes de `T` ya son banners de aviso o información, escritos cada uno por su cuenta y
**ninguno con tono del sistema**:

| Componente | Tono real | Qué le falta |
| --- | --- | --- |
| `VetSoftwarePublicFront/src/features/facturacion/components/FeThresholdBanner.vue` | aviso | `role`, y consume `--warning-*` a mano en vez de `.ds-banner--warning` |
| `VetSoftwarePublicFront/src/features/agenda/components/AppointmentNoticeBanner.vue:44-60` | aviso/error | `role` (**ninguno**), y `oklch(…)` literal en `scoped` |
| `VetSoftwarePublicFront/src/components/public/AuthBanner.vue:14` | variable por `tone` | usa `role="alert"` **siempre**, también cuando el tono no es error |
| `VetSoftwarePublicFront/src/components/feedback/ConsultaActiveBanner.vue:20` | información | correcto (`status`+`polite`); **no tocar** |

`AppointmentNoticeBanner.vue` documenta por qué no subió a `.ds-banner` (radio 9 vs 8, 12,5 px vs 13).
Ese motivo era válido para la geometría y **sigue siéndolo**: no se le cambia el aspecto. Lo que sí
se le exige es el `role`, que no tiene nada que ver con los píxeles.

## 5 · Hallazgos, ordenados por daño

### H1 · **[Bloqueante]** Un rechazo de la DIAN se anuncia como venta correcta — `VetSoftwarePublicFront/src/features/tienda/composables/usePosSale.ts:165-170`

```ts
if (document.dianStatus === 'VALIDADO') {
  toast.success('Venta registrada', 'Factura validada por la DIAN.')
} else if (document.dianStatus === 'PENDIENTE') {
  toast.success('Venta registrada', 'Documento guardado · emisión a la DIAN pendiente.')
} else {
  toast.success('Venta registrada', 'Documento generado.')
}
```

**Criterio:** regla de decisión §1, pregunta 2 · NN/g H1 (visibilidad del estado del sistema) ·
WCAG 2.2 §4.1.3 (AA) para el anuncio.
**Impacto:** la rama `else` traga **todo estado que no sea validado ni pendiente, incluido el
rechazo**, y lo presenta con el mismo tono verde y las mismas tres palabras que el éxito. El cajero
cierra el turno creyendo que facturó. La consecuencia es fiscal y llega semanas después, cuando ya no
hay forma de reconstruir qué venta fue. Es el único hallazgo de este informe con daño económico
directo y sin recuperación.
**Arreglo:** partir en tres, con tono distinto y persistencia distinta.
- `VALIDADO` → `toast.success('Venta registrada', 'Factura validada por la DIAN.')` (queda igual).
- `PENDIENTE` → **banner de aviso en el modal de comprobante**, no toast:
  `.ds-banner .ds-banner--warning` con `role="status"`, texto exacto
  «**Emisión a la DIAN pendiente.** El documento está guardado. Si en 24 h sigue pendiente, avisa a
  administración.» Lleva estado presente y consecuencia: es banner por §2.
- cualquier otro estado → **banner de error** `.ds-banner--error` con `role="alert"`, texto exacto
  «**La DIAN rechazó la factura.** La venta está registrada pero el documento no es válido. Anótalo y
  avisa a administración.», más el `dianStatus` crudo en `.ds-meta` para que soporte lo pueda buscar.
- La rama `else` **no puede volver a decir «Venta registrada»** a secas.

**Ejecuta:** `front-feature` (`T`). **Verifica:** `front-e2e-visual`, un spec por rama de
`dianStatus` afirmando el `role` del nodo, no su color.

### H2 · **[Grave]** Borrar una empresa —un tenant entero— se confirma con una línea y sin tono de aviso — `VetSoftwareFront/src/components/feedback/AppConfirmDialog.vue:25-31`, llamado desde `VetSoftwareFront/src/features/companies/views/CompaniesListView.vue:29`

**Criterio:** **WCAG 2.2 §3.3.4 Error Prevention (Legal, Financial, Data) (AA)** · NN/g H5
(prevención de errores) · regla §1 pregunta 2.
**Impacto:** el diálogo recibe un único `message: string` y lo pinta tal cual. La llamada real es
`confirm('¿Eliminar la empresa "X"?')`: **no dice qué se lleva por delante** (empleados, sedes,
historia clínica), no dice si es reversible, y el botón se llama «Confirmar», que no nombra la acción.
El *blast radius* del diálogo es todo el borrado de la consola —las 17 vistas de listado usan el mismo
`useConfirmDialog`—, así que el defecto no es de Empresas: es del patrón.
**Arreglo:** ampliar el contrato de `confirmDialog.store` a `{ message, consequence?, confirmLabel? }`
y en `AppConfirmDialog.vue` pintar `consequence` en un `.ds-banner .ds-banner--warning
.ds-banner--sm` con `role="status"` bajo el mensaje. El botón toma `confirmLabel` con la acción
nombrada («Eliminar empresa»), no «Confirmar» (APG, *Alert Dialog*: el nombre accesible del botón debe
describir el resultado). Texto exacto para Empresas: «Se eliminará también su ficha en la plataforma.
Esta acción no se puede deshacer.» El `role="alertdialog"` de `ModalShell` **no se toca aquí**: es
gemelo TR-02.

**Ejecuta:** `front-feature` (`C`) para el store, el diálogo y las llamadas. **Ojo:**
`AppConfirmDialog.vue` **no** es gemelo (`T` no lo tiene), así que no entra `front-parity`.

### H3 · **[Grave]** El aviso fiscal de la DIAN no se anuncia a nadie — `VetSoftwarePublicFront/src/features/facturacion/components/FeThresholdBanner.vue:11-19`

**Criterio:** WCAG 2.2 §4.1.3 Status Messages (AA) · regla §1 pregunta 2.
**Impacto:** el banner aparece cuando la venta supera el umbral de UVT y comunica una **obligación
legal** («la DIAN exige Factura electrónica con los datos fiscales del cliente»). Aparece por una
interacción —añadir una línea al ticket— y **no tiene `role` ninguno**, así que quien no mira esa zona
de la pantalla no se entera jamás. Cobra como POS una venta que debía ser factura electrónica.
**Arreglo:** `role="status"` en el contenedor, que debe estar **siempre montado** con el texto dentro
conmutado (§4.2c) — hoy el `v-if` lo monta y desmonta desde el padre. Y sustituir el `scoped` que
reescribe `--warning-50`/`--warning-200`/`oklch(40% 0.11 70deg)` por `.ds-banner .ds-banner--warning`,
dejando en el `scoped` solo la geometría propia (radio 11, `.sub`). El color en `scoped` es la trampa
de especificidad de `AGENTS.md:103-122`.

**Ejecuta:** `front-feature` (`T`).

### H4 · **[Grave]** El choque de horario de una cita no llega al lector de pantalla — `VetSoftwarePublicFront/src/features/agenda/components/AppointmentNoticeBanner.vue:28-31`

**Criterio:** WCAG 2.2 §4.1.3 (AA) · §1 pregunta 2.
**Impacto:** el componente documenta sus cuatro usos —«choque de horario, error de guardado, sujeto
sin indicar, motivo de cancelación»— y renderiza `<div class="banner" :class="tone">` **sin `role`**.
Los cuatro son avisos o errores que aparecen tras una interacción y ninguno se anuncia. Un solape de
citas invisible es una consulta doble en la sala de espera.
**Arreglo:** derivar el `role` del `tone` que la prop ya trae:
`:role="tone === 'err' ? 'alert' : 'status'"`, y `aria-live="polite"` explícito cuando sea `status`.
Los colores locales se quedan (motivo escrito en el propio componente y aceptado, §4.4), pero el
`role` entra. Hay un caso `:282` en `AppointmentFormModal.vue` que ya pone `role="alert"` por su
cuenta: al añadir el `role` al componente hay que quitar el del sitio de uso o quedarán anidados.

**Ejecuta:** `front-feature` (`T`). **Verifica:** `front-e2e-visual` con `toMatchAriaSnapshot`, que es
regresión de semántica y no de píxeles.

### H5 · **[Grave]** `AuthBanner` interrumpe con `alert` también cuando informa — `VetSoftwarePublicFront/src/components/public/AuthBanner.vue:14`

**Criterio:** ARIA 1.2, `alert` reservado a lo que requiere atención inmediata · §4.2b.
**Impacto:** `role="alert"` está fijo aunque el componente reciba `tone` variable. En las 16 pantallas
públicas, un «Revisa tu correo para confirmar la cuenta» corta la locución igual que un fallo de
contraseña. Es el mecanismo por el que un usuario de lector de pantalla aprende a ignorar las alertas.
**Arreglo:** `:role="tone === 'error' ? 'alert' : 'status'"`. Adaptar el nombre del tono al que la prop
declare realmente.

**Ejecuta:** `front-feature` (`T`).

### H6 · **[Grave]** Una empresa deshabilitada es indistinguible de una activa — `VetSoftwareFront/src/features/companies/views/CompaniesListView.vue:50-57`

**Criterio:** NN/g H1 (visibilidad del estado del sistema) · §1 pregunta 3.
**Impacto:** `CompanyResponse` declara `enabled: boolean`
(`VetSoftwareFront/src/features/companies/types/companies.types.ts`) y **la tabla no lo pinta**: las
cabeceras son `['Nombre','Identificador','Teléfono','Fecha creación','Acciones']`. En la consola de
plataforma, la única pantalla que existe para saber qué tenants están vivos, un tenant suspendido por
impago se ve exactamente igual que uno al corriente. `grep -rn "enabled" VetSoftwareFront/src
--include=*.vue` devuelve **cero**: no se pinta en ninguna pantalla de la consola.
**Arreglo:** columna «Estado» con `AppBadge` —tono neutro para activa, tono aviso para deshabilitada—
y, en `CompanyDetailView.vue`, banner `.ds-banner .ds-banner--warning` con `role="status"` y texto
«**Esta empresa está deshabilitada.** Sus empleados no pueden entrar.» Es información de estado
presente: banner, no toast (§2).

**Ejecuta:** `front-feature` (`C`). Encaja con la ficha F2 de
`patron-de-busqueda-en-listado.md`, que reescribe esta misma vista: **hacer las dos en el mismo PR**.

### H7 · **[Menor]** El resumen de errores está definido en CSS y no existe como componente — `primitives.css:1633-1654`

**Criterio:** WCAG 2.2 §3.3.1 (A) · GOV.UK, *Error summary*.
**Impacto:** cinco selectores de CSS con cero consumidores en los dos repos y **sin `ErrorSummary.vue`
escrito**. Mientras siga así, ningún formulario largo tiene resumen tras el envío y el usuario que
falla tres campos por debajo del pliegue no ve ninguno.
**Arreglo:** **no es de este documento.** Es FORM-05, y su dueño en el marcado es `front-parity`
(gemelo TR-02, `src/components/feedback/`). Aquí solo queda registrado que sigue abierto, para que
nadie lo implemente por su cuenta al hacer H1–H6 y acabe con dos resúmenes distintos.

**Ejecuta:** `front-parity`, en su propio hilo.

## 6 · Catálogo de textos — los que se fijan aquí

Un patrón de mensajes sin textos exactos vuelve a ser una discusión. Estos son literales, en español,
y se copian tal cual. Formato: **negrita = qué pasó** · resto = qué hacer.

| Situación | Tono | Texto |
| --- | --- | --- |
| Emisión DIAN pendiente | aviso | **Emisión a la DIAN pendiente.** El documento está guardado. Si en 24 h sigue pendiente, avisa a administración. |
| DIAN rechaza | error | **La DIAN rechazó la factura.** La venta está registrada pero el documento no es válido. Anótalo y avisa a administración. |
| Borrado de empresa | aviso | Se eliminará también su ficha en la plataforma. Esta acción no se puede deshacer. |
| Empresa deshabilitada | aviso | **Esta empresa está deshabilitada.** Sus empleados no pueden entrar. |
| Listado recortado por permisos | información | Ves solo los registros de tu empresa. |
| Búsqueda sin resultados | información | Ver `patron-de-busqueda-en-listado.md`, §4. |

Reglas de redacción, que valen para los que vengan después:

1. **Nunca empieza por «Error:».** El tono ya lo dice el color, el icono y el `role`. El texto se
   gasta en el hecho.
2. **Nunca dice «inténtalo de nuevo» sin un botón que lo intente.** Si hay reintento, hay botón
   (`AppTable.vue:77-80` es el modelo).
3. **Nunca culpa al usuario** («has introducido mal…»). Describe el estado, no al autor.
4. **El error de red no se escribe a mano**: sale de `errorFrom()` y arrastra la traza.

## 7 · Reparto de trabajo

| Ficha | Agente | Repo | Notas |
| --- | --- | --- | --- |
| H1 | `front-feature` | `T` | tres ramas, tres tonos |
| H2 | `front-feature` | `C` | store + diálogo + 17 llamadas |
| H3 | `front-feature` | `T` | + retirar color del `scoped` |
| H4 | `front-feature` | `T` | quitar el `role` duplicado de `AppointmentFormModal.vue:282` |
| H5 | `front-feature` | `T` | una línea |
| H6 | `front-feature` | `C` | mismo PR que la búsqueda de Empresas |
| H7 | `front-parity` | ambos | FORM-05, hilo aparte |
| Cobertura | `front-e2e-visual` | ambos | `toMatchAriaSnapshot` sobre H1, H3, H4, H5 |

**Nada de esto cambia `primitives.css` ni `tokens.css`.** Las clases y los tokens ya existen y ya
están medidos: lo único que falta es usarlos. Si algún PR toca esos ficheros, se ha equivocado de
sitio.

## 8 · Issues propuestos (redactados, sin abrir)

Se dejan escritos para que los abra quien tenga la decisión. **Ningún agente los abre por su cuenta.**

**`public-web` — «El rechazo de la DIAN se anuncia como venta correcta»** · etiquetas `bug`,
`facturacion`, `a11y` · cuerpo: §5 H1 íntegro, más la tabla de textos de §6.

**`public-web` — «Tres banners de aviso sin `role`: DIAN, agenda y autenticación»** · etiquetas
`a11y`, `accessibility` · cuerpo: §5 H3+H4+H5, más §4.2 como criterio. Enlazar
[public-web #57](https://github.com/kefaroTech/vetsoftware-public-web/issues/57) (sin puerta de
accesibilidad en CI), que es por lo que estos tres pasaron.

**`admin-web` — «Confirmar un borrado destructivo sin decir qué se pierde»** · etiquetas `a11y`,
`ux` · cuerpo: §5 H2, criterio WCAG 2.2 §3.3.4.

**`admin-web` — «La consola no muestra si una empresa está deshabilitada»** · etiquetas `bug`, `ux`
· cuerpo: §5 H6. Marcar dependencia con el issue de búsqueda en Empresas.

## 9 · Comprobaciones — qué se midió y qué no

**Ejecutado (lectura):** el censo de clases y de tonos de `useToast` con los `grep` de §0, el marcado
de los siete componentes citados, y los tokens de `tokens.css:113-135`.

**No ejecutado, y declarado como tal:** no se corrió `npm run quality`, ni `ds:audit`, ni Playwright,
ni ninguna medida de contraste propia. Los ratios de §0 **no los midió este documento**: se citan de
los comentarios de A11Y-09 en `tokens.css:117-129`. Si alguien necesita el número verificado, es una
medición nueva y hay que hacerla.

## Fuentes

- WCAG 2.2 §4.1.3 Status Messages (AA) — https://www.w3.org/TR/WCAG22/#status-messages
- WCAG 2.2 §3.3.1 Error Identification (A) · §3.3.4 Error Prevention (AA) — https://www.w3.org/TR/WCAG22/
- WAI-ARIA 1.2, roles `alert` y `status` — https://www.w3.org/TR/wai-aria-1.2/
- APG, patrón *Alert* y *Alert Dialog* — https://www.w3.org/WAI/ARIA/apg/patterns/
- NN/g, *10 Usability Heuristics* — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, *Error Message Guidelines* — https://www.nngroup.com/articles/errors-forms-design-guidelines/
- GOV.UK Design System, *Validation* y *Error summary* —
  https://design-system.service.gov.uk/patterns/validation/
