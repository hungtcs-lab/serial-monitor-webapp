import { describe, expect, it } from 'vitest'
import { encodeEscaped, encodeInput, parseHex, validateInput } from './codec'
import { DEFAULT_SEND_OPTIONS } from './constants'

const bytes = (u: Uint8Array) => Array.from(u)

describe('parseHex', () => {
  it('支持空格、逗号、0x 前缀与连续写法', () => {
    expect(bytes(parseHex('AA 55 01 ff'))).toEqual([0xaa, 0x55, 0x01, 0xff])
    expect(bytes(parseHex('0xAA,0x55'))).toEqual([0xaa, 0x55])
    expect(bytes(parseHex('aa55'))).toEqual([0xaa, 0x55])
  })

  it('奇数位或非法字符报错', () => {
    expect(() => parseHex('AA 5')).toThrow('invalid-hex')
    expect(() => parseHex('GG')).toThrow('invalid-hex')
  })
})

describe('encodeEscaped', () => {
  it('解析常用转义与 \\xHH', () => {
    expect(bytes(encodeEscaped('A\\r\\n\\t\\0\\e\\\\\\x7f'))).toEqual([0x41, 13, 10, 9, 0, 0x1b, 0x5c, 0x7f])
  })

  it('非 ASCII 字符按 UTF-8 编码', () => {
    expect(bytes(encodeEscaped('温'))).toEqual([0xe6, 0xb8, 0xa9])
  })

  it('非法转义报错', () => {
    expect(() => encodeEscaped('\\q')).toThrow('invalid-escape')
    expect(() => encodeEscaped('\\x4')).toThrow('invalid-escape')
    expect(() => encodeEscaped('tail\\')).toThrow('invalid-escape')
  })
})

describe('encodeInput', () => {
  it('文本模式追加行尾，转义可关闭', () => {
    expect(bytes(encodeInput('AT', { ...DEFAULT_SEND_OPTIONS, lineEnding: 'crlf' }))).toEqual([65, 84, 13, 10])
    expect(bytes(encodeInput('\\n', { format: 'text', lineEnding: 'none', escapes: false }))).toEqual([0x5c, 0x6e])
  })

  it('Hex 模式忽略行尾', () => {
    expect(bytes(encodeInput('01 02', { format: 'hex', lineEnding: 'crlf', escapes: true }))).toEqual([1, 2])
  })

  it('validateInput 返回错误码', () => {
    expect(validateInput('AA 5', { ...DEFAULT_SEND_OPTIONS, format: 'hex' })).toBe('invalid-hex')
    expect(validateInput('\\z', DEFAULT_SEND_OPTIONS)).toBe('invalid-escape')
    expect(validateInput('ok', DEFAULT_SEND_OPTIONS)).toBeNull()
  })
})
