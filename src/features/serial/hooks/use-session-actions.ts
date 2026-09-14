import { useTranslation } from 'react-i18next'
import { toaster } from '@/components/ui/toaster'
import { useWorkspace } from '../store/workspace-store'
import { useSession } from './session-context'

/** 需要与浏览器交互（弹窗、下载）或跨会话的动作 */
export function useSessionActions() {
  const session = useSession()
  const { t } = useTranslation()
  const requestSerialPort = useWorkspace((s) => s.requestSerialPort)

  /** 连接；当前标签还没有设备时先弹出浏览器的设备选择框 */
  async function connect() {
    if (!session.device) {
      const device = await requestSerialPort()
      if (!device) return
      session.selectDevice(device.id)
    }
    await session.connect()
  }

  function exportLog() {
    const text = session.exportText()
    if (!text) {
      toaster.create({ type: 'info', title: t('notify.nothingToExport') })
      return
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const url = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `serial-${stamp}.log` })
    link.click()
    URL.revokeObjectURL(url)
  }

  return { connect, exportLog }
}
