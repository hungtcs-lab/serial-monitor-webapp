import { Box, Span, type SystemStyleObject } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { Range } from '../../lib/matcher'
import type { AnsiColor, AnsiSegment, AnsiStyle } from '../../lib/types'

const PALETTE = ['gray', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'gray'] as const

function fgToken(color: AnsiColor): string {
  if (color.type === 'rgb') return color.value
  const bright = color.index >= 8
  const index = color.index % 8
  if (index === 7) return bright ? 'fg' : 'fg.muted'
  if (index === 0) return bright ? 'gray.500' : 'gray.600'
  return bright ? `${PALETTE[index]}.400` : `${PALETTE[index]}.fg`
}

function bgToken(color: AnsiColor): string {
  if (color.type === 'rgb') return color.value
  const index = color.index % 8
  if (index === 0) return 'gray.emphasized'
  if (index === 7) return 'gray.muted'
  return `${PALETTE[index]}.muted`
}

function ansiCss(style: AnsiStyle): SystemStyleObject | undefined {
  if (!style.fg && !style.bg && !style.bold && !style.dim && !style.italic && !style.underline && !style.inverse) {
    return undefined
  }
  const fg = style.fg ? fgToken(style.fg) : undefined
  const bg = style.bg ? bgToken(style.bg) : undefined
  return {
    color: style.inverse ? (bg ?? 'bg') : fg,
    bg: style.inverse ? (fg ?? 'fg') : bg,
    fontWeight: style.bold ? 'bold' : undefined,
    opacity: style.dim ? 0.7 : undefined,
    fontStyle: style.italic ? 'italic' : undefined,
    textDecoration: style.underline ? 'underline' : undefined,
  }
}

interface StyledTextProps {
  segments: AnsiSegment[]
  /** 搜索命中范围（基于纯文本偏移） */
  ranges?: Range[]
  /** 当前定位到的命中在 ranges 中的下标 */
  activeRange?: number
}

/** 渲染带 ANSI 样式的文本，并叠加搜索命中高亮 */
export function StyledText({ segments, ranges, activeRange }: StyledTextProps) {
  if (!ranges?.length) {
    return segments.map((segment, i) => (
      <Span key={i} css={ansiCss(segment.style)}>
        {segment.text}
      </Span>
    ))
  }

  const nodes: ReactNode[] = []
  let offset = 0
  let key = 0
  for (const segment of segments) {
    const css = ansiCss(segment.style)
    const start = offset
    const end = offset + segment.text.length
    let cursor = start
    for (let r = 0; r < ranges.length; r++) {
      const [rs, re] = ranges[r]
      if (re <= cursor || rs >= end) continue
      const from = Math.max(rs, cursor)
      const to = Math.min(re, end)
      if (from > cursor) {
        nodes.push(
          <Span key={key++} css={css}>
            {segment.text.slice(cursor - start, from - start)}
          </Span>,
        )
      }
      const active = r === activeRange
      nodes.push(
        <Box
          as="mark"
          key={key++}
          css={css}
          bg={active ? 'orange.solid' : 'yellow.muted'}
          color={active ? 'orange.contrast' : 'inherit'}
          rounded="xs"
          data-active-match={active || undefined}
        >
          {segment.text.slice(from - start, to - start)}
        </Box>,
      )
      cursor = to
    }
    if (cursor < end) {
      nodes.push(
        <Span key={key++} css={css}>
          {segment.text.slice(cursor - start)}
        </Span>,
      )
    }
    offset = end
  }
  return nodes
}
