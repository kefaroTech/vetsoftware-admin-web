import { describe, expect, it } from 'vitest'
import {
  HINT_MAX_LENGTH,
  HINT_EMPTY_MESSAGE,
  HINT_TOO_FEW_BLOCKS_MESSAGE,
  hintFirstBlock,
  hintServerError,
  joinBlocks,
  signerLabel,
  splitBlocks,
  deSujeto,
  deSujetoEntrecomillado,
  parentesisDelCodigo,
  sujetoCorto,
  validateHintBlock,
  validateHintLength,
  validateHintText,
} from '@/features/catalog-ai-hints/composables/hintText'

/**
 * La regla de la pista, que es lo único de esta pantalla que decide de verdad
 * qué llega al servidor.
 *
 * <p>Se prueba aquí y no a través del componente porque es donde vive: el
 * compositor solo la invoca. Y se prueba con los <b>textos literales</b>, no con
 * «devuelve algo no vacío»: el resumen de errores y el mensaje en línea tienen
 * que ser la misma cadena (GOV.UK), así que si el texto cambia sin querer, esta
 * prueba es la que lo dice.
 */

describe('splitBlocks parte igual que el servidor', () => {
  it('un texto sin línea en blanco es un solo bloque', () => {
    expect(splitBlocks('una sola frase')).toEqual(['una sola frase'])
  })

  it('tres bloques separados por línea en blanco son tres', () => {
    expect(splitBlocks('uno\n\ndos\n\ntres')).toEqual(['uno', 'dos', 'tres'])
  })

  it('cuatro bloques son cuatro: no se recortan a tres', () => {
    // Es la razón de que exista el modo de texto libre. Si esto devolviera tres,
    // el compositor perdería el cuarto sin decirlo.
    expect(splitBlocks('uno\n\ndos\n\ntres\n\ncuatro')).toHaveLength(4)
  })

  it('acepta CRLF, que es lo que llega de un copiado desde Windows', () => {
    expect(splitBlocks('uno\r\n\r\ndos\r\n\r\ntres')).toEqual(['uno', 'dos', 'tres'])
  })

  it('una línea de solo espacios separa igual, como el `\\R\\s*\\R` del servidor', () => {
    expect(splitBlocks('uno\n   \ndos\n\t\ntres')).toEqual(['uno', 'dos', 'tres'])
  })

  it('el texto vacío no produce ningún bloque', () => {
    expect(splitBlocks('   \n\n  ')).toEqual([])
  })
})

describe('joinBlocks recorta y une con exactamente una línea en blanco', () => {
  it('mete `\\n\\n` entre bloques y ni uno más', () => {
    expect(joinBlocks(['  uno  ', 'dos', ' tres'])).toBe('uno\n\ndos\n\ntres')
  })

  it('lo que une se vuelve a partir en los mismos bloques', () => {
    const bloques = ['qué es', 'las señales', 'cuándo no']
    expect(splitBlocks(joinBlocks(bloques))).toEqual(bloques)
  })
})

describe('validateHintText da los mensajes exactos', () => {
  it('vacío', () => {
    expect(validateHintText('   ')).toBe(HINT_EMPTY_MESSAGE)
    expect(HINT_EMPTY_MESSAGE).toBe(
      'Escribe la pista: sin texto el asistente no puede proponer este artículo.',
    )
  })

  it('menos de tres bloques', () => {
    expect(validateHintText('uno\n\ndos')).toBe(HINT_TOO_FEW_BLOCKS_MESSAGE)
  })

  it('tres bloques dentro del tope: sin error', () => {
    expect(validateHintText('uno\n\ndos\n\ntres')).toBe('')
  })

  it('más de tres bloques también vale: el dominio exige AL MENOS tres', () => {
    expect(validateHintText('uno\n\ndos\n\ntres\n\ncuatro')).toBe('')
  })

  it('pasarse de 1000 caracteres dice cuántos sobran', () => {
    const largo = ['a'.repeat(500), 'b'.repeat(500), 'c'.repeat(42)].join('\n\n')
    expect(largo.length).toBe(1046)
    expect(validateHintText(largo)).toBe(
      'La pista no puede pasar de 1000 caracteres. Ahora tiene 1046: sobran 46.',
    )
  })

  it('la longitud se mide sobre el texto UNIDO, separadores incluidos', () => {
    // Tres bloques que suman exactamente 1000 caracteres por separado se pasan
    // al unirlos, porque los dos `\n\n` cuentan. Medir campo a campo daría un
    // formulario en verde que el servidor rechaza con un 400.
    const bloques = ['a'.repeat(400), 'b'.repeat(400), 'c'.repeat(200)]
    expect(bloques.join('').length).toBe(HINT_MAX_LENGTH)
    expect(validateHintLength(joinBlocks(bloques))).not.toBe('')
    expect(joinBlocks(bloques).length).toBe(HINT_MAX_LENGTH + 4)
  })

  it('justo en el tope no da error', () => {
    expect(validateHintLength('x'.repeat(HINT_MAX_LENGTH))).toBe('')
    expect(validateHintLength('x'.repeat(HINT_MAX_LENGTH + 1))).not.toBe('')
  })
})

describe('validateHintBlock nombra el bloque que falta', () => {
  it.each([
    [0, 'Falta el qué es. Los tres bloques son obligatorios.'],
    [1, 'Faltan las señales. Los tres bloques son obligatorios.'],
    [2, 'Falta el contraejemplo. Los tres bloques son obligatorios.'],
  ])('el bloque %i vacío', (indice, mensaje) => {
    expect(validateHintBlock('  ', indice)).toBe(mensaje)
  })

  it('un bloque con texto no da error', () => {
    expect(validateHintBlock('algo', 0)).toBe('')
  })
})

describe('hintFirstBlock', () => {
  it('devuelve el primer bloque y no el texto entero', () => {
    expect(hintFirstBlock('qué es\n\nseñales\n\nno aplica')).toBe('qué es')
  })

  it('sobre un texto vacío devuelve cadena vacía y no revienta', () => {
    expect(hintFirstBlock('')).toBe('')
  })
})

describe('el sujeto nunca dice «null» ni «de el»', () => {
  const base = { catalogItemId: 42, catalogItemCode: 'GROOMING', catalogItemName: 'Peluquería' }
  const huerfano = { catalogItemId: 42, catalogItemCode: null, catalogItemName: null }

  it('prefiere el nombre, y detrás de «de» no contrae', () => {
    expect(deSujeto(base)).toBe('de Peluquería')
  })

  it('sin nombre cae al código', () => {
    expect(deSujeto({ ...base, catalogItemName: null })).toBe('de GROOMING')
  })

  it('sin nombre ni código contrae: «del artículo», nunca «de el artículo»', () => {
    // La contracción es obligatoria en español, y aquí la oye justo quien
    // depende del lector de pantalla: los tres controles de esa fila son
    // iconos sin texto visible, así que el `aria-label` es todo lo que hay.
    expect(deSujeto(huerfano)).toBe('del artículo #42')
    expect(deSujeto(huerfano)).not.toContain('de el')
    expect(deSujeto(huerfano)).not.toContain('null')
  })

  it('entrecomilla solo lo que es un nombre de verdad', () => {
    // Las comillas delimitan dónde acaba un nombre largo. Un descriptor
    // genérico no es un nombre: entrecomillarlo lo disfraza de nombre y
    // además impediría la contracción para no romper la cita.
    expect(deSujetoEntrecomillado(base)).toBe('de «Peluquería»')
    expect(deSujetoEntrecomillado(huerfano)).toBe('del artículo #42')
    expect(deSujetoEntrecomillado(huerfano)).not.toContain('«')
  })

  it('el sujeto corto prefiere el código, que es lo que titula los modales', () => {
    expect(sujetoCorto(base)).toBe('GROOMING')
    expect(sujetoCorto({ ...base, catalogItemCode: null })).toBe('Peluquería')
    expect(sujetoCorto({ catalogItemId: 9, catalogItemCode: null, catalogItemName: null })).toBe(
      '#9',
    )
  })
})

/**
 * El paréntesis del código en la pregunta del diálogo de retirada.
 *
 * <p>Las cuatro combinaciones, y no solo las que fallaban: un arreglo que
 * borrara el paréntesis SIEMPRE también quitaría la repetición, y sin el primer
 * caso pasaría en verde habiendo destruido lo único que el paréntesis aporta.
 */
describe('el paréntesis del código solo se pinta cuando desambigua', () => {
  it('con nombre Y código, desambigua: se pinta', () => {
    expect(
      parentesisDelCodigo({
        catalogItemId: 42,
        catalogItemCode: 'GROOMING',
        catalogItemName: 'Peluquería',
      }),
    ).toBe(' (GROOMING)')
  })

  it('sin nombre, el sujeto ya ES el código: no se repite', () => {
    expect(
      parentesisDelCodigo({
        catalogItemId: 42,
        catalogItemCode: 'GROOMING',
        catalogItemName: null,
      }),
    ).toBe('')
  })

  it('sin código, `sujetoCorto` cae al mismo nombre: no se repite', () => {
    expect(
      parentesisDelCodigo({
        catalogItemId: 42,
        catalogItemCode: null,
        catalogItemName: 'Peluquería',
      }),
    ).toBe('')
  })

  it('sin nombre ni código, el sujeto ya ES el identificador: no se repite', () => {
    // Era «¿Retirar la pista vigente del artículo #903 (#903)?»: el mismo
    // número dos veces en la frase que confirma que se apaga un artículo.
    expect(
      parentesisDelCodigo({ catalogItemId: 903, catalogItemCode: null, catalogItemName: null }),
    ).toBe('')
  })
})

describe('signerLabel', () => {
  it('escribe «tú» solo cuando el firmante es quien mira', () => {
    expect(signerLabel(7, 7)).toBe('tú (usuario #7)')
    expect(signerLabel(7, 8)).toBe('usuario #7')
    expect(signerLabel(7, null)).toBe('usuario #7')
  })
})

describe('hintServerError reparte los fallos del servidor', () => {
  it('el 409 de texto repetido tiene texto propio para el formulario', () => {
    expect(hintServerError('CATALOG_ITEM_AI_HINT_TEXT_ALREADY_PUBLISHED')).toContain(
      'Ese texto exacto ya se publicó antes para este artículo.',
    )
  })

  it('el 400 genérico de la regla de los tres bloques se traduce a lenguaje del operador', () => {
    // El `detail` del servidor es la constante «Los datos enviados no son
    // válidos.», que no dice cuál es el problema.
    expect(hintServerError('INVALID_INPUT')).toBe(HINT_TOO_FEW_BLOCKS_MESSAGE)
  })

  it('lo que no está en el mapa se devuelve como `null` para que salga por toast con su traza', () => {
    expect(hintServerError('FORBIDDEN')).toBeNull()
    expect(hintServerError(null)).toBeNull()
  })
})
