/**
 * 검색 결과 없음 힌트 생성
 * 법제처 API는 공백 키워드를 AND 조건으로 처리하므로,
 * 키워드가 많을수록 결과 0건이 되기 쉬움 → 키워드 축소/대체 도구 안내
 */

export interface SearchHintOptions {
  query: string
  toolName: string
  domain?: string
  alternatives?: string[]
}

export function buildNoResultHint(opts: SearchHintOptions): string {
  const { query, toolName, alternatives } = opts
  const keywords = query.trim().split(/\s+/)
  const lines: string[] = ["검색 결과가 없습니다."]

  const hints: string[] = []

  if (keywords.length >= 2) {
    hints.push(`키워드를 줄여보세요: ${toolName}(query="${keywords[0]}")`)
  }

  if (alternatives?.length) {
    for (const alt of alternatives) {
      hints.push(`다른 도메인: ${alt}(query="${query}")`)
    }
  }

  if (hints.length > 0) {
    lines.push("")
    lines.push("힌트:")
    for (const h of hints) {
      lines.push(`  - ${h}`)
    }
  }

  return lines.join("\n")
}
