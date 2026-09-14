import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  HStack,
  IconButton,
  Input,
  Portal,
  Stack,
  Switch,
  Text,
  Toggle,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuCaseSensitive, LuPlus, LuRegex, LuRotateCcw, LuTrash2 } from 'react-icons/lu'
import { Tooltip } from '@/components/ui/tooltip'
import { DEFAULT_HIGHLIGHT_RULES, RULE_COLORS } from '../../lib/constants'
import { isValidPattern } from '../../lib/matcher'
import type { HighlightRule, RuleColor } from '../../lib/types'
import { usePreferences } from '../../store/preferences-store'
import { useUi } from '../../store/ui-store'

function ColorPicker({ value, onChange }: { value: RuleColor; onChange: (color: RuleColor) => void }) {
  return (
    <HStack gap="1" role="radiogroup">
      {RULE_COLORS.map((color) => (
        <Box
          key={color}
          as="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          boxSize="4"
          rounded="full"
          bg={`${color}.solid`}
          outline={value === color ? '2px solid' : 'none'}
          outlineColor="fg"
          outlineOffset="1px"
          cursor="pointer"
          onClick={() => onChange(color)}
        />
      ))}
    </HStack>
  )
}

function RuleEditor({
  rule,
  onChange,
  onRemove,
}: {
  rule: HighlightRule
  onChange: (patch: Partial<HighlightRule>) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const invalid = !isValidPattern({ text: rule.pattern, regex: rule.regex })

  return (
    <Stack gap="2" p="3" borderWidth="1px" rounded="md" borderStartWidth="3px" borderStartColor={`${rule.color}.solid`}>
      <HStack gap="2">
        <Switch.Root size="sm" checked={rule.enabled} onCheckedChange={(e) => onChange({ enabled: e.checked })}>
          <Switch.HiddenInput />
          <Switch.Control />
        </Switch.Root>
        <Field.Root invalid={invalid} flex="1">
          <Input
            size="sm"
            fontFamily="mono"
            value={rule.pattern}
            placeholder={t('rules.patternPlaceholder')}
            aria-label={t('rules.pattern')}
            onChange={(e) => onChange({ pattern: e.currentTarget.value })}
          />
        </Field.Root>
        <Tooltip content={t('search.caseSensitive')}>
          <Toggle.Root asChild pressed={rule.caseSensitive} onPressedChange={(caseSensitive) => onChange({ caseSensitive })}>
            <IconButton aria-label={t('search.caseSensitive')} size="sm" variant={{ base: 'ghost', _pressed: 'subtle' }}>
              <LuCaseSensitive />
            </IconButton>
          </Toggle.Root>
        </Tooltip>
        <Tooltip content={t('search.regex')}>
          <Toggle.Root asChild pressed={rule.regex} onPressedChange={(regex) => onChange({ regex })}>
            <IconButton aria-label={t('search.regex')} size="sm" variant={{ base: 'ghost', _pressed: 'subtle' }}>
              <LuRegex />
            </IconButton>
          </Toggle.Root>
        </Tooltip>
        <IconButton aria-label={t('rules.remove')} title={t('rules.remove')} size="sm" variant="ghost" onClick={onRemove}>
          <LuTrash2 />
        </IconButton>
      </HStack>
      <HStack justify="space-between">
        <ColorPicker value={rule.color} onChange={(color) => onChange({ color })} />
        {invalid && (
          <Text textStyle="xs" color="fg.error">
            {t('rules.invalidRegex')}
          </Text>
        )}
      </HStack>
    </Stack>
  )
}

export function HighlightRulesDialog() {
  const { t } = useTranslation()
  const open = useUi((s) => s.dialog === 'highlight-rules')
  const closeDialog = useUi((s) => s.closeDialog)
  const rules = usePreferences((s) => s.highlightRules)
  const setPrefs = usePreferences((s) => s.set)

  const update = (id: string, patch: Partial<HighlightRule>) =>
    setPrefs({ highlightRules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && closeDialog()} size="lg" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Stack gap="1">
                <Dialog.Title>{t('rules.title')}</Dialog.Title>
                <Dialog.Description textStyle="sm" color="fg.muted">
                  {t('rules.description')}
                </Dialog.Description>
              </Stack>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="2">
                {rules.length === 0 && (
                  <Text textStyle="sm" color="fg.muted" textAlign="center" py="6">
                    {t('rules.empty')}
                  </Text>
                )}
                {rules.map((rule) => (
                  <RuleEditor
                    key={rule.id}
                    rule={rule}
                    onChange={(patch) => update(rule.id, patch)}
                    onRemove={() => setPrefs({ highlightRules: rules.filter((r) => r.id !== rule.id) })}
                  />
                ))}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer justifyContent="space-between">
              <Button size="sm" variant="ghost" onClick={() => setPrefs({ highlightRules: DEFAULT_HIGHLIGHT_RULES })}>
                <LuRotateCcw /> {t('rules.reset')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPrefs({
                    highlightRules: [
                      ...rules,
                      { id: crypto.randomUUID(), pattern: '', regex: false, caseSensitive: false, color: 'blue', enabled: true },
                    ],
                  })
                }
              >
                <LuPlus /> {t('rules.add')}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
