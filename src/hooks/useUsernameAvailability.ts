import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'
import { usernameLooksValid } from '../utils/formValidation'

export type UsernameAvailabilityStatus = 'idle' | 'waiting' | 'checking' | 'available' | 'unavailable' | 'error'

export type UsernameAvailabilityState = {
  message?: string
  status: UsernameAvailabilityStatus
  username: string
}

const initialState: UsernameAvailabilityState = { status: 'idle', username: '' }

export function useUsernameAvailability(currentUsername = '', waitMs = 600) {
  const [state, setState] = useState<UsernameAvailabilityState>(initialState)
  const timerRef = useRef<number | undefined>(undefined)
  const requestRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const cancelPending = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    requestRef.current?.abort()
    requestRef.current = null
    requestIdRef.current += 1
  }, [])

  const reset = useCallback(() => {
    cancelPending()
    setState(initialState)
  }, [cancelPending])

  const check = useCallback((candidate: string) => {
    cancelPending()
    const username = candidate.normalize('NFKC').trim().toLocaleLowerCase()
    const current = currentUsername.normalize('NFKC').trim().toLocaleLowerCase()

    if (!username || username === current || !usernameLooksValid(username)) {
      setState(initialState)
      return
    }

    const requestId = requestIdRef.current
    setState({ status: 'waiting', username })
    timerRef.current = window.setTimeout(() => {
      const controller = new AbortController()
      requestRef.current = controller
      setState({ status: 'checking', username })
      void apiGet<{ available: boolean; username: string }>(
        `/users/username-availability?username=${encodeURIComponent(username)}`,
        { signal: controller.signal },
      ).then((response) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return
        setState({
          status: response.available ? 'available' : 'unavailable',
          username: response.username || username,
        })
      }).catch((requestError) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return
        setState({
          message: getErrorMessage(requestError, 'Username availability could not be checked'),
          status: 'error',
          username,
        })
      }).finally(() => {
        if (requestRef.current === controller) requestRef.current = null
      })
    }, waitMs)
  }, [cancelPending, currentUsername, waitMs])

  useEffect(() => cancelPending, [cancelPending])

  return { check, reset, state }
}
