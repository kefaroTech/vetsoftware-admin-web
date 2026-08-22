import { describe, it, expect } from 'vitest'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'

/**
 * El diálogo de confirmación. Sin lógica de negocio y por eso nadie lo mira,
 * pero puede dejar la aplicación inutilizable sin lanzar un solo error: una
 * promesa que no resuelve nunca y una acción del usuario que se queda a medias
 * sin decir nada.
 *
 * Solo existe en esta consola; el front operativo resuelve la confirmación con
 * un componente por caso.
 */

describe('diálogo de confirmación', () => {
  it('aceptar resuelve a verdadero', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm('¿Eliminar la especie?')
    expect(store.isOpen).toBe(true)
    expect(store.message).toBe('¿Eliminar la especie?')
    store.accept()

    await expect(respuesta).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
  })

  it('cancelar resuelve a falso', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm('¿Eliminar?')
    store.cancel()

    await expect(respuesta).resolves.toBe(false)
    expect(store.isOpen).toBe(false)
  })

  it('aceptar dos veces no vuelve a resolver', async () => {
    // Un doble clic en "Aceptar" no debe ejecutar la acción destructiva dos
    // veces: el segundo `accept` ya no tiene a quién resolver.
    const store = useConfirmDialogStore()
    const respuesta = store.confirm('¿Eliminar?')

    store.accept()
    expect(() => store.accept()).not.toThrow()

    await expect(respuesta).resolves.toBe(true)
  })

  it('cancelar después de aceptar no cambia la respuesta ya dada', async () => {
    const store = useConfirmDialogStore()
    const respuesta = store.confirm('¿Eliminar?')

    store.accept()
    store.cancel()

    await expect(respuesta).resolves.toBe(true)
  })

  it('un segundo confirm cancela el primero', async () => {
    // Abrir una pregunta nueva con otra pendiente resuelve la anterior con
    // `false`: el usuario nunca la respondió, así que la respuesta segura es
    // «no». Quien la esperaba continúa —y ejecuta su `finally`— en vez de
    // quedarse colgado para siempre sin ningún error que lo delate.
    const store = useConfirmDialogStore()
    const primera = store.confirm('¿Eliminar la especie?')
    const segunda = store.confirm('¿Eliminar la raza?')

    expect(store.message).toBe('¿Eliminar la raza?')
    await expect(primera).resolves.toBe(false)

    store.accept()

    await expect(segunda).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
  })
})

/**
 * Las dos formas de llamada.
 *
 * `confirm('texto')` es la que usan las 16 vistas de catálogo y NO se reescribió:
 * la sobrecarga existe justamente para no tener que tocarlas. Eso deja dos
 * caminos vivos por el mismo `confirm`, y el riesgo no está en ninguno de los
 * dos por separado sino en la mezcla — el store es un singleton y sus refs
 * sobreviven de un diálogo al siguiente, así que un campo opcional que no se
 * reinicia sale pintado en la pregunta de otra vista.
 *
 * WCAG 2.2 §3.3.4 pide que el botón NOMBRE la acción y que se advierta qué se
 * pierde; lo que se comprueba aquí es que ambas cosas lleguen al store y que la
 * forma antigua no herede lo que dijo la anterior.
 */
describe('formas de llamada y campos opcionales', () => {
  it('la forma de objeto lleva la consecuencia y el rótulo con la acción nombrada', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm({
      message: '¿Eliminar la empresa "Veterinaria Kefaro"?',
      consequence:
        'Se eliminan sus empleados, sedes e historia clínica. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar empresa',
    })

    expect(store.isOpen).toBe(true)
    expect(store.message).toBe('¿Eliminar la empresa "Veterinaria Kefaro"?')
    expect(store.consequence).toBe(
      'Se eliminan sus empleados, sedes e historia clínica. Esta acción no se puede deshacer.',
    )
    expect(store.confirmLabel).toBe('Eliminar empresa')

    // La sobrecarga no cambia el contrato: sigue resolviendo como siempre.
    store.accept()
    await expect(respuesta).resolves.toBe(true)
  })

  it('la forma de objeto sin campos opcionales cae a los valores por defecto', async () => {
    // `{ message }` a secas debe comportarse EXACTAMENTE como la forma de
    // string: sin banner de consecuencia y con «Confirmar» en el botón.
    const store = useConfirmDialogStore()

    const respuesta = store.confirm({ message: '¿Desactivar el módulo?' })

    expect(store.message).toBe('¿Desactivar el módulo?')
    expect(store.consequence).toBeNull()
    expect(store.confirmLabel).toBe('Confirmar')

    store.cancel()
    await expect(respuesta).resolves.toBe(false)
  })

  it('la forma de string sigue funcionando y nace sin consecuencia ni rótulo propio', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm('¿Eliminar la especie?')

    expect(store.message).toBe('¿Eliminar la especie?')
    expect(store.consequence).toBeNull()
    expect(store.confirmLabel).toBe('Confirmar')

    store.accept()
    await expect(respuesta).resolves.toBe(true)
  })

  it('un diálogo sin consecuencia no hereda la del anterior', async () => {
    // El defecto que solo aparece con el store compartido: si `consequence` y
    // `confirmLabel` se asignaran solo cuando vienen, la siguiente vista —una de
    // las 16 que llaman con string— pintaría el banner de «se eliminan sus
    // empleados y su historia clínica» sobre «¿Eliminar la especie?», y el botón
    // diría «Eliminar empresa». Sería una advertencia falsa en una acción menor,
    // que es la forma más rápida de que el usuario deje de leer las de verdad.
    const store = useConfirmDialogStore()

    const primera = store.confirm({
      message: '¿Eliminar la empresa?',
      consequence: 'Se lleva por delante el tenant entero.',
      confirmLabel: 'Eliminar empresa',
    })
    store.cancel()
    await expect(primera).resolves.toBe(false)

    const segunda = store.confirm('¿Eliminar la especie?')

    expect(store.consequence).toBeNull()
    expect(store.confirmLabel).toBe('Confirmar')

    store.accept()
    await expect(segunda).resolves.toBe(true)
  })
})
