import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/datos-personales` — las autorizaciones de tratamiento de datos y
 * las solicitudes de los titulares (§I9).
 *
 * <p><b>Declarada, no construida, y esta vez con el impedimento nombrado.</b> Se
 * revisó `api/openapi.json` entero buscando las tres piezas de §I9 y <b>no hay
 * ninguna</b>: ni `data_subject_authorizations`, ni `data_subject_requests`, ni
 * `company_data_export_events`. No es que falte un campo: no hay endpoint.
 *
 * <p><b>Por qué no se construye «hasta donde llegue el contrato».</b> Porque el
 * contrato no llega a ningún sitio aquí, y esta pantalla concreta no admite una
 * maqueta. Las tres cosas que pinta son pruebas ante una autoridad, y una prueba
 * inventada es peor que la ausencia de prueba:
 *
 * <ul>
 *   <li>Una tabla de autorizaciones vacía se lee como «esta clínica no tiene
 *       ninguna autorización», que es una acusación, no un hueco.</li>
 *   <li>Un contador de plazos sin plazos reales se lee como «vas al día».</li>
 *   <li>Y <b>los plazos no se pueden calcular en el navegador aunque hubiera
 *       solicitudes</b>: son días <b>hábiles</b>, y los hábiles se cuentan contra
 *       el calendario de festivos. Ese calendario es la ficha J3
 *       (`/catalogos-anuales/festivos`) y tampoco tiene endpoint. Contarlos como
 *       días corridos da un vencimiento distinto del real —y siempre más tarde—,
 *       que es justo el error que produce el incumplimiento que la pantalla existe
 *       para evitar.</li>
 * </ul>
 *
 * <p><b>Los dos plazos son distintos y no se pueden confundir</b>: una <i>consulta</i>
 * se responde en diez días hábiles prorrogables cinco; un <i>reclamo</i>, en quince
 * hábiles prorrogables ocho. Y la prórroga hay que informarla <b>antes</b> de que
 * venza el plazo original: registrada después, no es una prórroga, es un
 * incumplimiento, y la pantalla tiene que poder enseñarlo. Nada de eso se puede
 * derivar sin `request_type`, sin `received_at`, sin `extension_notified_at` y sin
 * el calendario de festivos — los cuatro faltan.
 *
 * <p>Las otras dos reglas de la ficha, para quien la tome: <b>revocar no borra</b>
 * (cierra la fila; una autorización cerrada sigue probando que en marzo sí estaba
 * autorizado), y <b>autorizar una finalidad no autoriza las demás</b> (nada de un
 * único distintivo «Autorizado» que dé a entender que el permiso vale para todo).
 */
const datosPersonalesTab: CompanyRecordTab = {
  segment: 'datos-personales',
  routeName: 'company-record-datos-personales',
  label: 'Datos personales',
  order: 8,
  component: () => import('./CompanyRecordPendingView.vue'),
  pending: {
    what: 'Las autorizaciones de tratamiento vivas y las cerradas, con quién es el responsable de cada una y para qué finalidad se dio; las solicitudes de los titulares con su plazo —diez días hábiles para una consulta, quince para un reclamo— y si la prórroga se informó a tiempo; y la bitácora de exportaciones de datos, incluidas las que fallaron.',
    spec: 'I9',
    blockedBy:
      'Sigue sin haber endpoint, y se ha vuelto a comprobar sobre «api/openapi.json» tras la regeneración de +99 operaciones: no existe ningún esquema ni ninguna ruta de «data_subject_authorizations», «data_subject_requests» ni «company_data_export_events». Y aunque los expusiera, los plazos se cuentan en días hábiles contra el calendario de festivos de la ficha J3 («/catalogos-anuales/festivos»), que tampoco existe: contarlos como días corridos daría siempre un vencimiento más tarde que el real. Dos pantallas ya construidas dependen de este hueco y lo declaran con palabras en vez de rellenarlo: la pestaña «Cesión» —una cesión no arrastra las autorizaciones del titular anterior, que quedan pendientes de reconfirmar y no se pueden listar— y la pestaña «Cartera», donde la exportación de datos de una clínica en mora no se puede ofrecer porque no habría dónde registrarla.',
  },
}

export default datosPersonalesTab
