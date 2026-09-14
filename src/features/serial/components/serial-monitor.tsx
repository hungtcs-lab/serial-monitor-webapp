import { Flex } from '@chakra-ui/react'
import { ConnectionBar } from './connection-bar'
import { SendPanel } from './send-panel'
import { TerminalToolbar } from './terminal-toolbar'
import { TerminalView } from './terminal-view'

/**
 * 整体布局（自上而下）：
 * 标题栏（端口/波特率/参数 · 标题与状态 · 连接/菜单）→ 终端 → 工具栏 → 发送栏
 */
export function SerialMonitor() {
  return (
    <Flex direction="column" h="100dvh" bg="bg">
      <ConnectionBar />
      <Flex direction="column" flex="1" minH="0">
        <TerminalView />
      </Flex>
      <TerminalToolbar />
      <SendPanel />
    </Flex>
  )
}
