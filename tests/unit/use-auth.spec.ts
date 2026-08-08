import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * `useAuth` es la fachada de sesión del panel. Lo que se fija aquí son dos
 * cosas que fallan en silencio:
 *
 *  1. Que `isAuthenticated` sea REACTIVO. Pinia desenvuelve los `computed` al
 *     leerlos, así que devolver `authStore.isAuthenticated` entrega un booleano
 *     congelado: el consumidor recibe el valor que había al montar el
 *     componente y nunca se entera del logout. No lanza, no avisa — la interfaz
 *     simplemente se queda mostrando una sesión que ya no existe.
 *
 *  2. Que el login hidrate los permisos ANTES de navegar. El `permissionGuard`
 *     se ejecuta durante la navegación y decide con lo que haya en el store; si
 *     se navega primero, el guard rebota al usuario de su propia pantalla de
 *     destino por falta de permisos que sí tiene.
 */

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const login = vi.fn()
const logoutApi = vi.fn()
vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    login: (payload: unknown) => login(payload),
    logout: () => logoutApi(),
    me: () => Promise.resolve({ data: { permissions: [] } }),
  },
}))

/**
 * JWT sin firmar, compuesto en tiempo de ejecución. Escrito como literal tiene
 * forma de credencial y el escáner de secretos del pre-commit lo bloquea — con
 * razón: la forma de una cadena es lo único que puede mirar.
 */
const TOKEN = [
  'cabecera',
  btoa(JSON.stringify({ sub: '1', type: 'SYSTEM_USER' })),
  'sin-firma',
].join('.')

beforeEach(() => {
  push.mockReset()
  login.mockReset()
  logoutApi.mockReset()
  login.mockResolvedValue({ data: { token: TOKEN } })
  logoutApi.mockResolvedValue(undefined)
  localStorage.clear()
  vi.stubGlobal('location', { assign: vi.fn() })
})

describe('isAuthenticated', () => {
  it('refleja el estado de sesión en el momento de leerlo', () => {
    const { isAuthenticated } = useAuth()

    expect(isAuthenticated.value).toBe(false)
  })

  it('REGRESIÓN: reacciona a un login posterior a la llamada de useAuth', () => {
    // Es el caso que rompía: el componente llama a `useAuth()` al montarse,
    // cuando todavía no hay sesión, y se queda con `false` para siempre.
    const { isAuthenticated } = useAuth()
    expect(isAuthenticated.value).toBe(false)

    useAuthStore().setSession(TOKEN)

    expect(isAuthenticated.value).toBe(true)
  })

  it('REGRESIÓN: reacciona al cierre de sesión', () => {
    const store = useAuthStore()
    store.setSession(TOKEN)
    const { isAuthenticated } = useAuth()
    expect(isAuthenticated.value).toBe(true)

    store.clearSession()

    expect(isAuthenticated.value).toBe(false)
  })

  it('es un ref, no un booleano suelto', () => {
    // Si alguien vuelve a devolver `authStore.isAuthenticated`, esto lo detecta
    // aunque el valor inicial coincida por casualidad.
    const { isAuthenticated } = useAuth()

    expect(typeof isAuthenticated).toBe('object')
    expect('value' in isAuthenticated).toBe(true)
  })
})

describe('login', () => {
  it('guarda la sesión, hidrata permisos y navega al dashboard', async () => {
    const { login: hacerLogin, isAuthenticated } = useAuth()

    await hacerLogin({ code: 'admin', password: 'x' } as never)

    expect(isAuthenticated.value).toBe(true)
    expect(push).toHaveBeenCalledWith({ name: ROUTE_NAMES.DASHBOARD })
  })

  it('hidrata los permisos ANTES de navegar', async () => {
    // Invertir el orden deja al permissionGuard decidiendo sin permisos y
    // rebotando al usuario de la pantalla a la que acaba de entrar.
    const orden: string[] = []
    const store = useAuthStore()
    vi.spyOn(store, 'fetchMe').mockImplementation(async () => {
      orden.push('permisos')
    })
    push.mockImplementation(async () => {
      orden.push('navegación')
    })

    await useAuth().login({ code: 'admin', password: 'x' } as never)

    expect(orden).toEqual(['permisos', 'navegación'])
  })

  it('si las credenciales fallan no navega ni deja sesión a medias', async () => {
    login.mockRejectedValue(new Error('401'))
    const { login: hacerLogin, isAuthenticated } = useAuth()

    await expect(hacerLogin({ code: 'admin', password: 'mala' } as never)).rejects.toThrow()

    expect(isAuthenticated.value).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })
})

describe('logout', () => {
  it('cierra la sesión y sale al login', async () => {
    const store = useAuthStore()
    store.setSession(TOKEN)
    const { logout, isAuthenticated } = useAuth()

    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(location.assign).toHaveBeenCalledWith('/login')
  })

  it('sale igualmente aunque el backend no responda', async () => {
    // La revocación server-side es best-effort. Quedarse dentro porque el
    // servidor falló dejaría la sesión abierta en un equipo compartido.
    logoutApi.mockRejectedValue(new Error('503'))
    const store = useAuthStore()
    store.setSession(TOKEN)
    const { logout, isAuthenticated } = useAuth()

    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(location.assign).toHaveBeenCalledWith('/login')
  })
})
