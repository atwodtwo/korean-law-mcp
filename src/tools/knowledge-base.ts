import { z } from "zod"
import type { LawApiClient } from "../lib/api-client.js"
import { truncateResponse } from "../lib/schemas.js"
import { extractTag, parseKBXML } from "./kb-utils.js"
import { formatToolError } from "../lib/errors.js"
import { buildNoResultHint } from "../lib/search-hints.js"

// ============================================================================
// 법령정보 지식베이스 API
// - 법령용어/일상용어 조회 및 연계
// - 용어-조문 연계
// - 관련법령 조회
// ============================================================================

// 1. 법령용어 지식베이스 조회 (lstrmAI)
export const getLegalTermKBSchema = z.object({
  query: z.string().describe("검색할 법령용어"),
  display: z.number().min(1).max(100).default(20).describe("결과 수 (기본:20)"),
  page: z.number().min(1).default(1).describe("페이지 (기본:1)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});

export type GetLegalTermKBInput = z.infer<typeof getLegalTermKBSchema>;

export async function getLegalTermKB(
  apiClient: LawApiClient,
  args: GetLegalTermKBInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const xmlText = await apiClient.fetchApi({
      endpoint: "lawSearch.do",
      target: "lstrm",
      extraParams: {
        query: args.query,
        display: (args.display || 20).toString(),
        page: (args.page || 1).toString(),
      },
      apiKey: args.apiKey,
    });
    const result = parseKBXML(xmlText, "LsTrmAISearch");

    if (!result.data) {
      throw new Error("응답 형식 오류");
    }

    const totalCount = parseInt(result.totalCnt || "0");
    const items = result.data;

    if (totalCount === 0 || items.length === 0) {
      return {
        content: [{ type: "text", text: buildNoResultHint({ query: args.query, toolName: "get_legal_term_kb" }) }],
        isError: true,
      };
    }

    let output = `법령용어 지식베이스 (${totalCount}건):\n\n`;

    for (const item of items) {
      output += `${item.법령용어명 || item.용어명}\n`;
      if (item.동음이의어) output += `   [주의] 동음이의어 있음\n`;
      if (item.용어간관계링크) output += `   용어관계: 있음\n`;
      if (item.조문간관계링크) output += `   조문관계: 있음\n`;
      output += `\n`;
    }

    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_legal_term_kb");
  }
}

// 2. 법령용어 상세 조회 (lstrm 본문)
export const getLegalTermDetailSchema = z.object({
  query: z.string().describe("조회할 법령용어명"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});

export type GetLegalTermDetailInput = z.infer<typeof getLegalTermDetailSchema>;

export async function getLegalTermDetail(
  apiClient: LawApiClient,
  args: GetLegalTermDetailInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const xmlText = await apiClient.fetchApi({
      endpoint: "lawService.do",
      target: "lstrm",
      extraParams: { query: args.query },
      apiKey: args.apiKey,
    });

    // Parse the detail response
    const termName = extractTag(xmlText, "법령용어명_한글") || extractTag(xmlText, "법령용어명");
    const termHanja = extractTag(xmlText, "법령용어명_한자");
    const definition = extractTag(xmlText, "법령용어정의");
    const source = extractTag(xmlText, "출처");
    const code = extractTag(xmlText, "법령용어코드명");

    if (!termName && !definition) {
      return {
        content: [{ type: "text", text: `'${args.query}' 용어를 찾을 수 없습니다.` }],
        isError: true,
      };
    }

    let output = `법령용어 상세\n\n`;
    output += `${termName}`;
    if (termHanja) output += ` (${termHanja})`;
    output += `\n\n`;

    if (definition) {
      output += `정의:\n${definition}\n\n`;
    }
    if (source) {
      output += `출처: ${source}\n`;
    }
    if (code) {
      output += `분류: ${code}\n`;
    }

    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_legal_term_detail");
  }
}

// 3. 일상용어 조회
export const getDailyTermSchema = z.object({
  query: z.string().describe("검색할 일상용어 (예: '월세', '전세', '뺑소니')"),
  display: z.number().min(1).max(100).default(20).describe("결과 수 (기본:20)"),
  page: z.number().min(1).default(1).describe("페이지 (기본:1)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
});

export type GetDailyTermInput = z.infer<typeof getDailyTermSchema>;

export async function getDailyTerm(
  apiClient: LawApiClient,
  args: GetDailyTermInput
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const xmlText = await apiClient.fetchApi({
      endpoint: "lawSearch.do",
      target: "lstrm",
      extraParams: {
        query: args.query,
        display: (args.display || 20).toString(),
        page: (args.page || 1).toString(),
        dicKndCd: "011402",
      },
      apiKey: args.apiKey,
    });
    const result = parseKBXML(xmlText, "LsTrmSearch");

    const totalCount = parseInt(result.totalCnt || "0");
    const items = result.data || [];

    if (totalCount === 0 || items.length === 0) {
      return {
        content: [{ type: "text", text: buildNoResultHint({ query: args.query, toolName: "search_daily_terms" }) }],
        isError: true,
      };
    }

    let output = `일상용어 검색 결과 (${totalCount}건):\n\n`;

    for (const item of items) {
      output += `${item.법령용어명 || item.용어명}\n`;
      if (item.법령용어ID) output += `   ID: ${item.법령용어ID}\n`;
      output += `\n`;
    }

    return { content: [{ type: "text", text: truncateResponse(output) }] };
  } catch (error) {
    return formatToolError(error, "get_daily_term");
  }
}


