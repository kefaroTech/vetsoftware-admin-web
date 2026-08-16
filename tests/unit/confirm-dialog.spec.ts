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

  it('DEFECTO: un segundo confirm deja la primera promesa sin resolver nunca', async () => {
    // `confirm` pisa el resolver anterior. Quien esperaba la primera respuesta
    // se queda esperando para siempre: si ese `await` estaba dentro de un
    // `try/finally` que apaga un spinner o libera un bloqueo, no se ejecuta
    // nunca y no hay ningún error que lo delate.
    const store = useConfirmDialogStore()
    let primeraResuelta = false
    const primera = store.confirm('¿Eliminar la especie?')
    primera.then(() => {
      primeraResuelta = true
    })
    const segunda = store.confirm('¿Eliminar la raza?')

    store.accept()

    await expect(segunda).resolves.toBe(true)
    // Esperarla colgaría la prueba, así que se comprueba que su `then` no llegó
    // a correr después de vaciar la cola de microtareas.
    await Promise.resolve()
    await Promise.resolve()

    expect(primeraResuelta).toBe(false)
  })
})
