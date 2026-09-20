// @vitest-environment jsdom
/**
 * Tilde-delimiter behavior of the markdown grammar: single tildes are
 * literal text, double tildes strike through, delimiter runs pair only at
 * equal length — asserted on both parse arms and on the incremental
 * streaming frontier so streaming and settled rendering cannot diverge.
 */
import { describe, expect, it } from 'vitest'
import type { Root, RootContent } from 'mdast'
import { IncrementalMarkdownParser } from '../src/markdown/incremental.ts'
import { parseGfm, parseGfmWithMath } from '../src/markdown/parse.ts'

/** Count nodes of one mdast type in the subtree. */
function countType(node: Root | RootContent, type: string): number {
  let count = node.type === type ? 1 : 0
  for (const child of ('children' in node ? node.children : undefined) ?? []) {
    count += countType(child as RootContent, type)
  }
  return count
}

/** Visible text of the subtree, concatenated. */
function textOf(node: Root | RootContent): string {
  if (node.type === 'text') return node.value
  return (('children' in node ? node.children : undefined) ?? [])
    .map((child) => textOf(child as RootContent))
    .join('')
}

const ARMS: Array<[name: string, parse: (text: string) => Root]> = [
  ['streaming parseGfm', parseGfm],
  ['settled parseGfmWithMath', parseGfmWithMath],
]

describe.each(ARMS)('%s', (_name, parse) => {
  it('renders single-tilde pairs as literal text', () => {
    const root = parse('见 ~a~ 与 ~b~。')
    expect(countType(root, 'delete')).toBe(0)
    expect(textOf(root)).toContain('~a~')
    expect(textOf(root)).toContain('~b~')
  })

  it('keeps double-tilde strikethrough', () => {
    const root = parse('要 ~~删除~~ 这一段。')
    expect(countType(root, 'delete')).toBe(1)
    expect(textOf(root)).toBe('要 删除 这一段。')
  })

  it('does not bridge adjacent single-tilde pairs into one strike', () => {
    const root = parse('区间 ~100~ ~200~ 之间')
    expect(countType(root, 'delete')).toBe(0)
    expect(textOf(root)).toContain('~100~')
    expect(textOf(root)).toContain('~200~')
  })

  it('resolves mixed single and double tildes independently', () => {
    const root = parse('保留 ~a~ 但 ~~b~~ 去掉')
    expect(countType(root, 'delete')).toBe(1)
    expect(textOf(root)).toContain('~a~')
  })

  it('pairs delimiter runs only at equal length', () => {
    expect(countType(parse('~~b~~'), 'delete')).toBe(1)
    expect(countType(parse('~~b~~~'), 'delete')).toBe(0)
    expect(textOf(parse('~~b~~~'))).toBe('~~b~~~')
    expect(countType(parse('~a~~b~~~'), 'delete')).toBe(0)
  })
})

describe('incremental streaming frontier', () => {
  it('keeps tilde runs literal when split across appended chunks', () => {
    const parser = new IncrementalMarkdownParser(parseGfm)
    let accumulated = ''
    for (const chunk of ['~100', '~ ~200', '~']) {
      accumulated += chunk
      const { frozen, tail } = parser.update(accumulated)
      for (const block of [...frozen, ...tail]) {
        expect(countType(block.node as RootContent, 'delete')).toBe(0)
      }
    }
    const { frozen, tail } = parser.update(accumulated)
    const all = [...frozen, ...tail].map((block) => textOf(block.node as RootContent)).join('')
    expect(all).toContain('~100~')
    expect(all).toContain('~200~')
  })
})
