import { Button, Field, HStack, IconButton, Input, Menu, Portal, SegmentGroup, Span, Toggle } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuHistory, LuSendHorizontal, LuTrash2 } from 'react-icons/lu'
import { Tooltip } from '@/components/ui/tooltip'
import { useSession, useSessionState } from '../hooks/session-context'
import { validateInput } from '../lib/codec'
import { LINE_ENDING_VALUES, SEND_INPUT_ID } from '../lib/constants'
import type { DataFormat } from '../lib/types'
import { usePreferences } from '../store/preferences-store'
import { SelectField } from './select-field'
import { TimedSendPopover } from './timed-send-popover'

function HistoryMenu({ onPick }: { onPick: (value: string) => void }) {
  const { t } = useTranslation()
  const history = usePreferences((s) => s.history)
  const clearHistory = usePreferences((s) => s.clearHistory)

  return (
    <Menu.Root positioning={{ placement: 'top-start' }}>
      <Menu.Trigger asChild>
        <IconButton aria-label={t('send.history')} title={t('send.history')} size="sm" variant="ghost" disabled={history.length === 0}>
          <LuHistory />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="72" maxW="md" maxH="80" overflowY="auto">
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>{t('send.history')}</Menu.ItemGroupLabel>
              {history.map((entry) => (
                <Menu.Item key={entry} value={entry} onSelect={() => onPick(entry)} fontFamily="mono">
                  <Span truncate>{entry}</Span>
                </Menu.Item>
              ))}
            </Menu.ItemGroup>
            <Menu.Separator />
            <Menu.Item value="__clear" color="fg.error" onSelect={clearHistory}>
              <LuTrash2 />
              <Menu.ItemText>{t('send.clearHistory')}</Menu.ItemText>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

/** 发送栏：Enter 发送，↑/↓ 浏览历史；文本模式支持转义字符，Hex 模式实时校验 */
export function SendBar() {
  const { t } = useTranslation()
  const session = useSession()
  const isOpen = useSessionState((s) => s.status === 'open')
  const options = useSessionState((s) => s.send)
  const history = usePreferences((s) => s.history)
  const pushHistory = usePreferences((s) => s.pushHistory)
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState(-1)

  const error = value ? validateInput(value, options) : null
  const canSend = isOpen && !error && (options.format === 'text' || value.trim() !== '')

  async function submit() {
    if (!canSend) return
    if (!(await session.send(value))) return
    if (value) pushHistory(value)
    setValue('')
    setCursor(-1)
  }

  function browseHistory(step: 1 | -1) {
    const next = Math.min(Math.max(cursor + step, -1), history.length - 1)
    setCursor(next)
    setValue(next === -1 ? '' : history[next])
  }

  const placeholder = !isOpen
    ? t('send.placeholderClosed')
    : options.format === 'hex'
      ? t('send.placeholderHex')
      : t('send.placeholderText')

  return (
    <HStack gap="1.5" px="3" py="2" bg="bg.panel" borderTopWidth="1px" wrap={{ base: 'wrap', md: 'nowrap' }}>
      <HistoryMenu
        onPick={(entry) => {
          setValue(entry)
          document.getElementById(SEND_INPUT_ID)?.focus()
        }}
      />
      <Field.Root flex="1" minW="48" invalid={!!error}>
        <Tooltip content={error ? t(`send.error.${error}`) : ''} open={!!error} positioning={{ placement: 'top-start' }}>
          <Input
            id={SEND_INPUT_ID}
            size="sm"
            fontFamily="mono"
            aria-label={t('send.input')}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.currentTarget.value)
              setCursor(-1)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submit()
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault()
                browseHistory(e.key === 'ArrowUp' ? 1 : -1)
              }
            }}
          />
        </Tooltip>
      </Field.Root>

      {options.format === 'text' && (
        <Tooltip content={t('send.escapesHint')}>
          <Toggle.Root
            asChild
            pressed={options.escapes}
            onPressedChange={(escapes) => session.updateSendOptions({ escapes })}
          >
            <Button size="sm" variant={{ base: 'ghost', _pressed: 'subtle' }} fontFamily="mono" px="2" aria-label={t('send.escapes')}>
              \n
            </Button>
          </Toggle.Root>
        </Tooltip>
      )}

      <SelectField
        label={t('send.lineEnding')}
        hideLabel
        width="24"
        options={LINE_ENDING_VALUES.map((v) => ({ label: t(`send.lineEndingValue.${v}`), value: v }))}
        value={options.lineEnding}
        onValueChange={(lineEnding) => session.updateSendOptions({ lineEnding })}
        disabled={options.format === 'hex'}
      />

      <SegmentGroup.Root
        size="sm"
        value={options.format}
        onValueChange={(e) => e.value && session.updateSendOptions({ format: e.value as DataFormat })}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items
          items={[
            { value: 'text', label: t('format.text') },
            { value: 'hex', label: t('format.hex') },
          ]}
        />
      </SegmentGroup.Root>

      <TimedSendPopover input={value} invalid={!!error || (options.format === 'hex' && value.trim() === '')} />

      <Button size="sm" minW="20" colorPalette="blue" disabled={!canSend} onClick={() => void submit()}>
        <LuSendHorizontal /> {t('send.send')}
      </Button>
    </HStack>
  )
}
