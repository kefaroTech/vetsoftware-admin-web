import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/accesos` — la constancia de los accesos de soporte, D-91 (§I8).
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
const accesosTab: CompanyRecordTab = {
  segment: 'accesos',
  routeName: 'company-record-accesos',
  label: 'Accesos',
  order: 7,
  component: () => import('./CompanyRecordPendingView.vue'),
  pending: {
    what: 'Quién de plataforma entró a esta empresa, cuándo, qué leyó y con qué motivo, con filtro por persona y por fecha.',
    spec: 'I8',
    blockedBy:
      'Sigue sin haber endpoint, y se ha vuelto a comprobar sobre «api/openapi.json» después de la regeneración que trajo +99 operaciones: no aparece ninguna ruta de auditoría, de bitácora de acceso ni de motivo de acceso de soporte. El registro del backend solo anota escrituras, así que hoy no queda constancia de qué LEE un usuario de plataforma y no hay nada que listar. La pantalla no puede inventarlo, y su mitad del efecto disuasorio depende de que lo que muestre sea cierto: una tabla vacía aquí se leería como «nadie ha entrado», que es una afirmación, no un hueco.',
  },
}

export default accesosTab
