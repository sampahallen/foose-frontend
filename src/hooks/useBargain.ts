import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'
import type { Bargain, BargainAction, BargainResponse, ChatMessage } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { useApiResource } from './useApiResource'
import { useMessaging } from './useMessaging'

function listingIdOf(bargain: Bargain) {
  const value = bargain.listingId
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

/**
 * The buyer's own accepted, unspent bargains keyed by listing. Used to preview
 * the negotiated price in the cart and at checkout — the server still resolves
 * the real price when the order is placed, so this is display only.
 */
export function useAcceptedBargainPrices(enabled = true) {
  const resource = useApiResource<{ bargains: Bargain[] }>(
    enabled ? '/bargains?role=buyer&status=accepted&limit=100' : null,
    enabled,
  )

  return useMemo(() => {
    const prices: Record<string, number> = {}
    for (const bargain of resource.data?.bargains || []) {
      const listingId = listingIdOf(bargain)
      if (listingId && typeof bargain.agreedPrice === 'number') prices[listingId] = bargain.agreedPrice
    }
    return prices
  }, [resource.data?.bargains])
}

function bargainIdOf(message: ChatMessage) {
  const value = message.bargainId
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

/**
 * Live bargain state for the offer cards in a conversation.
 *
 * Offer messages arrive through the normal chat stream and carry an immutable
 * snapshot of their round; this hook tracks the *current* state of each
 * negotiation so only the newest card offers buttons, and so both sides update
 * the moment `bargain-updated` lands.
 */
export function useBargain(messages: ChatMessage[]) {
  const { bargainEvent } = useMessaging()
  const [bargains, setBargains] = useState<Record<string, Bargain>>({})
  const [busyId, setBusyId] = useState('')
  const [actionError, setActionError] = useState('')

  const bargainIds = useMemo(() => {
    const ids = new Set<string>()
    for (const message of messages) {
      const id = bargainIdOf(message)
      if (id) ids.add(id)
    }
    return [...ids].sort().join(',')
  }, [messages])

  // The last offer message per bargain is the only interactive card.
  const latestOfferMessageIds = useMemo(() => {
    const latest = new Map<string, string>()
    for (const message of messages) {
      const id = bargainIdOf(message)
      if (id && message.type === 'offer') latest.set(id, message._id)
    }
    return new Set(latest.values())
  }, [messages])

  const mergeBargain = useCallback((bargain: Bargain) => {
    setBargains((current) => ({ ...current, [bargain._id]: bargain }))
  }, [])

  useEffect(() => {
    const ids = bargainIds ? bargainIds.split(',') : []
    if (!ids.length) return undefined

    let active = true
    void Promise.all(
      ids.map((id) =>
        apiGet<{ bargain: Bargain }>(`/bargains/${encodeURIComponent(id)}`)
          .then((data) => data.bargain)
          .catch(() => null),
      ),
    ).then((loaded) => {
      if (!active) return
      const next: Record<string, Bargain> = {}
      for (const bargain of loaded) {
        if (bargain) next[bargain._id] = bargain
      }
      setBargains((current) => ({ ...current, ...next }))
    })

    return () => {
      active = false
    }
  }, [bargainIds])

  useEffect(() => {
    if (!bargainEvent?.bargain) return
    // Deferred so the socket event does not set state synchronously inside the
    // effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => mergeBargain(bargainEvent.bargain))
  }, [bargainEvent, mergeBargain])

  const act = useCallback(
    async (bargainId: string, action: BargainAction, amount?: number) => {
      if (!bargainId) return null
      setBusyId(bargainId)
      setActionError('')
      try {
        const result = await apiPost<BargainResponse>(
          `/bargains/${encodeURIComponent(bargainId)}/${action}`,
          action === 'counter' ? { amount } : {},
        )
        mergeBargain(result.bargain)
        return result
      } catch (error) {
        setActionError(getErrorMessage(error))
        return null
      } finally {
        setBusyId('')
      }
    },
    [mergeBargain],
  )

  return {
    act,
    actionError,
    bargains,
    busyId,
    clearActionError: useCallback(() => setActionError(''), []),
    isLatestOfferMessage: useCallback(
      (messageId: string) => latestOfferMessageIds.has(messageId),
      [latestOfferMessageIds],
    ),
    mergeBargain,
  }
}
