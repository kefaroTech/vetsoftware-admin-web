import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/cesion` — la cesión del contrato, D-62 (§I11).
 *
 * <p><b>Construida.</b> Se cambió el `component` por su SFC y se le quitó el
 * `pending`; no se tocó el armazón, ni el módulo de rutas, ni la barra de
 * pestañas, ni ningún otro `*.tab.ts`. Eso es exactamente lo que el
 * descubrimiento por glob de `companies.routes.ts` existe para permitir.
 *
 * <p><b>Estaba bloqueada con razón, y ha dejado de estarlo.</b> Su `blockedBy`
 * decía «no hay ningún endpoint de cesión de contrato en api/openapi.json», y era
 * cierto cuando se escribió. La regeneración del contrato trajo las tres piezas
 * que hacían falta:
 *
 * <ul>
 *   <li>`GET /company-billing-profile` — el titular vigente.</li>
 *   <li>`GET /company-billing-profile/history` — la serie de titulares, paginada,
 *       que es lo que convierte «quién factura» en «quién facturó cuándo».</li>
 *   <li>`POST /company-billing-profile/succession` — la cesión: cierra al saliente
 *       y abre al entrante desde una fecha.</li>
 * </ul>
 *
 * <p><b>La pantalla no cubre todo lo que §I11 describe, y lo dice.</b> Una cesión
 * no arrastra las autorizaciones de tratamiento de datos que recogió el titular
 * anterior —el entrante es un responsable distinto y tiene que volver a pedirlas—,
 * así que después de ceder queda un conjunto de titulares de datos pendientes de
 * reconfirmar. Esa lista <b>no se puede pintar</b>: el contrato no publica
 * `data_subject_authorizations` (ver `datos-personales.tab.ts`). Se declara con
 * palabras, en la pantalla y en el modal antes de firmar, en vez de con un
 * contador en cero — que después de una cesión diría justo lo contrario de lo que
 * pasa (R14 de `docs/ux/reglas-de-interfaz.md`).
 *
 * <p><b>Sin `blockedBy` porque la pestaña ya no está bloqueada</b>: lo que falta lo
 * declara la propia pantalla, delante de quien la usa, y no una nota que solo se ve
 * si nunca se construye. Es el mismo criterio que dejó escrito `fiscal.tab.ts`.
 */
const cesionTab: CompanyRecordTab = {
  segment: 'cesion',
  routeName: 'company-record-cesion',
  label: 'Cesión',
  order: 10,
  component: () => import('./CompanyCessionView.vue'),
}

export default cesionTab
