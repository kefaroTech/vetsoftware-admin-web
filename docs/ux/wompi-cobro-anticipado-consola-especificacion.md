# Cobro anticipado con Wompi — lo que le falta al contador de plataforma, especificación

**Origen.** Auditoría UX/a11y del cierre de contratación idempotente (rama
`feature/cierre-contratacion-idempotente` de `VetSoftwarePublicFront`, que dispara el cobro
anticipado del primer periodo), 2026-09-06. Gemelo de
`VetSoftwarePublicFront/docs/ux/wompi-cobro-anticipado-cliente-especificacion.md`: ese cubre al
cliente, este cubre al contador de plataforma que audita el dinero desde esta consola.

**Qué es este documento.** La especificación con la que se implementa la parte que falta. Las
pantallas de dinero que ya existen (`PaymentsView`, `PaymentAttemptsTable`, `PaymentReversalsView`,
`PaymentRefundsView`) están construidas con un nivel alto y no se tocan salvo lo que sigue —
consistente con el veredicto de `docs/ux/dinero-consola-auditoria-de-conjunto.md` (2026-08-28), que
ya calificó estas ~60 pantallas por encima de la media. Este documento es más estrecho: solo el
cobro anticipado con Wompi y sus huecos, que esa auditoría anterior no cubrió por ser posterior a
su fecha de corte.

**Verificado leyendo**, no ejecutando: sin `npm run quality`, sin Vitest, sin Playwright, sin dev
server. `fichero:línea` contra el árbol de trabajo del 2026-09-06, en los dos repos
(`VetSoftwareFront` y, para el contraste de contrato, `VetSoftware`).

---

## Contenido

- [C-01 · No existe una pantalla de contratos activos sin cobro — el hallazgo principal](#c-01)
- [C-02 · El intento de cobro no dice qué tarjeta se usó](#c-02)
- [C-03 · Ningún pago ni intento dice quién o qué lo registró](#c-03)
- [C-04 · Sin filtro de fecha ni exportación en las cuatro listas de dinero de Wompi](#c-04)
- [C-05 · Los pagos `PENDING` envejecidos no se pueden encontrar](#c-05)
- [C-06 · El filtro de antigüedad nuevo busca en la página, no en el historial](#c-06)
- [C-07 · El payload del webhook de Wompi existe y es inalcanzable](#c-07)
- [C-08 · Un pago-reserva sin referencia no se explica como tal](#c-08)
- [C-09 · Los 409 nuevos de plataforma llegan sin traducir](#c-09)
- [No tocar](#no-tocar)

---

## C-01 · No existe una pantalla de contratos activos sin cobro — el hallazgo principal {#c-01}

**Severidad: bloqueante.**

**Causa raíz, en el backend (para que quien implemente la pantalla sepa qué va a poder consultar).**
`GatewayCharger.charge()`
(`VetSoftware/src/main/java/com/vetsoftware/app/paymentgateway/application/usecase/GatewayCharger.java:62-64`)
lanza una `IllegalStateException` sin capturar cuando la empresa no tiene perfil fiscal vigente, y
**ninguno de los dos llamadores la atrapa para registrar un intento**
(`ChargeContractFirstPeriodService.java:74-90`, `ChargeBillingDocumentService.java:106-114`) —a
diferencia de la rama hermana `NO_PAYMENT_METHOD`, que sí anota un `payment_attempt` con
`declineKind=CONFIGURATION` antes de devolver el resultado. Consecuencia: un contrato puede quedar
`ACTIVE` (el primer cobro corre `afterCommit` de `SettleNewContractService.java:62-94`, sin
`try/catch`) sin que exista ninguna fila en `payment_attempts` ni en `subscription_payments` que lo
explique. El único rastro indirecto es que, semanas después, el documento de cobro ya emitido cruza
su fecha de vencimiento sin pagarse y aparece en `OverdueDocumentsView.vue` — sin ninguna pista de
que la causa fue "falta perfil fiscal" y no morosidad ordinaria.

**Qué falta en esta consola.** Ninguna vista cruza "cotización `ACCEPTED`" / "contrato `ACTIVE`"
contra "sin ningún `subscription_payment` que liquide el primer periodo". Es exactamente el filtro
que habría hecho visible este hallazgo sin necesidad de leer el código fuente del backend.

**Corrección, en dos partes:**

1. **`backend-feature`** (`VetSoftware`): capturar la ausencia de perfil fiscal en `GatewayCharger`
   (o en cada llamador) y registrar un `payment_attempt` `CONFIGURATION` con un motivo
   distinguible ("perfil fiscal ausente"), igual que ya existe para `NO_PAYMENT_METHOD`. Sin esto,
   la pantalla de abajo no tiene ni siquiera un intento que mostrar — solo podría enseñar la
   ausencia total, que es peor evidencia.
2. **`backend-feature` + `front-feature`**: una vista nueva, "Contratos sin cobro del primer
   periodo" (o ampliar `OverdueDocumentsView.vue` con una pestaña), que liste contratos con
   `status IN (ACTIVE, PAST_DUE)` cuyo documento del primer periodo no tiene ningún
   `subscription_payment` `CONFIRMED`. Reutilizar el patrón de `AppEmptyState`/`AppTable` ya
   establecido en `billing-operations`.

**Verificación tras el arreglo.** Reproducir el caso en un entorno de prueba (empresa sin perfil
fiscal, cotización aceptada) y comprobar que aparece una fila `CONFIGURATION` en
`PaymentAttemptsTable.vue` y, si se construye la vista nueva, que el contrato aparece en ella. No
se pudo verificar contra datos reales en esta auditoría (regla del repo: verificar solo con
código, no contra la base de datos de dev).

---

## C-02 · El intento de cobro no dice qué tarjeta se usó {#c-02}

**Severidad: grave.**

**Qué pasa hoy.** `SystemPaymentAttemptResponse.paymentMethodId`
(`src/features/billing-operations/types/payment-attempts.types.ts:108`) existe en el contrato,
pero `PaymentAttemptsTable.vue` **nunca lo resuelve ni lo pinta** — no hay ninguna columna ni
tooltip con la marca/últimos 4 de la tarjeta que falló.

**Por qué importa.** Un operador que investiga por qué se acumulan rechazos en una empresa no
puede saber, desde esta tabla, si el problema es siempre la misma tarjeta o si hay varias
involucradas — dato que cambia la conversación con el cliente.

**Corrección.** El contrato debería incluir `brand`/`lastFour` directamente en
`SystemPaymentAttemptResponse` (igual que `WompiPaymentMethodResponse` ya los expone), o exponer un
endpoint de plataforma para resolver un `paymentMethodId` suelto que el front pueda cruzar —mismo
patrón que `CompanyRef.vue` ya usa para resolver un `companyId`.

**Agente:** `api-contract-sync` primero (confirmar si el campo ya existe en otra respuesta y solo
falta declararlo aquí) → `backend-feature` si hay que añadirlo de verdad → `front-feature` para
pintarlo en `PaymentAttemptsTable.vue`.

---

## C-03 · Ningún pago ni intento dice quién o qué lo registró {#c-03}

**Severidad: grave — hallazgo de contrato, con precedente en el propio repo.**

**Qué pasa hoy.** Ni `SubscriptionPaymentResponse`
(`billing-operations.types.ts:122-137`) ni `SystemPaymentAttemptResponse`
(`payment-attempts.types.ts:104-120`) llevan ningún campo que diga si el movimiento lo generó el
webhook de Wompi, el barrido de cobro recurrente, o un operador de plataforma a mano.

**El contraste que confirma que es un hueco y no una decisión.** `SystemPaymentRefundResponse`
(`payment-refunds.types.ts:104-132`) sí modela exactamente este dato para las devoluciones —
`authorizedBySystemUserId`, obligatorio, con su javadoc explicando por qué es un id y no un
nombre. El patrón existe, está bien pensado, y simplemente no se replicó en pagos ni en intentos.

**Por qué importa.** Sin este dato, la consola no puede distinguir "el webhook confirmó este pago
solo" de "alguien lo marcó a mano" — que es justo la pregunta que hace la auditoría cuando algo no
cuadra en la conciliación.

**Corrección.** Añadir un campo de actor a los dos esquemas, con la misma forma que ya usa
`authorizedBySystemUserId` donde el actor es un operador, y un valor reservado (p. ej.
`SYSTEM_WEBHOOK` / `SYSTEM_BATCH`) cuando no lo es. Pintarlo en `PaymentsTable.vue` y
`PaymentAttemptsTable.vue` como una columna más, igual que ya se hace con "Conciliación".

**Agente:** `backend-feature` (`VetSoftware`, los dos esquemas y su origen en dominio) →
`front-feature` (`VetSoftwareFront`, las dos tablas).

---

## C-04 · Sin filtro de fecha ni exportación en las cuatro listas de dinero de Wompi {#c-04}

**Severidad: grave.**

**Qué pasa hoy.** Los cuatro clientes de `billing-operations/api/*.ts`
(`payment-attempts.api.ts`, `billing-operations.api.ts`, `payment-refunds.api.ts`,
`payment-reversals.api.ts`) solo aceptan `page`, `pageSize` y, en algunos, `companyId` — grep
confirmado sobre los cuatro ficheros, cero parámetro de fecha en ninguno, y cero mención a
`export`/`csv`/`xlsx` en toda la carpeta `billing-operations`.

**Por qué importa.** Cerrar el mes contable exige poder acotar por rango de fechas y sacar los
datos de la aplicación; hoy la única forma es paginar a mano y copiar filas.

**Corrección.** Añadir `from`/`to` (o `receivedAfter`/`receivedBefore`, coherente con el resto del
contrato) a los cuatro endpoints, y un botón de exportar CSV en cada tabla — patrón a definir una
sola vez y reutilizar en las cuatro, no cuatro implementaciones distintas.

**Agente:** `backend-feature` (los parámetros de fecha) → `front-feature` (el filtro + la
exportación, en las cuatro vistas).

---

## C-05 · Los pagos `PENDING` envejecidos no se pueden encontrar {#c-05}

**Severidad: grave.**

**Qué pasa hoy.** `OverdueDocumentsView.vue` filtra por `dueDate` del **documento de cobro**, un
concepto distinto de "pago que quedó `PENDING` y el webhook nunca llegó". `PaymentsTable.vue`
pinta el estado `PENDING` pero no ordena ni resalta por antigüedad — un pago colgado hace tres
semanas se ve igual que uno de hace tres minutos.

**Por qué importa.** Un pago `PENDING` que nunca resuelve es exactamente el síntoma de un webhook
perdido (ver la nota de memoria del proyecto sobre pérdida silenciosa de eventos): sin poder
encontrarlos por antigüedad, nadie los busca hasta que el cliente reclama.

**Corrección.** Añadir una columna de antigüedad en `PaymentsTable.vue` cuando `status='PENDING'`,
reutilizando `daysSince`/`agingText` de `composables/billingFormat.ts` (ya existen, se usan en otro
punto de esta misma feature) en vez de reimplementar el cálculo. Ordenar por `receivedAt` ascendente
cuando el filtro de estado sea `PENDING`.

**Agente:** `front-feature`. No necesita cambio de contrato: el dato (`receivedAt`) ya viaja en
`SubscriptionPaymentResponse`.

---

## C-06 · El filtro de antigüedad nuevo busca en la página, no en el historial {#c-06}

**Severidad: grave.** Origen: auditoría de ronda 2, 2026-09-06, sobre la columna de antigüedad y
el checkbox "Solo pendientes con más de 1 hora" añadidos en
`PaymentsView.vue`/`PaymentsTable.vue` (rama `feature/consola-pagos-pendientes-envejecidos`),
que implementan C-05 de este mismo documento.

**Qué pasa hoy.** `PaymentsView.vue:48-56` lo documenta honestamente en su propio comentario: "El
endpoint no admite `status`: el filtro corre en cliente sobre la página cargada." El checkbox
filtra y ordena por `receivedAt` solo dentro de `items.value`, que es la página actual. La columna
de antigüedad (`PaymentsTable.vue:86-92`, con `AppBadge` y `title` de fecha exacta) y el vacío
específico (`PaymentsView.vue:98-109`) están bien hechos — pero no resuelven la tarea real:
encontrar el pago `PENDING` más viejo de TODO el historial de una empresa exige activar el
checkbox y pasar página por página.

**Por qué importa.** Es exactamente el trabajo manual que C-05 pedía eliminar. La mitad visual
(verlo cuando ya está en pantalla) está resuelta; la mitad que ahorra tiempo (encontrarlo sin
paginar) no.

**Corrección.** `backend-feature`: añadir `status` (y opcionalmente `sort=receivedAt,asc`) al
endpoint que sirve `usePlatformPayments`, análogo a lo pedido en C-04 para fechas. `front-feature`:
cuando el filtro esté activo, pasarlo como parámetro de servidor en vez de filtrar la página
cargada.

**Agente:** `backend-feature` → `front-feature`.

---

## C-07 · El payload del webhook de Wompi existe y es inalcanzable {#c-07}

**Severidad: grave.**

**Qué pasa hoy.** `ProcessWompiEventService.java:109-111` persiste el cuerpo crudo de cada evento
de Wompi (`webhookEventRecorderPort.recordReceived(..., command.rawBody())`) junto con su
checksum, tipo de evento y `transactionId` — respaldado por `WompiWebhookEventJpaEntity` /
`WompiWebhookEventJpaRepository`. Pero ningún `@RestController` lo expone (grep confirmado: cero
rutas de lectura tipo `webhook-events` en todo `src/main`), así que hoy la única forma de
recuperarlo es una consulta SQL directa.

**Por qué importa.** Es exactamente el dato que hace falta para una disputa con el banco o con
Wompi ("¿qué mandó realmente la pasarela?"), y hoy depende de pedirle a alguien con acceso a la
base de datos que lo saque a mano.

**Corrección.** `backend-feature`: `GET /system/payment-gateway/wompi/events?transactionId=...`
(o por `gatewayReference`), de solo lectura, cerrado a un permiso de plataforma nuevo o existente
de auditoría. `front-feature`: un panel de detalle —junto a `PaymentAttemptsTable` o en el
expediente del contrato— que muestre el payload crudo con copia al portapapeles, mismo patrón que
ya se usa para el `traceId` en los toasts de error.

**Agente:** `backend-feature` → `front-feature`.

---

## C-08 · Un pago-reserva sin referencia no se explica como tal {#c-08}

**Severidad: nota.**

**Qué pasa hoy.** Cuando se reserva un pago antes de recibir la confirmación de Wompi
(`SubscriptionPaymentLedgerAdapter.registerAndApply`, `PaymentReservation`), el pago nace
`PENDING` sin `gatewayReference`. `PaymentsTable.vue:45-47` (`gatewayText`) pinta "WOMPI" sin
número en la columna de pasarela; combinado con el badge "Pendiente" y, si pasa de una hora, el
badge de antigüedad de C-05, la lectura es posible pero no explícita.

**Por qué importa.** Un operador nuevo puede confundir "WOMPI sin número" con un dato incompleto
o un error de captura, en vez de una reserva normal en espera del webhook.

**Corrección.** Añadir un `title` (o una nota en la celda) cuando `gatewayReference` es null y
`status === 'PENDING'`: *"Reservado; Wompi todavía no confirmó la referencia."*

**Agente:** `front-feature`.

---

## C-09 · Los 409 nuevos de plataforma llegan sin traducir {#c-09}

**Severidad: grave — mismo patrón que F-10 del documento gemelo, lado consola.**

**Qué pasa hoy.** `BillingDocumentHasPendingPaymentException.java:9-10` construye su mensaje en
inglés con el ID interno del documento (`"Billing document 42 has a pending payment application in
flight"`), y `GlobalExceptionHandler` lo usa tal cual como `detail`. Hoy es **inalcanzable desde
cualquier pantalla**: `BillingDocumentDetailView.vue` documenta explícitamente (comentario de
cabecera, §"Lo que esta pantalla NO ofrece") que anular un documento existe en el contrato
(`/void`) pero deliberadamente no se ofrece ningún botón — la corrección se hace con nota crédito,
no con anulación. El mensaje sin traducir es hoy deuda latente, no un defecto visible.

**Por qué importa poco hoy y por qué merece quedar escrito.** Si en el futuro se decide exponer
`/void` desde algún flujo (por ejemplo, un panel de soporte de plataforma), este mensaje saldría
crudo el primer día. Documentarlo ahora evita repetir la investigación.

**Corrección.** No urgente mientras `/void` no tenga botón. Si se implementa C-01/UX-34 (ronda 1)
o cualquier otro flujo que dispare `/void` desde una UI, redactar el `detail` en español antes de
exponerlo.

**Agente:** `backend-feature`, baja prioridad mientras no haya UI que lo dispare.

---

## No tocar {#no-tocar}

Verificado y correcto — no lo "mejores" sin motivo nuevo:

- `PaymentAttemptsTable.vue` traduciendo `declineKind` con `DECLINE_KIND_PRESENTATION`: la
  distinción SOFT/HARD/CONFIGURATION con su `nextStep` explícito es el mejor patrón de esta
  auditoría completa, en cualquiera de los dos fronts.
- `PaymentsTable.vue` mostrando `formatMoney(amount, currency)` con la moneda real del pago, en
  vez de asumirla — al contrario de lo que hace el tenant (ver el hallazgo F-06 del documento
  gemelo).
- La decisión de que registrar/conciliar/cambiar estado de un pago viva en el expediente del
  contrato y no en el feed global (`PaymentsView.vue:12-25`): evita la empresa implícita.
- `AcknowledgeReversalModal.vue` y el resto del flujo de reversión, que cumple WCAG §3.3.4 con más
  rigor del que exige la norma.
