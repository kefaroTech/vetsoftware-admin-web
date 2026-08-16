/** Sujeto al que pertenece la sesión. Lo declara el backend en `TokenResponse.type`. */
export type AuthSubjectType = 'EMPLOYEE' | 'SYSTEM_USER'

/**
 * Lo único que este código persiste de una sesión.
 *
 * El refresh token estaba en `localStorage` y lo podía leer cualquier script de
 * la página. Dura 30 días, así que un XSS no se llevaba una sesión de 15 minutos:
 * se llevaba un mes de acceso reutilizable fuera del navegador de la víctima.
 * Ahora lo emite el backend en una cookie `HttpOnly` con `Path=/auth`, invisible
 * para JavaScript, y por eso no aparece aquí.
 *
 * El access token se queda en `localStorage` a propósito: dura 15 minutos y es lo
 * que permite recargar la página sin volver a pasar por `/auth/refresh`. Un XSS
 * todavía puede robarlo, pero la ventana es de minutos y no es renovable.
 */
export interface AuthSession {
  token: string
  type: AuthSubjectType
}

export const AUTH_STORAGE_KEY = 'vetsoft.auth'

/**
 * Aviso de sesión desplazada. Vive en `sessionStorage` y no en el store porque
 * lo escribe el interceptor de axios justo antes de un redirect duro a /login:
 * el store se destruye en la recarga, `sessionStorage` sobrevive a ella.
 */
export const SESSION_REPLACED_NOTICE_KEY = 'vetsoft.auth.session-replaced'

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed?.token || !parsed?.type) return null
    return { token: parsed.token, type: parsed.type }
  } catch {
    // Entrada corrupta: se descarta en vez de arrastrarla en cada petición.
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

/**
 * Único punto de acceso al almacenamiento del navegador. Los dos fronts lo
 * comparten byte a byte: la capa HTTP llama a `getSession()` en cada petición y
 * a `clearSession()` cuando el refresh ya no es posible, y ninguna de las dos
 * cosas debe depender de cómo guarde la sesión cada aplicación.
 */
export const storageService = {
  getSession: readSession,

  getToken: (): string | null => readSession()?.token ?? null,

  setSession(session: AuthSession): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  },

  /** Elimina solo las credenciales; conserva preferencias y el aviso de sesión desplazada. */
  clearSession(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },

  /** Vaciado total. Reservado al logout explícito, no a la expiración de un token. */
  clearAll(): void {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  },

  takeSessionReplacedNotice(): string | null {
    const notice = sessionStorage.getItem(SESSION_REPLACED_NOTICE_KEY)
    if (notice) sessionStorage.removeItem(SESSION_REPLACED_NOTICE_KEY)
    return notice
  },

  setSessionReplacedNotice(message: string): void {
    sessionStorage.setItem(SESSION_REPLACED_NOTICE_KEY, message)
  },
}
