import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CatalogItemSubModulesPanel from '@/features/commercial-catalog/components/CatalogItemSubModulesPanel.vue'
import type { CatalogItemSubModuleResponse } from '@/features/platform-setup/types/platform-setup.types'
import type { SubModuleResponse } from '@/features/submodules/types/submodules.types'

/**
 * La fila de «Qué pantallas abre» tiene un solo hueco posible, y conviene que
 * quede sujeto porque las tres primeras celdas se parecen y su origen no es el
 * mismo.
 *
 * `subModule` viene en la propia respuesta del puente y el contrato lo declara
 * `required` (`CatalogItemSubModuleResponse` en `api/openapi.json`), respaldado
 * por la invariante del dominio: `CatalogItemSubModule` rechaza construirse sin
 * él. Pantalla y código, por tanto, siempre están.
 *
 * El módulo NO viene ahí: se resuelve contra el catálogo de submódulos
 * vendibles, que es otra petición y puede no conocer ese id —catálogo aún sin
 * cargar, o un submódulo que dejó de ser vendible sin que se quitara el
 * vínculo—. Ese es el único `—` legítimo de la fila, y tiene que seguir siendo
 * un hueco y no un fallo: la tabla enseña qué se está cobrando, y una fila que
 * no se pinta se lee como un artículo que no concede nada.
 */

// Las fábricas de `vi.mock` se izan por encima de los `import`, así que aquí no
// puede haber `ref()`: solo se resuelve el nombre `bridges`/`sellable` cuando el
// componente llama al composable, que ya es después de cargarse Vue.
vi.mock('@/features/commercial-catalog/composables/useCatalogItemBridges', () => ({
  useCatalogItemBridges: () => bridges,
}))
vi.mock('@/features/commercial-catalog/composables/useSellableSubModules', () => ({
  useSellableSubModules: () => sellable,
}))

const bridges = {
  subModuleLinks: ref<CatalogItemSubModuleResponse[]>([]),
  subModulesLoading: ref(false),
  subModulesError: ref<string | null>(null),
  subModulesErrorTraceId: ref<string | null>(null),
  loadSubModuleLinks: vi.fn(),
  linkSubModule: vi.fn(),
  unlinkSubModule: vi.fn(),
}

const sellable = {
  options: ref<{ value: number; label: string }[]>([]),
  loading: ref(false),
  error: ref<string | null>(null),
  findById: vi.fn<(id: number) => SubModuleResponse | null>(),
  refresh: vi.fn(),
}

function link(id: number, subModuleId: number, name: string, code: string) {
  return {
    id,
    catalogItemId: 7,
    subModule: { id: subModuleId, name, code },
    createdDate: '2026-01-01T00:00:00',
    enabled: true,
    outcome: null,
  } satisfies CatalogItemSubModuleResponse
}

function catalogo(id: number, moduleName: string): SubModuleResponse {
  return {
    id,
    name: 'Historia clínica',
    code: 'HISTORIA',
    module: { id: 1, name: moduleName, code: 'CLINICA' },
    sellable: true,
    readOnlyCapable: true,
    createdDate: '2026-01-01T00:00:00',
  }
}

async function montar() {
  const wrapper = mount(CatalogItemSubModulesPanel, {
    props: { itemId: 7, itemName: 'Plan Clínica' },
  })
  await Promise.resolve()
  return wrapper
}

/** Las tres primeras celdas de la única fila: módulo, pantalla y código. */
function celdas(html: string): string[] {
  const interior = /<tr[^>]*class="[^"]*ds-row-hover[^"]*"[^>]*>([\s\S]*?)<\/tr>/.exec(html)?.[1]
  if (interior === undefined) throw new Error('la tabla no pintó ninguna fila de vínculo')
  return [...interior.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .slice(0, 3)
    .map((celda) => (celda[1] ?? '').replace(/<[^>]*>/g, '').trim())
}

describe('la fila de una pantalla vinculada', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    bridges.subModuleLinks.value = [link(11, 3, 'Historia clínica', 'HISTORIA')]
  })

  it('pinta módulo, pantalla y código cuando el catálogo conoce el submódulo', async () => {
    sellable.findById.mockReturnValue(catalogo(3, 'Clínica'))

    expect(celdas((await montar()).html())).toEqual(['Clínica', 'Historia clínica', 'HISTORIA'])
  })

  it('deja el módulo en «—» si el catálogo no trae ese submódulo, sin perder la fila', async () => {
    sellable.findById.mockReturnValue(null)

    const [modulo, pantalla, codigo] = celdas((await montar()).html())
    expect(modulo).toBe('—')
    expect(pantalla).toBe('Historia clínica')
    expect(codigo).toBe('HISTORIA')
  })
})
