import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RECORD_LINK_PARAMS,
  recordLinkQuery,
} from '@/features/subscriptions-admin/composables/useRecordLink'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'

/**
 * <b>La cadena del expediente, en los dos sentidos</b> (§3.3, tarea W3-D; issues
 * #161 y #164).
 *
 * <p>La pregunta que vertebra el modelo —<i>«¿qué tenía contratado Ana el 3 de
 * marzo, y por qué se le facturaron 179.000?»</i>— se responde saltando entre las
 * sub-vistas, y §3.3 lo exige como <b>requisito duro</b>: «cada eslabón es un
 * enlace, y cada uno tiene su vuelta».
 *
 * <h3>Por qué estas pruebas son de texto fuente y no de montaje</h3>
 *
 * <p>Porque el fallo que hay que impedir <b>no lanza ninguna excepción</b>. Si un
 * extremo escribe `?otrosí=` y el otro lee `?otrosi=`, el `RouterLink` sigue
 * resolviendo, la navegación sigue funcionando y la pantalla destino simplemente
 * deja de señalar nada — <b>en silencio</b>. Es literalmente el riesgo que el
 * issue #164 dejó escrito: «el enlace de ida queda inerte sin romperse; no falla,
 * simplemente deja de destacar nada, y nadie se entera». Un test de montaje que
 * comprobara «al pulsar, navega» pasaría con la cadena rota. Lo que hay que
 * atornillar es que <b>los seis extremos tomen el nombre de la misma constante</b>,
 * y eso se ve en el fuente.
 */
const root = resolve(__dirname, '..', '..')
const leer = (rel: string): string => readFileSync(join(root, rel), 'utf8')

const FEATURE = 'src/features/subscriptions-admin'

/** Los cuatro que construyen enlaces de la cadena. */
const EMISORES = [
  `${FEATURE}/components/record/AmendmentEntry.vue`,
  `${FEATURE}/components/record/ChargeChain.vue`,
  `${FEATURE}/components/record/EntitlementsTable.vue`,
  `${FEATURE}/components/record/SubscriptionItemsTable.vue`,
]

/** Las cuatro sub-vistas que los leen. */
const LECTORES = [
  `${FEATURE}/views/record/SubscriptionItemsView.vue`,
  `${FEATURE}/views/record/SubscriptionHistoryView.vue`,
  `${FEATURE}/views/record/SubscriptionAccessView.vue`,
  `${FEATURE}/views/record/SubscriptionMoneyView.vue`,
]

describe('el nombre del parámetro de la cadena vive en un solo sitio', () => {
  it('son los dos que acordaron las sub-vistas, y no cambian de tapadillo', () => {
    expect(RECORD_LINK_PARAMS.ITEM).toBe('item')
    expect(RECORD_LINK_PARAMS.AMENDMENT).toBe('otrosi')
  })

  it('recordLinkQuery construye la query con ese nombre y el id como cadena', () => {
    expect(recordLinkQuery(RECORD_LINK_PARAMS.ITEM, 900)).toEqual({ item: '900' })
    expect(recordLinkQuery(RECORD_LINK_PARAMS.AMENDMENT, 42)).toEqual({ otrosi: '42' })
  })

  /**
   * El guardián de verdad. Antes de W3-D cada extremo escribía
   * `query: { otrosi: String(id) }` a mano; con cuatro emisores y cuatro lectores,
   * cambiar el nombre exigía acertar en ocho sitios y equivocarse no rompía nada.
   */
  it('ningún emisor escribe el nombre del parámetro a mano', () => {
    for (const ruta of EMISORES) {
      const fuente = leer(ruta)
      expect(fuente, `${ruta} debe importar recordLinkQuery`).toContain('recordLinkQuery')
      expect(fuente, `${ruta} escribe la query a mano`).not.toMatch(/query:\s*\{\s*otrosi:/)
      expect(fuente, `${ruta} escribe la query a mano`).not.toMatch(/query:\s*\{\s*item:/)
    }
  })

  it('ningún lector lee route.query a mano', () => {
    for (const ruta of LECTORES) {
      const fuente = leer(ruta)
      expect(fuente, `${ruta} debe usar useRecordLinkId`).toContain('useRecordLinkId')
      expect(fuente, `${ruta} lee route.query a mano`).not.toContain('route.query')
    }
  })
})

/**
 * La cadena, eslabón por eslabón. Cada `it` es una frase de §3.3 convertida en
 * comprobación: si alguna se borra del marcado, aquí se cae.
 */
describe('cada eslabón de la cadena tiene su vuelta', () => {
  it('desde un permiso se llega a la línea que lo paga, y desde la línea a sus permisos', () => {
    expect(leer(`${FEATURE}/components/record/EntitlementsTable.vue`)).toContain(
      'RECORD_LINK_PARAMS.ITEM',
    )
    // La vuelta, que es la que no existía (#161).
    expect(leer(`${FEATURE}/components/record/SubscriptionItemsTable.vue`)).toContain(
      'Los permisos que abrió',
    )
    expect(leer(`${FEATURE}/views/record/SubscriptionAccessView.vue`)).toContain('useRecordLinkId')
  })

  it('desde un otrosí se llega a sus líneas y a sus cargos, y desde los dos al otrosí', () => {
    const otrosi = leer(`${FEATURE}/components/record/AmendmentEntry.vue`)
    expect(otrosi).toContain('Ver las líneas que abrió y cerró')
    expect(otrosi).toContain('Ver los cargos que generó')
    // La vuelta: la ficha del otrosí es un ancla y sabe que se llegó a ella.
    expect(otrosi).toContain('otrosi-${amendment.id}')
    expect(otrosi).toContain('El otrosí desde el que llegaste')
    // Y «Historia» —que era sorda al parámetro— ya lo lee (#164, punto 1).
    expect(leer(`${FEATURE}/views/record/SubscriptionHistoryView.vue`)).toContain(
      'RECORD_LINK_PARAMS.AMENDMENT',
    )
  })

  it('desde una línea se llega al otrosí que la abrió y al que la cerró', () => {
    const tabla = leer(`${FEATURE}/components/record/SubscriptionItemsTable.vue`)
    expect(tabla).toContain('row.item.createdAmendmentId')
    expect(tabla).toContain('row.item.endedAmendmentId')
    expect(tabla).toContain('Los cargos que generó')
  })

  it('desde un cargo se llega a su documento, a su otrosí y a su línea', () => {
    const cadena = leer(`${FEATURE}/components/record/ChargeChain.vue`)
    expect(cadena).toContain('charge.billingDocumentId')
    expect(cadena).toContain('RECORD_LINK_PARAMS.AMENDMENT')
    expect(cadena).toContain('RECORD_LINK_PARAMS.ITEM')
  })
})

/**
 * <b>Cuando el destino no encuentra lo señalado, lo dice.</b> Es la convención que
 * fijaron las cinco instancias del expediente, y la que separa «no está en esta
 * página» —un hecho de la interfaz— de «no existe», que es una conclusión sobre el
 * contrato del cliente. Las cuatro sub-vistas tienen que decir algo.
 */
describe('ningún destino se queda callado cuando no encuentra lo señalado', () => {
  it('las cuatro sub-vistas anuncian el resultado del enlace en una región educada', () => {
    for (const ruta of LECTORES) {
      const fuente = leer(ruta)
      expect(fuente, `${ruta} no construye ningún aviso de enlace`).toMatch(
        /linkNotice|amendmentNotice/,
      )
      expect(fuente, `${ruta} debe anunciarlo con role="status"`).toContain('role="status"')
    }
  })

  it('«Acceso» explica que el permiso puede estar en el listado completo', () => {
    // El modo por defecto es «lo que puede usar hoy»: un permiso caducado que la
    // línea abrió NO está en esa tabla, y decir solo «no se encontró» dejaría al
    // operador concluyendo que la línea nunca dio acceso a nada.
    expect(leer(`${FEATURE}/views/record/SubscriptionAccessView.vue`)).toContain(
      'El listado completo',
    )
  })

  it('«Dinero» declara que el cruce es sobre la página, porque el servidor no filtra', () => {
    // Límite real heredado del backend (#463): `GET /subscription-billing/charges`
    // no acepta filtrar por otrosí ni por línea. La pantalla lo dice en vez de
    // aparentar un filtro completo sobre el contrato.
    expect(leer(`${FEATURE}/views/record/SubscriptionMoneyView.vue`)).toContain(
      'el servidor no permite pedir los cargos de un otrosí ni de una línea concretos',
    )
  })

  it('«Historia» distingue «no cabe» de «no existe» cuando la película viene truncada', () => {
    expect(leer(`${FEATURE}/views/record/SubscriptionHistoryView.vue`)).toContain(
      'es probable que se haya quedado fuera por el tope, no que no exista',
    )
  })
})

/**
 * Lo señalado tiene que poder recibir el foco: `focus()` sobre un `<tr>` o un
 * `<article>` sin `tabindex="-1"` no hace absolutamente nada, y quien llega por el
 * enlace se queda en `<body>` con la fila prometida fuera de la pantalla.
 */
describe('lo señalado es alcanzable con el teclado', () => {
  const ANCLAS: [string, string][] = [
    [`${FEATURE}/components/record/SubscriptionItemsTable.vue`, 'linea-${row.item.id}'],
    [`${FEATURE}/components/record/SubscriptionChargesTable.vue`, 'cargo-${charge.id}'],
    [`${FEATURE}/components/record/EntitlementsTable.vue`, 'permiso-${row.id}'],
    [`${FEATURE}/components/record/AmendmentEntry.vue`, 'otrosi-${amendment.id}'],
  ]

  it('cada fila señalable lleva su ancla estable y tabindex negativo', () => {
    for (const [ruta, ancla] of ANCLAS) {
      const fuente = leer(ruta)
      expect(fuente, `${ruta} no declara el ancla ${ancla}`).toContain(ancla)
      expect(fuente, `${ruta} no puede recibir el foco`).toContain('tabindex="-1"')
    }
  })
})

/**
 * Las cuatro sub-vistas de la cadena tienen que estar registradas para que los
 * enlaces se pinten: cada emisor cae a texto sin enlace si su destino no existe,
 * así que una pestaña que desaparezca degrada la cadena en silencio.
 */
describe('las sub-vistas destino de la cadena están registradas', () => {
  it('contratado, historia, acceso y dinero son pestañas del expediente', () => {
    const segmentos = subscriptionRecordTabs.map((tab) => tab.segment)
    expect(segmentos).toEqual(
      expect.arrayContaining(['contratado', 'historia', 'acceso', 'dinero']),
    )
  })
})
