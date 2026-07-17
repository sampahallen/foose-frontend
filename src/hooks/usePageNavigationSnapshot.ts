import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  removeNavigationSnapshot,
  setNavigationSnapshot,
  useNavigationStore,
  type NavigationPageSnapshot,
} from '../stores/navigationMemoryStore'
import {
  registerNavigationCapture,
  registerNavigationScrollRegion,
  restoreNavigationPosition,
} from '../utils/navigation'

type ScrollRegionTarget = RefObject<HTMLElement | null> | (() => HTMLElement | null)

export type PageNavigationSnapshotOptions<T> = {
  namespace: string
  capture: () => T
  restore?: (snapshot: T) => void
  ready?: boolean
  mediaHeavy?: boolean
  scrollRegions?: Record<string, ScrollRegionTarget>
}

export type PageNavigationSnapshotResult<T> = {
  entryId?: string
  restoredSnapshot?: T
  snapshot?: NavigationPageSnapshot<T>
  saveSnapshot: (data?: T) => NavigationPageSnapshot<T> | undefined
  removeSnapshot: () => void
  restorePosition: () => void
}

function regionGetter(target: ScrollRegionTarget) {
  return typeof target === 'function' ? target : () => target.current
}

export function usePageNavigationSnapshot<T>({
  namespace,
  capture,
  restore,
  ready = true,
  mediaHeavy = false,
  scrollRegions = {},
}: PageNavigationSnapshotOptions<T>): PageNavigationSnapshotResult<T> {
  const entryId = useNavigationStore((state) => state.currentEntryId)
  const key = entryId ? `${entryId}:${namespace}` : undefined
  const snapshot = useNavigationStore((state) => (
    key ? state.snapshots[key] as NavigationPageSnapshot<T> | undefined : undefined
  ))
  const captureRef = useRef(capture)
  const restoreRef = useRef(restore)
  const restoredVersionRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    captureRef.current = capture
    restoreRef.current = restore
  }, [capture, restore])

  const saveSnapshot = useCallback((data?: T) => {
    if (!entryId) return undefined
    return setNavigationSnapshot(namespace, data ?? captureRef.current(), { entryId, mediaHeavy })
  }, [entryId, mediaHeavy, namespace])

  const removeSnapshot = useCallback(() => {
    if (entryId) removeNavigationSnapshot(namespace, entryId)
  }, [entryId, namespace])

  const restorePosition = useCallback(() => restoreNavigationPosition(), [])

  useEffect(() => registerNavigationCapture(() => {
    saveSnapshot()
  }), [saveSnapshot])

  const regionEntries = useMemo(() => Object.entries(scrollRegions), [scrollRegions])
  useEffect(() => {
    const cleanups = regionEntries.map(([name, target]) => (
      registerNavigationScrollRegion(name, regionGetter(target))
    ))
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [regionEntries])

  useEffect(() => {
    if (!ready || !snapshot) return
    const version = snapshot.key
    if (restoredVersionRef.current === version) return
    restoredVersionRef.current = version
    restoreRef.current?.(snapshot.data)
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => restoreNavigationPosition())
    })
    return () => window.cancelAnimationFrame(firstFrame)
  }, [ready, snapshot])

  return {
    entryId,
    restoredSnapshot: snapshot?.data,
    snapshot,
    saveSnapshot,
    removeSnapshot,
    restorePosition,
  }
}
