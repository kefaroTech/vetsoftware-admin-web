import type { RouteRecordRaw } from 'vue-router'

/**
 * El configurador — dos sub-vistas, una sola entrada de menú.
 *
 * <p><b>Los nombres de ruta viven aquí y no en `src/constants/routes.ts`</b> a
 * propósito. Ese fichero es un punto de serialización: las cinco tareas de la
 * onda 1 escriben en paralelo y todas querrían tocarlo a la vez. Nada de fuera
 * necesita estos nombres —`AppSidebar` enlaza por ruta, no por nombre— así que
 * se declaran junto a las rutas que nombran y se exportan por si alguien los
 * quiere. Si algún día hacen falta en `ROUTE_NAMES`, se mueven de una vez.
 *
 * <p><b>Sin `meta.permission`.</b> Las nueve rutas del configurador son globales
 * de plataforma y ninguna declara `hasAuthority(...)`: su `@PreAuthorize` es
 * `hasRole('SYSTEM')` a secas, y todo operador de esta consola es un
 * `SystemUserContext` que lo recibe sin que se miren sus permisos. Poner aquí un
 * código inventado no restringiría nada y rompería el día en que
 * `hasPermission()` deje de ser un atajo universal — ver la cabecera de
 * `src/constants/permissions.ts`.
 *
 * <p>Este fichero NO se registra a sí mismo: los seis imports de la onda 1 los
 * añade una sola instancia en `router/index.ts` (tarea W1-B), que es la regla de
 * no colisión de §7 de la especificación.
 */
export const CONFIGURATOR_ROUTE_NAMES = {
  CONFIGURATOR: 'configurator',
  CONFIGURATOR_QUESTIONNAIRE: 'configurator-questionnaire',
  CONFIGURATOR_TEST: 'configurator-test',
  CONFIGURATOR_EFFECT_ORDER: 'configurator-effect-order',
} as const

export const configuratorRoutes: RouteRecordRaw[] = [
  {
    path: '/configurador',
    name: CONFIGURATOR_ROUTE_NAMES.CONFIGURATOR,
    component: () => import('@/features/configurator/views/ConfiguratorView.vue'),
    // El armazón no pinta nada por sí solo: sin redirección, `/configurador` es
    // una cabecera con el hueco de la sub-vista vacío.
    redirect: { name: CONFIGURATOR_ROUTE_NAMES.CONFIGURATOR_QUESTIONNAIRE },
    children: [
      {
        path: 'cuestionario',
        name: CONFIGURATOR_ROUTE_NAMES.CONFIGURATOR_QUESTIONNAIRE,
        component: () => import('@/features/configurator/views/ConfiguratorQuestionnaireView.vue'),
        meta: { title: 'Editar el cuestionario · Configurador' },
      },
      {
        // El orden de aplicacion es una propiedad del CONJUNTO de efectos y no
        // cabe dentro de las tarjetas por pregunta, donde aparecen repartidos
        // por disparador y nunca en la sucesion en que se ejecutan. Sub-vista
        // del mismo armazon, no entrada de menu propia: sigue siendo «editar el
        // configurador», solo que la parte que decide quien manda.
        path: 'orden',
        name: CONFIGURATOR_ROUTE_NAMES.CONFIGURATOR_EFFECT_ORDER,
        component: () => import('@/features/configurator/views/ConfiguratorEffectOrderView.vue'),
        meta: { title: 'El orden de los efectos · Configurador' },
      },
      {
        path: 'probar',
        name: CONFIGURATOR_ROUTE_NAMES.CONFIGURATOR_TEST,
        component: () => import('@/features/configurator/views/ConfiguratorTestView.vue'),
        meta: { title: 'Probar el configurador' },
      },
    ],
  },
]
