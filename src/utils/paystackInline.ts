import Paystack from '@paystack/inline-js'

export type PaystackInlineResult =
  | { reference: string; status: 'success' }
  | { status: 'cancelled' }

type PaystackInlineOptions = {
  onLoad?: () => void
}

let activePayment: Promise<PaystackInlineResult> | null = null

function restoreTrigger(trigger: HTMLElement | null) {
  window.requestAnimationFrame(() => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true })
  })
}

export function openPaystackInline(accessCode: string, options: PaystackInlineOptions = {}) {
  if (!accessCode.trim()) return Promise.reject(new Error('Paystack did not return a payment access code'))
  if (activePayment) return activePayment

  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const currentPayment = new Promise<PaystackInlineResult>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      if (activePayment === currentPayment) activePayment = null
      restoreTrigger(trigger)
      callback()
    }

    queueMicrotask(() => {
      try {
        const paystack = new Paystack()
        paystack.resumeTransaction(accessCode, {
          onCancel: () => finish(() => resolve({ status: 'cancelled' })),
          onError: (error) => finish(() => reject(new Error(error?.message || 'Paystack could not load the secure payment form'))),
          onLoad: () => options.onLoad?.(),
          onSuccess: (transaction) => finish(() => {
            if (!transaction?.reference) {
              reject(new Error('Paystack completed without a transaction reference'))
              return
            }
            resolve({ reference: transaction.reference, status: 'success' })
          }),
        })
      } catch (error) {
        finish(() => reject(error instanceof Error ? error : new Error('Paystack could not load the secure payment form')))
      }
    })
  })

  activePayment = currentPayment
  return currentPayment
}

export function resetPaystackInlineForTests() {
  activePayment = null
}
