import { Center, Flex, Spinner } from '@chakra-ui/react'
import { useEffect } from 'react'
import i18n, { resolveLanguage } from '@/i18n'
import { SessionContext } from '../hooks/session-context'
import { useShortcuts } from '../hooks/use-shortcuts'
import { usePreferences } from '../store/preferences-store'
import { useWorkspace } from '../store/workspace-store'
import { ConnectionBar } from './connection-bar'
import { HighlightRulesDialog } from './dialogs/highlight-rules-dialog'
import { ShortcutsDialog } from './dialogs/shortcuts-dialog'
import { WebSocketDialog } from './dialogs/websocket-dialog'
import { SendBar } from './send-bar'
import { TabBar } from './tab-bar'
import { TerminalView } from './terminal/terminal-view'
import { TerminalToolbar } from './terminal-toolbar'

function SessionView() {
  useShortcuts()
  return (
    <>
      <ConnectionBar />
      <TerminalView />
      <TerminalToolbar />
      <SendBar />
    </>
  )
}

/**
 * 整体布局（自上而下）：
 * 标签栏 → 连接栏（设备/波特率/参数 · 状态 · 连接）→ 终端 → 工具栏 → 发送栏
 */
export function SerialMonitor() {
  const ready = useWorkspace((s) => s.ready)
  const init = useWorkspace((s) => s.init)
  const session = useWorkspace((s) => s.sessions.find((x) => x.id === s.activeId))
  const language = usePreferences((s) => s.language)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    void i18n.changeLanguage(resolveLanguage(language))
  }, [language])

  if (!ready || !session) {
    return (
      <Center h="100dvh">
        <Spinner />
      </Center>
    )
  }

  return (
    <SessionContext value={session}>
      <Flex direction="column" h="100dvh" bg="bg">
        <TabBar />
        {/* 切换标签时重新挂载会话视图，避免残留上一个会话的滚动与输入状态 */}
        <Flex key={session.id} direction="column" flex="1" minH="0">
          <SessionView />
        </Flex>
      </Flex>
      <HighlightRulesDialog />
      <WebSocketDialog />
      <ShortcutsDialog />
    </SessionContext>
  )
}
