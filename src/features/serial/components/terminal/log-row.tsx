import { Box, Span } from '@chakra-ui/react'
import { memo } from 'react'
import { formatTime } from '../../lib/codec'
import type { CompiledRule, Range } from '../../lib/matcher'
import { matchRule } from '../../lib/matcher'
import { hexRowParts, lineSegments, rowPlainText } from '../../lib/row-text'
import type { Direction, HexRow, SysLevel, TextLine } from '../../lib/types'
import { StyledText } from './styled-text'

export type LogRowData = TextLine | HexRow

export interface LogRowProps {
  row: LogRowData
  ansi: boolean
  showTimestamp: boolean
  rules: CompiledRule[]
  ranges?: Range[]
  activeRange?: number
}

const DIRECTION = {
  rx: { label: 'RX', color: 'green.fg' },
  tx: { label: 'TX', color: 'blue.fg' },
  sys: { label: '--', color: 'fg.subtle' },
} satisfies Record<Direction, { label: string; color: string }>

const SYS_COLOR: Record<SysLevel, string> = {
  info: 'fg.muted',
  warn: 'orange.fg',
  error: 'red.fg',
}

function isHexRow(row: LogRowData): row is HexRow {
  return 'kind' in row
}

/** 终端中的一行：时间戳、方向标记与内容；命中高亮规则时整行着色 */
export const LogRow = memo(function LogRow({ row, ansi, showTimestamp, rules, ranges, activeRange }: LogRowProps) {
  const rule = row.dir === 'sys' ? null : matchRule(rowPlainText(row, ansi), rules)
  const direction = DIRECTION[row.dir]
  const level = isHexRow(row) ? (row.kind === 'sys' ? row.level : undefined) : row.level

  let content
  if (isHexRow(row) && row.kind === 'bytes') {
    const parts = hexRowParts(row)
    content = (
      <>
        <Span color="fg.subtle" userSelect="none" me="3">
          {parts.offset}
        </Span>
        <StyledText
          segments={[{ text: `${parts.hex}  |${parts.ascii}|`, style: {} }]}
          ranges={ranges}
          activeRange={activeRange}
        />
      </>
    )
  } else {
    const segments = isHexRow(row) ? [{ text: row.text, style: {} }] : lineSegments(row, ansi)
    content = <StyledText segments={segments} ranges={ranges} activeRange={activeRange} />
  }

  return (
    <Box
      display="flex"
      gap="3"
      px="3"
      borderStartWidth="3px"
      borderStartColor={rule ? `${rule.color}.solid` : 'transparent'}
      bg={rule ? `${rule.color}.subtle` : undefined}
      _hover={{ bg: rule ? `${rule.color}.muted` : 'bg.muted' }}
    >
      {showTimestamp && (
        <Span flexShrink="0" color="fg.subtle" userSelect="none">
          {formatTime(row.time)}
        </Span>
      )}
      <Span flexShrink="0" color={direction.color} fontWeight="semibold" userSelect="none">
        {direction.label}
      </Span>
      <Box
        flex="1"
        minW="0"
        whiteSpace="pre-wrap"
        wordBreak="break-all"
        color={level ? SYS_COLOR[level] : rule ? `${rule.color}.fg` : 'fg'}
        fontStyle={level ? 'italic' : undefined}
      >
        {content}
      </Box>
    </Box>
  )
})
