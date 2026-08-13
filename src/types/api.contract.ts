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
import type { SystemConfiguration } from '../features/config/types/config.types'
import type {
  AnimalColor,
  CreateAnimalColorCommand,
  SpecieSummary,
  UpdateAnimalColorCommand,
} from '../features/animal-colors/types/animal-colors.types'
import type {
  LoginEmployeeCommand,
  LoginSystemUserCommand,
  MeResponse,
  TokenResponse,
} from '../features/auth/types/auth.types'
import type {
  BasePermission,
  CreateBasePermissionCommand,
  UpdateBasePermissionCommand,
} from '../features/base-permissions/types/base-permissions.types'
import type { PublishAdminPermissionsResult } from '../features/base-role-permissions/types/admin-permission-publish.types'
import type {
  BasePermissionSummary,
  BaseRolePermission,
  BaseRoleSummary,
  CreateBaseRolePermissionCommand,
  UpdateBaseRolePermissionCommand,
} from '../features/base-role-permissions/types/base-role-permissions.types'
import type {
  BaseRole,
  CreateBaseRoleCommand,
  UpdateBaseRoleCommand,
} from '../features/base-roles/types/base-roles.types'
import type {
  Breed,
  CreateBreedCommand,
  UpdateBreedCommand,
} from '../features/breeds/types/breeds.types'
import type {
  Company,
  CreateCompanyCommand,
  UpdateCompanyCommand,
} from '../features/companies/types/companies.types'
import type { SetSystemConfigurationCommand } from '../features/config/types/config.types'
import type {
  ConsultationType,
  CreateConsultationTypeCommand,
  UpdateConsultationTypeCommand,
} from '../features/consultation-types/types/consultation-types.types'
import type {
  CreateDiagnosticImagingTypeCommand,
  DiagnosticImagingType,
  UpdateDiagnosticImagingTypeCommand,
} from '../features/diagnostic-imaging-types/types/diagnostic-imaging-types.types'
import type {
  CreateLaboratoryTestTypeCommand,
  LaboratoryTestType,
  UpdateLaboratoryTestTypeCommand,
} from '../features/laboratory-test-types/types/laboratory-test-types.types'
import type {
  CreateMembershipSubModuleCommand,
  MembershipSubModule,
  MembershipSummary,
  UpdateMembershipSubModuleCommand,
} from '../features/membership-sub-modules/types/membership-sub-modules.types'
import type {
  CreateMembershipCommand,
  Membership,
  UpdateMembershipCommand,
} from '../features/memberships/types/memberships.types'
import type {
  AppModule,
  CreateModuleCommand,
  UpdateModuleCommand,
} from '../features/modules/types/modules.types'
import type {
  CreateSpaTypeCommand,
  SpaType,
  UpdateSpaTypeCommand,
} from '../features/spa-types/types/spa-types.types'
import type {
  CreateSpecieCommand,
  Specie,
  UpdateSpecieCommand,
} from '../features/species/types/species.types'
import type {
  CreateSubmoduleCommand,
  Submodule,
  UpdateSubmoduleCommand,
} from '../features/submodules/types/submodules.types'
import type {
  CreateSurgeryTypeCommand,
  SurgeryType,
  UpdateSurgeryTypeCommand,
} from '../features/surgery-types/types/surgery-types.types'
import type {
  CreateVaccinationTypeCommand,
  UpdateVaccinationTypeCommand,
  VaccinationType,
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
 * `true` si el tipo local encaja con el esquema; si no, **los nombres de los campos que fallan**.
 * Es a propósito: el error de compilación los nombra uno a uno en vez de decir «no asignable»,
 * que obligaría a comparar cuarenta campos a ojo.
 */
export type MatchesContract<Local, Name extends keyof Schemas> = [
  | UnknownFields<Local, Name>
  | MismatchedFields<Local, Name>
  | MissingRequiredFields<Local, Name>
  | NullableWhereRequired<Local, Name>,
] extends [never]
  ? true
  : | UnknownFields<Local, Name>
    | MismatchedFields<Local, Name>
    | MissingRequiredFields<Local, Name>
    | NullableWhereRequired<Local, Name>

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Las ataduras: una por cada tipo de este repositorio con un esquema homónimo en el contrato.
 * `api-contract.spec.ts` falla si aparece un tipo nuevo y nadie lo ata aquí, que es lo que evita
 * que esta lista envejezca en silencio.
 */
export type ContractAssertions = [
  Expect<MatchesContract<SystemConfiguration, 'SystemConfigurationDto'>>,
  Expect<MatchesContract<AnimalColor, 'AnimalColorResponse'>>,
  Expect<MatchesContract<AppModule, 'ModuleResponse'>>,
  Expect<MatchesContract<BasePermission, 'BasePermissionResponse'>>,
  Expect<MatchesContract<BasePermissionSummary, 'BasePermissionSummary'>>,
  Expect<MatchesContract<BaseRole, 'BaseRoleResponse'>>,
  Expect<MatchesContract<BaseRolePermission, 'BaseRolePermissionResponse'>>,
  Expect<MatchesContract<BaseRoleSummary, 'BaseRoleSummary'>>,
  Expect<MatchesContract<Breed, 'BreedResponse'>>,
  Expect<MatchesContract<Company, 'CompanyResponse'>>,
  Expect<MatchesContract<ConsultationType, 'ConsultationTypeResponse'>>,
  Expect<MatchesContract<CreateAnimalColorCommand, 'CreateAnimalColorRequest'>>,
  Expect<MatchesContract<CreateBasePermissionCommand, 'CreateBasePermissionRequest'>>,
  Expect<MatchesContract<CreateBaseRoleCommand, 'CreateBaseRoleRequest'>>,
  Expect<MatchesContract<CreateBaseRolePermissionCommand, 'CreateBaseRolePermissionRequest'>>,
  Expect<MatchesContract<CreateBreedCommand, 'CreateBreedRequest'>>,
  Expect<MatchesContract<CreateCompanyCommand, 'CreateCompanyRequest'>>,
  Expect<MatchesContract<CreateConsultationTypeCommand, 'CreateConsultationTypeRequest'>>,
  Expect<MatchesContract<CreateDiagnosticImagingTypeCommand, 'CreateDiagnosticImagingTypeRequest'>>,
  Expect<MatchesContract<CreateLaboratoryTestTypeCommand, 'CreateLaboratoryTestTypeRequest'>>,
  Expect<MatchesContract<CreateMembershipCommand, 'CreateMembershipRequest'>>,
  Expect<MatchesContract<CreateMembershipSubModuleCommand, 'CreateMembershipSubModuleRequest'>>,
  Expect<MatchesContract<CreateModuleCommand, 'CreateModuleRequest'>>,
  Expect<MatchesContract<CreateSpaTypeCommand, 'CreateSpaTypeRequest'>>,
  Expect<MatchesContract<CreateSpecieCommand, 'CreateSpecieRequest'>>,
  Expect<MatchesContract<CreateSubmoduleCommand, 'CreateSubModuleRequest'>>,
  Expect<MatchesContract<CreateSurgeryTypeCommand, 'CreateSurgeryTypeRequest'>>,
  Expect<MatchesContract<CreateVaccinationTypeCommand, 'CreateVaccinationTypeRequest'>>,
  Expect<MatchesContract<DiagnosticImagingType, 'DiagnosticImagingTypeResponse'>>,
  Expect<MatchesContract<LaboratoryTestType, 'LaboratoryTestTypeResponse'>>,
  Expect<MatchesContract<LoginEmployeeCommand, 'LoginEmployeeRequest'>>,
  Expect<MatchesContract<LoginSystemUserCommand, 'LoginSystemUserRequest'>>,
  Expect<MatchesContract<MeResponse, 'MeResponse'>>,
  Expect<MatchesContract<Membership, 'MembershipResponse'>>,
  Expect<MatchesContract<MembershipSubModule, 'MembershipSubModuleResponse'>>,
  Expect<MatchesContract<MembershipSummary, 'MembershipSummary'>>,
  Expect<MatchesContract<PublishAdminPermissionsResult, 'PublishAdminPermissionsResponse'>>,
  Expect<MatchesContract<SetSystemConfigurationCommand, 'SetSystemConfigurationRequest'>>,
  Expect<MatchesContract<SpaType, 'SpaTypeResponse'>>,
  Expect<MatchesContract<Specie, 'SpecieResponse'>>,
  Expect<MatchesContract<SpecieSummary, 'SpecieSummary'>>,
  Expect<MatchesContract<Submodule, 'SubModuleResponse'>>,
  Expect<MatchesContract<SurgeryType, 'SurgeryTypeResponse'>>,
  Expect<MatchesContract<TokenResponse, 'TokenResponse'>>,
  Expect<MatchesContract<UpdateAnimalColorCommand, 'UpdateAnimalColorRequest'>>,
  Expect<MatchesContract<UpdateBasePermissionCommand, 'UpdateBasePermissionRequest'>>,
  Expect<MatchesContract<UpdateBaseRoleCommand, 'UpdateBaseRoleRequest'>>,
  Expect<MatchesContract<UpdateBaseRolePermissionCommand, 'UpdateBaseRolePermissionRequest'>>,
  Expect<MatchesContract<UpdateBreedCommand, 'UpdateBreedRequest'>>,
  Expect<MatchesContract<UpdateCompanyCommand, 'UpdateCompanyRequest'>>,
  Expect<MatchesContract<UpdateConsultationTypeCommand, 'UpdateConsultationTypeRequest'>>,
  Expect<MatchesContract<UpdateDiagnosticImagingTypeCommand, 'UpdateDiagnosticImagingTypeRequest'>>,
  Expect<MatchesContract<UpdateLaboratoryTestTypeCommand, 'UpdateLaboratoryTestTypeRequest'>>,
  Expect<MatchesContract<UpdateMembershipCommand, 'UpdateMembershipRequest'>>,
  Expect<MatchesContract<UpdateMembershipSubModuleCommand, 'UpdateMembershipSubModuleRequest'>>,
  Expect<MatchesContract<UpdateModuleCommand, 'UpdateModuleRequest'>>,
  Expect<MatchesContract<UpdateSpaTypeCommand, 'UpdateSpaTypeRequest'>>,
  Expect<MatchesContract<UpdateSpecieCommand, 'UpdateSpecieRequest'>>,
  Expect<MatchesContract<UpdateSubmoduleCommand, 'UpdateSubModuleRequest'>>,
  Expect<MatchesContract<UpdateSurgeryTypeCommand, 'UpdateSurgeryTypeRequest'>>,
  Expect<MatchesContract<UpdateVaccinationTypeCommand, 'UpdateVaccinationTypeRequest'>>,
  Expect<MatchesContract<VaccinationType, 'VaccinationTypeResponse'>>,
]
