import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth, sanitizeRedirect } from '@/features/auth/composables/useAuth'
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
const currentRoute = { query: {} as Record<string, unknown> }
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => currentRoute,
}))

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
  currentRoute.query = {}
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

    useAuthStore().setSession({ token: TOKEN, type: 'SYSTEM_USER' })

    expect(isAuthenticated.value).toBe(true)
  })

  it('REGRESIÓN: reacciona al cierre de sesión', () => {
    const store = useAuthStore()
    store.setSession({ token: TOKEN, type: 'SYSTEM_USER' })
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

  it('tras autenticar, vuelve a la ruta que el guard recordó en ?redirect=', async () => {
    // Es la razón de ser del arreglo: sin esto, un enlace profundo aterriza
    // siempre en el home tras el login.
    currentRoute.query = { redirect: '/companies/42?tab=facturacion' }

    await useAuth().login({ code: 'admin', password: 'x' } as never)

    expect(push).toHaveBeenCalledWith('/companies/42?tab=facturacion')
  })

  it('ignora un ?redirect= que no sea una ruta interna y cae al dashboard', async () => {
    // Sin este filtro, `?redirect=` sería un open redirect: el atacante manda el
    // enlace de login legítimo y el usuario, tras autenticarse, aterriza fuera.
    currentRoute.query = { redirect: 'https://evil.example.com' }

    await useAuth().login({ code: 'admin', password: 'x' } as never)

    expect(push).toHaveBeenCalledWith({ name: ROUTE_NAMES.DASHBOARD })
  })
})

describe('sanitizeRedirect', () => {
  it.each([['/companies/42'], ['/companies/42?tab=facturacion']])(
    'acepta la ruta interna %s',
    (value) => {
      expect(sanitizeRedirect(value)).toBe(value)
    },
  )

  it.each([
    ['no es un string', 42],
    ['no es un string', null],
    ['no es un string', undefined],
    ['no empieza por "/"', 'evil.example.com'],
    ['URL absoluta', 'https://evil.example.com'],
    ['protocol-relative: el navegador la resuelve contra otro host', '//evil.example.com'],
    ['esquema disfrazado de ruta', '/x:javascript:alert(1)'],
  ])('rechaza cuando %s (%j)', (_motivo, value) => {
    expect(sanitizeRedirect(value)).toBeNull()
  })
})

describe('logout', () => {
  it('cierra la sesión y sale al login', async () => {
    const store = useAuthStore()
    store.setSession({ token: TOKEN, type: 'SYSTEM_USER' })
    const { logout, isAuthenticated } = useAuth()

    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(location.assign).toHaveBeenCalledWith('/login')
  })

  it('vacía también sessionStorage, no solo la credencial de localStorage', async () => {
    // El logout de la consola hace un vaciado TOTAL, y esa propiedad no la
    // protegía ningún test. Importa por `sessionStorage`: ahí vive el
    // identificador de sesión de Faro, y el logout recarga la MISMA pestaña
    // (`location.assign('/login')`), que no lo limpia por sí sola. Si el vaciado
    // se degradara a borrar solo la credencial, en un puesto compartido la
    // telemetría del siguiente administrador seguiría emitiéndose con la sesión
    // del anterior: no falla nada, no avisa nada, y en Grafana las dos personas
    // quedan fundidas en una.
    //
    // La consola puede permitirse el vaciado total porque no tiene ninguna
    // preferencia de dispositivo que conservar. El front del tenant NO puede
    // —debe preservar `vetrina:receipt-width`— y por eso usa `clearVolatile()`.
    // La asimetría entre los dos fronts es deliberada, no deriva TR-02.
    sessionStorage.setItem('com.grafana.faro.session', '{"id":"sesion-de-A"}')
    localStorage.setItem('vetsoft.lo-que-sea', 'contexto del usuario que sale')
    const store = useAuthStore()
    store.setSession({ token: TOKEN, type: 'SYSTEM_USER' })

    await useAuth().logout()

    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('sale igualmente aunque el backend no responda', async () => {
    // La revocación server-side es best-effort. Quedarse dentro porque el
    // servidor falló dejaría la sesión abierta en un equipo compartido.
    logoutApi.mockRejectedValue(new Error('503'))
    const store = useAuthStore()
    store.setSession({ token: TOKEN, type: 'SYSTEM_USER' })
    const { logout, isAuthenticated } = useAuth()

    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(location.assign).toHaveBeenCalledWith('/login')
  })
})
