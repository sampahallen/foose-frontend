import type { ReactNode } from 'react'
import { ConfirmDialog } from './Dialog'
import { useUnsavedChanges } from './useUnsavedChanges'

export function UnsavedChangesGuard({
  children,
  message,
  when,
}: {
  children?: ReactNode
  message?: string
  when: boolean
}) {
  const guard = useUnsavedChanges({ dirty: when, message })
  return (
    <>
      {children}
      <ConfirmDialog {...guard.dialogProps} />
    </>
  )
}
