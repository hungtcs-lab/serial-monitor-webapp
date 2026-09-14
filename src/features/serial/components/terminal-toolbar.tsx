import { Button, Checkbox, HStack, IconButton, SegmentGroup, Separator, Spacer, Text, Toggle } from '@chakra-ui/react'
import { LuEraser } from 'react-icons/lu'
import { Tooltip } from '@/components/ui/tooltip'
import { useSerialMonitor } from '../context/serial-monitor-context'
import type { DataFormat, OutputSignals } from '../lib/types'

const FORMAT_ITEMS = [
  { value: 'text', label: 'Text' },
  { value: 'hex', label: 'Hex' },
]

const SIGNALS: { key: keyof OutputSignals; label: string; description: string }[] = [
  { key: 'dataTerminalReady', label: 'DTR', description: 'Data Terminal Ready' },
  { key: 'requestToSend', label: 'RTS', description: 'Request To Send' },
]

function SignalToggles() {
  const { signals, updateSignal, isOpen } = useSerialMonitor()
  return (
    <HStack gap="1.5">
      {SIGNALS.map(({ key, label, description }) => (
        <Tooltip key={key} content={description}>
          <Toggle.Root asChild pressed={signals[key]} onPressedChange={(pressed) => updateSignal(key, pressed)}>
            <Button
              size="xs"
              minW="12"
              fontFamily="mono"
              disabled={!isOpen}
              variant={{ base: 'subtle', _pressed: 'solid' }}
              colorPalette={signals[key] ? 'blue' : 'gray'}
            >
              {label}
            </Button>
          </Toggle.Root>
        </Tooltip>
      ))}
    </HStack>
  )
}

function TrafficCounter() {
  const { stats } = useSerialMonitor()
  const format = (n: number) => n.toLocaleString('en-US')
  return (
    <HStack gap="3" fontFamily="mono" textStyle="xs" color="fg.muted">
      <Text>
        RX <Text as="span" color="green.fg">{format(stats.rx)}</Text>
      </Text>
      <Text>
        TX <Text as="span" color="blue.fg">{format(stats.tx)}</Text>
      </Text>
    </HStack>
  )
}

/** 终端底部工具栏：显示格式、时间戳、自动滚动、控制信号与收发计数 */
export function TerminalToolbar() {
  const { view, updateView, entries, clearLog } = useSerialMonitor()

  return (
    <HStack gap="3" px="3" py="1.5" bg="bg.panel" borderTopWidth="1px" wrap="wrap">
      <SegmentGroup.Root
        size="xs"
        value={view.format}
        onValueChange={(e) => e.value && updateView({ format: e.value as DataFormat })}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={FORMAT_ITEMS} />
      </SegmentGroup.Root>

      <Checkbox.Root
        size="sm"
        checked={view.showTimestamp}
        onCheckedChange={(e) => updateView({ showTimestamp: !!e.checked })}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>时间戳</Checkbox.Label>
      </Checkbox.Root>

      <Checkbox.Root size="sm" checked={view.autoScroll} onCheckedChange={(e) => updateView({ autoScroll: !!e.checked })}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>自动滚动</Checkbox.Label>
      </Checkbox.Root>

      <Separator orientation="vertical" height="5" />
      <SignalToggles />

      <Spacer />
      <TrafficCounter />
      <Tooltip content="清空终端">
        <IconButton aria-label="清空终端" size="xs" variant="ghost" disabled={entries.length === 0} onClick={clearLog}>
          <LuEraser />
        </IconButton>
      </Tooltip>
    </HStack>
  )
}
