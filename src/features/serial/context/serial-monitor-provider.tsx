import type { PropsWithChildren } from 'react'
import { SerialMonitorContext } from './serial-monitor-context'
import { useSerialMonitorState } from './use-serial-monitor-state'

export function SerialMonitorProvider({ children }: PropsWithChildren) {
  const state = useSerialMonitorState()
  return <SerialMonitorContext value={state}>{children}</SerialMonitorContext>
}
