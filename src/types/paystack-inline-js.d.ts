declare module '@paystack/inline-js' {
  export type PaystackInlineCallbacks = {
    onCancel?: () => void
    onError?: (error: { message?: string }) => void
    onLoad?: (response: { accessCode?: string; customer?: unknown; id?: number }) => void
    onSuccess?: (response: { id?: number; message?: string; reference?: string }) => void
  }

  export default class Paystack {
    resumeTransaction(accessCode: string, callbacks?: PaystackInlineCallbacks): unknown
  }
}
