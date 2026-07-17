import { createContext } from 'react'
import type { NavigationFlashTone } from '../../utils/navigation'

export type ToastTone = NavigationFlashTone

export type ToastInput = {
  duration?: number
  id?: string
  message: string
  title?: string
  tone: ToastTone
}

export type ToastRecord = Required<Pick<ToastInput, 'duration' | 'id' | 'message' | 'tone'>>
  & Pick<ToastInput, 'title'>
  & { revision: number }

export type ToastContextValue = {
  clearToasts: () => void
  dismissToast: (id: string) => void
  showToast: (input: ToastInput) => string
  toasts: ToastRecord[]
}

export const ToastContext = createContext<ToastContextValue | null>(null)
