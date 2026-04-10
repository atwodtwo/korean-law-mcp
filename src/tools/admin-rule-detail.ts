/**
 * 행정규칙 전문 조회 (get_admin_rule)
 * admin-rule.ts에서 분리 — 200줄 제한 준수
 */

import { z } from "zod"
import { DOMParser } from "@xmldom/xmldom"
import type { LawApiClient } from "../lib/api-client.js"
import { truncateResponse } from "../lib/schemas.js"
import { formatToolError } from "../lib/errors.js"

export const GetAdminRuleSchema = z.object({
  id: z.string().describe("행정규칙ID (search_admin_rule에서 획득)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달")
})

export type GetAdminRuleInput = z.infer<typeof GetAdminRuleSchema>

function formatAttachments(doc: ReturnType<DOMParser["parseFromString"]>): string {
  const attachments = doc.getElementsByTagName("첨부파일링크")
  if (attachments.length === 0) return ""

  let text = "[주의] 이 행정규칙은 조문 형식이 아닌 첨부파일로 제공됩니다.\n\n"
  text += "첨부파일:\n"
  for (let i = 0; i < attachments.length; i++) {
    const link = attachments[i].textContent || ""
    if (link) {
      text += `   ${i + 1}. ${link}\n`
    }
  }
  return text
}

export async function getAdminRule(
  apiClient: LawApiClient,
  input: GetAdminRuleInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  try {
    const xmlText = await apiClient.getAdminRule(input.id, input.apiKey)

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, "text/xml")

    const ruleName = doc.getElementsByTagName("행정규칙명")[0]?.textContent || "알 수 없음"
    const promDate = doc.getElementsByTagName("공포일자")[0]?.textContent || ""
    const orgName = doc.getElementsByTagName("소관부처")[0]?.textContent || ""
    const ruleType = doc.getElementsByTagName("행정규칙종류")[0]?.textContent || ""

    let resultText = `행정규칙명: ${ruleName}\n`
    if (promDate) resultText += `공포일: ${promDate}\n`
    if (ruleType) resultText += `종류: ${ruleType}\n`
    if (orgName) resultText += `소관부처: ${orgName}\n`
    resultText += `\n---\n\n`

    const joContents = doc.getElementsByTagName("조문내용")

    if (joContents.length === 0) {
      const attachmentText = formatAttachments(doc)
      if (attachmentText) {
        resultText += attachmentText
        return { content: [{ type: "text", text: truncateResponse(resultText) }] }
      }

      return {
        content: [{
          type: "text",
          text: "행정규칙 전문을 조회할 수 없습니다.\n\n" +
                "[주의] 법제처 API 제한: 일부 행정규칙은 전문 조회가 지원되지 않습니다."
        }],
        isError: true
      }
    }

    let hasContent = false
    for (let i = 0; i < joContents.length; i++) {
      if ((joContents[i].textContent?.trim() || "").length > 0) {
        hasContent = true
        break
      }
    }

    if (!hasContent) {
      const attachmentText = formatAttachments(doc)
      if (attachmentText) {
        resultText += attachmentText
      } else {
        resultText += "[주의] 이 행정규칙은 조문 내용이 비어있습니다."
      }
      return { content: [{ type: "text", text: truncateResponse(resultText) }] }
    }

    for (let i = 0; i < joContents.length; i++) {
      const joContent = joContents[i].textContent?.trim() || ""
      if (joContent.length > 0) {
        resultText += `${joContent}\n\n`
      }
    }

    const addendums = doc.getElementsByTagName("부칙내용")
    if (addendums.length > 0) {
      resultText += `\n---\n부칙\n---\n\n`
      for (let i = 0; i < addendums.length; i++) {
        const content = addendums[i].textContent?.trim() || ""
        if (content.length > 0) {
          resultText += `${content}\n\n`
        }
      }
    }

    const annexes = doc.getElementsByTagName("별표내용")
    if (annexes.length > 0) {
      resultText += `\n---\n별표\n---\n\n`
      for (let i = 0; i < annexes.length; i++) {
        const title = doc.getElementsByTagName("별표제목")[i]?.textContent?.trim() || ""
        const content = annexes[i].textContent?.trim() || ""

        if (title) {
          resultText += `[${title}]\n`
        }
        if (content.length > 0) {
          resultText += `${content}\n\n`
        }
      }
    }

    return { content: [{ type: "text", text: truncateResponse(resultText) }] }
  } catch (error) {
    return formatToolError(error, "get_admin_rule")
  }
}
