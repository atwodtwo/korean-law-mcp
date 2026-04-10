import { z } from "zod";
import type { LawApiClient } from "../lib/api-client.js";
import { searchCommitteeDecisions, getCommitteeDecisionText } from "../lib/committee-decisions-impl.js";

// Common schema for committee decision search (query optional)
const baseSearchSchemaOptionalQuery = {
  query: z.string().optional().describe("검색 키워드"),
  display: z.number().min(1).max(100).default(20).describe("페이지당 결과 개수 (기본값: 20, 최대: 100)"),
  page: z.number().min(1).default(1).describe("페이지 번호 (기본값: 1)"),
  sort: z.enum(["lasc", "ldes", "dasc", "ddes"]).optional()
    .describe("정렬 옵션: lasc/ldes (법령명순), dasc/ddes (날짜순)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
};

// Common schema for committee decision search (query required)
const baseSearchSchemaRequiredQuery = {
  display: z.number().min(1).max(100).default(20).describe("페이지당 결과 개수 (기본값: 20, 최대: 100)"),
  page: z.number().min(1).default(1).describe("페이지 번호 (기본값: 1)"),
  sort: z.enum(["lasc", "ldes", "dasc", "ddes"]).optional()
    .describe("정렬 옵션: lasc/ldes (법령명순), dasc/ddes (날짜순)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
};

const baseTextSchema = {
  id: z.string().describe("결정문 일련번호 (검색 결과에서 획득)"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
};

// ========================================
// 공정거래위원회 결정문 (FTC Decisions)
// ========================================

export const searchFtcDecisionsSchema = z.object({
  ...baseSearchSchemaRequiredQuery,
  query: z.string().describe("검색 키워드 (필수, 예: '담합', '불공정거래', '시정명령')"),
});

export type SearchFtcDecisionsInput = z.infer<typeof searchFtcDecisionsSchema>;

export async function searchFtcDecisions(
  apiClient: LawApiClient,
  args: SearchFtcDecisionsInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return searchCommitteeDecisions(apiClient, args, "ftc", "공정거래위원회 결정문", "get_ftc_decision_text");
}

export const getFtcDecisionTextSchema = z.object(baseTextSchema);
export type GetFtcDecisionTextInput = z.infer<typeof getFtcDecisionTextSchema>;

export async function getFtcDecisionText(
  apiClient: LawApiClient,
  args: GetFtcDecisionTextInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return getCommitteeDecisionText(apiClient, args, "ftc", "공정거래위원회 결정문");
}

// ========================================
// 개인정보보호위원회 결정문 (PIPC Decisions)
// ========================================

export const searchPipcDecisionsSchema = z.object({
  ...baseSearchSchemaRequiredQuery,
  query: z.string().describe("검색 키워드 (필수, 예: '개인정보', '유출', '과징금')"),
});

export type SearchPipcDecisionsInput = z.infer<typeof searchPipcDecisionsSchema>;

export async function searchPipcDecisions(
  apiClient: LawApiClient,
  args: SearchPipcDecisionsInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return searchCommitteeDecisions(apiClient, args, "ppc", "개인정보보호위원회 결정문", "get_pipc_decision_text");
}

export const getPipcDecisionTextSchema = z.object(baseTextSchema);
export type GetPipcDecisionTextInput = z.infer<typeof getPipcDecisionTextSchema>;

export async function getPipcDecisionText(
  apiClient: LawApiClient,
  args: GetPipcDecisionTextInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return getCommitteeDecisionText(apiClient, args, "ppc", "개인정보보호위원회 결정문");
}

// ========================================
// 중앙노동위원회 결정문 (NLRC Decisions)
// ========================================

export const searchNlrcDecisionsSchema = z.object({
  ...baseSearchSchemaOptionalQuery,
  query: z.string().optional().describe("검색 키워드 (예: '부당해고', '노동쟁의', '조정')"),
});

export type SearchNlrcDecisionsInput = z.infer<typeof searchNlrcDecisionsSchema>;

export async function searchNlrcDecisions(
  apiClient: LawApiClient,
  args: SearchNlrcDecisionsInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return searchCommitteeDecisions(apiClient, args, "nlrc", "중앙노동위원회 결정문", "get_nlrc_decision_text");
}

export const getNlrcDecisionTextSchema = z.object(baseTextSchema);
export type GetNlrcDecisionTextInput = z.infer<typeof getNlrcDecisionTextSchema>;

export async function getNlrcDecisionText(
  apiClient: LawApiClient,
  args: GetNlrcDecisionTextInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return getCommitteeDecisionText(apiClient, args, "nlrc", "중앙노동위원회 결정문");
}

// ========================================
// 국민권익위원회 결정문 (ACR Decisions)
// ========================================

export const searchAcrDecisionsSchema = z.object({
  ...baseSearchSchemaOptionalQuery,
  query: z.string().optional().describe("검색 키워드 (예: '행정심판', '고충민원', '부패행위')"),
});

export type SearchAcrDecisionsInput = z.infer<typeof searchAcrDecisionsSchema>;

export async function searchAcrDecisions(
  apiClient: LawApiClient,
  args: SearchAcrDecisionsInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return searchCommitteeDecisions(apiClient, args, "acr", "국민권익위원회 결정문", "get_acr_decision_text");
}

export const getAcrDecisionTextSchema = z.object(baseTextSchema);
export type GetAcrDecisionTextInput = z.infer<typeof getAcrDecisionTextSchema>;

export async function getAcrDecisionText(
  apiClient: LawApiClient,
  args: GetAcrDecisionTextInput
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  return getCommitteeDecisionText(apiClient, args, "acr", "국민권익위원회 결정문");
}
