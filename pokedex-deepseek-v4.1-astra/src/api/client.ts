/**
 * Thin fetch wrapper around the official PokéAPI REST endpoints.
 * All network access in the app funnels through here.
 */

export const API_BASE = 'https://pokeapi.co/api/v2'
export const REQUEST_TIMEOUT_MS = 12_000

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'payload'

/** Error carrying a message that is safe (and useful) to show on the device LCD. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly url: string

  constructor(
    message: string,
    options: { kind: ApiErrorKind; url: string; status?: number | null; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = options.kind
    this.status = options.status ?? null
    this.url = options.url
  }
}

function describeStatus(status: number, url: string): ApiError {
  if (status === 404) {
    return new ApiError('PokéAPI has no record for that entry.', {
      kind: 'http',
      status,
      url,
    })
  }
  if (status === 429) {
    return new ApiError('PokéAPI is rate limiting requests. Wait a moment and retry.', {
      kind: 'http',
      status,
      url,
    })
  }
  return new ApiError(`PokéAPI link failed (HTTP ${status}). Retry in a moment.`, {
    kind: 'http',
    status,
    url,
  })
}

/**
 * GET a PokéAPI path (e.g. `/pokemon/25`) and parse JSON.
 * Combines the caller's abort signal with an internal timeout signal.
 */
export async function apiGet<T>(path: string, options: { signal?: AbortSignal } = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const controller = new AbortController()
  const external = options.signal

  const abortFromExternal = () => controller.abort(external?.reason)
  if (external) {
    if (external.aborted) abortFromExternal()
    else external.addEventListener('abort', abortFromExternal, { once: true })
  }

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw describeStatus(response.status, url)
    try {
      return (await response.json()) as T
    } catch (cause) {
      throw new ApiError('PokéAPI returned an unreadable response.', {
        kind: 'payload',
        url,
        cause,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (external?.aborted) throw error // caller cancelled — propagate untouched
    if (timedOut) {
      throw new ApiError('PokéAPI did not answer in time. Check the link and retry.', {
        kind: 'timeout',
        url,
        cause: error,
      })
    }
    throw new ApiError('Cannot reach PokéAPI. Check this device’s connection.', {
      kind: 'network',
      url,
      cause: error,
    })
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', abortFromExternal)
  }
}

/** Normalise anything thrown by the data layer into a displayable string. */
export function toDisplayMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Unexpected fault in the index link.'
}
