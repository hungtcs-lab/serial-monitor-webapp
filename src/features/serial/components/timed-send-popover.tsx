import { Badge, Button, Field, HStack, IconButton, NumberInput, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuPlay, LuSquare, LuTimer } from 'react-icons/lu'
import { useSession, useSessionState } from '../hooks/session-context'
import { usePreferences } from '../store/preferences-store'

interface TimedSendPopoverProps {
  input: string
  /** 当前输入无法发送（为空或格式错误） */
  invalid: boolean
}

/** 定时 / 循环发送：按固定间隔重复发送输入框中的内容 */
export function TimedSendPopover({ input, invalid }: TimedSendPopoverProps) {
  const { t } = useTranslation()
  const session = useSession()
  const open = useSessionState((s) => s.status === 'open')
  const timedSend = useSessionState((s) => s.timedSend)
  const config = usePreferences((s) => s.timedSend)
  const setPrefs = usePreferences((s) => s.set)

  return (
    <Popover.Root positioning={{ placement: 'top-end' }} lazyMount>
      <Popover.Trigger asChild>
        <IconButton
          aria-label={t('send.timed')}
          title={t('send.timed')}
          size="sm"
          variant={timedSend.running ? 'solid' : 'ghost'}
          colorPalette={timedSend.running ? 'orange' : 'gray'}
          position="relative"
        >
          <LuTimer />
          {timedSend.running && (
            <Badge position="absolute" top="-1.5" right="-1.5" size="xs" colorPalette="orange" variant="solid" rounded="full">
              {timedSend.sent}
            </Badge>
          )}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="xs">
            <Popover.Arrow />
            <Popover.Header>
              <Popover.Title fontWeight="semibold">{t('send.timed')}</Popover.Title>
              <Text textStyle="xs" color="fg.muted">
                {t('send.timedHint')}
              </Text>
            </Popover.Header>
            <Popover.Body pt="2">
              <Stack gap="3">
                <HStack gap="3">
                  <Field.Root disabled={timedSend.running}>
                    <Field.Label>{t('send.interval')}</Field.Label>
                    <NumberInput.Root
                      size="sm"
                      min={10}
                      step={100}
                      value={String(config.intervalMs)}
                      onValueChange={(e) =>
                        Number.isFinite(e.valueAsNumber) && setPrefs({ timedSend: { ...config, intervalMs: e.valueAsNumber } })
                      }
                    >
                      <NumberInput.Control />
                      <NumberInput.Input fontFamily="mono" />
                    </NumberInput.Root>
                  </Field.Root>
                  <Field.Root disabled={timedSend.running}>
                    <Field.Label>{t('send.count')}</Field.Label>
                    <NumberInput.Root
                      size="sm"
                      min={0}
                      value={String(config.count)}
                      onValueChange={(e) =>
                        Number.isFinite(e.valueAsNumber) && setPrefs({ timedSend: { ...config, count: e.valueAsNumber } })
                      }
                    >
                      <NumberInput.Control />
                      <NumberInput.Input fontFamily="mono" />
                    </NumberInput.Root>
                    <Field.HelperText>{t('send.countHint')}</Field.HelperText>
                  </Field.Root>
                </HStack>
                {timedSend.running ? (
                  <Button size="sm" colorPalette="red" variant="subtle" onClick={() => session.stopTimed()}>
                    <LuSquare /> {t('send.stopTimed', { count: timedSend.sent })}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    disabled={!open || invalid}
                    onClick={() => session.startTimedSend(input, config)}
                  >
                    <LuPlay /> {t('send.startTimed')}
                  </Button>
                )}
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
