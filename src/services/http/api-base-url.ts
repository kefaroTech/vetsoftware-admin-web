export function createApiBaseUrl(apiUrl: string | undefined): string {
  const normalizedOrigin = apiUrl?.trim().replace(/\/+$/, '') ?? ''
  return `${normalizedOrigin}/api/v1`
}
