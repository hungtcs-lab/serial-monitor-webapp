import { createContext, use } from 'react'
import type { SerialMonitorState } from './use-serial-monitor-state'

export const SerialMonitorContext = createContext<SerialMonitorState | null>(null)

export function useSerialMonitor(): SerialMonitorState {
  const context = use(SerialMonitorContext)
  if (!context) throw new Error('useSerialMonitor 必须在 <SerialMonitorProvider> 内使用')
  return context
}
