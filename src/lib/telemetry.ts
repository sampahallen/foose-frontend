import { getApiBaseUrl } from '../config/env'

type TelemetryEvent = {
  endpoint?: string
  message?: string
  metadata?: Record<string, unknown>
  method?: string
  path?: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  source?: 'marketplace'
  statusCode?: number
  type: 'page_view' | 'js_error' | 'unhandled_rejection' | 'api_failure' | 'resource_error' | 'custom'
  url?: string
}

let installed = false
let lastPageViewAt = 0
let lastPageViewPath = ''

function analyticsUrl() {
  return `${getApiBaseUrl()}/analytics/events`
}

function currentPath() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

function trackPageView() {
  const path = currentPath()
  const now = Date.now()
  if (path === lastPageViewPath && now - lastPageViewAt < 500) return

  lastPageViewAt = now
  lastPageViewPath = path
  reportTelemetry({ path, type: 'page_view' })
}

export function reportTelemetry(event: TelemetryEvent) {
  if (typeof window === 'undefined') return
  if (event.endpoint?.includes('/analytics/events')) return

  const payload = {
    path: currentPath(),
    severity: 'info',
    source: 'marketplace',
    url: window.location.href,
    ...event,
  }
  const body = JSON.stringify(payload)

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(analyticsUrl(), blob)) return
    }

    void fetch(analyticsUrl(), {
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch(() => undefined)
  } catch {
    // Telemetry must never interrupt customer workflows.
  }
}

export function installTelemetry() {
  if (typeof window === 'undefined' || installed) return
  installed = true

  trackPageView()

  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  window.history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args)
    queueMicrotask(trackPageView)
    return result
  }

  window.history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState.apply(this, args)
    queueMicrotask(trackPageView)
    return result
  }

  window.addEventListener('popstate', trackPageView)

  window.addEventListener('error', (event) => {
    const target = event.target
    if (target instanceof HTMLElement) {
      reportTelemetry({
        message: target instanceof HTMLImageElement ? target.src : 'Resource failed to load',
        severity: 'warning',
        type: 'resource_error',
      })
      return
    }

    reportTelemetry({
      message: event.message || 'Unhandled marketplace error',
      metadata: {
        column: event.colno,
        line: event.lineno,
      },
      severity: 'critical',
      type: 'js_error',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportTelemetry({
      message: event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled rejection'),
      severity: 'critical',
      type: 'unhandled_rejection',
    })
  })
}
