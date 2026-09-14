import {
  Box,
  Button,
  Checkbox,
  HStack,
  IconButton,
  Menu,
  Portal,
  SegmentGroup,
  Separator,
  Spacer,
  Status,
  Text,
  Toggle,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuChevronDown, LuCircleStop, LuEraser, LuEye, LuRotateCcw, LuZap } from 'react-icons/lu'
import { Tooltip } from '@/components/ui/tooltip'
import { useSession, useSessionState } from '../hooks/session-context'
import { formatBytes } from '../lib/codec'
import type { DataFormat, OutputSignals } from '../lib/types'
import { usePreferences } from '../store/preferences-store'
import { useUi } from '../store/ui-store'
import { useWorkspace } from '../store/workspace-store'

const OUTPUT_SIGNALS: { key: keyof OutputSignals; label: string; name: string }[] = [
  { key: 'dataTerminalReady', label: 'DTR', name: 'Data Terminal Ready' },
  { key: 'requestToSend', label: 'RTS', name: 'Request To Send' },
]

const INPUT_SIGNALS: { key: keyof SerialInputSignals; label: string; name: string }[] = [
  { key: 'clearToSend', label: 'CTS', name: 'Clear To Send' },
  { key: 'dataSetReady', label: 'DSR', name: 'Data Set Ready' },
  { key: 'dataCarrierDetect', label: 'DCD', name: 'Data Carrier Detect' },
  { key: 'ringIndicator', label: 'RI', name: 'Ring Indicator' },
]

function DisplayOptions() {
  const { t } = useTranslation()
  const session = useSession()
  const format = useSessionState((s) => s.displayFormat)
  const prefs = usePreferences()
  const openDialog = useUi((s) => s.openDialog)

  return (
    <HStack gap="3">
      <SegmentGroup.Root
        size="xs"
        value={format}
        onValueChange={(e) => e.value && session.setDisplayFormat(e.value as DataFormat)}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items
          items={[
            { value: 'text', label: t('format.text') },
            { value: 'hex', label: t('format.hex') },
          ]}
        />
      </SegmentGroup.Root>

      <Checkbox.Root size="sm" checked={prefs.showTimestamp} onCheckedChange={(e) => prefs.set({ showTimestamp: !!e.checked })}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>{t('toolbar.timestamps')}</Checkbox.Label>
      </Checkbox.Root>
      <Checkbox.Root size="sm" checked={prefs.autoScroll} onCheckedChange={(e) => prefs.set({ autoScroll: !!e.checked })}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>{t('toolbar.autoScroll')}</Checkbox.Label>
      </Checkbox.Root>

      <Menu.Root closeOnSelect={false}>
        <Menu.Trigger asChild>
          <Button size="xs" variant="ghost">
            <LuEye /> {t('toolbar.view')} <LuChevronDown />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="48">
              <Menu.CheckboxItem value="ansi" checked={prefs.ansi} onCheckedChange={(ansi) => prefs.set({ ansi })}>
                {t('toolbar.ansiColors')}
                <Menu.ItemIndicator />
              </Menu.CheckboxItem>
              <Menu.CheckboxItem value="tx" checked={prefs.showTx} onCheckedChange={(showTx) => prefs.set({ showTx })}>
                {t('toolbar.showTx')}
                <Menu.ItemIndicator />
              </Menu.CheckboxItem>
              <Menu.Separator />
              <Menu.Item value="rules" onSelect={() => openDialog('highlight-rules')}>
                {t('menu.highlightRules')}
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </HStack>
  )
}

function SignalControls() {
  const { t } = useTranslation()
  const session = useSession()
  const signals = useSessionState((s) => s.signals)
  const inputSignals = useSessionState((s) => s.inputSignals)
  const busy = useSessionState((s) => s.busy)
  const open = useSessionState((s) => s.status === 'open')
  const deviceId = useSessionState((s) => s.deviceId)
  const isSerial = useWorkspace((s) => s.devices.find((d) => d.id === deviceId)?.kind !== 'websocket')
  if (!isSerial) return null
  const disabled = !open || busy

  return (
    <HStack gap="2">
      <Separator orientation="vertical" height="5" />
      {OUTPUT_SIGNALS.map(({ key, label, name }) => (
        <Tooltip key={key} content={name}>
          <Toggle.Root asChild pressed={signals[key]} onPressedChange={(pressed) => void session.setSignal(key, pressed)}>
            <Button
              size="xs"
              minW="11"
              fontFamily="mono"
              disabled={disabled}
              variant={{ base: 'subtle', _pressed: 'solid' }}
              colorPalette={signals[key] ? 'blue' : 'gray'}
            >
              {label}
            </Button>
          </Toggle.Root>
        </Tooltip>
      ))}

      <HStack gap="2.5" px="1" hideBelow="lg" aria-label={t('toolbar.inputSignals')}>
        {INPUT_SIGNALS.map(({ key, label, name }) => (
          <Tooltip key={key} content={`${name}: ${inputSignals ? (inputSignals[key] ? 'ON' : 'OFF') : '—'}`}>
            <Status.Root size="sm" colorPalette={inputSignals?.[key] ? 'green' : 'gray'} opacity={inputSignals ? 1 : 0.5}>
              <Status.Indicator />
              <Text textStyle="xs" fontFamily="mono" color="fg.muted">
                {label}
              </Text>
            </Status.Root>
          </Tooltip>
        ))}
      </HStack>

      <Menu.Root>
        <Menu.Trigger asChild>
          <Button size="xs" variant="subtle" disabled={disabled} loading={busy}>
            <LuZap /> {t('toolbar.control')} <LuChevronDown />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="56">
              <Menu.Item value="break" onSelect={() => void session.sendBreak()}>
                <LuZap />
                <Menu.ItemText>{t('toolbar.sendBreak')}</Menu.ItemText>
              </Menu.Item>
              <Menu.Separator />
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel>{t('toolbar.espReset')}</Menu.ItemGroupLabel>
                <Menu.Item value="reset" onSelect={() => void session.resetDevice('reset')}>
                  <LuRotateCcw />
                  <Menu.ItemText>{t('toolbar.resetDevice')}</Menu.ItemText>
                </Menu.Item>
                <Menu.Item value="bootloader" onSelect={() => void session.resetDevice('bootloader')}>
                  <LuRotateCcw />
                  <Menu.ItemText>{t('toolbar.enterBootloader')}</Menu.ItemText>
                </Menu.Item>
              </Menu.ItemGroup>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </HStack>
  )
}

function FileLogIndicator() {
  const { t } = useTranslation()
  const session = useSession()
  const fileLog = useSessionState((s) => s.fileLog)
  if (!fileLog) return null
  return (
    <HStack gap="1.5" textStyle="xs" color="fg.muted" maxW="60">
      <Box
        boxSize="2"
        rounded="full"
        bg="red.solid"
        flexShrink="0"
        animation="pulse 1.5s ease-in-out infinite"
      />
      <Text truncate title={fileLog.name}>
        {fileLog.name}
      </Text>
      <Text fontFamily="mono" flexShrink="0">
        {formatBytes(fileLog.bytes)}
      </Text>
      <Tooltip content={t('menu.stopFileLog')}>
        <IconButton aria-label={t('menu.stopFileLog')} size="2xs" variant="ghost" onClick={() => void session.stopFileLog()}>
          <LuCircleStop />
        </IconButton>
      </Tooltip>
    </HStack>
  )
}

function TrafficCounter() {
  const stats = useSessionState((s) => s.stats)
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

/** 终端底部工具栏：显示选项、控制信号、文件记录状态与收发计数 */
export function TerminalToolbar() {
  const { t } = useTranslation()
  const session = useSession()
  const empty = useSessionState((s) => s.lines.length === 0 && s.hexRows.length === 0)

  return (
    <HStack gap="3" px="3" py="1.5" bg="bg.panel" borderTopWidth="1px" wrap="wrap" rowGap="1.5">
      <DisplayOptions />
      <SignalControls />
      <Spacer />
      <FileLogIndicator />
      <TrafficCounter />
      <Tooltip content={t('menu.clear')}>
        <IconButton aria-label={t('menu.clear')} size="xs" variant="ghost" disabled={empty} onClick={() => session.clear()}>
          <LuEraser />
        </IconButton>
      </Tooltip>
    </HStack>
  )
}
