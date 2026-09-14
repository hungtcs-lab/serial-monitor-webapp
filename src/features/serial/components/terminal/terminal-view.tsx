import { Box, Button, Center, EmptyState, Float, Kbd, List, ScrollArea } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { LuArrowDownToLine, LuTerminal } from 'react-icons/lu'
import { useSessionState } from '../../hooks/session-context'
import { compileRules } from '../../lib/matcher'
import { usePreferences } from '../../store/preferences-store'
import { useUi } from '../../store/ui-store'
import { isSerialSupported } from '../../store/workspace-store'
import { LogRow, type LogRowData } from './log-row'
import { SearchBar } from './search-bar'
import { useSearchMatches } from './use-search-matches'

const ROW_HEIGHT_ESTIMATE = 22
/** 距离底部小于该值视为“在底部”，新数据到来时继续跟随 */
const BOTTOM_THRESHOLD = 32

function EmptyTerminal() {
  const { t } = useTranslation()
  return (
    <Center h="full">
      <EmptyState.Root size="sm">
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuTerminal />
          </EmptyState.Indicator>
          <EmptyState.Title>{isSerialSupported ? t('terminal.empty') : t('terminal.unsupported')}</EmptyState.Title>
          <EmptyState.Description>
            {isSerialSupported ? t('terminal.emptyHint') : t('terminal.unsupportedHint')}
          </EmptyState.Description>
          <List.Root variant="plain" gap="1.5" textStyle="xs" color="fg.muted">
            <List.Item>
              <Trans i18nKey="terminal.tipSearch" components={{ kbd: <Kbd size="sm" /> }} />
            </List.Item>
            <List.Item>
              <Trans i18nKey="terminal.tipHistory" components={{ kbd: <Kbd size="sm" /> }} />
            </List.Item>
            <List.Item>
              <Trans i18nKey="terminal.tipShortcuts" components={{ kbd: <Kbd size="sm" /> }} />
            </List.Item>
          </List.Root>
        </EmptyState.Content>
      </EmptyState.Root>
    </Center>
  )
}

export function TerminalView() {
  // useVirtualizer 返回的是可变对象，React Compiler 的自动缓存会导致列表不刷新
  'use no memo'
  const { t } = useTranslation()
  const format = useSessionState((s) => s.displayFormat)
  const lines = useSessionState((s) => s.lines)
  const hexRows = useSessionState((s) => s.hexRows)
  const showTimestamp = usePreferences((s) => s.showTimestamp)
  const autoScroll = usePreferences((s) => s.autoScroll)
  const ansi = usePreferences((s) => s.ansi)
  const showTx = usePreferences((s) => s.showTx)
  const highlightRules = usePreferences((s) => s.highlightRules)
  const searchOpen = useUi((s) => s.searchOpen)
  const search = useUi((s) => s.search)
  const searchIndex = useUi((s) => s.searchIndex)

  const rows = useMemo<LogRowData[]>(() => {
    const source: LogRowData[] = format === 'hex' ? hexRows : lines
    return showTx ? source : source.filter((row) => row.dir !== 'tx')
  }, [format, hexRows, lines, showTx])
  const rules = useMemo(() => compileRules(highlightRules), [highlightRules])
  const matches = useSearchMatches(rows, search, searchOpen, ansi)
  const activeMatch = matches.list[searchIndex]
  const activeRowIndex = activeMatch?.rowIndex
  const searching = searchOpen && search.text !== ''

  const viewportRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const [following, setFollowing] = useState(true)

  // oxlint-disable-next-line react/incompatible-library -- 已通过 'use no memo' 退出编译器优化
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    getItemKey: (index) => rows[index].id,
    overscan: 20,
  })

  // 新数据到来时跟随到底部（搜索时不跟随，避免跳走）
  useEffect(() => {
    if (autoScroll && following && !searching && rows.length > 0) {
      virtualizer.scrollToIndex(rows.length - 1, { align: 'end' })
    }
  }, [rows, autoScroll, following, searching, virtualizer])

  // 定位到当前搜索命中
  useEffect(() => {
    if (activeRowIndex !== undefined) virtualizer.scrollToIndex(activeRowIndex, { align: 'center' })
  }, [activeRowIndex, virtualizer])

  function handleScroll(el: HTMLDivElement) {
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
    // 只有用户向上滚动时才暂停跟随；内容增长引起的变化不算
    if (atBottom) setFollowing(true)
    else if (el.scrollTop < lastScrollTop.current - 4) setFollowing(false)
    lastScrollTop.current = el.scrollTop
  }

  return (
    <Box position="relative" flex="1" minH="0" bg="bg">
      {searchOpen && <SearchBar matches={matches} />}
      {rows.length === 0 ? (
        <EmptyTerminal />
      ) : (
        <ScrollArea.Root h="full" size="xs">
          <ScrollArea.Viewport ref={viewportRef} onScroll={(e) => handleScroll(e.currentTarget)}>
            <ScrollArea.Content py="2" fontFamily="mono" textStyle="sm" lineHeight="1.65">
              <Box position="relative" height={`${virtualizer.getTotalSize()}px`}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = rows[item.index]
                  const isActiveRow = activeMatch?.rowIndex === item.index
                  return (
                    <Box
                      key={item.key}
                      data-index={item.index}
                      ref={virtualizer.measureElement}
                      position="absolute"
                      top="0"
                      left="0"
                      width="full"
                      transform={`translateY(${item.start}px)`}
                    >
                      <LogRow
                        row={row}
                        ansi={ansi}
                        showTimestamp={showTimestamp}
                        rules={rules}
                        ranges={searching ? matches.byRow.get(item.index) : undefined}
                        activeRange={isActiveRow ? activeMatch.rangeIndex : undefined}
                      />
                    </Box>
                  )
                })}
              </Box>
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar />
        </ScrollArea.Root>
      )}
      {!following && autoScroll && rows.length > 0 && (
        <Float placement="bottom-end" offsetX="16" offsetY="8">
          <Button
            size="xs"
            variant="surface"
            shadow="md"
            onClick={() => {
              setFollowing(true)
              virtualizer.scrollToIndex(rows.length - 1, { align: 'end' })
            }}
          >
            <LuArrowDownToLine /> {t('terminal.jumpToLatest')}
          </Button>
        </Float>
      )}
    </Box>
  )
}
