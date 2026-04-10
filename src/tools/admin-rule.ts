/**
 * 행정규칙 관련 Tools
 */

import { z } from "zod"
import { DOMParser } from "@xmldom/xmldom"
import type { LawApiClient } from "../lib/api-client.js"
import { truncateResponse } from "../lib/schemas.js"
import { formatToolError } from "../lib/errors.js"
import { buildNoResultHint } from "../lib/search-hints.js"

// search_admin_rule 스키마
export const SearchAdminRuleSchema = z.object({
  query: z.string().describe("검색할 행정규칙명"),
  knd: z.string().optional().describe("행정규칙 종류 (1=훈령, 2=예규, 3=고시, 4=공고, 5=일반)"),
  display: z.number().optional().default(20).describe("최대 결과 개수"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달")
})

export type SearchAdminRuleInput = z.infer<typeof SearchAdminRuleSchema>

export async function searchAdminRule(
  apiClient: LawApiClient,
  input: SearchAdminRuleInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  try {
    const xmlText = await apiClient.searchAdminRule({
      query: input.query,
      knd: input.knd,
      apiKey: input.apiKey
    })

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, "text/xml")

    const rules = doc.getElementsByTagName("admrul")

    if (rules.length === 0) {
      return {
        content: [{ type: "text", text: buildNoResultHint({ query: input.query, toolName: "search_admin_rule", alternatives: ["search_law"] }) }],
        isError: true
      }
    }

    let resultText = `행정규칙 검색 결과 (총 ${rules.length}건):\n\n`

    const display = Math.min(rules.length, input.display)

    for (let i = 0; i < display; i++) {
      const rule = rules[i]

      const ruleName = rule.getElementsByTagName("행정규칙명")[0]?.textContent || "알 수 없음"
      const ruleSeq = rule.getElementsByTagName("행정규칙일련번호")[0]?.textContent || ""
      const ruleId = rule.getElementsByTagName("행정규칙ID")[0]?.textContent || ""
      const promDate = rule.getElementsByTagName("발령일자")[0]?.textContent || ""
      const ruleType = rule.getElementsByTagName("행정규칙종류")[0]?.textContent || ""
      const orgName = rule.getElementsByTagName("소관부처명")[0]?.textContent || ""

      resultText += `${i + 1}. ${ruleName}\n`
      resultText += `   - 행정규칙일련번호: ${ruleSeq}\n`
      resultText += `   - 행정규칙ID: ${ruleId}\n`
      resultText += `   - 공포일: ${promDate}\n`
      resultText += `   - 구분: ${ruleType}\n`
      resultText += `   - 소관부처: ${orgName}\n\n`
    }

    // 후속 도구 안내 제거 (LLM이 이미 도구 목록을 알고 있음)

    return {
      content: [{
        type: "text",
        text: truncateResponse(resultText)
      }]
    }
  } catch (error) {
    return formatToolError(error, "search_admin_rule")
  }
}

// compare_admin_rule_old_new 스키마
export const CompareAdminRuleOldNewSchema = z.object({
  query: z.string().optional().describe("행정규칙명 키워드 (검색용)"),
  id: z.string().optional().describe("행정규칙ID (본문 조회용, search_admin_rule에서 획득)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달")
}).refine(data => data.query || data.id, {
  message: "query(검색) 또는 id(본문조회) 중 하나는 필수입니다"
})

export type CompareAdminRuleOldNewInput = z.infer<typeof CompareAdminRuleOldNewSchema>

export async function compareAdminRuleOldNew(
  apiClient: LawApiClient,
  input: CompareAdminRuleOldNewInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  try {
    if (input.id) {
      // 본문 조회: lawService.do, target=admrulOldAndNew
      const xmlText = await apiClient.fetchApi({
        endpoint: "lawService.do",
        target: "admrulOldAndNew",
        type: "XML",
        extraParams: { ID: String(input.id) },
        apiKey: input.apiKey
      })

      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlText, "text/xml")

      const ruleName = doc.getElementsByTagName("행정규칙명")[0]?.textContent || "알 수 없음"

      let resultText = `행정규칙 신구법 대조: ${ruleName}\n`
      resultText += `---\n\n`

      const oldArticles = doc.getElementsByTagName("구조문")
      const newArticles = doc.getElementsByTagName("신조문")
      const maxCount = Math.max(oldArticles.length, newArticles.length)

      if (maxCount === 0) {
        resultText += "신구법 대조 데이터가 없습니다."
        return { content: [{ type: "text", text: resultText }] }
      }

      const displayCount = Math.min(maxCount, 30)
      for (let i = 0; i < displayCount; i++) {
        const oldContent = oldArticles[i]?.textContent?.trim() || ""
        const newContent = newArticles[i]?.textContent?.trim() || ""

        resultText += `---\n`
        resultText += `[개정 전] ${oldContent || "(신설)"}\n\n`
        resultText += `[개정 후] ${newContent || "(삭제)"}\n\n`
      }

      if (maxCount > displayCount) {
        resultText += `\n... 외 ${maxCount - displayCount}개 항목 (생략)\n`
      }

      return { content: [{ type: "text", text: truncateResponse(resultText) }] }
    }

    // 검색: lawSearch.do, target=admrulOldAndNew
    const xmlText = await apiClient.fetchApi({
      endpoint: "lawSearch.do",
      target: "admrulOldAndNew",
      type: "XML",
      extraParams: { query: String(input.query) },
      apiKey: input.apiKey
    })

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, "text/xml")

    const rules = doc.getElementsByTagName("admrul")
    if (rules.length === 0) {
      return {
        content: [{ type: "text", text: buildNoResultHint({ query: String(input.query), toolName: "compare_admin_rule_old_new", alternatives: ["search_admin_rule"] }) }],
        isError: true
      }
    }

    let resultText = `행정규칙 신구법 검색 결과 (총 ${rules.length}건):\n\n`

    const display = Math.min(rules.length, 20)
    for (let i = 0; i < display; i++) {
      const rule = rules[i]
      const name = rule.getElementsByTagName("행정규칙명")[0]?.textContent || "알 수 없음"
      const ruleId = rule.getElementsByTagName("행정규칙ID")[0]?.textContent || ""
      const promDate = rule.getElementsByTagName("발령일자")[0]?.textContent || ""
      const orgName = rule.getElementsByTagName("소관부처명")[0]?.textContent || ""

      resultText += `${i + 1}. ${name}\n`
      resultText += `   - 행정규칙ID: ${ruleId}\n`
      resultText += `   - 발령일: ${promDate}\n`
      resultText += `   - 소관부처: ${orgName}\n\n`
    }

    // 후속 도구 안내 제거 (LLM이 이미 도구 목록을 알고 있음)

    return { content: [{ type: "text", text: truncateResponse(resultText) }] }
  } catch (error) {
    return formatToolError(error, "compare_admin_rule_old_new")
  }
}
