import { describe, expect, it } from 'vitest'
import { createApiBaseUrl } from '@/services/http/api-base-url'

describe('createApiBaseUrl', () => {
  it('creates an absolute API URL without duplicate slashes', () => {
    expect(createApiBaseUrl('https://api.vetsoftware.co/')).toBe(
      'https://api.vetsoftware.co/api/v1',
    )
  })

  it('keeps local proxy mode relative when the origin is empty', () => {
    expect(createApiBaseUrl('')).toBe('/api/v1')
    expect(createApiBaseUrl(undefined)).toBe('/api/v1')
  })
})
