import { SerialTransport } from '../transport/serial-transport'
import type { Transport } from '../transport/transport'
import { WebSocketTransport } from '../transport/websocket-transport'

export type Device =
  | { id: string; kind: 'serial'; port: SerialPort; profileKey: string; label: string; detail: string }
  | { id: string; kind: 'websocket'; url: string; profileKey: string; label: string; detail: string }

/** 常见 USB 转串口芯片 / 开发板，用于给端口起个好认的名字 */
const KNOWN_USB_DEVICES: Record<string, string> = {
  '1a86:7523': 'CH340',
  '1a86:5523': 'CH341',
  '1a86:55d3': 'CH343',
  '1a86:55d4': 'CH9102',
  '10c4:ea60': 'CP210x',
  '0403:6001': 'FT232R',
  '0403:6010': 'FT2232',
  '0403:6014': 'FT232H',
  '0403:6015': 'FT231X',
  '067b:2303': 'PL2303',
  '303a:1001': 'ESP32 USB JTAG/Serial',
  '2e8a:000a': 'Raspberry Pi Pico',
  '2e8a:0005': 'MicroPython',
  '0483:5740': 'STM32 VCP',
  '239a:8029': 'Adafruit',
  '1366:0105': 'J-Link CDC',
  '0d28:0204': 'DAPLink',
}

const hex4 = (n: number) => n.toString(16).padStart(4, '0')

const portIds = new WeakMap<SerialPort, string>()
let nextPortId = 1

export function serialProfileKey(info: SerialPortInfo): string {
  if (info.usbVendorId !== undefined) return `usb:${hex4(info.usbVendorId)}:${hex4(info.usbProductId ?? 0)}`
  if (info.bluetoothServiceClassId !== undefined) return `bt:${info.bluetoothServiceClassId}`
  return 'serial'
}

export function serialDevice(port: SerialPort): Device {
  let id = portIds.get(port)
  if (!id) {
    id = `serial-${nextPortId++}`
    portIds.set(port, id)
  }
  const info = port.getInfo()
  if (info.usbVendorId !== undefined) {
    const vidPid = `${hex4(info.usbVendorId)}:${hex4(info.usbProductId ?? 0)}`
    return {
      id,
      kind: 'serial',
      port,
      profileKey: serialProfileKey(info),
      label: KNOWN_USB_DEVICES[vidPid] ?? `USB ${vidPid}`,
      detail: vidPid,
    }
  }
  const bluetooth = info.bluetoothServiceClassId !== undefined
  return {
    id,
    kind: 'serial',
    port,
    profileKey: serialProfileKey(info),
    label: bluetooth ? 'Bluetooth' : 'Serial',
    detail: bluetooth ? String(info.bluetoothServiceClassId) : '',
  }
}

export function websocketDevice(url: string): Device {
  let label = url
  try {
    label = new URL(url).host
  } catch {
    // 保留原始地址
  }
  return { id: `ws:${url}`, kind: 'websocket', url, profileKey: `ws:${url}`, label, detail: url }
}

/** 同型号设备同时插多个时，给名称加上序号区分 */
export function disambiguateLabels(devices: Device[]): Device[] {
  const counts = new Map<string, number>()
  for (const d of devices) counts.set(d.label, (counts.get(d.label) ?? 0) + 1)
  const seen = new Map<string, number>()
  return devices.map((d) => {
    if ((counts.get(d.label) ?? 0) < 2) return d
    const n = (seen.get(d.label) ?? 0) + 1
    seen.set(d.label, n)
    return { ...d, label: `${d.label} #${n}` }
  })
}

export function createTransport(device: Device): Transport {
  return device.kind === 'serial' ? new SerialTransport(device.port) : new WebSocketTransport(device.url)
}
