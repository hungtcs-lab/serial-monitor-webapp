import { Field, HStack, IconButton, Input, InputGroup, Text, Toggle } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LuCaseSensitive, LuChevronDown, LuChevronUp, LuRegex, LuSearch, LuX } from 'react-icons/lu'
import { Tooltip } from '@/components/ui/tooltip'
import { useUi } from '../../store/ui-store'
import type { SearchMatches } from './use-search-matches'

export function SearchBar({ matches }: { matches: SearchMatches }) {
  const { t } = useTranslation()
  const search = useUi((s) => s.search)
  const index = useUi((s) => s.searchIndex)
  const setSearch = useUi((s) => s.setSearch)
  const setIndex = useUi((s) => s.setSearchIndex)
  const close = useUi((s) => s.closeSearch)
  const inputRef = useRef<HTMLInputElement>(null)
  const total = matches.list.length

  // 每次打开（包括再次按 Ctrl+F）都聚焦并全选
  const focusToken = useUi((s) => s.searchFocusToken)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusToken])

  const step = (delta: number) => {
    if (total === 0) return
    setIndex((index + delta + total) % total)
  }

  return (
    <HStack
      position="absolute"
      top="2"
      right="4"
      zIndex="docked"
      gap="1"
      p="1"
      bg="bg.panel"
      borderWidth="1px"
      rounded="md"
      shadow="md"
    >
      <Field.Root invalid={matches.invalid} width="56">
        <InputGroup startElement={<LuSearch />} endElement={
          <Text textStyle="xs" color="fg.muted" fontFamily="mono" whiteSpace="nowrap">
            {search.text ? (total ? `${Math.min(index + 1, total)}/${total}` : '0/0') : ''}
          </Text>
        }>
          <Input
            ref={inputRef}
            size="xs"
            aria-label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            value={search.text}
            onChange={(e) => setSearch({ text: e.currentTarget.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                step(e.shiftKey ? -1 : 1)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                close()
              }
            }}
          />
        </InputGroup>
      </Field.Root>
      <Tooltip content={t('search.caseSensitive')}>
        <Toggle.Root asChild pressed={search.caseSensitive} onPressedChange={(caseSensitive) => setSearch({ caseSensitive })}>
          <IconButton aria-label={t('search.caseSensitive')} size="xs" variant={{ base: 'ghost', _pressed: 'subtle' }}>
            <LuCaseSensitive />
          </IconButton>
        </Toggle.Root>
      </Tooltip>
      <Tooltip content={t('search.regex')}>
        <Toggle.Root asChild pressed={search.regex} onPressedChange={(regex) => setSearch({ regex })}>
          <IconButton aria-label={t('search.regex')} size="xs" variant={{ base: 'ghost', _pressed: 'subtle' }}>
            <LuRegex />
          </IconButton>
        </Toggle.Root>
      </Tooltip>
      <IconButton aria-label={t('search.previous')} title={t('search.previous')} size="xs" variant="ghost" disabled={!total} onClick={() => step(-1)}>
        <LuChevronUp />
      </IconButton>
      <IconButton aria-label={t('search.next')} title={t('search.next')} size="xs" variant="ghost" disabled={!total} onClick={() => step(1)}>
        <LuChevronDown />
      </IconButton>
      <IconButton aria-label={t('common.close')} title={t('common.close')} size="xs" variant="ghost" onClick={close}>
        <LuX />
      </IconButton>
    </HStack>
  )
}
