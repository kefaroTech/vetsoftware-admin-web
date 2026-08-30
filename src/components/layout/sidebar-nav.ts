import type { Component } from 'vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

/**
 * El modelo de la navegación de la consola: qué grupos hay, en qué orden y a
 * dónde lleva cada entrada.
 *
 * Vive fuera del SFC —igual que `useSidebarNav.ts` en el front del tenant— por
 * una razón medible: `scripts/css-budget.mjs` fija `maxSfcLines: 500` con techo
 * de cero infractores, y `AppSidebar.vue` con los 26 destinos dentro lo pasaba.
 * Un array de datos no es la parte del componente que hay que leer para
 * entender cómo se pinta, así que es lo primero que sale.
 *
 * Aquí solo hay DATOS y su forma. El estado —qué grupo está desplegado, qué
 * ruta está activa, qué destinos conoce el router— sigue en el componente,
 * porque es estado por instancia y no se comparte con nadie.
 */

export interface NavLeaf {
  name?: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
  label: string
  path: string
  icon: Component
}

export interface NavParent {
  label: string
  icon: Component
  children: NavLeaf[]
}

export type NavItem = NavLeaf | NavParent

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const isParent = (item: NavItem): item is NavParent => 'children' in item

export const navGroups: NavGroup[] = [
  {
    title: 'General',
    items: [
      {
        name: ROUTE_NAMES.DASHBOARD,
        label: 'Dashboard',
        path: '/dashboard',
        icon: ICONS.DASHBOARD,
      },
      {
        name: ROUTE_NAMES.COMPANIES_LIST,
        label: 'Empresas',
        path: '/empresas',
        icon: ICONS.COMPANY,
      },
      { label: 'Empleados', path: '/empleados', icon: ICONS.EMPLOYEE },
    ],
  },
  {
    /**
     * §2 de `docs/ux/suscripciones-consola-especificacion.md`: diez familias de
     * rutas no son diez entradas de menú. El modelo tiene una cadena y el menú
     * la cuenta, **en su orden**: catálogo y precios → el asistente → la oferta
     * → el contrato → el dinero. Cambiar este orden es cambiar la historia que
     * el menú explica, así que va sujeto con una prueba
     * (`tests/unit/sidebar-sin-cifras-inventadas.spec.ts`).
     *
     * `Cotizaciones` es la entrada nueva. Sus rutas las aportan otras tareas de
     * la onda (§7), y hasta que el router las conozca la entrada NO se pinta: un
     * elemento de menú que lleva a una pantalla en blanco es exactamente la
     * avería que el usuario reporta como «la consola está rota». Ver
     * `isAvailable`.
     */
    title: 'Suscripciones',
    items: [
      {
        name: ROUTE_NAMES.COMMERCIAL_CATALOG,
        label: 'Catálogo y precios',
        path: '/catalogo-comercial',
        icon: ICONS.COMMERCIAL_CATALOG,
      },
      // El eslabón «el asistente» de la cadena, que hasta ahora no tenía ninguna
      // entrada: va entre el catálogo y la oferta porque es donde el orden
      // documentado arriba lo coloca —el asistente es lo que convierte una
      // descripción en una cotización—. Es además la única pantalla de los dos
      // fronts que atiende una petición de habeas data (Ley 1581, art. 8 e), y
      // hasta que existió, cumplirla exigía invocar la API a mano.
      {
        label: 'Supresión de datos',
        path: '/asistente/supresion-datos',
        icon: ICONS.DATA_SUPPRESSION,
      },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: ICONS.QUOTE },
      {
        name: ROUTE_NAMES.SUBSCRIPTIONS_ADMIN,
        label: 'Contratos',
        path: '/suscripciones',
        icon: ICONS.SUBSCRIPTION,
      },
      // El cupo se deriva del contrato y se cobra después: va entre los dos.
      { label: 'Cupos y límites', path: '/limites', icon: ICONS.LIMIT },
      // Las pruebas van pegadas al cupo, no al contrato: §2 de la ampliación las
      // agrupa por la misma tarea —gobernar lo que se vende y lo que se regala— y
      // una ventana de prueba se lee como un techo con fecha de caducidad.
      { label: 'Pruebas y concesiones', path: '/pruebas', icon: ICONS.TRIAL },
      {
        name: ROUTE_NAMES.BILLING_OPERATIONS,
        label: 'Cobranza',
        path: '/cobranza',
        icon: ICONS.RECEIPT,
      },
      // El documento de cobro con su circuito de estados. Va pegada a Cobranza
      // porque es la misma tarea vista desde el otro lado: alli se persigue lo que
      // falta por cobrar, aqui se mira un documento concreto para entenderlo.
      { label: 'Documentos de cobro', path: '/documentos', icon: ICONS.BILLING_DOCUMENT },
      // Cierra la cadena, y por eso va la última: primero se cobra, después se
      // cuadra. §2 de la ampliación la pone en un grupo «Dinero» junto a Cobranza;
      // ese grupo no existe todavía —el menú son cuatro grupos y `sidebar-nav-a11y`
      // lo sujeta—, así que aterriza donde la especificación la deja: pegada a
      // Cobranza. La cabecera de `reconciliation.routes.ts` proponía «Sistema»,
      // escrita antes de que §2.2 repartiera estas pantallas por tarea.
      { label: 'Conciliación', path: '/conciliacion', icon: ICONS.RECONCILIATION },
    ],
  },
  {
    title: 'Configuración',
    items: [
      {
        name: ROUTE_NAMES.MODULES_LIST,
        label: 'Módulos',
        path: '/modulos',
        icon: ICONS.MODULE,
      },
      {
        name: ROUTE_NAMES.SUBMODULES_LIST,
        label: 'Submódulos',
        path: '/submodulos',
        icon: ICONS.SUBMODULE,
      },
      {
        name: ROUTE_NAMES.BASE_PERMISSIONS_LIST,
        label: 'Permisos base',
        path: '/permisos-base',
        icon: ICONS.BASE_PERMISSION,
      },
      {
        name: ROUTE_NAMES.BASE_ROLES_LIST,
        label: 'Roles base',
        path: '/roles-base',
        icon: ICONS.BASE_ROLE,
      },
      {
        name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST,
        label: 'Permisos de roles',
        path: '/permisos-roles-base',
        icon: ICONS.BASE_ROLE_PERMISSION,
      },
      {
        label: 'Animales',
        icon: ICONS.ANIMAL_SETTINGS,
        children: [
          {
            name: ROUTE_NAMES.SPECIES_LIST,
            label: 'Especies',
            path: '/animales/especies',
            icon: ICONS.SPECIES,
          },
          {
            name: ROUTE_NAMES.BREEDS_LIST,
            label: 'Razas',
            path: '/animales/razas',
            icon: ICONS.BREED,
          },
          {
            name: ROUTE_NAMES.ANIMAL_COLORS_LIST,
            label: 'Colores',
            path: '/animales/colores',
            icon: ICONS.COLOR,
          },
        ],
      },
      {
        label: 'Catálogos clínicos',
        icon: ICONS.CLINICAL_CATALOGS,
        children: [
          {
            name: ROUTE_NAMES.CONSULTATION_TYPES_LIST,
            label: 'Tipos de consulta',
            path: '/catalogos-clinicos/tipos-consulta',
            icon: ICONS.CONSULTATION_TYPE,
          },
          {
            name: ROUTE_NAMES.VACCINATION_TYPES_LIST,
            label: 'Tipos de vacuna',
            path: '/catalogos-clinicos/tipos-vacuna',
            icon: ICONS.VACCINATION_TYPE,
          },
          {
            name: ROUTE_NAMES.SURGERY_TYPES_LIST,
            label: 'Tipos de cirugía',
            path: '/catalogos-clinicos/tipos-cirugia',
            icon: ICONS.SURGERY_TYPE,
          },
          {
            name: ROUTE_NAMES.LABORATORY_TEST_TYPES_LIST,
            label: 'Tipos de laboratorio',
            path: '/catalogos-clinicos/tipos-laboratorio',
            icon: ICONS.LABORATORY_TEST_TYPE,
          },
          {
            name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPES_LIST,
            label: 'Tipos de imagen',
            path: '/catalogos-clinicos/tipos-imagen',
            icon: ICONS.DIAGNOSTIC_IMAGING_TYPE,
          },
          {
            name: ROUTE_NAMES.SPA_TYPES_LIST,
            label: 'Tipos de spa',
            path: '/catalogos-clinicos/tipos-spa',
            icon: ICONS.SPA_TYPE,
          },
          // Última del subgrupo, y no en medio: las seis anteriores son «Tipos
          // de …» y forman una serie homogénea. «Medicamentos» no es un tipo,
          // es un vademécum; intercalarlo rompe la lectura de la serie.
          // La lente «Medicamentos en toda la plataforma» NO entra aquí: es el
          // mismo concepto visto de otra manera, y dos entradas obligarían a
          // elegir antes de saber en qué se diferencian. Se llega por el enlace
          // de la pantalla que la explica.
          {
            name: ROUTE_NAMES.MEDICAMENTS_LIST,
            label: 'Medicamentos',
            path: '/catalogos-clinicos/medicamentos',
            icon: ICONS.MEDICAMENT,
          },
        ],
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        name: ROUTE_NAMES.CONFIG,
        label: 'Configuración',
        path: '/configuracion',
        icon: ICONS.SETTINGS,
      },
      // §2.1 · `/platform-billing-config` es UNA fila. Ir sola a un grupo de
      // primer nivel le daría el mismo peso que a «Contratos»; su sitio es aquí,
      // junto a los contadores de numeración.
      {
        label: 'Facturación de plataforma',
        path: '/configuracion/facturacion',
        icon: ICONS.PLATFORM_BILLING,
      },
    ],
  },
]
