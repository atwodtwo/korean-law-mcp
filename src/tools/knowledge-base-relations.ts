/**
 * 법령용어 관계 도구 (용어 연계 + 조문 연계 + 관련법령)
 * knowledge-base.ts에서 분리 — 200줄 제한 준수
 */
import { z } from "zod"
import type { LawApiClient } from "../lib/api-client.js"
import { truncateResponse } from "../lib/schemas.js"
import { parseKBXML, fallbackTermSearch } from "./kb-utils.js"
import { formatToolError } from "../lib/errors.js"

// 4. 일상용어 → 법령용어 연계
export const getDailyToLegalSchema = z.object({
  dailyTerm: z.string().describe("일상용어 (예: '월세' → '임대차')"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});
export type GetDailyToLegalInput = z.infer<typeof getDailyToLegalSchema>;

export async function getDailyToLegal(
  apiClient: LawApiClient, args: GetDailyToLegalInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let xmlText: string;
    try {
      xmlText = await apiClient.fetchApi({
        endpoint: "lawSearch.do", target: "lstrmRel",
        extraParams: { query: args.dailyTerm, relType: "DL" }, apiKey: args.apiKey,
      });
    } catch {
      return await fallbackTermSearch(apiClient, args.dailyTerm, "일상용어");
    }
    const items = parseKBXML(xmlText, "LsTrmRelSearch").data || [];
    if (items.length === 0) return await fallbackTermSearch(apiClient, args.dailyTerm, "일상용어");

    let output = `일상용어 → 법령용어 연계\n\n입력: ${args.dailyTerm}\n\n관련 법령용어:\n`;
    for (const item of items) output += `   • ${item.법령용어명 || item.연계용어명}\n`;
    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_daily_to_legal");
  }
}

// 5. 법령용어 → 일상용어 연계
export const getLegalToDailySchema = z.object({
  legalTerm: z.string().describe("법령용어 (예: '임대차' → '월세', '전세')"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});
export type GetLegalToDailyInput = z.infer<typeof getLegalToDailySchema>;

export async function getLegalToDaily(
  apiClient: LawApiClient, args: GetLegalToDailyInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let xmlText: string;
    try {
      xmlText = await apiClient.fetchApi({
        endpoint: "lawSearch.do", target: "lstrmRel",
        extraParams: { query: args.legalTerm, relType: "LD" }, apiKey: args.apiKey,
      });
    } catch {
      return await fallbackTermSearch(apiClient, args.legalTerm, "법령용어");
    }
    const items = parseKBXML(xmlText, "LsTrmRelSearch").data || [];
    if (items.length === 0) return await fallbackTermSearch(apiClient, args.legalTerm, "법령용어");

    let output = `법령용어 → 일상용어 연계\n\n입력: ${args.legalTerm}\n\n관련 일상용어:\n`;
    for (const item of items) output += `   • ${item.일상용어명 || item.연계용어명}\n`;
    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_legal_to_daily");
  }
}

// 6. 법령용어 → 조문 연계
export const getTermArticlesSchema = z.object({
  term: z.string().describe("검색할 법령용어"),
  display: z.number().min(1).max(100).default(20).describe("결과 수 (기본:20)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});
export type GetTermArticlesInput = z.infer<typeof getTermArticlesSchema>;

export async function getTermArticles(
  apiClient: LawApiClient, args: GetTermArticlesInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let xmlText: string;
    try {
      xmlText = await apiClient.fetchApi({
        endpoint: "lawSearch.do", target: "lstrmJo",
        extraParams: { query: args.term, display: (args.display || 20).toString() },
        apiKey: args.apiKey,
      });
    } catch {
      return { content: [{ type: "text", text: `'${args.term}' 용어-조문 연계 조회 실패.` }], isError: true };
    }
    const result = parseKBXML(xmlText, "LsTrmJoSearch");
    const totalCount = parseInt(result.totalCnt || "0");
    const items = result.data || [];

    if (totalCount === 0 || items.length === 0) {
      return { content: [{ type: "text", text: `'${args.term}' 용어가 사용된 조문을 찾을 수 없습니다.` }], isError: true };
    }

    let output = `'${args.term}' 용어 사용 조문 (${totalCount}건):\n\n`;
    for (const item of items) {
      output += `${item.법령명}\n`;
      if (item.조문번호) {
        output += `   제${item.조문번호}조`;
        if (item.조문제목) output += ` (${item.조문제목})`;
        output += `\n`;
      }
      if (item.법령ID) output += `   법령ID: ${item.법령ID}\n`;
      output += `\n`;
    }
    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_term_articles");
  }
}

// 7. 관련법령 조회
export const getRelatedLawsSchema = z.object({
  lawId: z.string().optional().describe("법령ID"),
  lawName: z.string().optional().describe("법령명"),
  display: z.number().min(1).max(100).default(20).describe("결과 수 (기본:20)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});
export type GetRelatedLawsInput = z.infer<typeof getRelatedLawsSchema>;

export async function getRelatedLaws(
  apiClient: LawApiClient, args: GetRelatedLawsInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    if (!args.lawId && !args.lawName) throw new Error("lawId 또는 lawName 중 하나는 필수입니다.");

    const extraParams: Record<string, string> = { display: (args.display || 20).toString() };
    if (args.lawId) extraParams.ID = String(args.lawId);
    if (args.lawName) extraParams.query = String(args.lawName);

    let xmlText: string;
    try {
      xmlText = await apiClient.fetchApi({
        endpoint: "lawSearch.do", target: "lawRel", extraParams, apiKey: args.apiKey,
      });
    } catch {
      return { content: [{ type: "text", text: `관련법령 조회 실패.` }], isError: true };
    }
    const result = parseKBXML(xmlText, "LawRelSearch");
    const totalCount = parseInt(result.totalCnt || "0");
    const items = result.data || [];

    if (totalCount === 0 || items.length === 0) {
      return { content: [{ type: "text", text: `관련법령을 찾을 수 없습니다.` }], isError: true };
    }

    let output = `관련법령 (${totalCount}건):\n\n`;
    for (const item of items) {
      output += `${item.법령명}\n`;
      if (item.관계유형) output += `   관계: ${item.관계유형}\n`;
      if (item.법령ID) output += `   법령ID: ${item.법령ID}\n`;
      if (item.법령종류) output += `   종류: ${item.법령종류}\n`;
      output += `\n`;
    }
    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_related_laws");
  }
}
