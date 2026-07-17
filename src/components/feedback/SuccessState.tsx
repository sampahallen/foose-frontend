import type { StatePanelProps } from './StatePanel'
import { StatePanel } from './StatePanel'

export type SuccessStateProps = Omit<StatePanelProps, 'tone'> & {
  message?: StatePanelProps['body']
}

export function SuccessState({ body, message, ...props }: SuccessStateProps) {
  return <StatePanel {...props} body={body ?? message} tone="success" />
}
