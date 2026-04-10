import type { LawApiClient } from "./api-client.js";
import { truncateResponse } from "./schemas.js";
import { parseSearchXML, extractTag } from "./xml-parser.js";
import { formatToolError } from "./errors.js";
import { buildNoResultHint } from "./search-hints.js";

export async function searchCommitteeDecisions(
  apiClient: LawApiClient,
  args: { query?: string; display?: number; page?: number; sort?: string; apiKey?: string },
  target: string,
  committeeName: string,
  textToolName: string
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  try {
    const extraParams: Record<string, string> = {
      display: (args.display || 20).toString(),
      page: (args.page || 1).toString(),
    };
    if (args.query) extraParams.query = args.query;
    if (args.sort) extraParams.sort = args.sort;

    const xmlText = await apiClient.fetchApi({
      endpoint: "lawSearch.do",
      target,
      extraParams,
      apiKey: args.apiKey,
    });

    const searchKey = getSearchKey(target);
    const itemKey = target.toLowerCase();
    const { totalCnt, page: currentPage, items: decisions } = parseSearchXML(
      xmlText, searchKey, itemKey,
      (content) => ({
        결정일련번호: extractTag(content, "결정문일련번호") || extractTag(content, "결정일련번호") || extractTag(content, "판례일련번호") || extractTag(content, "일련번호"),
        사건명: extractTag(content, "사건명") || extractTag(content, "안건명") || extractTag(content, "제목"),
        사건번호: extractTag(content, "사건번호") || extractTag(content, "의안번호"),
        결정일자: extractTag(content, "결정일자") || extractTag(content, "의결일") || extractTag(content, "선고일자") || extractTag(content, "등록일"),
        결정유형: extractTag(content, "결정유형") || extractTag(content, "결정구분") || extractTag(content, "판결유형") || extractTag(content, "회의종류"),
        재결청: extractTag(content, "재결청") || extractTag(content, "기관명"),
        상세링크: extractTag(content, "결정문상세링크") || extractTag(content, "상세링크") || extractTag(content, "판례상세링크"),
      }),
      { useIndexOf: true }
    );

    const totalCount = totalCnt;

    if (totalCount === 0) {
      return {
        content: [{ type: "text", text: buildNoResultHint({ query: args.query || "", toolName: textToolName, alternatives: ["search_precedents"] }) }],
        isError: true
      };
    }

    let output = `${committeeName} 검색 결과 (총 ${totalCount}건, ${currentPage}페이지):\n\n`;

    for (const decision of decisions) {
      const title = decision.사건명 || "(제목 없음)";
      output += `[${decision.결정일련번호}] ${title}\n`;
      if (decision.사건번호) output += `  사건번호: ${decision.사건번호}\n`;
      if (decision.결정일자) output += `  결정일: ${decision.결정일자}\n`;
      if (decision.결정유형) output += `  결정유형: ${decision.결정유형}\n`;
      if (decision.재결청) output += `  재결청: ${decision.재결청}\n`;
      if (decision.상세링크) output += `  링크: ${decision.상세링크}\n`;
      output += `\n`;
    }

    return {
      content: [{
        type: "text",
        text: truncateResponse(output)
      }]
    };
  } catch (error) {
    return formatToolError(error, `search_${target}_decisions`);
  }
}

export async function getCommitteeDecisionText(
  apiClient: LawApiClient,
  args: { id: string; apiKey?: string },
  target: string,
  committeeName: string
): Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }> {
  try {
    const responseText = await apiClient.fetchApi({
      endpoint: "lawService.do",
      target,
      type: "JSON",
      extraParams: { ID: args.id },
      apiKey: args.apiKey,
    });

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      throw new Error("Failed to parse JSON response from API");
    }

    const serviceKey = getServiceKey(target);
    if (!data[serviceKey]) {
      throw new Error(`${committeeName}을(를) 찾을 수 없거나 응답 형식이 올바르지 않습니다.`);
    }

    const decision = data[serviceKey];

    let output = `=== ${decision.사건명 || committeeName} ===\n\n`;

    output += `기본 정보:\n`;
    output += `  사건번호: ${decision.사건번호 || "N/A"}\n`;
    output += `  결정일자: ${decision.결정일자 || "N/A"}\n`;
    output += `  결정유형: ${decision.결정유형 || "N/A"}\n`;
    if (decision.당사자) output += `  당사자: ${decision.당사자}\n`;
    if (decision.피심인) output += `  피심인: ${decision.피심인}\n`;
    output += `\n`;

    if (decision.주문) {
      output += `주문:\n${decision.주문}\n\n`;
    }

    if (decision.결정요지 || decision.요지) {
      output += `결정요지:\n${decision.결정요지 || decision.요지}\n\n`;
    }

    if (decision.이유) {
      output += `이유:\n${decision.이유}\n\n`;
    }

    if (decision.참조조문) {
      output += `참조조문:\n${decision.참조조문}\n\n`;
    }

    if (decision.결정내용 || decision.전문) {
      output += `전문:\n${decision.결정내용 || decision.전문}\n`;
    }

    return {
      content: [{
        type: "text",
        text: truncateResponse(output)
      }]
    };
  } catch (error) {
    return formatToolError(error, `get_${target}_decision_text`);
  }
}

function getSearchKey(target: string): string {
  const mapping: Record<string, string> = {
    ftc: "Ftc",
    ppc: "Ppc",
    nlrc: "Nlrc",
    acr: "Acr",
  };
  return mapping[target] || `${target.charAt(0).toUpperCase() + target.slice(1)}`;
}

function getServiceKey(target: string): string {
  const mapping: Record<string, string> = {
    ftc: "FtcService",
    ppc: "PpcService",
    nlrc: "NlrcService",
    acr: "AcrService",
  };
  return mapping[target] || `${target.charAt(0).toUpperCase() + target.slice(1)}Service`;
}
