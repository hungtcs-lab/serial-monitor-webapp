import { Button, Field, HStack, Input, SegmentGroup } from '@chakra-ui/react'
import { useState } from 'react'
import { LuSendHorizontal } from 'react-icons/lu'
import { useSerialMonitor } from '../context/serial-monitor-context'
import { isValidHex } from '../lib/codec'
import { LINE_ENDING_OPTIONS, SEND_HISTORY_LIMIT } from '../lib/constants'
import type { DataFormat, LineEnding } from '../lib/types'
import { SelectField } from './select-field'

const FORMAT_ITEMS = [
  { value: 'text', label: 'Text' },
  { value: 'hex', label: 'Hex' },
]

/** 发送栏：Enter 发送，↑/↓ 浏览历史，Hex 模式实时校验 */
export function SendPanel() {
  const { isOpen, send } = useSerialMonitor()
  const [value, setValue] = useState('')
  const [format, setFormat] = useState<DataFormat>('text')
  const [ending, setEnding] = useState<LineEnding>('lf')
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState(-1)

  const hexInvalid = format === 'hex' && value.trim() !== '' && !isValidHex(value)
  const canSend = isOpen && !hexInvalid && (format === 'text' || value.trim() !== '')

  async function submit() {
    if (!canSend) return
    if (!(await send(value, format, ending))) return
    if (value) setHistory((h) => [value, ...h.filter((item) => item !== value)].slice(0, SEND_HISTORY_LIMIT))
    setValue('')
    setCursor(-1)
  }

  function browseHistory(step: 1 | -1) {
    const next = Math.min(Math.max(cursor + step, -1), history.length - 1)
    setCursor(next)
    setValue(next === -1 ? '' : history[next])
  }

  return (
    <HStack gap="2" px="3" py="2" bg="bg.panel" borderTopWidth="1px" wrap={{ base: 'wrap', md: 'nowrap' }}>
      <Field.Root flex="1" minW="48" invalid={hexInvalid}>
        <Input
          size="sm"
          fontFamily="mono"
          aria-label="发送内容"
          placeholder={
            isOpen ? (format === 'hex' ? '十六进制字节，如 AA 55 01 FF' : '输入要发送的数据，Enter 发送，↑↓ 历史') : '连接串口后可发送数据'
          }
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              browseHistory(e.key === 'ArrowUp' ? 1 : -1)
            }
          }}
        />
      </Field.Root>

      <SelectField
        label="行尾"
        hideLabel
        width="24"
        options={LINE_ENDING_OPTIONS}
        value={ending}
        onValueChange={setEnding}
        disabled={format === 'hex'}
      />

      <SegmentGroup.Root size="sm" value={format} onValueChange={(e) => e.value && setFormat(e.value as DataFormat)}>
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={FORMAT_ITEMS} />
      </SegmentGroup.Root>

      <Button size="sm" minW="20" colorPalette="blue" disabled={!canSend} onClick={submit}>
        <LuSendHorizontal /> 发送
      </Button>
    </HStack>
  )
}
