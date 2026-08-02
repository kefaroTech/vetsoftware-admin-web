const TOKEN_KEY = 'vet_token'
const REFRESH_KEY = 'vet_refresh'

export const storageService = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  removeToken: (): void => localStorage.removeItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token: string): void => localStorage.setItem(REFRESH_KEY, token),
  removeRefreshToken: (): void => localStorage.removeItem(REFRESH_KEY),
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
