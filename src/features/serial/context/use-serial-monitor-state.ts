import { useState } from 'react'
import { toaster } from '@/components/ui/toaster'
import { useSerialLog } from '../hooks/use-serial-log'
import { useSerialPort } from '../hooks/use-serial-port'
import { encodeInput, errorMessage, formatFrame, serializeLog } from '../lib/codec'
import { DEFAULT_SETTINGS, DEFAULT_SIGNALS, DEFAULT_VIEW_OPTIONS } from '../lib/constants'
import type { DataFormat, LineEnding, OutputSignals, PortSettings, ViewOptions } from '../lib/types'

/** 组合串口、日志与界面状态，作为整个串口监视器的唯一状态来源 */
export function useSerialMonitorState() {
  const log = useSerialLog()
  const [settings, setSettings] = useState<PortSettings>(DEFAULT_SETTINGS)
  const [signals, setSignals] = useState<OutputSignals>(DEFAULT_SIGNALS)
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS)

  const serial = useSerialPort({
    onData: log.rx,
    onError: (error) => {
      log.sys(`错误：${errorMessage(error)}`)
      toaster.create({ type: 'error', title: '串口错误', description: errorMessage(error) })
    },
    onDisconnect: () => {
      log.sys('设备已断开')
      setSignals(DEFAULT_SIGNALS)
      toaster.create({ type: 'warning', title: '设备已断开' })
    },
  })

  /** 连接选中的端口；尚无可用端口时先弹出浏览器的设备选择框 */
  async function connect() {
    const target = serial.port ?? (await serial.requestPort())
    if (!target || !(await serial.open(settings, target))) return
    log.resetSession()
    log.sys(`串口已打开 ${formatFrame(settings)}`)
  }

  async function disconnect() {
    await serial.close()
    setSignals(DEFAULT_SIGNALS)
    log.sys('串口已关闭')
  }

  async function send(input: string, format: DataFormat, ending: LineEnding): Promise<boolean> {
    try {
      const bytes = encodeInput(input, format, ending)
      await serial.write(bytes)
      log.tx(bytes)
      return true
    } catch (error) {
      toaster.create({ type: 'error', title: '发送失败', description: errorMessage(error) })
      return false
    }
  }

  async function updateSignal(key: keyof OutputSignals, value: boolean) {
    const next = { ...signals, [key]: value }
    try {
      await serial.setSignals(next)
      setSignals(next)
    } catch (error) {
      toaster.create({ type: 'error', title: '设置控制信号失败', description: errorMessage(error) })
    }
  }

  function exportLog() {
    const blob = new Blob([serializeLog(log.entries, view.format)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), { href: url, download: `serial-${Date.now()}.log` })
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    // 端口
    ports: serial.ports,
    port: serial.port,
    status: serial.status,
    isOpen: serial.status === 'open',
    selectPort: serial.selectPort,
    requestPort: serial.requestPort,
    // 配置
    settings,
    updateSettings: (patch: Partial<PortSettings>) => setSettings((s) => ({ ...s, ...patch })),
    signals,
    updateSignal,
    view,
    updateView: (patch: Partial<ViewOptions>) => setView((v) => ({ ...v, ...patch })),
    // 数据
    entries: log.entries,
    stats: log.stats,
    clearLog: log.clear,
    exportLog,
    // 动作
    connect,
    disconnect,
    send,
  }
}

export type SerialMonitorState = ReturnType<typeof useSerialMonitorState>
