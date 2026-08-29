/**
 * Ata los tipos escritos a mano al contrato del backend (TR-01).
 *
 * <p>Este repositorio declara 90 interfaces que espejan los DTOs del servidor y nada las ataba
 * a él: renombrar un campo en un `record` de Java compilaba, desplegaba y fallaba en el navegador
 * del veterinario como `undefined`. Aquí ese fallo pasa a ser un error de compilación.
 *
 * <p><b>Por qué afirmar en vez de sustituir.</b> Lo evidente sería borrar las interfaces y usar
 * `components['schemas'][...]`. No se hace porque springdoc no marca ningún campo como requerido
 * —un `record` de Java no dice nada sobre nulabilidad—, así que **el esquema generado es
 * enteramente opcional**: adoptarlo cambiaría 90 tipos precisos por 90 donde cada acceso
 * necesita `?.`. Eso es perder información, no ganarla. Afirmar conserva los tipos escritos a
 * mano —con su documentación de negocio— y detecta lo que de verdad rompe la pantalla.
 *
 * <p><b>Qué comprueba.</b> Seis conjuntos de campos. La lista importa, porque de ella depende
 * qué cambios del backend rompen este build y cuáles no:
 *
 * <ol>
 *   <li><b>Campos que no existen</b> (`UnknownFields`). Si este repositorio declara un campo que
 *       el contrato no tiene, es un campo inventado, renombrado en el backend o eliminado — y en
 *       runtime vale `undefined`. Es el fallo que describe TR-01.</li>
 *   <li><b>Tipos primitivos incompatibles</b> (`MismatchedFields`), incluidos los enums: un campo
 *       que el backend declara como una unión cerrada y aquí se escribió como `string` acepta
 *       valores que el servidor rechazará. Un tipo local MÁS estrecho que el del contrato sí
 *       pasa, y es legítimo.</li>
 *   <li><b>Campos obligatorios declarados opcionales</b> (`MissingRequiredFields`). springdoc
 *       deriva `required` de las anotaciones de validación de los DTO de entrada. Declararlo
 *       opcional aquí deja construir una petición incompleta que compila y se rechaza con un
 *       400.</li>
 *   <li><b>Campos garantizados declarados nulables</b> (`NullableWhereRequired`). Desde que los
 *       DTO de salida llevan `requiredMode`, el contrato SÍ dice qué garantiza devolver el
 *       servidor, y declararlo nulable aquí obliga a comprobaciones que nunca se cumplen.</li>
 *   <li><b>Campos del contrato que este repositorio NO declara en absoluto</b>
 *       (`UndeclaredFields`), descontando el techo de `ContractGaps`.</li>
 *   <li><b>Entradas caducadas del techo</b> (`StaleGaps`): quien termine de declarar un esquema
 *       tiene que borrar su línea de `ContractGaps` o el build no compila.</li>
 * </ol>
 *
 * <p><b>Consecuencia que hay que tener delante, porque es contraintuitiva.</b> El quinto conjunto
 * significa que <b>un campo NUEVO en una respuesta del backend rompe la compilación de todo front
 * que ate ese esquema</b>. Un cambio 100 % aditivo —nada renombrado, nada borrado— NO es seguro
 * para los fronts. Es deliberado: un campo que el servidor manda y la pantalla ignora es
 * exactamente cómo se pierden datos en silencio (ver el javadoc de `UndeclaredFields`).
 *
 * <p>Ya ocurrió, y no es hipotético: al regenerar el contrato, `CatalogItemResponse` ganó el campo
 * opcional `defaultTrialDays` y la consola dejó de compilar con
 * `error TS2344: Type '"defaultTrialDays"' does not satisfy the constraint 'true'`. La atadura
 * hizo su trabajo. Quien lea esta cabecera y planifique un cambio aditivo en el backend tiene que
 * contar con este paso en los dos fronts.
 *
 * <p><b>Qué NO comprueba, a propósito.</b> La forma de los campos anidados: cada tipo anidado
 * tiene su propia atadura en la lista de abajo y se comprueba ahí. Compararla aquí solo
 * produciría falsos positivos, ya que el generador emite `campo?: string` donde este repositorio
 * escribe `string | null` y esa diferencia no dice nada sobre el backend.
 */
import type { components } from './api.generated'
import type { PageResponse } from './pagination'
import type { SystemConfigurationDto } from '../features/config/types/config.types'
import type {
  AnimalColorResponse,
  CreateAnimalColorRequest,
  SpecieSummary,
  UpdateAnimalColorRequest,
} from '../features/animal-colors/types/animal-colors.types'
import type {
  LoginEmployeeRequest,
  LoginSystemUserRequest,
  MeResponse,
  TokenResponse,
} from '../features/auth/types/auth.types'
import type {
  BasePermissionResponse,
  CreateBasePermissionRequest,
  UpdateBasePermissionRequest,
} from '../features/base-permissions/types/base-permissions.types'
import type { PublishAdminPermissionsResponse } from '../features/base-role-permissions/types/admin-permission-publish.types'
import type {
  BasePermissionSummary,
  BaseRolePermissionResponse,
  BaseRoleSummary,
  CreateBaseRolePermissionRequest,
  UpdateBaseRolePermissionRequest,
} from '../features/base-role-permissions/types/base-role-permissions.types'
import type {
  BaseRoleResponse,
  CreateBaseRoleRequest,
  UpdateBaseRoleRequest,
} from '../features/base-roles/types/base-roles.types'
import type {
  BreedResponse,
  CreateBreedRequest,
  UpdateBreedRequest,
} from '../features/breeds/types/breeds.types'
import type {
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../features/companies/types/companies.types'
import type {
  CompanyTaxProfileResponse,
  EconomicActivitySummary,
  NumberingResolutionResponse,
  WithholdingConfigDto,
} from '../features/companies/types/company-fiscal.types'
import type {
  CompanyBillingProfileResponse,
  SucceedCompanyBillingProfileRequest,
} from '../features/companies/types/company-cession.types'
import type { SetSystemConfigurationRequest } from '../features/config/types/config.types'
import type {
  ConsultationTypeResponse,
  CreateConsultationTypeRequest,
  UpdateConsultationTypeRequest,
} from '../features/consultation-types/types/consultation-types.types'
import type {
  CreateDiagnosticImagingTypeRequest,
  DiagnosticImagingTypeResponse,
  UpdateDiagnosticImagingTypeRequest,
} from '../features/diagnostic-imaging-types/types/diagnostic-imaging-types.types'
import type {
  CreateLaboratoryTestTypeRequest,
  LaboratoryTestTypeResponse,
  UpdateLaboratoryTestTypeRequest,
} from '../features/laboratory-test-types/types/laboratory-test-types.types'
import type {
  CreateGlobalMedicamentRequest,
  MedicamentCompanySummary,
  MedicamentResponse,
  UpdateGlobalMedicamentRequest,
} from '../features/medicaments/types/medicaments.types'
import type {
  ModuleResponse,
  CreateModuleRequest,
  UpdateModuleRequest,
} from '../features/modules/types/modules.types'
import type {
  CreateSpaTypeRequest,
  SpaTypeResponse,
  UpdateSpaTypeRequest,
} from '../features/spa-types/types/spa-types.types'
import type {
  CreateSpecieRequest,
  SpecieResponse,
  UpdateSpecieRequest,
} from '../features/species/types/species.types'
import type {
  CreateSubModuleRequest,
  SubModuleResponse,
  UpdateSubModuleRequest,
} from '../features/submodules/types/submodules.types'
import type {
  CreateSurgeryTypeRequest,
  SurgeryTypeResponse,
  UpdateSurgeryTypeRequest,
} from '../features/surgery-types/types/surgery-types.types'
import type {
  CreateVaccinationTypeRequest,
  UpdateVaccinationTypeRequest,
  VaccinationTypeResponse,
} from '../features/vaccination-types/types/vaccination-types.types'
import type {
  BillingDocumentResponse,
  BillingDocumentTaxSummary,
  DunningBillingDocumentSummary,
  DunningEventResponse,
  DunningSubscriptionSummary,
  RegisterExternalInvoiceRequest,
  SubscriptionPaymentResponse,
} from '../features/billing-operations/types/billing-operations.types'
import type {
  BillingDocumentApplicationResponse,
  BillingDocumentSummary,
  IssueCreditNoteRequest,
} from '../features/billing-documents/types/billing-documents.types'
import type {
  ApplyBillingDocumentRequest,
  DocumentWithholdingResponse,
  RegisterDocumentWithholdingRequest,
} from '../features/billing-documents/types/document-money.types'
import type {
  RecordPaymentAttemptRequest,
  ReschedulePaymentAttemptRequest,
  SystemPaymentAttemptResponse,
} from '../features/billing-operations/types/payment-attempts.types'
import type {
  PaymentRefundResponse,
  RegisterPaymentRefundRequest,
  SystemPaymentRefundResponse,
} from '../features/billing-operations/types/payment-refunds.types'
import type {
  AcknowledgeReversalRequest,
  OpenReversalRequest,
  OpposeReversalRequest,
  PaymentReversalRequestResponse,
  ResolveReversalRequest,
} from '../features/billing-operations/types/payment-reversals.types'
import type {
  ConsumeCustomerCreditRequest,
  CustomerCreditBalanceResponse,
  CustomerCreditEntryResponse,
  GrantCustomerCreditRequest,
} from '../features/billing-operations/types/customer-credit.types'
import type {
  BundleComponentResponse,
  CatalogItemDependencyResponse,
  CatalogItemLimitResponse,
  CatalogItemResponse,
  CatalogItemSummary,
  CatalogPriceResponse,
  CreateBundleComponentRequest,
  CreateCatalogItemDependencyRequest,
  CreateCatalogItemLimitRequest,
  CreateCatalogItemRequest,
  CreateCatalogItemSubModuleRequest,
  CreateCatalogPriceRequest,
  CreatePriceListRequest,
  LimitPropagationResponse,
  PriceListResponse,
  PropagateCatalogLimitImprovementRequest,
  UpdateBundleComponentRequest,
  UpdateCatalogItemDependencyRequest,
  UpdateCatalogItemLimitRequest,
  UpdateCatalogItemRequest,
  UpdateCatalogPriceRequest,
  UpdatePriceListRequest,
} from '../features/commercial-catalog/types/commercial-catalog.types'
import type {
  CityResponse,
  CountryResponse,
  CountrySummary,
  StateResponse,
  StateSummary,
} from '../features/companies/types/company-locations.types'
import type {
  SubscriptionItemOverlapResponse,
  SubscriptionResponse,
} from '../features/subscriptions-admin/types/subscriptions-admin.types'
import type {
  CancelSubscriptionRequest,
  ChangeSubscriptionStatusRequest,
} from '../features/subscriptions-admin/types/subscription-record.types'
import type {
  AddSubscriptionItemRequest,
  ChangeSubscriptionItemQuantityRequest,
  RemoveSubscriptionItemRequest,
  RequestedSubscriptionItemRequest,
  SubscriptionItemResponse,
} from '../features/subscriptions-admin/types/subscription-items.types'
import type {
  SubscriptionAmendmentResponse,
  SubscriptionStatusChangeResponse,
} from '../features/subscriptions-admin/types/subscription-history.types'
import type {
  CompanyAccessResponse,
  CompanyCapacityResponse,
  CompanyEntitlementResponse,
  EntitlementRecalculationResponse,
} from '../features/subscriptions-admin/types/entitlements.types'
import type { RecordDunningEventRequest } from '../features/subscriptions-admin/types/dunning-record.types'
import type {
  RegisterSubscriptionPaymentRequest,
  SubscriptionChargeResponse,
} from '../features/subscriptions-admin/types/subscription-money.types'
import type {
  ConfiguratorEffectResponse,
  ConfiguratorOptionResponse,
  ConfiguratorQuestionResponse,
  ConfiguratorSelectionResponse,
  CreateConfiguratorEffectRequest,
  CreateConfiguratorOptionRequest,
  CreateConfiguratorQuestionRequest,
  EffectPriorityRequest,
  QuestionnaireOptionResponse,
  QuestionnaireQuestionResponse,
  ReorderConfiguratorEffectsRequest,
  ResolveConfiguratorSelectionRequest,
  SelectedItemResponse,
  UpdateConfiguratorEffectRequest,
  UpdateConfiguratorOptionRequest,
  UpdateConfiguratorQuestionRequest,
} from '../features/configurator/types/configurator.types'
import type {
  AcceptInvitationRequest,
  AccessRequestResponse,
  CreateAccessRequestRequest,
  InvitationResponse,
  ResolveAccessRequestRequest,
} from '../features/platform-access/types/platform-access.types'
import type {
  CatalogItemSubModuleResponse,
  SubModuleSummary,
} from '../features/platform-setup/types/platform-setup.types'
import type {
  BillingDocumentSequenceResponse,
  CreateBillingDocumentSequenceRequest,
  PlatformBillingConfigResponse,
  PriceListSummary,
  UpdatePlatformBillingConfigRequest,
} from '../features/platform-billing/types/platform-billing.types'
import type {
  AcceptQuoteRequest,
  CompanySummary,
  CreateQuoteRequest,
  QuoteAnswerRequest,
  QuoteAnswerResponse,
  QuoteLineRequest,
  QuoteLineResponse,
  QuoteResponse,
  QuoteSummaryResponse,
  SelfServeQuoteLineRequest,
  SelfServeQuoteRequest,
} from '../features/quotes/types/quotes.types'
import type {
  CompanyLimitEventResponse,
  CompanyLimitOverrideResponse,
  CreateLimitDimensionRequest,
  EffectiveLimitResponse,
  GrantCompanyLimitOverrideRequest,
  LimitDimensionResponse,
  LimitDimensionSubModuleSummary,
  RevokeCompanyLimitOverrideRequest,
  UpdateLimitDimensionRequest,
} from '../features/limits/types/limits.types'
import type {
  AdjustCompanyUsageRequest,
  CompanyEntitlementSnapshotResponse,
} from '../features/company-limits/types/company-limits.types'
import type {
  CompanyTrialGrantResponse,
  CompanyTrialWindowResponse,
  ConsumeTrialGrantRequest,
  GrantTrialRequest,
  OpenTrialWindowRequest,
} from '../features/trials/types/trials.types'
import type {
  AttachProviderInvoiceRequest,
  BankReceiptResponse,
  ExternalInvoiceReconciliationResponse,
  GatewaySettlementReconciliationResponse,
  GatewaySettlementResponse,
  LinkBankReceiptRequest,
  MatchExternalInvoiceRequest,
  OpenExternalInvoiceReconciliationRequest,
  RegisterBankReceiptRequest,
  RegisterGatewaySettlementRequest,
  ResolveExternalInvoiceReconciliationRequest,
} from '../features/reconciliation/types/reconciliation.types'
export type Schemas = components['schemas']

/** Lo que el contrato sabe comparar campo a campo. Lo demás se comprueba por su propia atadura. */
type Comparable = string | number | boolean

/** Campos que este repositorio declara y el contrato del backend no tiene. */
type UnknownFields<Local, Name extends keyof Schemas> = Exclude<keyof Local, keyof Schemas[Name]>

/** Campos primitivos presentes en ambos lados cuyo tipo no encaja, ignorando la nulabilidad. */
type MismatchedFields<Local, Name extends keyof Schemas> = {
  [K in Extract<keyof Local, keyof Schemas[Name]>]: NonNullable<Schemas[Name][K]> extends Comparable
    ? NonNullable<Local[K]> extends NonNullable<Schemas[Name][K]>
      ? never
      : K
    : never
}[Extract<keyof Local, keyof Schemas[Name]>]

/** Claves que un tipo declara sin `?`. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T]

/**
 * Campos que el contrato exige y este repositorio declara opcionales.
 *
 * <p>Solo aplica a las peticiones: springdoc deriva `required` de las anotaciones de validación
 * (`@NotNull`, `@NotBlank`) de los DTO de entrada, y hoy lo hace en 187 esquemas. Declarar
 * opcional aquí un campo que el servidor exige deja construir una petición incompleta que
 * compila y se rechaza con un 400 en producción. Los DTO de salida no traen esta información
 * —un `record` de Java no dice qué garantiza devolver—, así que ahí este conjunto siempre está
 * vacío y no afirma nada de más.
 */
type MissingRequiredFields<Local, Name extends keyof Schemas> = Exclude<
  RequiredKeys<Schemas[Name]> & keyof Local,
  RequiredKeys<Local>
>

/**
 * Campos que el contrato garantiza y este repositorio declara nulables.
 *
 * <p>Desde que los DTO de salida llevan requiredMode, el contrato sí dice qué garantiza devolver
 * el servidor. Declarar nulable aquí un campo garantizado obliga a comprobaciones
 * que nunca se cumplen y, peor, esconde que los dos fronts describían el mismo endpoint de forma
 * distinta.
 */
type NullableWhereRequired<Local, Name extends keyof Schemas> = {
  [K in RequiredKeys<Schemas[Name]> & keyof Local]: null extends Local[K] ? K : never
}[RequiredKeys<Schemas[Name]> & keyof Local]

/**
 * Campos que el contrato declara y este repositorio no declara **en absoluto**.
 *
 * <p>Este era el agujero del propio guardián. Los cuatro conjuntos de arriba cruzan todos por
 * `keyof Local`, así que solo saben hablar de campos que este repositorio ya nombra: **omitir**
 * un campo entero les resultaba invisible. La petición de crear membresía declaraba `name` y
 * `status`, el contrato traía además `mandatory`, y su atadura pasaba en verde mientras cada
 * membresía creada o editada desde la consola se guardaba con `mandatory = false` sin que nadie
 * lo eligiera ni lo viera.
 *
 * <p>Aquel esquema ya no existe: el modelo de membresías se sustituyó por el de suscripciones.
 * El mecanismo sí sigue haciendo falta, y lo demostró el propio cambio: `CreateSubModuleRequest`
 * estrenó `sellable` y `readOnlyCapable` sin que este repositorio los declarara, y fue este
 * conjunto —no los `required`— el que lo detuvo.
 *
 * <p>Y no basta con mirar los `required` del contrato, que es lo que hace `MissingRequiredFields`:
 * `mandatory` **no** es `required` allí —springdoc solo marca lo que lleva `@NotNull` o
 * `@NotBlank`—, pero en el `record` de Java es un `boolean` primitivo. Un cuerpo JSON sin ese
 * campo no significa «déjalo como está»: significa `false`. Por eso este conjunto mira **todos**
 * los campos del esquema y no solo los exigidos.
 *
 * <p>`ToleratedGaps` descuenta la deuda que ya existía el día que esto se encendió: ver
 * `ContractGaps`.
 */
type UndeclaredFields<Local, Name extends keyof Schemas> = Exclude<
  keyof Schemas[Name],
  keyof Local | ToleratedGaps<Name>
>

/** El techo de deuda resuelto para un esquema concreto; `never` si el esquema no figura. */
type ToleratedGaps<Name extends keyof Schemas> = Name extends keyof ContractGaps
  ? ContractGaps[Name]
  : never

/**
 * Entradas del techo que este tipo ya no necesita, porque declara **todos** los campos que se le
 * perdonaban. Es lo que hace que el techo solo pueda bajar: quien termine de declarar un esquema
 * tiene que borrar su línea de `ContractGaps`, o el build no compila.
 *
 * <p>Pide declararlos todos, y no campo a campo, por un motivo concreto: hay esquemas atados por
 * **dos** tipos locales distintos que comparten una sola entrada del techo. Con la comprobación
 * campo a campo, el tipo que declarara más obligaría a borrar una línea que el otro todavía
 * necesita, y la entrada se quedaría sin forma válida de escribirse.
 */
type StaleGaps<Local, Name extends keyof Schemas> = [
  Exclude<ToleratedGaps<Name>, keyof Local>,
] extends [never]
  ? ToleratedGaps<Name>
  : never

/**
 * `true` si el tipo local encaja con el esquema; si no, **los nombres de los campos que fallan**.
 * Es a propósito: el error de compilación los nombra uno a uno en vez de decir «no asignable»,
 * que obligaría a comparar cuarenta campos a ojo.
 */
export type MatchesContract<Local, Name extends keyof Schemas> = [
  | UnknownFields<Local, Name>
  | MismatchedFields<Local, Name>
  | MissingRequiredFields<Local, Name>
  | NullableWhereRequired<Local, Name>
  | UndeclaredFields<Local, Name>
  | StaleGaps<Local, Name>,
] extends [never]
  ? true
  : | UnknownFields<Local, Name>
    | MismatchedFields<Local, Name>
    | MissingRequiredFields<Local, Name>
    | NullableWhereRequired<Local, Name>
    | UndeclaredFields<Local, Name>
    | StaleGaps<Local, Name>

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Entradas del techo que ya no describen nada real: un esquema que el contrato dejó de traer, o
 * un campo que ese esquema ya no tiene. Es la otra forma de pudrirse —la silenciosa, la que deja
 * el repositorio afirmando por escrito algo falso— y por eso se comprueba aparte de `StaleGaps`,
 * que solo mira el lado del front.
 */
type RottenGapEntries = {
  [N in keyof ContractGaps]: N extends keyof Schemas
    ? [Exclude<ContractGaps[N], keyof Schemas[N]>] extends [never]
      ? never
      : N
    : N
}[keyof ContractGaps]

/**
 * Las ataduras: una por cada tipo de este repositorio con un esquema homónimo en el contrato.
 * `api-contract.spec.ts` falla si aparece un tipo nuevo y nadie lo ata aquí, que es lo que evita
 * que esta lista envejezca en silencio.
 */
/**
 * **El techo de deuda, y solo baja.** Campos que el contrato declara y este repositorio todavía
 * no: la foto del día en que `UndeclaredFields` se encendió. Sin ella, encender la comprobación
 * habría dejado en rojo el build de los dos fronts de golpe, que es la forma segura de que a
 * alguien se le ocurra apagarla.
 *
 * <p>Se sostiene sola por los dos lados: `StaleGaps` obliga a borrar la línea en cuanto el tipo
 * local declara todo lo que se le perdonaba, y `RottenGapEntries` obliga a borrarla si el
 * esquema o el campo dejan de existir en el contrato. Añadir una entrada nueva es siempre un
 * acto deliberado que se ve en el diff — nunca algo que ocurra solo.
 *
 * <p>No todo lo de aquí es un defecto. `TokenResponse.refreshToken` se omite **a propósito**
 * (el backend lo emite en una cookie `HttpOnly` y el campo llega `null`), y los `enabled` de
 * los catálogos son inertes: sus entidades JPA llevan `@SQLRestriction("enabled = true")`, así
 * que por el cable nunca viaja otra cosa que `true`. Esa es justo la razón de que el techo
 * exista en vez de una prohibición seca.
 */
interface ContractGaps {
  // --- Respuestas: lo que este repositorio no lee -------------------------------------
  AnimalColorResponse: 'enabled'
  BasePermissionResponse: 'enabled'
  BaseRolePermissionResponse: 'enabled'
  BaseRoleResponse: 'enabled'
  BreedResponse: 'enabled'
  ConsultationTypeResponse: 'enabled'
  DiagnosticImagingTypeResponse: 'enabled'
  LaboratoryTestTypeResponse: 'enabled'
  ModuleResponse: 'enabled'
  SpaTypeResponse: 'enabled'
  SpecieResponse: 'enabled'
  SubModuleResponse: 'enabled'
  SurgeryTypeResponse: 'enabled'
  TokenResponse: 'refreshToken'
  VaccinationTypeResponse: 'enabled'
}

export type ContractAssertions = [
  Expect<[RottenGapEntries] extends [never] ? true : RottenGapEntries>,
  // La envoltura de página, atada por una de sus 37 instanciaciones (BE-21). El generador emite
  // un esquema por tipo de contenido —`PageResponseCompanyResponse`, `PageResponseSpecieResponse`…—
  // y ninguno se llama `PageResponse` a secas, así que la regla de homónimos de
  // `tests/unit/api-contract.spec.ts` no lo alcanzaba y los cinco campos de `PageResponse<T>` eran
  // los únicos del repositorio sin nada que los atara al servidor: renombrar `content` o
  // `totalElements` en el backend no rompía la compilación, devolvía `undefined` en los quince
  // listados paginados de la consola, en `companies.api.ts` y en `useServerPaged`. Una
  // instanciación basta, porque los cinco campos los declara la envoltura y no el contenido.
  Expect<MatchesContract<PageResponse<CompanyResponse>, 'PageResponseCompanyResponse'>>,
  Expect<MatchesContract<SystemConfigurationDto, 'SystemConfigurationDto'>>,
  Expect<MatchesContract<AnimalColorResponse, 'AnimalColorResponse'>>,
  Expect<MatchesContract<ModuleResponse, 'ModuleResponse'>>,
  Expect<MatchesContract<BasePermissionResponse, 'BasePermissionResponse'>>,
  Expect<MatchesContract<BasePermissionSummary, 'BasePermissionSummary'>>,
  Expect<MatchesContract<BaseRoleResponse, 'BaseRoleResponse'>>,
  Expect<MatchesContract<BaseRolePermissionResponse, 'BaseRolePermissionResponse'>>,
  Expect<MatchesContract<BaseRoleSummary, 'BaseRoleSummary'>>,
  Expect<MatchesContract<BreedResponse, 'BreedResponse'>>,
  Expect<MatchesContract<CompanyResponse, 'CompanyResponse'>>,
  Expect<MatchesContract<ConsultationTypeResponse, 'ConsultationTypeResponse'>>,
  Expect<MatchesContract<CreateAnimalColorRequest, 'CreateAnimalColorRequest'>>,
  Expect<MatchesContract<CreateBasePermissionRequest, 'CreateBasePermissionRequest'>>,
  Expect<MatchesContract<CreateBaseRoleRequest, 'CreateBaseRoleRequest'>>,
  Expect<MatchesContract<CreateBaseRolePermissionRequest, 'CreateBaseRolePermissionRequest'>>,
  Expect<MatchesContract<CreateBreedRequest, 'CreateBreedRequest'>>,
  Expect<MatchesContract<CreateCompanyRequest, 'CreateCompanyRequest'>>,
  Expect<MatchesContract<CreateConsultationTypeRequest, 'CreateConsultationTypeRequest'>>,
  Expect<MatchesContract<CreateDiagnosticImagingTypeRequest, 'CreateDiagnosticImagingTypeRequest'>>,
  Expect<MatchesContract<CreateLaboratoryTestTypeRequest, 'CreateLaboratoryTestTypeRequest'>>,
  Expect<MatchesContract<CreateModuleRequest, 'CreateModuleRequest'>>,
  Expect<MatchesContract<CreateSpaTypeRequest, 'CreateSpaTypeRequest'>>,
  Expect<MatchesContract<CreateSpecieRequest, 'CreateSpecieRequest'>>,
  Expect<MatchesContract<CreateSubModuleRequest, 'CreateSubModuleRequest'>>,
  Expect<MatchesContract<CreateSurgeryTypeRequest, 'CreateSurgeryTypeRequest'>>,
  Expect<MatchesContract<CreateVaccinationTypeRequest, 'CreateVaccinationTypeRequest'>>,
  Expect<MatchesContract<DiagnosticImagingTypeResponse, 'DiagnosticImagingTypeResponse'>>,
  Expect<MatchesContract<LaboratoryTestTypeResponse, 'LaboratoryTestTypeResponse'>>,
  // Vademécum. `MedicamentCompanySummary` se ata al mismo `CompanySummary` del
  // contrato que ya usan las cotizaciones: es el resumen anidado que el backend
  // define UNA vez, y si le cambia un campo tiene que romper la compilación en
  // vez de dejar la columna «Ámbito» en `undefined`.
  Expect<MatchesContract<CreateGlobalMedicamentRequest, 'CreateGlobalMedicamentRequest'>>,
  Expect<MatchesContract<MedicamentCompanySummary, 'CompanySummary'>>,
  Expect<MatchesContract<MedicamentResponse, 'MedicamentResponse'>>,
  Expect<MatchesContract<UpdateGlobalMedicamentRequest, 'UpdateGlobalMedicamentRequest'>>,
  Expect<MatchesContract<LoginEmployeeRequest, 'LoginEmployeeRequest'>>,
  Expect<MatchesContract<LoginSystemUserRequest, 'LoginSystemUserRequest'>>,
  Expect<MatchesContract<MeResponse, 'MeResponse'>>,
  Expect<MatchesContract<PublishAdminPermissionsResponse, 'PublishAdminPermissionsResponse'>>,
  Expect<MatchesContract<SetSystemConfigurationRequest, 'SetSystemConfigurationRequest'>>,
  Expect<MatchesContract<SpaTypeResponse, 'SpaTypeResponse'>>,
  Expect<MatchesContract<SpecieResponse, 'SpecieResponse'>>,
  Expect<MatchesContract<SpecieSummary, 'SpecieSummary'>>,
  Expect<MatchesContract<SubModuleResponse, 'SubModuleResponse'>>,
  Expect<MatchesContract<SurgeryTypeResponse, 'SurgeryTypeResponse'>>,
  Expect<MatchesContract<TokenResponse, 'TokenResponse'>>,
  Expect<MatchesContract<UpdateAnimalColorRequest, 'UpdateAnimalColorRequest'>>,
  Expect<MatchesContract<UpdateBasePermissionRequest, 'UpdateBasePermissionRequest'>>,
  Expect<MatchesContract<UpdateBaseRoleRequest, 'UpdateBaseRoleRequest'>>,
  Expect<MatchesContract<UpdateBaseRolePermissionRequest, 'UpdateBaseRolePermissionRequest'>>,
  Expect<MatchesContract<UpdateBreedRequest, 'UpdateBreedRequest'>>,
  Expect<MatchesContract<UpdateCompanyRequest, 'UpdateCompanyRequest'>>,
  Expect<MatchesContract<UpdateConsultationTypeRequest, 'UpdateConsultationTypeRequest'>>,
  Expect<MatchesContract<UpdateDiagnosticImagingTypeRequest, 'UpdateDiagnosticImagingTypeRequest'>>,
  Expect<MatchesContract<UpdateLaboratoryTestTypeRequest, 'UpdateLaboratoryTestTypeRequest'>>,
  Expect<MatchesContract<UpdateModuleRequest, 'UpdateModuleRequest'>>,
  Expect<MatchesContract<UpdateSpaTypeRequest, 'UpdateSpaTypeRequest'>>,
  Expect<MatchesContract<UpdateSpecieRequest, 'UpdateSpecieRequest'>>,
  Expect<MatchesContract<UpdateSubModuleRequest, 'UpdateSubModuleRequest'>>,
  Expect<MatchesContract<UpdateSurgeryTypeRequest, 'UpdateSurgeryTypeRequest'>>,
  Expect<MatchesContract<UpdateVaccinationTypeRequest, 'UpdateVaccinationTypeRequest'>>,
  Expect<MatchesContract<VaccinationTypeResponse, 'VaccinationTypeResponse'>>,
  Expect<MatchesContract<BillingDocumentResponse, 'BillingDocumentResponse'>>,
  Expect<MatchesContract<BillingDocumentTaxSummary, 'BillingDocumentTaxSummary'>>,
  Expect<MatchesContract<RegisterExternalInvoiceRequest, 'RegisterExternalInvoiceRequest'>>,
  Expect<MatchesContract<SubscriptionPaymentResponse, 'SubscriptionPaymentResponse'>>,
  Expect<MatchesContract<DunningEventResponse, 'DunningEventResponse'>>,
  Expect<MatchesContract<DunningSubscriptionSummary, 'DunningSubscriptionSummary'>>,
  Expect<MatchesContract<DunningBillingDocumentSummary, 'DunningBillingDocumentSummary'>>,

  // El documento de cobro visto como documento (§G2–G4). Los tres esquemas del
  // bloque del dinero que ninguna pantalla anterior necesitaba.
  //
  // `BillingDocumentApplicationResponse` es el que no puede fallar en silencio: es
  // «qué salda esta factura», y de él sale la explicación de un saldo vivo. Si el
  // backend renombrara `sourceKind`, la fila no se rompería — se pintaría con el
  // rótulo de otro origen o sin ninguno, y una retención se leería como un pago.
  // `appliedAmount` renombrado dejaría la resta «total − aplicado» dando el total
  // entero, es decir, un documento saldado leyéndose como impagado, que es
  // exactamente el mecanismo con el que una clínica al día cae a solo lectura.
  //
  // `BillingDocumentSummary` es el resumen que traen las aplicaciones para el
  // documento de origen y el de destino; sin atadura, el enlace a la nota crédito
  // que salda a esta factura desaparecería en vez de fallar.
  //
  // `IssueCreditNoteRequest` se ata aunque su pantalla no esté construida: su
  // cuerpo son los cargos a acreditar y NO un importe, y esa forma es la garantía
  // de que nadie pueda escribir aquí un campo de «importe a corregir». Si el
  // contrato cambiara de forma, se tiene que saber al compilar y no al emitir.
  Expect<MatchesContract<BillingDocumentApplicationResponse, 'BillingDocumentApplicationResponse'>>,
  Expect<MatchesContract<BillingDocumentSummary, 'BillingDocumentSummary'>>,
  Expect<MatchesContract<IssueCreditNoteRequest, 'IssueCreditNoteRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<BillingDocumentApplicationResponse>,
      'PageResponseBillingDocumentApplicationResponse'
    >
  >,

  Expect<MatchesContract<CatalogItemResponse, 'CatalogItemResponse'>>,
  Expect<MatchesContract<CatalogPriceResponse, 'CatalogPriceResponse'>>,
  Expect<MatchesContract<CityResponse, 'CityResponse'>>,
  Expect<MatchesContract<CountryResponse, 'CountryResponse'>>,
  Expect<MatchesContract<CountrySummary, 'CountrySummary'>>,
  Expect<MatchesContract<CreateCatalogItemRequest, 'CreateCatalogItemRequest'>>,
  Expect<MatchesContract<CreateCatalogPriceRequest, 'CreateCatalogPriceRequest'>>,
  Expect<MatchesContract<CreatePriceListRequest, 'CreatePriceListRequest'>>,
  Expect<MatchesContract<PriceListResponse, 'PriceListResponse'>>,
  Expect<MatchesContract<StateResponse, 'StateResponse'>>,
  Expect<MatchesContract<StateSummary, 'StateSummary'>>,
  Expect<MatchesContract<SubscriptionItemOverlapResponse, 'SubscriptionItemOverlapResponse'>>,
  Expect<MatchesContract<SubscriptionResponse, 'SubscriptionResponse'>>,
  Expect<MatchesContract<UpdateCatalogItemRequest, 'UpdateCatalogItemRequest'>>,
  Expect<MatchesContract<UpdateCatalogPriceRequest, 'UpdateCatalogPriceRequest'>>,
  Expect<MatchesContract<UpdatePriceListRequest, 'UpdatePriceListRequest'>>,

  // Puesta en marcha de la plataforma (§3.7, W1-B). Las cuatro respuestas que la
  // lista de comprobación lee para saber si su paso está hecho. Si el backend
  // renombra `defaultPriceList` o `prefix`, la sonda dejaría de encontrarlo y el
  // paso se quedaría en «Pendiente» para siempre sin que nada fallara: es
  // exactamente el fallo silencioso que TR-01 existe para convertir en error de
  // compilación.
  Expect<MatchesContract<BillingDocumentSequenceResponse, 'BillingDocumentSequenceResponse'>>,
  Expect<
    MatchesContract<CreateBillingDocumentSequenceRequest, 'CreateBillingDocumentSequenceRequest'>
  >,
  Expect<MatchesContract<UpdatePlatformBillingConfigRequest, 'UpdatePlatformBillingConfigRequest'>>,
  Expect<MatchesContract<CatalogItemSubModuleResponse, 'CatalogItemSubModuleResponse'>>,
  Expect<MatchesContract<ConfiguratorQuestionResponse, 'ConfiguratorQuestionResponse'>>,
  Expect<MatchesContract<CreateConfiguratorQuestionRequest, 'CreateConfiguratorQuestionRequest'>>,
  Expect<MatchesContract<UpdateConfiguratorQuestionRequest, 'UpdateConfiguratorQuestionRequest'>>,
  Expect<MatchesContract<ConfiguratorOptionResponse, 'ConfiguratorOptionResponse'>>,
  Expect<MatchesContract<CreateConfiguratorOptionRequest, 'CreateConfiguratorOptionRequest'>>,
  Expect<MatchesContract<UpdateConfiguratorOptionRequest, 'UpdateConfiguratorOptionRequest'>>,
  Expect<MatchesContract<ConfiguratorEffectResponse, 'ConfiguratorEffectResponse'>>,
  Expect<MatchesContract<CreateConfiguratorEffectRequest, 'CreateConfiguratorEffectRequest'>>,
  Expect<MatchesContract<UpdateConfiguratorEffectRequest, 'UpdateConfiguratorEffectRequest'>>,
  Expect<MatchesContract<QuestionnaireQuestionResponse, 'QuestionnaireQuestionResponse'>>,
  Expect<MatchesContract<QuestionnaireOptionResponse, 'QuestionnaireOptionResponse'>>,
  Expect<
    MatchesContract<ResolveConfiguratorSelectionRequest, 'ResolveConfiguratorSelectionRequest'>
  >,
  Expect<MatchesContract<ConfiguratorSelectionResponse, 'ConfiguratorSelectionResponse'>>,
  Expect<MatchesContract<SelectedItemResponse, 'SelectedItemResponse'>>,
  Expect<MatchesContract<PlatformBillingConfigResponse, 'PlatformBillingConfigResponse'>>,
  Expect<MatchesContract<PriceListSummary, 'PriceListSummary'>>,
  Expect<MatchesContract<SubModuleSummary, 'SubModuleSummary'>>,

  // Cotizaciones (§4.3, W1-D). Las nueve formas del embudo comercial. `CompanySummary` se ata
  // aquí porque es el resumen anidado que el contrato define UNA vez y que las cotizaciones son
  // la unica familia de estas pantallas en recibir: si el backend le cambia un campo, tiene que
  // romper la compilación y no dejar la columna «Cliente» en `undefined`.
  Expect<MatchesContract<AcceptQuoteRequest, 'AcceptQuoteRequest'>>,
  Expect<MatchesContract<CompanySummary, 'CompanySummary'>>,
  Expect<MatchesContract<CreateQuoteRequest, 'CreateQuoteRequest'>>,
  Expect<MatchesContract<QuoteAnswerRequest, 'QuoteAnswerRequest'>>,
  Expect<MatchesContract<QuoteAnswerResponse, 'QuoteAnswerResponse'>>,
  Expect<MatchesContract<QuoteLineRequest, 'QuoteLineRequest'>>,
  Expect<MatchesContract<QuoteLineResponse, 'QuoteLineResponse'>>,
  Expect<MatchesContract<QuoteResponse, 'QuoteResponse'>>,
  Expect<MatchesContract<QuoteSummaryResponse, 'QuoteSummaryResponse'>>,
  // Autoservicio. Esta consola no llama a `POST /quotes/self-serve` —lo hace el front del
  // tenant—, pero el esquema se ata igual: sin atadura, el giro de `catalogItemId: number` a
  // `code: string` que ya ocurrió habría pasado en verde en los dos repositorios. La línea va
  // atada APARTE y no basta con la del sobre: el comparador de campos solo entiende
  // `string | number | boolean`, así que `lines` —un array— lo atraviesa sin que nadie lo mire.
  Expect<MatchesContract<SelfServeQuoteRequest, 'SelfServeQuoteRequest'>>,
  Expect<MatchesContract<SelfServeQuoteLineRequest, 'SelfServeQuoteLineRequest'>>,

  // Expediente del contrato (§4.4.2, W2-A). Los dos únicos cuerpos que esta
  // consola escribe sobre un contrato. `SubscriptionResponse` ya estaba atado
  // más arriba. Atar estos dos importa especialmente: son escrituras sobre el
  // dinero y el contrato de un tercero, y un campo renombrado en el backend no
  // fallaría al compilar — el servidor rechazaría el cuerpo con el operador
  // delante y Ana al teléfono.
  Expect<MatchesContract<CancelSubscriptionRequest, 'CancelSubscriptionRequest'>>,
  Expect<MatchesContract<ChangeSubscriptionStatusRequest, 'ChangeSubscriptionStatusRequest'>>,

  // Acceso calculado (§4.4.2, W2-D). Las cuatro formas de la tabla derivada.
  // Aquí no se escribe nada —los tres endpoints son de lectura o de reparación y
  // ninguno lleva cuerpo—, así que lo que hay que atar no son peticiones sino
  // respuestas, y por un motivo muy concreto: `subscriptionId` y
  // `subscriptionItemId` son el puente de vuelta a la línea del contrato. Si el
  // backend renombra uno de los dos, el enlace no falla: desaparece. La celda
  // pasa a decir «no hay línea detrás» sobre un permiso que sí la tiene, y nadie
  // se entera hasta que alguien reclama por qué se le cobró algo.
  Expect<MatchesContract<CompanyEntitlementResponse, 'CompanyEntitlementResponse'>>,
  Expect<MatchesContract<CompanyCapacityResponse, 'CompanyCapacityResponse'>>,
  Expect<MatchesContract<CompanyAccessResponse, 'CompanyAccessResponse'>>,
  Expect<MatchesContract<EntitlementRecalculationResponse, 'EntitlementRecalculationResponse'>>,

  // Historia del contrato (§3.3, W2-C). Los dos documentos inmutables que hacen
  // auditable el modelo: el otrosí y la bitácora de estados. Aquí tampoco se
  // escribe nada, y por eso atarlos importa de una forma distinta: un campo
  // renombrado en el backend no daría un 400 con el operador delante — daría un
  // `undefined` pintado como «—». `requestedByEmployeeId` y
  // `requestedBySystemUserId` son las dos firmas que dicen si un cambio lo pidió
  // la clínica o lo hizo la plataforma, y `prorationAmount`/`monthlyDeltaAmount`
  // son dos importes que significan cosas distintas. Cualquiera de los cuatro
  // desapareciendo en silencio deja una película del contrato que se lee entera
  // y miente.
  Expect<MatchesContract<SubscriptionAmendmentResponse, 'SubscriptionAmendmentResponse'>>,
  Expect<MatchesContract<SubscriptionStatusChangeResponse, 'SubscriptionStatusChangeResponse'>>,

  // Lo contratado (§3.3, W2-B). `SubscriptionItemResponse` es el DTO sobre el que
  // esta consola decide qué tenía contratado una clínica un día concreto. Si el
  // backend renombrara `effectiveFrom` o `effectiveTo`, el criterio de vigencia no
  // fallaría: con los dos campos en `undefined` clasificaría TODAS las líneas igual
  // y la pantalla seguiría respondiendo con aplomo. Es exactamente el error
  // invisible del que avisa `EffectivePeriod` —«se factura de más o se dejan
  // permisos vivos hasta que un cliente reclama meses después»—, y la única forma
  // de que cante es que deje de compilar.
  //
  // Los tres cuerpos de escritura se atan por el motivo de siempre: son otrosíes
  // sobre el contrato de un tercero, y un campo renombrado se descubriría con un
  // 400 y el operador delante.
  Expect<MatchesContract<SubscriptionItemResponse, 'SubscriptionItemResponse'>>,
  // `AddSubscriptionItemRequest.line` es `RequestedSubscriptionItemRequest` desde el cierre del
  // defecto de dinero que dejaba fijar el precio del lado del cliente (`unitAmount`, `taxRate`,
  // `includedQuantity`… viajaban en el cuerpo y el servicio los persistía tal cual). El servidor
  // ahora resuelve esos campos contra la tarifa del contrato y rechaza que vengan en la petición.
  Expect<MatchesContract<RequestedSubscriptionItemRequest, 'RequestedSubscriptionItemRequest'>>,
  Expect<MatchesContract<AddSubscriptionItemRequest, 'AddSubscriptionItemRequest'>>,
  Expect<
    MatchesContract<ChangeSubscriptionItemQuantityRequest, 'ChangeSubscriptionItemQuantityRequest'>
  >,
  Expect<MatchesContract<RemoveSubscriptionItemRequest, 'RemoveSubscriptionItemRequest'>>,

  // El dinero del contrato (§3.5, W2-E). Los tres verbos —devengar, facturar,
  // cobrar— y el unico cuerpo de escritura de la sub-vista.
  //
  // `SubscriptionChargeResponse` es el DTO que sostiene la cadena de §3.3:
  // `billingDocumentId`, `amendmentId` y `subscriptionItemId` son los tres saltos
  // que responden «¿por que se le facturaron 179.000?», y `prorationDays` /
  // `periodDays` son la fraccion sin la cual un prorrateo no se puede
  // reconstruir. Si el backend renombrara cualquiera de los cinco, nada fallaria:
  // el enlace no daria error, DESAPARECERIA, y la celda diria «no se sabe de
  // donde salio» sobre un cargo que si lo sabe. La unica forma de que cante es
  // que deje de compilar.
  //
  // `RegisterSubscriptionPaymentRequest` se ata por el motivo de siempre y por
  // uno propio: es una escritura sobre el dinero de un tercero, y `clientRequestId`
  // es lo unico que impide que un doble clic registre dos veces el mismo giro. Un
  // campo renombrado en el backend no daria un error de compilacion — daria una
  // llave de idempotencia que el servidor ignora en silencio.
  Expect<MatchesContract<SubscriptionChargeResponse, 'SubscriptionChargeResponse'>>,
  Expect<MatchesContract<RegisterSubscriptionPaymentRequest, 'RegisterSubscriptionPaymentRequest'>>,

  // Cobranza del contrato (§4.4.2, W2-F). La respuesta —`DunningEventResponse` y
  // sus dos resúmenes— ya está atada más arriba desde W1-E, y esta sub-vista la
  // reutiliza tal cual en vez de declarar una segunda copia. Lo que faltaba atar
  // es el único cuerpo que esta pantalla escribe.
  //
  // Importa por una razón concreta: `eventType` y `channel` son dos uniones
  // cerradas, y `channel` además es obligatorio cuando `eventType` es
  // `REMINDER_SENT` (`chk_dunning_events_reminder_channel`). Si el backend
  // añadiera o renombrara un valor del enum, el formulario seguiría compilando y
  // mandaría un valor que el servidor rechaza — con el operador delante y el
  // cliente al teléfono, en la pantalla cuya única razón de ser es servir de
  // prueba de que se avisó.
  Expect<MatchesContract<RecordDunningEventRequest, 'RecordDunningEventRequest'>>,

  // Los tres puentes del catálogo (§4.1, W3-A). Nueve rutas que hasta ahora no
  // tenía ningún consumidor, así que sus siete DTO entran atados desde el primer
  // día en vez de sumarse a la deuda que este fichero existe para cerrar.
  //
  // `CatalogItemDependencyResponse` importa por `relationType`: es una unión
  // cerrada en inglés (`REQUIRES` / `RECOMMENDS` / `EXCLUDES`) sobre la que ya
  // hubo un choque con el español de la interfaz. Si el backend renombrara o
  // añadiera un valor, el `<select>` seguiría compilando y mandaría algo que
  // `chk_catalog_item_dependencies_relation` rechaza con un 400 — y el operador
  // leería «solicitud inválida» sobre una regla que acaba de teclear bien.
  // `note` va atada por otra razón: es **copy que lee el cliente**, no un
  // comentario técnico. Si desapareciera del contrato, la regla se guardaría sin
  // mensaje y el configurador enseñaría un rechazo sin explicación, sin que nada
  // fallara aquí.
  //
  // `BundleComponentResponse` y sus dos cuerpos: `quantity` es lo único que se
  // edita de una pieza, así que un renombrado dejaría el `PUT` mandando un
  // cuerpo que el servidor ignora y la cantidad «guardada» sin cambiar.
  //
  // `CreateCatalogItemSubModuleRequest` es un solo campo, y por eso mismo no
  // tiene red: `subModuleId` mal escrito es un 400 en el puente entre vender y
  // funcionar, que es la única escritura de esta pantalla que decide si un
  // artículo vendido abre alguna pantalla.
  Expect<MatchesContract<CreateCatalogItemSubModuleRequest, 'CreateCatalogItemSubModuleRequest'>>,
  Expect<MatchesContract<CatalogItemDependencyResponse, 'CatalogItemDependencyResponse'>>,
  Expect<MatchesContract<CreateCatalogItemDependencyRequest, 'CreateCatalogItemDependencyRequest'>>,
  Expect<MatchesContract<UpdateCatalogItemDependencyRequest, 'UpdateCatalogItemDependencyRequest'>>,
  Expect<MatchesContract<BundleComponentResponse, 'BundleComponentResponse'>>,
  Expect<MatchesContract<CreateBundleComponentRequest, 'CreateBundleComponentRequest'>>,
  Expect<MatchesContract<UpdateBundleComponentRequest, 'UpdateBundleComponentRequest'>>,
  // El resumen del articulo que `CatalogPriceResponse` trae desde la incidencia #379. Se ata
  // aparte porque es un esquema propio del contrato: si el backend le renombra `code` o `name`,
  // la rejilla de precios enseñaria una celda vacia en vez de fallar al compilar.
  Expect<MatchesContract<CatalogItemSummary, 'CatalogItemSummary'>>,

  // Alta de superadministradores por invitacion. Estos cinco tipos se escribieron a mano
  // mientras el backend construia los endpoints, y su propio fichero dejo dicho que debian
  // atarse «en cuanto el contrato los publique». El contrato ya los publica, asi que se atan:
  // hasta esta linea, una deriva del backend en el cuerpo de la invitacion o de la solicitud de
  // acceso no rompia nada aqui y se veia por primera vez en el navegador, al aceptar la
  // invitacion con un campo `undefined`.
  Expect<MatchesContract<AcceptInvitationRequest, 'AcceptInvitationRequest'>>,
  Expect<MatchesContract<AccessRequestResponse, 'AccessRequestResponse'>>,
  Expect<MatchesContract<CreateAccessRequestRequest, 'CreateAccessRequestRequest'>>,
  Expect<MatchesContract<InvitationResponse, 'InvitationResponse'>>,
  Expect<MatchesContract<ResolveAccessRequestRequest, 'ResolveAccessRequestRequest'>>,

  // Cupo (§I4/§I5, W3). Los ejes de límite de la plataforma, las excepciones de techo
  // negociadas con un cliente y el techo efectivo que resuelve el servidor.
  Expect<MatchesContract<LimitDimensionResponse, 'LimitDimensionResponse'>>,
  Expect<MatchesContract<LimitDimensionSubModuleSummary, 'LimitDimensionSubModuleSummary'>>,
  Expect<MatchesContract<CreateLimitDimensionRequest, 'CreateLimitDimensionRequest'>>,
  Expect<MatchesContract<UpdateLimitDimensionRequest, 'UpdateLimitDimensionRequest'>>,
  Expect<MatchesContract<CompanyLimitOverrideResponse, 'CompanyLimitOverrideResponse'>>,
  Expect<MatchesContract<GrantCompanyLimitOverrideRequest, 'GrantCompanyLimitOverrideRequest'>>,
  Expect<MatchesContract<RevokeCompanyLimitOverrideRequest, 'RevokeCompanyLimitOverrideRequest'>>,
  Expect<MatchesContract<CompanyLimitEventResponse, 'CompanyLimitEventResponse'>>,
  Expect<MatchesContract<EffectiveLimitResponse, 'EffectiveLimitResponse'>>,

  // Los cupos de una empresa (§I4/§B8) y su corrección de contador.
  Expect<MatchesContract<AdjustCompanyUsageRequest, 'AdjustCompanyUsageRequest'>>,
  Expect<MatchesContract<CompanyEntitlementSnapshotResponse, 'CompanyEntitlementSnapshotResponse'>>,

  // La ventana de prueba de una empresa y sus concesiones (§I5/§C2).
  Expect<MatchesContract<CompanyTrialGrantResponse, 'CompanyTrialGrantResponse'>>,
  Expect<MatchesContract<CompanyTrialWindowResponse, 'CompanyTrialWindowResponse'>>,
  Expect<MatchesContract<OpenTrialWindowRequest, 'OpenTrialWindowRequest'>>,

  // Las dos escrituras del ciclo de una concesión de prueba. Se atan por lo que
  // se rompe si el backend las mueve, que no es lo mismo en las dos:
  //
  // `GrantTrialRequest` — si `daysGranted` dejara de ser obligatorio, esto seguiría
  // compilando con el campo puesto, pero el día que se renombre el cuerpo saldría sin
  // él y el borde aceptaría una concesión SIN FECHA DE FIN: la que no caza ningún
  // recalculo y sobrevive para siempre, sin contrato y sin cargo. Es el peor fallo
  // silencioso de este slice y la razón de que la atadura no sea opcional.
  //
  // `ConsumeTrialGrantRequest` — un `outcome` renombrado cerraría la concesión con el
  // campo vacío. No fallaría nada: quedaría consumida y muda, que es exactamente el
  // estado que la pantalla existe para vaciar, y como no hay operación que reescriba
  // un desenlace, el dato se perdería sin recuperación.
  Expect<MatchesContract<GrantTrialRequest, 'GrantTrialRequest'>>,
  Expect<MatchesContract<ConsumeTrialGrantRequest, 'ConsumeTrialGrantRequest'>>,

  // La cesión del contrato (§I11, D-62). Lo que se rompe si el backend los mueve:
  //
  // `CompanyBillingProfileResponse` — `validFrom`/`validTo` son el tramo de cada
  // titular. Si uno de los dos se renombrara, todos los tramos llegarían como
  // `undefined` y la serie entera se pintaría como «titular actual»: la pantalla
  // diría que hay cuatro titulares vigentes a la vez, y la pregunta que esta
  // pestaña existe para contestar —a quién se le factura hoy— dejaría de tener
  // respuesta sin que fallara nada.
  //
  // `SucceedCompanyBillingProfileRequest` — `effectiveFrom` es la línea que parte
  // la responsabilidad entre el titular saliente y el entrante. Renombrarlo haría
  // que el cuerpo saliera sin fecha y el borde la eligiera por su cuenta; el
  // resultado es una cesión con efecto en un día que nadie decidió, y no hay
  // operación que deshaga una cesión.
  Expect<MatchesContract<CompanyBillingProfileResponse, 'CompanyBillingProfileResponse'>>,
  Expect<
    MatchesContract<SucceedCompanyBillingProfileRequest, 'SucceedCompanyBillingProfileRequest'>
  >,

  // El perfil fiscal de una empresa y su numeracion (§I7). Los tres campos de
  // WithholdingConfigDto NO comparten unidad — reteFuente y reteIVA van en por ciento y
  // reteICA en por mil — y la pantalla pone la unidad a mano: si el contrato renombrara
  // uno, la tarifa saldria «No declarada» sobre una empresa que si retiene.
  //
  // De currentNumber salen las dos cuentas que avisan a una clinica de que se esta
  // quedando sin numeros, y es el PROXIMO a emitir, no el ultimo. Un renombrado lo deja
  // en undefined, y undefined menos rangeFrom es NaN: la barra desaparece y el aviso de
  // agotamiento no se dispara nunca, sin que nada falle.
  Expect<MatchesContract<CompanyTaxProfileResponse, 'CompanyTaxProfileResponse'>>,
  Expect<MatchesContract<EconomicActivitySummary, 'EconomicActivitySummary'>>,
  Expect<MatchesContract<NumberingResolutionResponse, 'NumberingResolutionResponse'>>,
  Expect<MatchesContract<WithholdingConfigDto, 'WithholdingConfigDto'>>,
  // Techos de fabrica del catalogo comercial y propagacion de una mejora. El techo que trae
  // un articulo es lo que despues se convierte en el cupo de la empresa: si el backend
  // renombrara el valor, el articulo se venderia con el limite en undefined y la empresa
  // quedaria con un cupo que nadie eligio.
  Expect<MatchesContract<CatalogItemLimitResponse, 'CatalogItemLimitResponse'>>,
  Expect<MatchesContract<CreateCatalogItemLimitRequest, 'CreateCatalogItemLimitRequest'>>,
  Expect<MatchesContract<UpdateCatalogItemLimitRequest, 'UpdateCatalogItemLimitRequest'>>,
  Expect<
    MatchesContract<
      PropagateCatalogLimitImprovementRequest,
      'PropagateCatalogLimitImprovementRequest'
    >
  >,
  Expect<MatchesContract<LimitPropagationResponse, 'LimitPropagationResponse'>>,

  // Reordenar los efectos del configurador. El orden decide que efecto gana cuando dos tocan
  // el mismo articulo: un campo renombrado en el cuerpo deja el reordenamiento sin
  // prioridades y el servidor resuelve por el orden que ya tenia, sin que la pantalla se
  // entere de que no guardo nada.
  Expect<MatchesContract<EffectPriorityRequest, 'EffectPriorityRequest'>>,
  Expect<MatchesContract<ReorderConfiguratorEffectsRequest, 'ReorderConfiguratorEffectsRequest'>>,

  // El resto del circuito del dinero. Cuatro escrituras sobre el documento y cuatro pantallas
  // de plataforma, todas atadas porque ninguna falla de forma ruidosa: un campo renombrado
  // aqui no rompe la pantalla, la deja pintando otra cosa.
  //
  // DocumentWithholdingResponse es el que mas dano hace en silencio: si el backend renombrara
  // amount o type, una retencion se registraria sin importe o sin impuesto y el saldo del
  // documento quedaria vivo, es decir, un cliente que retuvo bien y giro el resto entraria en
  // mora por una deuda que fiscalmente no existe.
  //
  // SystemPaymentAttemptResponse.declineKind gobierna si se ofrece reintentar. Si el contrato
  // cambiara sus valores, la pantalla ofreceria reprogramar sobre un rechazo duro, que es
  // exactamente lo que las redes penalizan.
  //
  // PaymentReversalRequestResponse guarda las TRES fechas de la figura legal y sus causales
  // tasadas: renombrar consumerBecameAwareAt dejaria el reloj del consumidor arrancando en la
  // fecha equivocada sin que nada fallara.
  //
  // CustomerCreditEntryResponse.expiresOn es lo unico que avisa de que un lote caduca. Sin
  // atadura, desapareceria en silencio y el cliente perderia el saldo.
  Expect<MatchesContract<ApplyBillingDocumentRequest, 'ApplyBillingDocumentRequest'>>,
  Expect<MatchesContract<DocumentWithholdingResponse, 'DocumentWithholdingResponse'>>,
  Expect<MatchesContract<RegisterDocumentWithholdingRequest, 'RegisterDocumentWithholdingRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<DocumentWithholdingResponse>,
      'PageResponseDocumentWithholdingResponse'
    >
  >,

  Expect<MatchesContract<SystemPaymentAttemptResponse, 'SystemPaymentAttemptResponse'>>,
  Expect<MatchesContract<RecordPaymentAttemptRequest, 'RecordPaymentAttemptRequest'>>,
  Expect<MatchesContract<ReschedulePaymentAttemptRequest, 'ReschedulePaymentAttemptRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<SystemPaymentAttemptResponse>,
      'PageResponseSystemPaymentAttemptResponse'
    >
  >,

  Expect<MatchesContract<SystemPaymentRefundResponse, 'SystemPaymentRefundResponse'>>,
  Expect<MatchesContract<PaymentRefundResponse, 'PaymentRefundResponse'>>,
  Expect<MatchesContract<RegisterPaymentRefundRequest, 'RegisterPaymentRefundRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<SystemPaymentRefundResponse>,
      'PageResponseSystemPaymentRefundResponse'
    >
  >,
  Expect<MatchesContract<PageResponse<PaymentRefundResponse>, 'PageResponsePaymentRefundResponse'>>,

  Expect<MatchesContract<PaymentReversalRequestResponse, 'PaymentReversalRequestResponse'>>,
  Expect<MatchesContract<OpenReversalRequest, 'OpenReversalRequest'>>,
  Expect<MatchesContract<AcknowledgeReversalRequest, 'AcknowledgeReversalRequest'>>,
  Expect<MatchesContract<OpposeReversalRequest, 'OpposeReversalRequest'>>,
  Expect<MatchesContract<ResolveReversalRequest, 'ResolveReversalRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<PaymentReversalRequestResponse>,
      'PageResponsePaymentReversalRequestResponse'
    >
  >,

  Expect<MatchesContract<CustomerCreditBalanceResponse, 'CustomerCreditBalanceResponse'>>,
  Expect<MatchesContract<CustomerCreditEntryResponse, 'CustomerCreditEntryResponse'>>,
  Expect<MatchesContract<GrantCustomerCreditRequest, 'GrantCustomerCreditRequest'>>,
  Expect<MatchesContract<ConsumeCustomerCreditRequest, 'ConsumeCustomerCreditRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<CustomerCreditBalanceResponse>,
      'PageResponseCustomerCreditBalanceResponse'
    >
  >,
  Expect<
    MatchesContract<
      PageResponse<CustomerCreditEntryResponse>,
      'PageResponseCustomerCreditEntryResponse'
    >
  >,

  // Conciliacion: el cuadre con el facturador externo, las liquidaciones de la pasarela y los
  // extractos bancarios. Es la ultima linea entre lo que la plataforma cree haber cobrado y lo
  // que el banco dice que entro, y un campo renombrado aqui no rompe ninguna pantalla: deja el
  // cuadre dando otro numero, que es peor.
  Expect<
    MatchesContract<ExternalInvoiceReconciliationResponse, 'ExternalInvoiceReconciliationResponse'>
  >,
  Expect<
    MatchesContract<
      OpenExternalInvoiceReconciliationRequest,
      'OpenExternalInvoiceReconciliationRequest'
    >
  >,
  Expect<MatchesContract<MatchExternalInvoiceRequest, 'MatchExternalInvoiceRequest'>>,
  Expect<
    MatchesContract<
      ResolveExternalInvoiceReconciliationRequest,
      'ResolveExternalInvoiceReconciliationRequest'
    >
  >,
  Expect<MatchesContract<GatewaySettlementResponse, 'GatewaySettlementResponse'>>,
  Expect<MatchesContract<RegisterGatewaySettlementRequest, 'RegisterGatewaySettlementRequest'>>,
  Expect<MatchesContract<AttachProviderInvoiceRequest, 'AttachProviderInvoiceRequest'>>,
  Expect<MatchesContract<LinkBankReceiptRequest, 'LinkBankReceiptRequest'>>,
  Expect<
    MatchesContract<
      GatewaySettlementReconciliationResponse,
      'GatewaySettlementReconciliationResponse'
    >
  >,
  Expect<MatchesContract<BankReceiptResponse, 'BankReceiptResponse'>>,
  Expect<MatchesContract<RegisterBankReceiptRequest, 'RegisterBankReceiptRequest'>>,
  Expect<
    MatchesContract<
      PageResponse<ExternalInvoiceReconciliationResponse>,
      'PageResponseExternalInvoiceReconciliationResponse'
    >
  >,
  Expect<
    MatchesContract<
      PageResponse<GatewaySettlementResponse>,
      'PageResponseGatewaySettlementResponse'
    >
  >,
  Expect<MatchesContract<PageResponse<BankReceiptResponse>, 'PageResponseBankReceiptResponse'>>,
]
