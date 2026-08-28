import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/cartera` — la cartera de la empresa (§I6).
 *
 * <p><b>Construida en parte, y la parte que falta la declara la propia
 * pantalla.</b> Se cambió el `component` por su SFC y se le quitó el `pending`;
 * no se tocó el armazón, ni el módulo de rutas, ni la barra de pestañas, ni
 * ningún otro `*.tab.ts`.
 *
 * <p><b>Qué desbloqueó la regeneración del contrato.</b> Apareció
 * `GET /system/dunning-events?companyId=`, que trae los hitos de cobranza de
 * <b>todos</b> los contratos que ha tenido la empresa. Con eso se contesta lo
 * esencial de la ficha —el reloj de la mora, los avisos, y sobre todo si se avisó
 * antes de restringir la cuenta— así que dejarla muda ya no estaría justificado.
 *
 * <p><b>Qué NO desbloqueó, y por eso la pantalla lo dice en voz alta.</b> El
 * impedimento original sigue vivo: `DunningEventResponse` no tiene ningún campo
 * de entrega —ni acuse, ni rebote, ni lectura—, así que un correo que rebotó y
 * uno que se leyó se anotan igual. La pantalla puede probar que un aviso se mandó;
 * no puede probar que llegara, y esa es justo la diferencia que decide si una
 * restricción se sostiene ante una reclamación. El texto va pegado al resultado y
 * no en una nota al pie (ver `companyReceivablesText.ts`).
 *
 * <p>Los otros tres huecos, también declarados en la pantalla: el saldo documento
 * a documento vive en la pantalla de documentos de cobro, los saldos a favor en la
 * de crédito de clientes —traerlos aquí duplicaría esos cuerpos, que es lo que el
 * trinquete prohíbe—, y el registro de exportaciones de datos de una empresa
 * sencillamente no existe en el contrato.
 *
 * <p><b>Sin `blockedBy` porque la pestaña ya no está bloqueada</b>: lo que falta lo
 * declara la propia pantalla, delante de quien la usa, y no una nota que solo se ve
 * si nunca se construye. Mismo criterio que `fiscal.tab.ts`.
 */
const carteraTab: CompanyRecordTab = {
  segment: 'cartera',
  routeName: 'company-record-cartera',
  label: 'Cartera',
  order: 5,
  component: () => import('./CompanyReceivablesView.vue'),
}

export default carteraTab
