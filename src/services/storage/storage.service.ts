const TOKEN_KEY = 'vet_token'

/**
 * Solo el access token vive aquí.
 *
 * El refresh token estaba en `localStorage` bajo `vet_refresh` y lo podía leer
 * cualquier script de la página. Dura 30 días, así que un XSS no se llevaba una
 * sesión de 15 minutos: se llevaba un mes de acceso reutilizable fuera del
 * navegador de la víctima. Ahora lo emite el backend en una cookie `HttpOnly`
 * con `Path=/auth`, invisible para JavaScript.
 *
 * El access token se queda en `localStorage` a propósito: dura 15 minutos y es
 * lo que permite recargar la página sin volver a pasar por `/auth/refresh`. Un
 * XSS todavía puede robarlo, pero la ventana es de minutos y no renovable.
 */
export const storageService = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  removeToken: (): void => localStorage.removeItem(TOKEN_KEY),
  clear: (): void => localStorage.clear(),
  clearAll: (): void => {
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
}
