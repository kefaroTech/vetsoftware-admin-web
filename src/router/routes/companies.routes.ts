import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import { PERMISSIONS } from '@/constants/permissions'
import type { CompanyRecordTab } from '@/features/companies/types/company-record.types'

/**
 * Empresas: la lista de plataforma y el <b>expediente</b> de una (§I2–I11 de
 * `docs/ux/suscripciones-consola-ampliacion-especificacion.md`, lote W5-A).
 *
 * <p><b>Este fichero no toca `router/index.ts`.</b> `companiesRoutes` ya estaba
 * importado allí, así que el expediente entra en el router sin que ningún lote
 * tenga que volver a ese fichero, que es un punto de colisión conocido.
 */

/**
 * <b>El punto de extensión de los lotes que cuelgan de W5-A, y la razón de que
 * puedan ir en paralelo.</b>
 *
 * <p>Cada sub-vista se declara a sí misma en
 * `src/features/companies/views/record/<segmento>.tab.ts`, y este módulo las
 * descubre. Consecuencia práctica: para construir «Cartera» no hay que editar
 * <b>ningún</b> fichero existente — ni éste, ni `router/index.ts`, ni la barra de
 * pestañas, ni el armazón. Se cambia el `component` del propio `cartera.tab.ts`,
 * se le borra el `pending`, y se escribe el SFC al lado.
 *
 * <p><b>Por qué descubrimiento y no una lista escrita aquí.</b> La alternativa
 * —diez entradas con ocho comentadas, que cada lote descomenta— haría que los
 * ocho lotes editaran este mismo fichero, que es exactamente la colisión que el
 * reparto de la campaña prohíbe. Con `import.meta.glob` sus conjuntos de ficheros
 * son disjuntos y no hay ninguna escritura compartida.
 *
 * <p>`eager: true` importa solo los módulos de metadatos, que son treinta líneas
 * cada uno; el SFC de la sub-vista sigue cargándose de forma diferida porque el
 * `component` del tab es una función `() => import(...)`. El techo de 500 líneas
 * por SFC se conserva.
 *
 * <p>El orden de la barra lo fija `order` del propio tab y no el orden alfabético
 * del sistema de ficheros: los rótulos tienen un orden con significado (quién es
 * → sus datos → qué tiene → qué debe) y `accesos.tab.ts` no puede quedar el
 * primero por la «a».
 *
 * <p><b>Es una copia deliberada del descubrimiento de
 * `subscriptions-admin.routes.ts`, no una pieza compartida.</b> Con dos
 * instancias no hay patrón todavía; ver `company-record.types.ts`.
 */
const tabModules = import.meta.glob<{ default: CompanyRecordTab }>(
  '../../features/companies/views/record/*.tab.ts',
  { eager: true },
)

export const companyRecordTabs: CompanyRecordTab[] = Object.values(tabModules)
  .map((module) => module.default)
  .sort((a, b) => a.order - b.order)

/**
 * A dónde lleva una pestaña del expediente, <b>si existe</b>.
 *
 * <p>Lo usan las tarjetas del resumen para ofrecer su salida —«Ver la cartera»,
 * «Ver los cupos»— sin escribir el nombre de la ruta a mano. Si un día se retira
 * un `*.tab.ts`, la tarjeta se queda sin enlace en vez de llevar a un 404: una
 * pantalla sin enlace es un inconveniente, un enlace roto es un fallo.
 *
 * <p>Es el mismo criterio con el que el banner de una cuenta vencida busca la
 * pestaña «Dinero» del expediente del contrato.
 */
export function companyRecordTabTarget(
  segment: string,
  companyId: number,
): RouteLocationRaw | null {
  const tab = companyRecordTabs.find((candidate) => candidate.segment === segment)
  return tab ? { name: tab.routeName, params: { id: String(companyId) } } : null
}

/**
 * La sub-vista por defecto del expediente. Es la primera de la barra —«Resumen»,
 * que aporta este mismo lote— y no una constante escrita a mano, para que
 * `/empresas/42` siga llevando a algún sitio aunque un día se reordenen.
 */
const defaultTab = companyRecordTabs[0]

/**
 * <b>`/empresas/:id` conserva el nombre de ruta `COMPANY_DETAIL`</b> aunque ya no
 * sea una vista sino un armazón. No es inercia: hay cuatro sitios que enlazan a
 * ese nombre —`CompanyRef.vue`, `QuoteChain.vue`, `QuotesListView.vue` y la
 * cabecera del expediente del contrato— y tres de ellos están en features de
 * otros lotes. Renombrarlo obligaría a tocarlas; conservándolo, los cuatro
 * enlaces siguen funcionando y aterrizan en el resumen, que es mejor destino que
 * el formulario al que llevaban antes.
 *
 * <p>El parámetro lleva `(\d+)`: una URL con letras no casa con la ruta, en vez
 * de llegar al composable como `NaN`.
 *
 * <p>El `permission` se repite en las hijas y no solo en el padre porque el
 * guardián del router lee el `meta` de la ruta <b>coincidente</b>, que en una
 * navegación a `/empresas/42/resumen` es la hija. Es el mismo `COMPANY_CREATE`
 * que ya protegía la ficha: este lote no cambia quién puede entrar.
 */
export const companiesRoutes: RouteRecordRaw[] = [
  {
    path: '/empresas',
    name: ROUTE_NAMES.COMPANIES_LIST,
    component: () => import('@/features/companies/views/CompaniesListView.vue'),
    meta: { permission: PERMISSIONS.COMPANY_CREATE },
  },
  {
    path: '/empresas/:id(\\d+)',
    name: ROUTE_NAMES.COMPANY_DETAIL,
    component: () => import('@/features/companies/views/CompanyRecordLayout.vue'),
    props: true,
    meta: { permission: PERMISSIONS.COMPANY_CREATE },
    // Conserva `id` al redirigir: sin el param, la sub-vista por defecto no
    // sabría de qué empresa se está hablando.
    redirect: (to) => ({
      name: defaultTab?.routeName ?? ROUTE_NAMES.COMPANIES_LIST,
      params: to.params,
    }),
    children: companyRecordTabs.map((tab) => ({
      path: tab.segment,
      name: tab.routeName,
      component: tab.component,
      // Las construidas reciben los params de la ruta; las pendientes reciben su
      // propia declaración de qué falta, que es lo único que tienen que pintar.
      props: tab.pending ? { pending: tab.pending } : true,
      meta: { permission: PERMISSIONS.COMPANY_CREATE },
    })),
  },
]
