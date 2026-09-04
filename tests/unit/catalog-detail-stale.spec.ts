import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Guarda del defecto que escribía en el registro equivocado.
 *
 * `selected` vive en el store que fabrica `createCatalogStore` y lo comparten la
 * ficha y el listado. Cuando `fetchById` fallaba, el `catch` solo sacaba un aviso
 * efímero: el store conservaba el registro ANTERIOR, la ficha lo pintaba con
 * `v-if="selected"` sin rama alternativa, y «Guardar» mandaba esos valores al
 * identificador de la ruta —es decir, a otro registro—.
 *
 * Por eso hay dos mitades aquí y las dos hacen falta: una prueba de
 * comportamiento sobre el caso testigo, que es la que no puede pasar con el
 * defecto puesto, y una rejilla sobre las nueve fichas, que es la que impide que
 * vuelva por la puerta de atrás en cualquiera de las otras ocho.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

vi.mock('@/features/consultation-types/api/consultation-types.api', () => ({
  consultationTypesApi: { findById: vi.fn() },
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), info: vi.fn(), warn: vi.fn(), errorFrom: vi.fn() }),
}))

const { consultationTypesApi } =
  await import('@/features/consultation-types/api/consultation-types.api')
const { useConsultationTypes } =
  await import('@/features/consultation-types/composables/useConsultationTypes')

const TIPO = { id: 1, name: 'Control', description: 'Revisión', createdDate: '2026-01-01' }

describe('la ficha de catálogo no se queda con el registro anterior', () => {
  beforeEach(() => {
    vi.mocked(consultationTypesApi.findById).mockReset()
  })

  it('un fallo al releer deja `selected` en null y no en el registro anterior', async () => {
    const catalogo = useConsultationTypes()

    vi.mocked(consultationTypesApi.findById).mockResolvedValueOnce(TIPO as never)
    await catalogo.fetchById(1)
    expect(catalogo.selected.value).toEqual(TIPO)

    vi.mocked(consultationTypesApi.findById).mockRejectedValueOnce(new Error('404'))
    await catalogo.fetchById(2)

    expect(catalogo.selected.value).toBeNull()
  })

  it('el fallo deja mensaje en el store, que es lo que la ficha pinta', () => {
    // Sin esto la pantalla quedaría en blanco: `selected` nulo y nada que decir.
    const catalogo = useConsultationTypes()

    vi.mocked(consultationTypesApi.findById).mockRejectedValueOnce(new Error('500'))
    return catalogo.fetchById(3).then(() => {
      expect(catalogo.error.value).toBeTruthy()
    })
  })

  it('el error anterior no sobrevive a una carga que sí funciona', async () => {
    const catalogo = useConsultationTypes()

    vi.mocked(consultationTypesApi.findById).mockRejectedValueOnce(new Error('500'))
    await catalogo.fetchById(4)
    expect(catalogo.error.value).toBeTruthy()

    vi.mocked(consultationTypesApi.findById).mockResolvedValueOnce(TIPO as never)
    await catalogo.fetchById(1)

    expect(catalogo.error.value).toBeNull()
    expect(catalogo.selected.value).toEqual(TIPO)
  })
})

/** Las nueve fichas `/:id` que comparten el patrón, y su composable. */
const FICHAS: readonly (readonly [string, string])[] = [
  [
    'consultation-types/composables/useConsultationTypes.ts',
    'consultation-types/views/ConsultationTypeDetailView.vue',
  ],
  [
    'vaccination-types/composables/useVaccinationTypes.ts',
    'vaccination-types/views/VaccinationTypeDetailView.vue',
  ],
  ['surgery-types/composables/useSurgeryTypes.ts', 'surgery-types/views/SurgeryTypeDetailView.vue'],
  [
    'laboratory-test-types/composables/useLaboratoryTestTypes.ts',
    'laboratory-test-types/views/LaboratoryTestTypeDetailView.vue',
  ],
  [
    'diagnostic-imaging-types/composables/useDiagnosticImagingTypes.ts',
    'diagnostic-imaging-types/views/DiagnosticImagingTypeDetailView.vue',
  ],
  ['spa-types/composables/useSpaTypes.ts', 'spa-types/views/SpaTypeDetailView.vue'],
  ['species/composables/useSpecies.ts', 'species/views/SpecieDetailView.vue'],
  ['breeds/composables/useBreeds.ts', 'breeds/views/BreedDetailView.vue'],
  ['animal-colors/composables/useAnimalColors.ts', 'animal-colors/views/AnimalColorDetailView.vue'],
]

function leer(relativo: string): string {
  return readFileSync(path.join(ROOT, 'src/features', relativo), 'utf8')
}

/** El cuerpo del `catch` de `fetchById`, que es donde estaba el agujero. */
function catchDeFetchById(fuente: string, donde: string): string {
  const inicio = fuente.indexOf('async function fetchById')
  if (inicio === -1) throw new Error(`${donde} no declara fetchById`)
  const trozo = fuente.slice(inicio)
  const match = /catch \(e\) \{([\s\S]*?)\n {4}\} finally/.exec(trozo)
  if (match === null) throw new Error(`${donde}: fetchById sin catch reconocible`)
  const cuerpo = match[1]
  if (cuerpo === undefined) throw new Error(`${donde}: catch sin cuerpo capturado`)
  return cuerpo
}

describe.each(FICHAS)('%s', (composable, vista) => {
  it('limpia el seleccionado cuando la relectura falla', () => {
    const cuerpo = catchDeFetchById(leer(composable), composable)
    expect(cuerpo, 'el catch conserva el registro anterior en `selected`').toMatch(
      /store\.setSelected\(null\)/,
    )
  })

  it('deja el fallo en el store y no solo en un aviso que se va', () => {
    const cuerpo = catchDeFetchById(leer(composable), composable)
    expect(cuerpo).toMatch(/store\.setError\(/)
  })

  it('la vista tiene rama de error y rama de ausencia, no solo `v-if="selected"`', () => {
    const fuente = leer(vista)
    expect(fuente, 'sin rama de error la pantalla no dice que la carga falló').toMatch(
      /v-if="error"/,
    )
    expect(fuente, 'la ficha debe colgar del error, no ser la primera rama').toMatch(
      /v-else-if="selected"/,
    )
    expect(fuente, 'sin rama de ausencia la pantalla se queda en blanco').toMatch(
      /v-else-if="!loading"/,
    )
  })
})
