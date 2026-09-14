import { Box, Center, EmptyState, Kbd, List, ScrollArea, Span, Text } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { LuTerminal } from 'react-icons/lu'
import { useSerialMonitor } from '../context/serial-monitor-context'
import { isSerialSupported } from '../hooks/use-serial-port'
import { formatEntryBody, formatTime } from '../lib/codec'
import type { DataFormat, LogEntry } from '../lib/types'

const DIRECTION_STYLE = {
  rx: { label: 'RX', color: 'green.fg' },
  tx: { label: 'TX', color: 'blue.fg' },
  sys: { label: '--', color: 'orange.fg' },
} as const

function LogLine({ entry, format, showTimestamp }: { entry: LogEntry; format: DataFormat; showTimestamp: boolean }) {
  const style = DIRECTION_STYLE[entry.dir]
  return (
    <Box display="flex" gap="3" px="3" _hover={{ bg: 'bg.muted' }}>
      {showTimestamp && (
        <Span flexShrink="0" color="fg.subtle" userSelect="none">
          {formatTime(entry.time)}
        </Span>
      )}
      <Span flexShrink="0" color={style.color} fontWeight="semibold" userSelect="none">
        {style.label}
      </Span>
      <Text
        flex="1"
        whiteSpace="pre-wrap"
        wordBreak="break-all"
        color={entry.dir === 'sys' ? style.color : 'fg'}
        fontStyle={entry.dir === 'sys' ? 'italic' : undefined}
      >
        {formatEntryBody(entry, format)}
      </Text>
    </Box>
  )
}

function EmptyTerminal() {
  return (
    <Center flex="1" minH="0">
      <EmptyState.Root size="sm">
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuTerminal />
          </EmptyState.Indicator>
          <EmptyState.Title>{isSerialSupported ? '暂无数据' : '当前浏览器不支持 Web Serial API'}</EmptyState.Title>
          <EmptyState.Description>
            {isSerialSupported
              ? '连接串口后，收发的数据会显示在这里'
              : '请使用桌面版 Chrome / Edge，并通过 localhost 或 HTTPS 访问'}
          </EmptyState.Description>
          {isSerialSupported && (
            <List.Root variant="plain" gap="1.5" textStyle="xs" color="fg.muted">
              <List.Item>
                点击 <Kbd size="sm">连接</Kbd> 选择设备，或在菜单中添加串口设备
              </List.Item>
              <List.Item>
                发送框中 <Kbd size="sm">Enter</Kbd> 发送，<Kbd size="sm">↑</Kbd> <Kbd size="sm">↓</Kbd> 浏览历史
              </List.Item>
            </List.Root>
          )}
        </EmptyState.Content>
      </EmptyState.Root>
    </Center>
  )
}

export function TerminalView() {
  const { entries, view } = useSerialMonitor()
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (view.autoScroll && viewport) viewport.scrollTop = viewport.scrollHeight
  }, [entries, view.autoScroll])

  if (entries.length === 0) return <EmptyTerminal />

  return (
    <ScrollArea.Root flex="1" minH="0" size="xs">
      <ScrollArea.Viewport ref={viewportRef}>
        <ScrollArea.Content py="2" fontFamily="mono" textStyle="sm" lineHeight="1.65">
          {entries.map((entry) => (
            <LogLine key={entry.id} entry={entry} format={view.format} showTimestamp={view.showTimestamp} />
          ))}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar />
    </ScrollArea.Root>
  )
}
