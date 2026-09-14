import type { HighlightRule, SearchQuery } from './types'

export type Range = [start: number, end: number]

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 把搜索词或高亮规则编译为全局正则；非法正则返回 null */
export function compilePattern(query: Pick<SearchQuery, 'text' | 'regex' | 'caseSensitive'>): RegExp | null {
  if (!query.text) return null
  try {
    return new RegExp(query.regex ? query.text : escapeRegExp(query.text), query.caseSensitive ? 'g' : 'gi')
  } catch {
    return null
  }
}

export function isValidPattern(query: Pick<SearchQuery, 'text' | 'regex'>): boolean {
  if (!query.regex || !query.text) return true
  try {
    new RegExp(query.text)
    return true
  } catch {
    return false
  }
}

export function findRanges(text: string, pattern: RegExp): Range[] {
  const ranges: Range[] = []
  pattern.lastIndex = 0
  for (const match of text.matchAll(pattern)) {
    if (match[0].length === 0) continue // 忽略零宽匹配，避免死循环/空高亮
    ranges.push([match.index, match.index + match[0].length])
  }
  return ranges
}

export interface CompiledRule {
  rule: HighlightRule
  pattern: RegExp
}

export function compileRules(rules: HighlightRule[]): CompiledRule[] {
  return rules.flatMap((rule) => {
    if (!rule.enabled) return []
    const pattern = compilePattern({ text: rule.pattern, regex: rule.regex, caseSensitive: rule.caseSensitive })
    return pattern ? [{ rule, pattern }] : []
  })
}

/** 返回第一条命中的规则（规则按列表顺序优先） */
export function matchRule(text: string, rules: CompiledRule[]): HighlightRule | null {
  for (const { rule, pattern } of rules) {
    pattern.lastIndex = 0
    if (pattern.test(text)) return rule
  }
  return null
}
