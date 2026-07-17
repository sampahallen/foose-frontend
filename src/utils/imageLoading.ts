export type ImagePreloadResult = {
  failed: string[]
  loaded: string[]
}

const IMAGE_LOAD_TIMEOUT_MS = 30_000

function preloadImage(url: string, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    const image = new Image()
    let settled = false
    let timeout = 0
    const finish = (loaded: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      image.onload = null
      image.onerror = null
      resolve(loaded)
    }
    const abort = () => {
      image.src = ''
      finish(false)
    }
    const decode = () => {
      if (typeof image.decode !== 'function') {
        finish(true)
        return
      }

      void image.decode().then(() => finish(true)).catch(() => finish(true))
    }

    if (signal?.aborted) {
      finish(false)
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    timeout = window.setTimeout(() => finish(false), IMAGE_LOAD_TIMEOUT_MS)

    image.onload = decode
    image.onerror = () => finish(false)
    image.decoding = 'async'
    image.src = url

    if (image.complete) {
      if (image.naturalWidth > 0) decode()
      else finish(false)
    }
  })
}

export async function preloadImageUrls(urls: string[], signal?: AbortSignal): Promise<ImagePreloadResult> {
  const uniqueUrls = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)))
  const results = await Promise.all(uniqueUrls.map(async (url) => ({ loaded: await preloadImage(url, signal), url })))

  return results.reduce<ImagePreloadResult>(
    (state, result) => {
      state[result.loaded ? 'loaded' : 'failed'].push(result.url)
      return state
    },
    { failed: [], loaded: [] },
  )
}
