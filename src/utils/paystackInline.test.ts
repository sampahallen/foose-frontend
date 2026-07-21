import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openPaystackInline, resetPaystackInlineForTests } from './paystackInline'

const paystackMocks = vi.hoisted(() => ({
  callbacks: null as null | {
    onCancel?: () => void
    onError?: (error: { message?: string }) => void
    onLoad?: () => void
    onSuccess?: (response: { reference?: string }) => void
  },
  resumeTransaction: vi.fn(),
}))

vi.mock('@paystack/inline-js', () => ({
  default: class PaystackMock {
    resumeTransaction(accessCode: string, callbacks: typeof paystackMocks.callbacks) {
      paystackMocks.callbacks = callbacks
      return paystackMocks.resumeTransaction(accessCode, callbacks)
    }
  },
}))

describe('Paystack inline adapter', () => {
  beforeEach(() => {
    resetPaystackInlineForTests()
    paystackMocks.callbacks = null
    paystackMocks.resumeTransaction.mockReset()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('opens one transaction, reports loading and resolves success', async () => {
    const onLoad = vi.fn()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    const first = openPaystackInline('access-code', { onLoad })
    const duplicate = openPaystackInline('another-code')
    expect(duplicate).toBe(first)
    await vi.waitFor(() => expect(paystackMocks.resumeTransaction).toHaveBeenCalledOnce())
    expect(paystackMocks.resumeTransaction).toHaveBeenCalledWith('access-code', expect.any(Object))

    paystackMocks.callbacks?.onLoad?.()
    paystackMocks.callbacks?.onSuccess?.({ reference: 'pay-ref' })

    await expect(first).resolves.toEqual({ reference: 'pay-ref', status: 'success' })
    expect(onLoad).toHaveBeenCalledOnce()
    expect(trigger).toHaveFocus()
  })

  it('resolves cancellation and rejects provider errors', async () => {
    const cancelled = openPaystackInline('cancel-code')
    await vi.waitFor(() => expect(paystackMocks.callbacks).not.toBeNull())
    paystackMocks.callbacks?.onCancel?.()
    await expect(cancelled).resolves.toEqual({ status: 'cancelled' })

    const failed = openPaystackInline('error-code')
    await vi.waitFor(() => expect(paystackMocks.resumeTransaction).toHaveBeenCalledTimes(2))
    paystackMocks.callbacks?.onError?.({ message: 'Checkout unavailable' })
    await expect(failed).rejects.toThrow('Checkout unavailable')
  })

  it('rejects a missing access code before opening the SDK', async () => {
    await expect(openPaystackInline('  ')).rejects.toThrow('payment access code')
    expect(paystackMocks.resumeTransaction).not.toHaveBeenCalled()
  })
})
