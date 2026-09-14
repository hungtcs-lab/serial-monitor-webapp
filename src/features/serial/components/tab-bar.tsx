import { Box, CloseButton, HStack, Icon, IconButton, Status, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuPlus, LuUsb } from 'react-icons/lu'
import { useStore } from 'zustand'
import { Tooltip } from '@/components/ui/tooltip'
import type { SerialSession } from '../engine/session'
import type { SessionStatus } from '../lib/types'
import { useWorkspace } from '../store/workspace-store'
import { AppMenu } from './app-menu'

const STATUS_COLOR: Record<SessionStatus, string> = {
  idle: 'gray',
  opening: 'orange',
  open: 'green',
  closing: 'orange',
  reconnecting: 'orange',
}

function TabItem({ session, active, index }: { session: SerialSession; active: boolean; index: number }) {
  const { t } = useTranslation()
  const status = useStore(session.store, (s) => s.status)
  const deviceId = useStore(session.store, (s) => s.deviceId)
  const lostLabel = useStore(session.store, (s) => s.lostDeviceLabel)
  const label = useWorkspace((s) => s.devices.find((d) => d.id === deviceId)?.label) ?? lostLabel ?? t('tabs.untitled')
  const activate = useWorkspace((s) => s.activate)
  const closeSession = useWorkspace((s) => s.closeSession)

  return (
    <HStack
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      gap="1.5"
      ps="3"
      pe="1"
      h="8"
      minW="0"
      maxW="56"
      flexShrink="1"
      roundedTop="md"
      cursor="pointer"
      userSelect="none"
      borderWidth="1px"
      borderBottomWidth="0"
      borderColor={active ? 'border' : 'transparent'}
      bg={active ? 'bg.panel' : 'transparent'}
      color={active ? 'fg' : 'fg.muted'}
      mb="-1px"
      _hover={{ bg: active ? 'bg.panel' : 'bg.emphasized' }}
      onClick={() => activate(session.id)}
      onAuxClick={(e) => {
        if (e.button === 1) closeSession(session.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') activate(session.id)
      }}
      title={index < 9 ? `${label} (Alt+${index + 1})` : label}
    >
      <Status.Root size="sm" colorPalette={STATUS_COLOR[status]}>
        <Status.Indicator opacity={status === 'idle' ? 0.5 : 1} />
      </Status.Root>
      <Text textStyle="sm" truncate flex="1">
        {label}
      </Text>
      <CloseButton
        size="2xs"
        variant="ghost"
        aria-label={t('tabs.close')}
        onClick={(e) => {
          e.stopPropagation()
          closeSession(session.id)
        }}
      />
    </HStack>
  )
}

/** 顶部标签栏：应用标识、各会话标签、新建标签与主菜单 */
export function TabBar() {
  const { t } = useTranslation()
  const sessions = useWorkspace((s) => s.sessions)
  const activeId = useWorkspace((s) => s.activeId)
  const newSession = useWorkspace((s) => s.newSession)

  return (
    <HStack gap="2" px="3" pt="1.5" bg="bg.muted" borderBottomWidth="1px" align="flex-end">
      <HStack gap="1.5" pb="2" pe="2" flexShrink="0">
        <Icon size="sm" color="teal.fg">
          <LuUsb />
        </Icon>
        <Text textStyle="sm" fontWeight="semibold" hideBelow="sm">
          {t('app.name')}
        </Text>
      </HStack>

      <HStack role="tablist" gap="0.5" flex="1" minW="0" overflowX="auto" overflowY="hidden" scrollbarWidth="none" align="flex-end">
        {sessions.map((session, index) => (
          <TabItem key={session.id} session={session} active={session.id === activeId} index={index} />
        ))}
        <Tooltip content={`${t('tabs.new')} (Alt+T)`}>
          <IconButton aria-label={t('tabs.new')} size="xs" variant="ghost" mb="1" ms="1" onClick={() => newSession()}>
            <LuPlus />
          </IconButton>
        </Tooltip>
      </HStack>

      <Box pb="1">
        <AppMenu />
      </Box>
    </HStack>
  )
}
