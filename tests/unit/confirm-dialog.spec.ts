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
