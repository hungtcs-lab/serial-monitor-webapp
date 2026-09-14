import { SerialMonitor } from '@/features/serial/components/serial-monitor'
import { SerialMonitorProvider } from '@/features/serial/context/serial-monitor-provider'

export function App() {
  return (
    <SerialMonitorProvider>
      <SerialMonitor />
    </SerialMonitorProvider>
  )
}
