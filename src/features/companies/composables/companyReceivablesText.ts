/**
 * <b>Los huecos declarados de la pestaña de cartera</b> (§I6).
 *
 * <p>Viven en su propio módulo y no incrustados en la plantilla por dos motivos.
 * Uno práctico: el trinquete del repositorio fija un techo de 500 líneas por SFC
 * desde el primer commit, y estos textos son largos a propósito. Y uno de fondo:
 * un hueco declarado es un dato de la pantalla, igual que una cifra, y como tal
 * se puede citar desde una prueba y encontrar con un `grep` el día que el
 * endpoint que falta aparezca.
 *
 * <p><b>Todos se comprobaron contra `api/openapi.json` después de la
 * regeneración</b>, no contra la memoria de cómo estaba el contrato antes. Es la
 * diferencia entre un impedimento y una excusa heredada.
 */
export const RECEIVABLES_GAPS = {
  /**
   * <b>El impedimento original de la ficha, y sigue vivo.</b>
   *
   * <p>`DunningEventResponse` trae `channel` —por dónde se mandó— y `detail`,
   * pero <b>ningún campo de entrega</b>: ni acuse, ni rebote, ni fecha de
   * lectura. Se buscó `delivery`, `acknowledg`, `receipt` y `bounce` sobre todos
   * los esquemas del contrato y no aparece ninguno aplicable.
   *
   * <p>Por qué importa, con el escenario concreto: una clínica reclama que se le
   * restringió la cuenta sin avisar. El expediente enseña tres
   * `REMINDER_SENT` por correo. Si los tres rebotaron, el sistema anotó tres
   * avisos y el cliente no recibió ninguno — y la pantalla, tal como está, los
   * cuenta como prueba de que se avisó. Por eso el texto va pegado al resultado y
   * no en una nota al pie.
   */
  deliveryStatus:
    'Un hito anotado no es un acuse de entrega. El contrato no publica el estado de entrega de un aviso —ni acuse, ni rebote, ni lectura—, así que un correo que rebotó y uno que se leyó se cuentan aquí exactamente igual. Antes de sostener una restricción ante una reclamación, comprueba por fuera que los avisos llegaron: esta pantalla puede probar que se mandaron, no que se recibieran.',

  /**
   * Los documentos con su saldo existen en el contrato
   * (`GET /system/subscription-billing/companies/{companyId}/documents`), pero
   * son la pantalla de documentos de cobro y tienen su propia feature. Traerlos
   * aquí con un cliente propio duplicaría ese cuerpo, que es justo lo que el
   * trinquete prohíbe.
   */
  documents:
    'El saldo documento a documento no se pinta aquí: vive en la pantalla de documentos de cobro, que es la que sabe de notas crédito, anulaciones y facturas externas. Esta pestaña responde por el comportamiento de pago de la empresa, no por el detalle de cada factura.',

  /**
   * Los saldos a favor están en `/system/customer-credit/**`, que es otra feature
   * de esta misma campaña.
   */
  credits:
    'Los saldos a favor vivos tampoco se pintan aquí: están en la pantalla de crédito de clientes, con sus vencimientos y sus consumos. Un saldo a favor sin su fecha de caducidad al lado se lee como dinero disponible cuando puede estar a punto de expirar.',

  /**
   * <b>El otro hueco, y este no tiene dónde ir todavía.</b>
   *
   * <p>Regla del modelo: los datos no se retienen como palanca de cobro. Una
   * clínica en mora puede exportar lo suyo, y esa exportación queda registrada —
   * <b>incluso si falla</b>, porque la exportación fallida es la que el cliente
   * recordará y la que después se discute.
   *
   * <p>El contrato no publica `company_data_export_events` (comprobado; ver
   * también `datos-personales.tab.ts`). Sin ese registro no se puede ni ofrecer la
   * exportación desde aquí ni enseñar las que hubo, y una exportación que no deja
   * constancia es peor que ninguna: quien la pidió no puede probar que la pidió.
   */
  dataExport:
    'Que una cuenta esté en mora no le quita el derecho a llevarse sus datos, y cada exportación —también las que fallan— tiene que quedar registrada. Hoy no se puede ofrecer desde aquí: el contrato no publica el registro de exportaciones de datos de una empresa, y una exportación sin constancia deja al cliente sin poder probar que la pidió. Mientras tanto, la solicitud se atiende por fuera y se deja anotada donde corresponda.',
} as const
