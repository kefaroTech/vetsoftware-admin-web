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
 * <p><b>Qué comprueba.</b> Dos cosas, y solo dos, porque son las que el contrato sabe expresar:
 *
 * <ol>
 *   <li><b>Campos que no existen.</b> Si este repositorio declara un campo que el contrato no
 *       tiene, es un campo inventado, renombrado en el backend o eliminado — y en runtime vale
 *       `undefined`. Es el fallo que describe TR-01.</li>
 *   <li><b>Tipos primitivos incompatibles</b>, incluidos los enums: un campo que el backend
 *       declara como una unión cerrada y aquí se escribió como `string` acepta valores que el
 *       servidor rechazará.</li>
 * </ol>
 *
 * <p><b>Qué NO comprueba, a propósito.</b> La nulabilidad, porque el contrato no la expresa; y la
 * forma de los campos anidados, porque cada tipo anidado tiene su propia atadura en la lista de
 * abajo y se comprueba ahí. Comparar aquí la nulabilidad de lo anidado solo produciría falsos
 * positivos: el generador emite `campo?: string` donde este repositorio escribe `string | null`,
 * y esa diferencia no dice nada sobre el backend.
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
  CompanyMembershipSummary,
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../features/companies/types/companies.types'
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
  CreateMembershipSubModuleRequest,
  MembershipSubModuleResponse,
  MembershipSummary,
  UpdateMembershipSubModuleRequest,
} from '../features/membership-sub-modules/types/membership-sub-modules.types'
import type {
  CreateMembershipRequest,
  MembershipResponse,
  UpdateMembershipRequest,
} from '../features/memberships/types/memberships.types'
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
 * un campo entero les resultaba invisible. `CreateMembershipRequest` declaraba `name` y
 * `status`, el contrato traía además `mandatory`, y
 * `MatchesContract<CreateMembershipRequest, 'CreateMembershipRequest'>` pasaba en verde mientras
 * cada membresía creada o editada desde la consola se guardaba con `mandatory = false` sin que
 * nadie lo eligiera ni lo viera.
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
  // --- Peticiones: lo que este repositorio NUNCA envía -------------------------------
  // Son las peligrosas. Un campo que no se declara no se envía, y el servidor no recibe
  // «sin cambios» sino el valor por defecto de Java. Bajar una de estas líneas arregla un
  // defecto de verdad; bajar una de las de abajo solo enseña un dato más.
  CreateCompanyRequest: 'cityId' | 'membershipId'
  UpdateCompanyRequest: 'cityId' | 'membershipId'

  // --- Respuestas: lo que este repositorio no lee -------------------------------------
  AnimalColorResponse: 'enabled'
  BasePermissionResponse: 'enabled'
  BaseRolePermissionResponse: 'enabled'
  BaseRoleResponse: 'enabled'
  BreedResponse: 'enabled'
  CompanyMembershipSummary: 'status'
  ConsultationTypeResponse: 'enabled'
  DiagnosticImagingTypeResponse: 'enabled'
  LaboratoryTestTypeResponse: 'enabled'
  MembershipResponse: 'enabled'
  MembershipSubModuleResponse: 'enabled'
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
  Expect<MatchesContract<CompanyMembershipSummary, 'CompanyMembershipSummary'>>,
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
  Expect<MatchesContract<CreateMembershipRequest, 'CreateMembershipRequest'>>,
  Expect<MatchesContract<CreateMembershipSubModuleRequest, 'CreateMembershipSubModuleRequest'>>,
  Expect<MatchesContract<CreateModuleRequest, 'CreateModuleRequest'>>,
  Expect<MatchesContract<CreateSpaTypeRequest, 'CreateSpaTypeRequest'>>,
  Expect<MatchesContract<CreateSpecieRequest, 'CreateSpecieRequest'>>,
  Expect<MatchesContract<CreateSubModuleRequest, 'CreateSubModuleRequest'>>,
  Expect<MatchesContract<CreateSurgeryTypeRequest, 'CreateSurgeryTypeRequest'>>,
  Expect<MatchesContract<CreateVaccinationTypeRequest, 'CreateVaccinationTypeRequest'>>,
  Expect<MatchesContract<DiagnosticImagingTypeResponse, 'DiagnosticImagingTypeResponse'>>,
  Expect<MatchesContract<LaboratoryTestTypeResponse, 'LaboratoryTestTypeResponse'>>,
  Expect<MatchesContract<LoginEmployeeRequest, 'LoginEmployeeRequest'>>,
  Expect<MatchesContract<LoginSystemUserRequest, 'LoginSystemUserRequest'>>,
  Expect<MatchesContract<MeResponse, 'MeResponse'>>,
  Expect<MatchesContract<MembershipResponse, 'MembershipResponse'>>,
  Expect<MatchesContract<MembershipSubModuleResponse, 'MembershipSubModuleResponse'>>,
  Expect<MatchesContract<MembershipSummary, 'MembershipSummary'>>,
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
  Expect<MatchesContract<UpdateMembershipRequest, 'UpdateMembershipRequest'>>,
  Expect<MatchesContract<UpdateMembershipSubModuleRequest, 'UpdateMembershipSubModuleRequest'>>,
  Expect<MatchesContract<UpdateModuleRequest, 'UpdateModuleRequest'>>,
  Expect<MatchesContract<UpdateSpaTypeRequest, 'UpdateSpaTypeRequest'>>,
  Expect<MatchesContract<UpdateSpecieRequest, 'UpdateSpecieRequest'>>,
  Expect<MatchesContract<UpdateSubModuleRequest, 'UpdateSubModuleRequest'>>,
  Expect<MatchesContract<UpdateSurgeryTypeRequest, 'UpdateSurgeryTypeRequest'>>,
  Expect<MatchesContract<UpdateVaccinationTypeRequest, 'UpdateVaccinationTypeRequest'>>,
  Expect<MatchesContract<VaccinationTypeResponse, 'VaccinationTypeResponse'>>,
]
