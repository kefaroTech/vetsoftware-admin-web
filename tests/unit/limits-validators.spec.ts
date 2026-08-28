import { describe, expect, it } from 'vitest'
import {
  validateAvailableFrom,
  validateCode,
  validateName,
  validateReleaseDelayDays,
  validateSubModuleId,
} from '@/features/limits/components/LimitDimensionForm.vue'
import { validateCompanyId } from '@/features/limits/components/CompanyScopePicker.vue'
import { validateEventRange } from '@/features/limits/components/EventScopeForm.vue'
import {
  validateLimitQuantity,
  validateValidFrom,
} from '@/features/limits/components/GrantOverrideModal.vue'

describe('el código de un eje', () => {
  it('acepta el formato que el catálogo usa de verdad', () => {
    expect(validateCode('PET_COUNT')).toBeNull()
    expect(validateCode('USERS')).toBeNull()
    expect(validateCode('INVOICES_2')).toBeNull()
  })

  it('rechaza minúsculas, espacios y arranque por dígito', () => {
    expect(validateCode('pet_count')).not.toBeNull()
    expect(validateCode('PET COUNT')).not.toBeNull()
    expect(validateCode('2PETS')).not.toBeNull()
  })

  it('exige al menos dos caracteres y no pasa de los cincuenta del contrato', () => {
    expect(validateCode('P')).not.toBeNull()
    expect(validateCode('A'.repeat(51))).not.toBeNull()
    expect(validateCode('A'.repeat(50))).toBeNull()
  })
})

describe('el nombre de un eje', () => {
  it('exige dos caracteres y respeta el máximo de 120 del contrato', () => {
    expect(validateName(' ')).not.toBeNull()
    expect(validateName('Mascotas registradas')).toBeNull()
    expect(validateName('a'.repeat(120))).toBeNull()
    expect(validateName('a'.repeat(121))).not.toBeNull()
  })
})

describe('el submódulo de un eje', () => {
  /** Vacío es válido: no todos los ejes cuelgan de un submódulo. */
  it('sin submódulo es válido', () => {
    expect(validateSubModuleId(null)).toBeNull()
  })

  it('un identificador que no puede existir se rechaza', () => {
    expect(validateSubModuleId(0)).not.toBeNull()
    expect(validateSubModuleId(-1)).not.toBeNull()
    expect(validateSubModuleId(12)).toBeNull()
  })
})

describe('los días de gracia', () => {
  /**
   * Vacío significa «no hay gracia declarada», que NO es lo mismo que cero:
   * cero prometería liberación inmediata, y eso el catálogo no lo ha dicho.
   */
  it('vacío es válido y es un estado distinto de cero', () => {
    expect(validateReleaseDelayDays('')).toBeNull()
    expect(validateReleaseDelayDays('   ')).toBeNull()
    expect(validateReleaseDelayDays('0')).toBeNull()
  })

  it('rechaza negativos, decimales y disparates', () => {
    expect(validateReleaseDelayDays('-1')).not.toBeNull()
    expect(validateReleaseDelayDays('1,5')).not.toBeNull()
    expect(validateReleaseDelayDays('4000')).not.toBeNull()
  })
})

describe('las fechas del eje y de la excepción', () => {
  it('acepta una fecha real y rechaza la que no existe en el calendario', () => {
    expect(validateAvailableFrom('2026-03-01')).toBeNull()
    // `new Date('2026-02-31')` no es `Invalid Date`: es el 3 de marzo. Sin la
    // comprobación de calendario, el formulario aceptaría una fecha que el
    // usuario nunca escribió.
    expect(validateAvailableFrom('2026-02-31')).not.toBeNull()
    expect(validateAvailableFrom('')).not.toBeNull()
    expect(validateAvailableFrom('01/03/2026')).not.toBeNull()
  })

  it('la fecha de la excepción usa el mismo criterio', () => {
    expect(validateValidFrom('2026-03-01')).toBeNull()
    expect(validateValidFrom('2026-02-31')).not.toBeNull()
    expect(validateValidFrom('')).not.toBeNull()
  })
})

describe('el techo concedido en una excepción', () => {
  /**
   * Un techo de cero no es una excepción: es dejar a la cuenta sin poder crear
   * nada. Si alguien quiere eso, hay otras palancas — no esta.
   */
  it('rechaza el cero y los negativos', () => {
    expect(validateLimitQuantity('0')).not.toBeNull()
    expect(validateLimitQuantity('-5')).not.toBeNull()
    expect(validateLimitQuantity('')).not.toBeNull()
    expect(validateLimitQuantity('250')).toBeNull()
  })
})

describe('el identificador de empresa', () => {
  /** Aquí la empresa NO es opcional: sin ella no hay ninguna consulta que hacer. */
  it('vacío no vale, a diferencia del filtro de cobranza', () => {
    expect(validateCompanyId('')).not.toBeNull()
    expect(validateCompanyId('   ')).not.toBeNull()
  })

  it('exige un entero positivo', () => {
    expect(validateCompanyId('42')).toBeNull()
    expect(validateCompanyId('0')).not.toBeNull()
    expect(validateCompanyId('4a')).not.toBeNull()
  })
})

describe('la ventana de la bitácora', () => {
  it('las dos fechas son obligatorias porque el endpoint las exige', () => {
    expect(validateEventRange('', '2026-03-01').from).not.toBeNull()
    expect(validateEventRange('2026-03-01', '').to).not.toBeNull()
  })

  /**
   * Un rango invertido no devuelve «nada»: devuelve un imposible, y sin este
   * aviso la pantalla lo pintaría como «a este cliente no le ha pasado nada»,
   * que es una afirmación falsa.
   */
  it('avisa del rango invertido en vez de dejar que parezca un vacío', () => {
    expect(validateEventRange('2026-03-10', '2026-03-01').to).not.toBeNull()
    expect(validateEventRange('2026-03-01', '2026-03-10')).toEqual({ from: null, to: null })
    expect(validateEventRange('2026-03-01', '2026-03-01')).toEqual({ from: null, to: null })
  })
})
