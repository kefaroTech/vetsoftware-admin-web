import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import type { SubscriptionRecordTab } from '@/features/subscriptions-admin/types/subscription-record.types'

/**
 * Contratos: la lista de plataforma y el expediente de uno (§4.4 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W2-A).
 *
 * <p><b>Este fichero no toca `router/index.ts`.</b> `subscriptionsAdminRoutes` ya
 * estaba importado allí desde la onda 1, así que el expediente entra en el router
 * sin que ninguna instancia tenga que volver a ese fichero, que es el punto de
 * colisión de §7.
 */

export const SUBSCRIPTION_RECORD_ROUTE_NAMES = {
  /**
   * La ruta padre: el armazón con la cabecera de empresa y la barra de
   * sub-vistas.
   *
   * <p>El literal subió a `constants/routes.ts` para que `SubscriptionRef`
   * —primitiva de `components/ui/`— pueda enlazar aquí sin importar desde
   * `router/routes/**`. Este alias se conserva porque lo usan las pestañas y el
   * armazón, y renombrarlo habría tocado ficheros que esta tarea no necesita.
   */
  RECORD: ROUTE_NAMES.SUBSCRIPTION_RECORD,
} as const

/**
 * <b>El punto de extensión de W2-B … W2-F, y la razón de que puedan ir cinco en
 * paralelo.</b>
 *
 * <p>Cada sub-vista se declara a sí misma en
 * `src/features/subscriptions-admin/views/record/<segmento>.tab.ts`, y este
 * módulo las descubre. Consecuencia práctica: para añadir «Lo contratado» no hay
 * que editar <b>ningún</b> fichero existente — ni éste, ni `router/index.ts`, ni
 * la barra de pestañas, ni el armazón. Se crean los ficheros propios de la tarea
 * y la pestaña aparece. Cinco instancias, cinco conjuntos de ficheros disjuntos,
 * cero escrituras compartidas.
 *
 * <p><b>Por qué descubrimiento y no una lista escrita aquí.</b> La alternativa
 * —seis entradas con cinco comentadas, que cada tarea descomenta— es el patrón
 * que usó la onda 1 en `router/index.ts`, y allí funcionaba porque una sola
 * instancia (W1-B) las descomentaba todas al final. En la onda 2 no hay esa
 * instancia final: las cinco tareas corren a la vez y editarían este mismo
 * fichero cinco veces, que es exactamente la colisión que §7 prohíbe.
 *
 * <p>`eager: true` importa solo los módulos de metadatos, que son diez líneas
 * cada uno; el SFC de la sub-vista sigue cargándose de forma diferida porque el
 * `component` del tab es una función `() => import(...)`. El techo de 500 líneas
 * por SFC de §2.2 se conserva.
 *
 * <p>El orden de la barra lo fija `order` del propio tab, no el orden alfabético
 * del sistema de ficheros: los seis rótulos de §4.4.2 tienen un orden con
 * significado (resumen → lo contratado → historia → acceso → dinero → cobranza) y
 * `contratado.tab.ts` no puede quedar antes que `resumen.tab.ts` por la «c».
 */
const tabModules = import.meta.glob<{ default: SubscriptionRecordTab }>(
  '../../features/subscriptions-admin/views/record/*.tab.ts',
  { eager: true },
)

export const subscriptionRecordTabs: SubscriptionRecordTab[] = Object.values(tabModules)
  .map((module) => module.default)
  .sort((a, b) => a.order - b.order)

/**
 * La sub-vista por defecto del expediente. Es la primera de la barra —«Resumen»,
 * que la aporta esta misma tarea— y no una constante escrita a mano, para que
 * `/suscripciones/42/184` siga llevando a algún sitio aunque un día se reordenen.
 */
const defaultTab = subscriptionRecordTabs[0]

/**
 * <b>Por qué la empresa va en la ruta y §2.2 escribía `/suscripciones/:id/*`.</b>
 *
 * <p>Las diez rutas de `/subscriptions/**` resuelven la empresa con
 * `Authz.currentCompanyId()`, que para el operador de esta consola lee la
 * cabecera `X-Company-Id` (§1.1). Para poder mandar esa cabecera hay que saber la
 * empresa <b>antes</b> de la primera petición — y `GET /subscriptions/{id}` es ya
 * una de las diez, así que no se puede preguntar por ella. El contrato tampoco
 * ofrece por dónde salir: `GET /platform-subscriptions` es una página sin filtro
 * por id y no existe `GET /platform-subscriptions/{id}` (comprobado sobre
 * `api/openapi.json`).
 *
 * <p>Con `/suscripciones/:id/*` a secas, el expediente solo funcionaría llegando
 * desde la lista, y un enlace pegado en un ticket de soporte —la razón 2 de §2.2—
 * abriría una pantalla que no puede cargar. Poniendo la empresa en la ruta, el
 * enlace profundo funciona y además la empresa deja de ser implícita también en
 * la URL, que es la misma idea de §2 llevada hasta el final.
 *
 * <p>No abre ningún agujero: el backend resuelve las tres rutas con
 * `findByIdAndCompanyId`, así que un par (empresa, contrato) inventado a mano en
 * la barra de direcciones responde 404 y no toca nada.
 *
 * <p>Los dos parámetros llevan `(\d+)`: una URL con letras no casa con la ruta en
 * vez de llegar al composable como `NaN`.
 */
export const subscriptionsAdminRoutes: RouteRecordRaw[] = [
  {
    path: '/suscripciones',
    name: ROUTE_NAMES.SUBSCRIPTIONS_ADMIN,
    component: () => import('@/features/subscriptions-admin/views/SubscriptionsAdminView.vue'),
  },
  {
    path: '/suscripciones/:companyId(\\d+)/:id(\\d+)',
    name: SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
    component: () => import('@/features/subscriptions-admin/views/SubscriptionRecordLayout.vue'),
    props: true,
    // Conserva `companyId` e `id` al redirigir: sin los params, la sub-vista por
    // defecto no sabría sobre qué empresa se está trabajando.
    redirect: (to) => ({
      name: defaultTab?.routeName ?? ROUTE_NAMES.SUBSCRIPTIONS_ADMIN,
      params: to.params,
    }),
    children: subscriptionRecordTabs.map((tab) => ({
      path: tab.segment,
      name: tab.routeName,
      component: tab.component,
      props: true,
    })),
  },
]
