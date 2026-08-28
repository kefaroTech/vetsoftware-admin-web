import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CompanyTaxProfileResponse,
  NumberingResolutionResponse,
  WithholdingConfigDto,
} from '../types/company-fiscal.types'

/**
 * Lo que la pestaña <b>Fiscal</b> del expediente de empresa (§I7) carga por su
 * cuenta: el perfil fiscal vigente, las resoluciones de numeración y las tarifas
 * de retención esperadas.
 *
 * <p>Store de Pinia por la regla obligatoria del proyecto —nada de un `ref()` a
 * nivel de módulo dentro del composable— y separado del store del armazón por la
 * misma razón que `company-summary.store.ts`: la identidad de la empresa la
 * necesitan las diez sub-vistas y se carga una vez arriba; esto lo necesita
 * <b>solo esta pestaña</b> y se recarga cada vez que se abre.
 *
 * <p><b>Cada carga lleva su propio error, y no hay uno compartido.</b> Las tres
 * peticiones van a controladores distintos y fallan por motivos distintos. Si
 * `/withholding-configs` devuelve un 500, el perfil fiscal y las resoluciones
 * siguen sirviendo y el hueco se dice donde está: un error único convertiría el
 * fallo de la tarjeta menos importante en una pantalla en blanco, con el cliente
 * al teléfono.
 *
 * <p><b>`profileLoaded` y `withholdingLoaded` existen porque `null` significa dos
 * cosas.</b> «Todavía no ha respondido» y «respondió que no hay» son estados
 * distintos y la pantalla los dice distinto: uno es un esqueleto, el otro es la
 * frase «esta empresa todavía no tiene perfil fiscal». Sin la bandera, la segunda
 * se pinta durante el medio segundo de la primera y el operador lee una mentira.
 * Las resoluciones no la necesitan: una lista vacía ya se distingue de `null`.
 */
export const useCompanyFiscalStore = defineStore('companyFiscal', () => {
  const profile = ref<CompanyTaxProfileResponse | null>(null)
  /** `true` cuando el servidor ya se pronunció sobre si hay perfil o no. */
  const profileLoaded = ref(false)
  const loadingProfile = ref(false)
  const profileError = ref<string | null>(null)

  const resolutions = ref<NumberingResolutionResponse[]>([])
  const loadingResolutions = ref(false)
  const resolutionsError = ref<string | null>(null)

  const withholding = ref<WithholdingConfigDto | null>(null)
  const withholdingLoaded = ref(false)
  const loadingWithholding = ref(false)
  const withholdingError = ref<string | null>(null)

  function setProfile(value: CompanyTaxProfileResponse | null) {
    profile.value = value
    profileLoaded.value = true
  }

  function setLoadingProfile(value: boolean) {
    loadingProfile.value = value
  }

  function setProfileError(message: string | null) {
    profileError.value = message
  }

  function setResolutions(value: NumberingResolutionResponse[]) {
    resolutions.value = value
  }

  function setLoadingResolutions(value: boolean) {
    loadingResolutions.value = value
  }

  function setResolutionsError(message: string | null) {
    resolutionsError.value = message
  }

  function setWithholding(value: WithholdingConfigDto | null) {
    withholding.value = value
    withholdingLoaded.value = true
  }

  function setLoadingWithholding(value: boolean) {
    loadingWithholding.value = value
  }

  function setWithholdingError(message: string | null) {
    withholdingError.value = message
  }

  /**
   * Recarga siempre al abrir: lo de la empresa anterior no se queda pintado
   * mientras carga la siguiente. Es la regla dura del proyecto y aquí importa más
   * que en otras pantallas — un NIT ajeno pintado medio segundo es el dato que
   * alguien copia en un correo.
   */
  function reset() {
    profile.value = null
    profileLoaded.value = false
    loadingProfile.value = false
    profileError.value = null

    resolutions.value = []
    loadingResolutions.value = false
    resolutionsError.value = null

    withholding.value = null
    withholdingLoaded.value = false
    loadingWithholding.value = false
    withholdingError.value = null
  }

  return {
    profile,
    profileLoaded,
    loadingProfile,
    profileError,
    resolutions,
    loadingResolutions,
    resolutionsError,
    withholding,
    withholdingLoaded,
    loadingWithholding,
    withholdingError,
    setProfile,
    setLoadingProfile,
    setProfileError,
    setResolutions,
    setLoadingResolutions,
    setResolutionsError,
    setWithholding,
    setLoadingWithholding,
    setWithholdingError,
    reset,
  }
})
