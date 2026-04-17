import "server-only"

export type RetryOptions = {
  /** Number of retry attempts after the first try. Default 2. */
  retries?: number
  /** Base backoff in ms; doubled each attempt with jitter. Default 250. */
  baseMs?: number
  /** Per-attempt timeout. Default 8000 (Vercel 10s-budget safe). */
  timeoutMs?: number
  /** Return true to retry on this error. Defaults to retrying transient/network errors only. */
  retryOn?: (err: unknown) => boolean
  /** External abort signal; when aborted we stop retrying immediately. */
  signal?: AbortSignal
  /** Optional label for debug logs. */
  label?: string
}

/** A thrown error that carries an HTTP status (set by callers that inspect `Response`). */
export class HttpStatusError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpStatusError"
    this.status = status
  }
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  )
}

/** Default retry predicate: network errors + per-attempt timeouts + 429/5xx HttpStatusError. */
function defaultRetryOn(err: unknown): boolean {
  if (isAbortError(err)) return true
  if (err instanceof HttpStatusError) {
    return err.status === 429 || err.status >= 500
  }
  if (err instanceof TypeError) return true
  return false
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      signal?.removeEventListener("abort", onAbort)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/**
 * Run `fn` with per-attempt AbortSignal (timeout) and exponential-backoff retries.
 * - Does NOT retry on errors `retryOn` rejects (e.g. 401/403/404 — permission issues).
 * - Respects the caller's `signal` for cooperative cancellation.
 */
export async function retryWithBackoff<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 2
  const baseMs = opts.baseMs ?? 250
  const timeoutMs = opts.timeoutMs ?? 8000
  const retryOn = opts.retryOn ?? defaultRetryOn

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }

    const attemptCtrl = new AbortController()
    const onParentAbort = () => attemptCtrl.abort()
    opts.signal?.addEventListener("abort", onParentAbort, { once: true })
    const timeoutId = setTimeout(() => attemptCtrl.abort(), timeoutMs)

    try {
      return await fn(attemptCtrl.signal)
    } catch (err) {
      lastErr = err
      if (opts.signal?.aborted) throw err
      if (attempt === retries || !retryOn(err)) throw err
      const backoff =
        baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * baseMs)
      await sleep(backoff, opts.signal)
    } finally {
      clearTimeout(timeoutId)
      opts.signal?.removeEventListener("abort", onParentAbort)
    }
  }
  throw lastErr
}
