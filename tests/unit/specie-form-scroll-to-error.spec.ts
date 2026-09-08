import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import SpecieForm from '@/features/species/components/SpecieForm.vue'
import { scrollToFirstError } from '@/composables/scrollToError'

vi.mock('@/composables/scrollToError', () => ({
  scrollToFirstError: vi.fn(),
}))

let wrapper: VueWrapper | null = null

function montar() {
  wrapper = mount(SpecieForm)
  return wrapper
}

afterEach(() => {
  vi.mocked(scrollToFirstError).mockClear()
  wrapper?.unmount()
  wrapper = null
})

describe('SpecieForm — desplazamiento al error tras un envío inválido', () => {
  it('con el nombre vacío, el envío desplaza al primer campo inválido', async () => {
    const w = montar()

    await w.find('form').trigger('submit')

    expect(scrollToFirstError).toHaveBeenCalledTimes(1)
    expect(w.emitted('submit')).toBeUndefined()
  })

  it('con el nombre válido, el envío emite `submit` sin desplazar', async () => {
    const w = montar()

    await w.find('input').setValue('Canino')
    await w.find('form').trigger('submit')

    expect(scrollToFirstError).not.toHaveBeenCalled()
    expect(w.emitted('submit')).toEqual([[{ name: 'Canino' }]])
  })
})
