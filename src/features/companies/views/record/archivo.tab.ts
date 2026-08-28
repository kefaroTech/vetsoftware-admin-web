import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/archivo` — el archivo y la restauración de la empresa (§I10).
 *
 * <p><b>Declarada, no construida.</b> La ruta existe desde el primer día para que
 * la pestaña de la barra lleve a algún sitio y para que quien tome este lote no
 * tenga que tocar el armazón ni el módulo de rutas: cambia el `component` por su
 * SFC, borra el `pending`, y ya está.
 *
 * <p>Mientras tanto el destino dice en palabras qué va a haber aquí. <b>Ni un
 * número</b>: un cero de relleno y un cero verdadero se ven igual y solo uno de
 * los dos es cierto (R14 de `docs/ux/reglas-de-interfaz.md`).
 */
const archivoTab: CompanyRecordTab = {
  segment: 'archivo',
  routeName: 'company-record-archivo',
  label: 'Archivo',
  order: 9,
  component: () => import('./CompanyRecordPendingView.vue'),
  pending: {
    what: 'Archivar una empresa sin borrarla y volver a restaurarla, con la constancia de quién lo hizo y cuándo.',
    spec: 'I10',
    blockedBy:
      'Sigue sin haber endpoint, y se ha vuelto a comprobar sobre «api/openapi.json» tras la regeneración: el único «/archive» del contrato es el de las listas de precios, y no hay ninguna ruta de archivo ni de restauración de empresas. Lo más parecido sigue siendo la baja lógica de «enabled», que no sirve: es un ESTADO que se sobrescribe, y esta ficha necesita dos HECHOS. Con «enabled» no se puede contestar cuántas veces se archivó una empresa ni quién lo hizo cada vez —la segunda vez pisa a la primera—, y esa cuenta es justo lo que la pantalla existe para dar.',
  },
}

export default archivoTab
