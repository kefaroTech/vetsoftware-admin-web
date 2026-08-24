import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, type AxiosResponse } from 'axios'
import {
  readCyclePath,
  useCatalogItemBridges,
  wasReactivated,
} from '@/features/commercial-catalog/composables/useCatalogItemBridges'
import { useSellableSubModules } from '@/features/commercial-catalog/composables/useSellableSubModules'

/**
 * Los tres puentes del catálogo (§4.1 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W3-A).
 *
 * Lo que se afirma aquí son las tres propiedades de las que depende que estas
 * pantallas no engañen a quien siembra el catálogo:
 *
 * 1. **El selector no ofrece lo que no se vende.** El campo del contrato es
 *    `sellable`, no `isSellable`; con el nombre equivocado el filtro no falla,
 *    devuelve `undefined` y deja pasar los 29 submódulos —incluida
 *    «Configuración del sistema»— como si fueran artículos vendibles.
 * 2. **Un vínculo reactivado no se anuncia como nuevo.** Las tres tablas puente
 *    llevan borrado lógico con clave única, así que el alta de un par dado de
 *    baja revive la fila en vez de insertar otra (issue #432 del backend).
 *    Decir «creado» sobre algo que ya existía esconde que el operador acaba de
 *    resucitar una configuración vieja.
 * 3. **El ciclo se pinta con su ruta.** El servidor manda el bucle como dato
 *    estructurado; si el front lo pierde, el aviso se queda en «dependencia
 *    inválida» y hay que buscar el arco a mano entre decenas de reglas.
 */

// `vi.hoisted` y no `const` a secas: `vi.mock` se iza al principio del fichero y
// su factoría se evalúa antes que cualquier declaración normal, así que un
// `const` de aquí arriba llegaría sin inicializar.
const {
  catalogItemsApi,
  catalogItemSubModulesApi,
  catalogItemDependenciesApi,
  bundleComponentsApi,
  submodulesApi,
  toast,
} = vi.hoisted(() => ({
  catalogItemsApi: { findById: vi.fn(), listAll: vi.fn() },
  catalogItemSubModulesApi: { listByCatalogItem: vi.fn(), create: vi.fn(), remove: vi.fn() },
  catalogItemDependenciesApi: {
    listByCatalogItem: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  bundleComponentsApi: {
    listByBundle: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  submodulesApi: { listAll: vi.fn() },
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom: vi.fn(),
  },
}))

vi.mock('@/features/commercial-catalog/api/commercial-catalog.api', () => ({
  catalogItemsApi,
  catalogItemSubModulesApi,
  catalogItemDependenciesApi,
  bundleComponentsApi,
}))

vi.mock('@/features/submodules/api/submodules.api', () => ({ submodulesApi }))

vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

// `useCommercialCatalog` monta tres paginadores servidos y no aporta nada a lo
// que aquí se comprueba: se sustituye por lo único que el puente le pide, la
// lista de artículos con la que pone nombre a los ids del bucle.
vi.mock('@/features/commercial-catalog/composables/useCommercialCatalog', () => ({
  useCommercialCatalog: () => ({
    catalogOptions: ref([
      { id: 7, code: 'CORE', name: 'Núcleo' },
      { id: 9, code: 'HC', name: 'Historia clínica' },
    ]),
    catalogOptionsLoading: ref(false),
    catalogOptionsError: ref(null),
    loadCatalogOptions: vi.fn().mockResolvedValue(undefined),
  }),
}))

/** Un `ProblemDetail` del backend, con las propiedades extra que adjunta. */
function problem(code: string, extra: Record<string, unknown> = {}) {
  const response = {
    data: { code, title: 'Conflict', status: 409, detail: 'conflict', ...extra },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
  return new AxiosError('conflict', 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

const REACTIVATED = 'Ya existía dado de baja: se ha vuelto a activar.'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([])
  catalogItemDependenciesApi.listByCatalogItem.mockResolvedValue([])
  bundleComponentsApi.listByBundle.mockResolvedValue([])
})

describe('el selector solo ofrece submódulos vendibles', () => {
  it('descarta la infraestructura interna, que ninguna clínica compra', async () => {
    submodulesApi.listAll.mockResolvedValue([
      {
        id: 1,
        name: 'Sucursales',
        code: 'BRANCH',
        module: { id: 1, name: 'General', code: 'GENERAL' },
        sellable: false,
        readOnlyCapable: true,
        createdDate: '2026-08-24T14:46:55',
      },
      {
        id: 2,
        name: 'Inventario',
        code: 'INVENTORY',
        module: { id: 1, name: 'General', code: 'GENERAL' },
        sellable: true,
        readOnlyCapable: true,
        createdDate: '2026-08-24T14:46:57',
      },
    ])

    const catalog = useSellableSubModules()
    await catalog.load()

    expect(catalog.options.value).toEqual([{ value: 2, label: 'General · Inventario' }])
  })

  it('conserva `readOnlyCapable` para poder avisar de qué pasa al dar de baja', async () => {
    submodulesApi.listAll.mockResolvedValue([
      {
        id: 3,
        name: 'Caja',
        code: 'CASH',
        module: { id: 2, name: 'Operación', code: 'OPS' },
        sellable: true,
        readOnlyCapable: false,
        createdDate: '2026-08-24T14:46:58',
      },
    ])

    const catalog = useSellableSubModules()
    await catalog.load()

    expect(catalog.findById(3)?.readOnlyCapable).toBe(false)
  })
})

describe('wasReactivated', () => {
  const before = [
    { id: 5, createdDate: '2026-08-01T10:00:00' },
    { id: 8, createdDate: '2026-08-10T10:00:00' },
  ]

  it('un id por debajo del mayor ya listado solo puede ser una fila que ya existía', () => {
    expect(wasReactivated({ id: 3, createdDate: '2026-08-24T10:00:00' }, before)).toBe(true)
  })

  it('una fecha anterior a la más reciente ya listada, también', () => {
    expect(wasReactivated({ id: 99, createdDate: '2026-07-01T10:00:00' }, before)).toBe(true)
  })

  it('un alta genuina —id mayor y fecha posterior— no se anuncia como reactivación', () => {
    expect(wasReactivated({ id: 12, createdDate: '2026-08-24T10:00:00' }, before)).toBe(false)
  })

  it('sin lista previa no se afirma nada: falla hacia «nuevo», que nunca miente de más', () => {
    expect(wasReactivated({ id: 1, createdDate: '2020-01-01T00:00:00' }, [])).toBe(false)
  })

  it('dos altas del mismo segundo no se confunden con una reactivación', () => {
    // El contrato sirve `createdDate` con segundos enteros: la comparación tiene
    // que ser estricta o un empate se leería como una fila vieja.
    expect(
      wasReactivated({ id: 9, createdDate: '2026-08-10T10:00:00' }, [
        { id: 8, createdDate: '2026-08-10T10:00:00' },
      ]),
    ).toBe(false)
  })
})

describe('el alta de un puente distingue crear de resucitar', () => {
  it('avisa de que el vínculo ya existía cuando el servidor devuelve la fila vieja', async () => {
    catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([
      {
        id: 8,
        catalogItemId: 7,
        subModule: { id: 2, code: 'INV', name: 'Inventario' },
        createdDate: '2026-08-10T10:00:00',
        enabled: true,
      },
    ])
    catalogItemSubModulesApi.create.mockResolvedValue({
      id: 3,
      catalogItemId: 7,
      subModule: { id: 4, code: 'HOSP', name: 'Hospitalización' },
      createdDate: '2026-07-01T09:00:00',
      enabled: true,
    })

    const bridges = useCatalogItemBridges()
    await bridges.loadSubModuleLinks(7)
    await bridges.linkSubModule(7, 4)

    expect(toast.info).toHaveBeenCalledWith(REACTIVATED)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('recuerda lo que acaba de quitar: quitar y volver a poner es reactivar, no crear', async () => {
    // El camino real —quitar una pantalla, ver que hacía falta y volver a
    // ponerla— no lo detectan las comparaciones de `wasReactivated`: la fila
    // revivida puede ser la más nueva de la lista. Lo que sí es exacto es que su
    // `id` es uno que esta pantalla acaba de dar de baja.
    catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([])
    catalogItemSubModulesApi.remove.mockResolvedValue(undefined)
    catalogItemSubModulesApi.create.mockResolvedValue({
      id: 42,
      catalogItemId: 7,
      subModule: { id: 4, code: 'HOSP', name: 'Hospitalización' },
      createdDate: '2026-08-24T09:00:00',
      enabled: true,
    })

    const bridges = useCatalogItemBridges()
    await bridges.unlinkSubModule(7, 42)
    vi.clearAllMocks()
    catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([])
    catalogItemSubModulesApi.create.mockResolvedValue({
      id: 42,
      catalogItemId: 7,
      subModule: { id: 4, code: 'HOSP', name: 'Hospitalización' },
      createdDate: '2026-08-24T09:00:00',
      enabled: true,
    })
    await bridges.linkSubModule(7, 4)

    expect(toast.info).toHaveBeenCalledWith(REACTIVATED)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('anuncia un alta normal como alta', async () => {
    catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([
      {
        id: 8,
        catalogItemId: 7,
        subModule: { id: 2, code: 'INV', name: 'Inventario' },
        createdDate: '2026-08-10T10:00:00',
        enabled: true,
      },
    ])
    catalogItemSubModulesApi.create.mockResolvedValue({
      id: 12,
      catalogItemId: 7,
      subModule: { id: 4, code: 'HOSP', name: 'Hospitalización' },
      createdDate: '2026-08-24T09:00:00',
      enabled: true,
    })

    const bridges = useCatalogItemBridges()
    await bridges.loadSubModuleLinks(7)
    await bridges.linkSubModule(7, 4)

    expect(toast.success).toHaveBeenCalledWith('Pantalla vinculada al artículo')
    expect(toast.info).not.toHaveBeenCalled()
  })
})

describe('readCyclePath', () => {
  it('lee la ruta que el backend adjunta al ProblemDetail', () => {
    expect(readCyclePath(problem('CATALOG_ITEM_DEPENDENCY_CYCLE', { cycle: [7, 9, 7] }))).toEqual([
      7, 9, 7,
    ])
  })

  it('devuelve null cuando el servidor no la mandó, en vez de inventarse una', () => {
    expect(readCyclePath(problem('CATALOG_ITEM_DEPENDENCY_CYCLE'))).toBeNull()
    expect(readCyclePath(problem('CATALOG_ITEM_DEPENDENCY_CYCLE', { cycle: 'ciclo' }))).toBeNull()
    expect(readCyclePath(new Error('nada que ver'))).toBeNull()
  })
})

describe('el ciclo se le enseña al operador con los artículos del bucle', () => {
  it('deja la ruta con los códigos del catálogo, no con ids sueltos', async () => {
    catalogItemDependenciesApi.create.mockRejectedValue(
      problem('CATALOG_ITEM_DEPENDENCY_CYCLE', { cycle: [7, 9, 7] }),
    )

    const bridges = useCatalogItemBridges()
    await expect(
      bridges.createDependency(7, {
        relatedItemId: 9,
        relationType: 'REQUIRES',
        note: 'Historia clínica necesita el núcleo.',
      }),
    ).rejects.toThrow()

    expect(bridges.dependencyCycle.value).toEqual([7, 9, 7])
    expect(bridges.cycleLabel.value).toBe('CORE · Núcleo → HC · Historia clínica → CORE · Núcleo')
  })

  it('no confunde otro 409 con un ciclo', async () => {
    catalogItemDependenciesApi.create.mockRejectedValue(
      problem('CATALOG_ITEM_DEPENDENCY_ALREADY_EXISTS'),
    )

    const bridges = useCatalogItemBridges()
    await expect(
      bridges.createDependency(7, {
        relatedItemId: 9,
        relationType: 'REQUIRES',
        note: 'Historia clínica necesita el núcleo.',
      }),
    ).rejects.toThrow()

    expect(bridges.dependencyCycle.value).toBeNull()
  })
})
