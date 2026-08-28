import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/fiscal` — el perfil fiscal de la empresa (§I7).
 *
 * <p><b>Construida.</b> Se cambió el `component` por su SFC y se le quitó el
 * `pending`; no se tocó el armazón, ni el módulo de rutas, ni la barra de
 * pestañas, ni ningún otro `*.tab.ts`. Eso es exactamente lo que el
 * descubrimiento por glob de `companies.routes.ts` existe para permitir.
 *
 * <p><b>La pantalla no cubre todo lo que §I7 describe, y lo dice.</b> El domicilio
 * fiscal, la serie de perfiles anteriores, los apellidos y nombres separados de una
 * persona natural, el titular del correo de facturación y el estado del mandato del
 * medio de pago no están en `api/openapi.json`. Ninguno se rellena con un cero
 * plausible: cada uno se pinta como hueco honesto, con lo que falta escrito
 * (R14 de `docs/ux/reglas-de-interfaz.md`).
 *
 * <p><b>Sin `blockedBy` porque la pestaña ya no está bloqueada</b>: lo que falta lo
 * declara la propia pantalla, delante de quien la usa, y no una nota que solo se ve
 * si nunca se construye.
 */
const fiscalTab: CompanyRecordTab = {
  segment: 'fiscal',
  routeName: 'company-record-fiscal',
  label: 'Fiscal',
  order: 6,
  component: () => import('./CompanyFiscalView.vue'),
}

export default fiscalTab
