import { Box, Button, Flex, HStack, Spinner, Stack, Status, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuPlug, LuUnplug } from 'react-icons/lu'
import { useSession, useSessionState } from '../hooks/session-context'
import { useSessionActions } from '../hooks/use-session-actions'
import { formatFrame } from '../lib/codec'
import type { SessionStatus } from '../lib/types'
import { isSerialSupported, useWorkspace } from '../store/workspace-store'
import { BaudRateCombobox } from './baud-rate-combobox'
import { DeviceSelect } from './device-select'
import { PortSettingsPopover } from './port-settings-popover'

const STATUS_COLOR: Record<SessionStatus, string> = {
  idle: 'gray',
  opening: 'orange',
  open: 'green',
  closing: 'orange',
  reconnecting: 'orange',
}

function useDeviceKind() {
  const deviceId = useSessionState((s) => s.deviceId)
  return useWorkspace((s) => s.devices.find((d) => d.id === deviceId)?.kind ?? null)
}

function ConnectionStatus() {
  const { t } = useTranslation()
  const status = useSessionState((s) => s.status)
  const params = useSessionState((s) => s.params)
  const deviceId = useSessionState((s) => s.deviceId)
  const device = useWorkspace((s) => s.devices.find((d) => d.id === deviceId))
  const lostLabel = useSessionState((s) => s.lostDeviceLabel)
  const kind = device?.kind ?? null

  return (
    <Stack gap="0" align="center" hideBelow="md" minW="0">
      <Text textStyle="sm" fontWeight="semibold" lineHeight="short" truncate maxW="xs">
        {device?.label ?? lostLabel ?? t('app.name')}
      </Text>
      <Status.Root size="sm" colorPalette={STATUS_COLOR[status]} color="fg.muted" textStyle="xs">
        {status === 'reconnecting' || status === 'opening' ? <Spinner size="xs" /> : <Status.Indicator />}
        {t(`status.${status}`)}
        {status === 'open' && kind === 'serial' && (
          <Text as="span" fontFamily="mono">
            · {formatFrame(params)}
          </Text>
        )}
      </Status.Root>
    </Stack>
  )
}

function ConnectButton() {
  const { t } = useTranslation()
  const session = useSession()
  const { connect } = useSessionActions()
  const status = useSessionState((s) => s.status)

  if (status === 'idle' || status === 'opening') {
    return (
      <Button
        aria-label={t('connection.connect')}
        size="sm"
        minW={{ sm: '24' }}
        colorPalette="blue"
        disabled={!isSerialSupported && !session.device}
        loading={status === 'opening'}
        onClick={() => void connect()}
      >
        <LuPlug />
        <Box as="span" hideBelow="sm">
          {t('connection.connect')}
        </Box>
      </Button>
    )
  }
  const cancelling = status === 'reconnecting'
  return (
    <Button
      aria-label={cancelling ? t('connection.cancelReconnect') : t('connection.disconnect')}
      size="sm"
      minW={{ sm: '24' }}
      colorPalette={cancelling ? 'orange' : 'red'}
      variant="subtle"
      loading={status === 'closing'}
      onClick={() => void session.disconnect()}
    >
      <LuUnplug />
      <Box as="span" hideBelow="sm">
        {cancelling ? t('connection.cancelReconnect') : t('connection.disconnect')}
      </Box>
    </Button>
  )
}

/** 连接栏：左侧设备与参数，中间设备名与状态，右侧连接按钮 */
export function ConnectionBar() {
  const session = useSession()
  const params = useSessionState((s) => s.params)
  const status = useSessionState((s) => s.status)
  const kind = useDeviceKind()
  const isWebSocket = kind === 'websocket'

  return (
    <Flex align="center" gap="2" px="3" py="2" bg="bg.panel" borderBottomWidth="1px">
      <HStack gap="1.5" flex="1" minW="0">
        <DeviceSelect />
        {!isWebSocket && (
          <>
            <Box flexShrink="0" width={{ base: '24', md: '32' }}>
              <BaudRateCombobox
                value={params.baudRate}
                onValueChange={(baudRate) => session.updateParams({ baudRate })}
                disabled={status !== 'idle'}
              />
            </Box>
            <PortSettingsPopover />
          </>
        )}
      </HStack>
      <ConnectionStatus />
      <HStack gap="1" flex={{ md: '1' }} justify="flex-end">
        <ConnectButton />
      </HStack>
    </Flex>
  )
}
