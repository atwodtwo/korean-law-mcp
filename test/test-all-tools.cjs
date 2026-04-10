#!/usr/bin/env node

/**
 * 전체 툴 테스트 스크립트 (93개 도구)
 * 각 툴을 순차적으로 실행하여 정상 동작 확인
 *
 * 사용법:
 *   node test/test-all-tools.cjs                 # 전체 실행
 *   node test/test-all-tools.cjs --group core    # 특정 그룹만
 *   node test/test-all-tools.cjs --tool search_law  # 특정 도구만
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// .env 파일 로드
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (key && value) process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// CLI 인자 파싱
const args = process.argv.slice(2);
const groupFilter = args.includes('--group') ? args[args.indexOf('--group') + 1] : null;
const toolFilter = args.includes('--tool') ? args[args.indexOf('--tool') + 1] : null;

// 서버 프로세스
let serverProcess = null;
let requestIdCounter = 1;

// ============================================================
// 테스트 케이스 정의 (그룹별)
// ============================================================

const testGroups = {
  // ── 핵심 법령 검색/조회 ──
  core: [
    { name: 'search_law', tool: 'search_law', args: { query: '관세법', maxResults: 5 } },
    { name: 'get_law_text', tool: 'get_law_text', args: { mst: '280363', jo: '제38조' } },
    { name: 'get_article_detail', tool: 'get_article_detail', args: { mst: '280363', jo: '제38조' } },
    { name: 'search_all', tool: 'search_all', args: { query: '환경', maxResults: 3 } },
    { name: 'advanced_search', tool: 'advanced_search', args: { query: '관세', searchType: 'law' } },
    { name: 'suggest_law_names', tool: 'suggest_law_names', args: { partial: '관세' } },
    { name: 'get_batch_articles', tool: 'get_batch_articles', args: { mst: '280363', articles: ['제38조', '제39조', '제40조'] } },
    { name: 'get_article_with_precedents', tool: 'get_article_with_precedents', args: { mst: '280363', jo: '제38조', includePrecedents: true } },
  ],

  // ── 유틸리티 ──
  utils: [
    { name: 'parse_jo_code', tool: 'parse_jo_code', args: { joText: '제38조', direction: 'to_code' } },
    { name: 'get_law_abbreviations', tool: 'get_law_abbreviations', args: {} },
  ],

  // ── 비교/분석 ──
  comparison: [
    { name: 'compare_old_new', tool: 'compare_old_new', args: { mst: '280363' } },
    { name: 'get_three_tier', tool: 'get_three_tier', args: { mst: '280363', knd: '2' } },
    { name: 'compare_articles', tool: 'compare_articles', args: { law1: { mst: '280363', jo: '제38조' }, law2: { mst: '280363', jo: '제39조' } } },
  ],

  // ── 행정규칙 ──
  admin_rule: [
    { name: 'search_admin_rule', tool: 'search_admin_rule', args: { query: '관세', maxResults: 5 } },
    {
      name: 'get_admin_rule', tool: 'get_admin_rule', args: null,
      dependsOn: 'search_admin_rule', extractId: true, idField: 'id',
      idPattern: /행정규칙일련번호[:\s]*(\d+)/
    },
    { name: 'compare_admin_rule_old_new', tool: 'compare_admin_rule_old_new', args: { query: '관세' } },
  ],

  // ── 자치법규 ──
  ordinance: [
    { name: 'search_ordinance', tool: 'search_ordinance', args: { query: '환경', display: 5 } },
    { name: 'get_ordinance', tool: 'get_ordinance', args: { ordinSeq: '5000001' } },
  ],

  // ── 법령연계 ──
  linkage: [
    { name: 'get_linked_ordinances', tool: 'get_linked_ordinances', args: { query: '국민건강보험법' } },
    { name: 'get_linked_ordinance_articles', tool: 'get_linked_ordinance_articles', args: { query: '국민건강보험법' } },
    { name: 'get_delegated_laws', tool: 'get_delegated_laws', args: { query: '보건복지부' } },
    { name: 'get_linked_laws_from_ordinance', tool: 'get_linked_laws_from_ordinance', args: { query: '서울특별시 주차장 설치 및 관리 조례' } },
  ],

  // ── 부가정보 ──
  supplementary: [
    { name: 'get_annexes', tool: 'get_annexes', args: { lawName: '관세법', knd: '1' } },
    { name: 'get_law_tree', tool: 'get_law_tree', args: { mst: '280363' } },
    { name: 'get_law_system_tree', tool: 'get_law_system_tree', args: { mst: '280363' } },
    { name: 'get_law_statistics', tool: 'get_law_statistics', args: { days: 30 } },
    { name: 'get_external_links', tool: 'get_external_links', args: { linkType: 'law', mst: '280363' } },
    { name: 'parse_article_links', tool: 'parse_article_links', args: { mst: '280363', jo: '제38조' } },
  ],

  // ── 이력 ──
  history: [
    { name: 'get_article_history', tool: 'get_article_history', args: { lawName: '관세법' } },
    { name: 'get_law_history', tool: 'get_law_history', args: { regDt: '20240101' } },
    { name: 'search_historical_law', tool: 'search_historical_law', args: { lawName: '관세법' } },
    { name: 'get_historical_law', tool: 'get_historical_law', args: { lawId: '001556', mst: '280363' } },
  ],

  // ── 판례 ──
  precedent: [
    { name: 'search_precedents', tool: 'search_precedents', args: { query: '자동차', display: 5 } },
    {
      name: 'get_precedent_text', tool: 'get_precedent_text', args: null,
      dependsOn: 'search_precedents', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    {
      name: 'summarize_precedent', tool: 'summarize_precedent', args: null,
      dependsOn: 'search_precedents', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    {
      name: 'extract_precedent_keywords', tool: 'extract_precedent_keywords', args: null,
      dependsOn: 'search_precedents', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'find_similar_precedents', tool: 'find_similar_precedents', args: { query: '손해배상' } },
  ],

  // ── 해석례 ──
  interpretation: [
    { name: 'search_interpretations', tool: 'search_interpretations', args: { query: '근로기준법', display: 5 } },
    {
      name: 'get_interpretation_text', tool: 'get_interpretation_text', args: null,
      dependsOn: 'search_interpretations', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 조세심판 ──
  tax_tribunal: [
    { name: 'search_tax_tribunal_decisions', tool: 'search_tax_tribunal_decisions', args: { query: '부가가치세' } },
    {
      name: 'get_tax_tribunal_decision_text', tool: 'get_tax_tribunal_decision_text', args: null,
      dependsOn: 'search_tax_tribunal_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 관세 ──
  customs: [
    { name: 'search_customs_interpretations', tool: 'search_customs_interpretations', args: { query: '관세' } },
    {
      name: 'get_customs_interpretation_text', tool: 'get_customs_interpretation_text', args: null,
      dependsOn: 'search_customs_interpretations', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 헌재 ──
  constitutional: [
    { name: 'search_constitutional_decisions', tool: 'search_constitutional_decisions', args: { query: '위헌' } },
    {
      name: 'get_constitutional_decision_text', tool: 'get_constitutional_decision_text', args: null,
      dependsOn: 'search_constitutional_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 행정심판 ──
  admin_appeal: [
    { name: 'search_admin_appeals', tool: 'search_admin_appeals', args: { query: '취소처분' } },
    {
      name: 'get_admin_appeal_text', tool: 'get_admin_appeal_text', args: null,
      dependsOn: 'search_admin_appeals', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 위원회 결정문 ──
  committee: [
    { name: 'search_ftc_decisions', tool: 'search_ftc_decisions', args: { query: '담합' } },
    {
      name: 'get_ftc_decision_text', tool: 'get_ftc_decision_text', args: null,
      dependsOn: 'search_ftc_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_pipc_decisions', tool: 'search_pipc_decisions', args: { query: '개인정보' } },
    {
      name: 'get_pipc_decision_text', tool: 'get_pipc_decision_text', args: null,
      dependsOn: 'search_pipc_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_nlrc_decisions', tool: 'search_nlrc_decisions', args: { query: '부당해고' } },
    {
      name: 'get_nlrc_decision_text', tool: 'get_nlrc_decision_text', args: null,
      dependsOn: 'search_nlrc_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_acr_decisions', tool: 'search_acr_decisions', args: { query: '처분' } },
    {
      name: 'get_acr_decision_text', tool: 'get_acr_decision_text', args: null,
      dependsOn: 'search_acr_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 소청/특별행정심판 ──
  special_appeal: [
    { name: 'search_appeal_review_decisions', tool: 'search_appeal_review_decisions', args: { query: '파면' } },
    {
      name: 'get_appeal_review_decision_text', tool: 'get_appeal_review_decision_text', args: null,
      dependsOn: 'search_appeal_review_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_acr_special_appeals', tool: 'search_acr_special_appeals', args: { query: '취소' } },
    {
      name: 'get_acr_special_appeal_text', tool: 'get_acr_special_appeal_text', args: null,
      dependsOn: 'search_acr_special_appeals', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 기관규칙 ──
  institutional: [
    { name: 'search_school_rules', tool: 'search_school_rules', args: { query: '학사' } },
    {
      name: 'get_school_rule_text', tool: 'get_school_rule_text', args: null,
      dependsOn: 'search_school_rules', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_public_corp_rules', tool: 'search_public_corp_rules', args: { query: '인사' } },
    {
      name: 'get_public_corp_rule_text', tool: 'get_public_corp_rule_text', args: null,
      dependsOn: 'search_public_corp_rules', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_public_institution_rules', tool: 'search_public_institution_rules', args: { query: '규정' } },
    {
      name: 'get_public_institution_rule_text', tool: 'get_public_institution_rule_text', args: null,
      dependsOn: 'search_public_institution_rules', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 조약 ──
  treaty: [
    { name: 'search_treaties', tool: 'search_treaties', args: { query: '투자보장' } },
    {
      name: 'get_treaty_text', tool: 'get_treaty_text', args: null,
      dependsOn: 'search_treaties', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/
    },
  ],

  // ── 영문법령/용어 ──
  english: [
    { name: 'search_english_law', tool: 'search_english_law', args: { query: 'tax' } },
    {
      name: 'get_english_law_text', tool: 'get_english_law_text', args: null,
      dependsOn: 'search_english_law', extractId: true, idField: 'lawId',
      idPattern: /\[(\d+)\]/
    },
    { name: 'search_legal_terms', tool: 'search_legal_terms', args: { query: '선의' } },
  ],

  // ── 생활법령/AI 검색 ──
  life_law: [
    { name: 'search_ai_law', tool: 'search_ai_law', args: { query: '음주운전 처벌' } },
  ],

  // ── 법령용어 지식베이스 ──
  knowledge_base: [
    { name: 'get_legal_term_kb', tool: 'get_legal_term_kb', args: { query: '법령용어' } },
    { name: 'get_legal_term_detail', tool: 'get_legal_term_detail', args: { query: '선의' } },
    { name: 'get_daily_term', tool: 'get_daily_term', args: { query: '월세' } },
    { name: 'get_daily_to_legal', tool: 'get_daily_to_legal', args: { dailyTerm: '월세' } },
    { name: 'get_legal_to_daily', tool: 'get_legal_to_daily', args: { legalTerm: '임대차' } },
    { name: 'get_term_articles', tool: 'get_term_articles', args: { term: '선의' } },
    { name: 'get_related_laws', tool: 'get_related_laws', args: { lawName: '민법' } },
  ],

  // ── 문서분석 ──
  document: [
    { name: 'analyze_document', tool: 'analyze_document', args: { text: '제1조(목적) 이 계약은 갑과 을 간의 부동산 매매에 관한 사항을 정함을 목적으로 한다.\n제2조(매매대금) 매매대금은 금 5억원으로 한다.\n제3조(계약금) 계약금은 매매대금의 10%인 금 5천만원으로 하며, 계약 체결 시 지급한다.' } },
  ],

  // ── 통합 결정문 (V3) ──
  unified: [
    { name: 'search_decisions', tool: 'search_decisions', args: { domain: 'precedent', query: '손해배상' } },
    {
      name: 'get_decision_text', tool: 'get_decision_text', args: null,
      dependsOn: 'search_decisions', extractId: true, idField: 'id',
      idPattern: /\[(\d+)\]/,
      extraArgs: { domain: 'precedent' }
    },
  ],

  // ── 메타 도구 ──
  meta: [
    { name: 'discover_tools', tool: 'discover_tools', args: { intent: '판례 검색' } },
    { name: 'execute_tool', tool: 'execute_tool', args: { tool_name: 'search_law', params: { query: '민법', maxResults: 3 } } },
  ],

  // ── 체인 도구 (V3 노출) ──
  chain: [
    { name: 'chain_full_research', tool: 'chain_full_research', args: { query: '음주운전 처벌' } },
    { name: 'chain_law_system', tool: 'chain_law_system', args: { query: '관세법' } },
    { name: 'chain_action_basis', tool: 'chain_action_basis', args: { query: '건축허가' } },
    { name: 'chain_dispute_prep', tool: 'chain_dispute_prep', args: { query: '부당해고' } },
    { name: 'chain_amendment_track', tool: 'chain_amendment_track', args: { query: '관세법' } },
    { name: 'chain_ordinance_compare', tool: 'chain_ordinance_compare', args: { query: '서울시 주차 조례' } },
    { name: 'chain_procedure_detail', tool: 'chain_procedure_detail', args: { query: '건축허가 절차' } },
    { name: 'chain_document_review', tool: 'chain_document_review', args: { text: '제1조(목적) 이 계약은 갑과 을 간의 매매에 관한 사항을 정함을 목적으로 한다.' } },
  ],
};

// ============================================================
// 서버 시작 (MCP initialize 핸드셰이크)
// ============================================================

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'build', 'index.js');
    console.log('Starting MCP server...');

    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, LAW_OC: process.env.LAW_OC },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let initialized = false;

    serverProcess.on('error', (error) => reject(error));
    serverProcess.on('exit', (code) => {
      if (!initialized) reject(new Error(`Server exited prematurely with code ${code}`));
    });

    const initRequest = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    let responseData = '';
    const dataHandler = (data) => {
      responseData += data.toString();
      try {
        const lines = responseData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id === 0 && !initialized) {
            initialized = true;
            serverProcess.stdout.removeListener('data', dataHandler);
            console.log('Server started\n');
            resolve();
            return;
          }
        }
      } catch (e) { /* 아직 완전한 JSON이 아님 */ }
    };

    serverProcess.stdout.on('data', dataHandler);
    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    setTimeout(() => {
      if (!initialized) {
        serverProcess.stdout.removeListener('data', dataHandler);
        reject(new Error('Server initialization timeout'));
      }
    }, 15000);
  });
}

// ============================================================
// MCP 요청 전송
// ============================================================

function sendMCPRequest(toolName, toolArgs) {
  return new Promise((resolve, reject) => {
    const id = requestIdCounter++;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    };

    let responseData = '';

    const dataHandler = (data) => {
      responseData += data.toString();
      try {
        const lines = responseData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id === id) {
            serverProcess.stdout.removeListener('data', dataHandler);
            resolve(response);
            return;
          }
        }
      } catch (e) { /* 아직 완전한 JSON이 아님 */ }
    };

    serverProcess.stdout.on('data', dataHandler);
    serverProcess.stdin.write(JSON.stringify(request) + '\n');

    // 체인/통계/비교 등 다중 API 호출 도구는 타임아웃 길게
    const slowTools = ['chain_', 'get_law_statistics', 'search_all', 'get_article_with_precedents', 'analyze_document'];
    const isSlow = slowTools.some(s => toolName.startsWith(s) || toolName === s);
    const timeout = isSlow ? 60000 : 15000;
    setTimeout(() => {
      serverProcess.stdout.removeListener('data', dataHandler);
      reject(new Error(`Request timeout (${timeout / 1000}s)`));
    }, timeout);
  });
}

// ============================================================
// ID 추출 (범용)
// ============================================================

function extractId(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : null;
}

// ============================================================
// 단일 테스트 실행
// ============================================================

async function runTest(test, index, total, resultMap) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index}/${total}] ${test.name}`);
  console.log(`${'='.repeat(60)}`);

  // 의존성 처리: 이전 search 결과에서 ID 추출
  if (test.extractId && test.dependsOn) {
    const dep = resultMap[test.dependsOn];
    if (!dep || !dep.success) {
      console.log('  Skipped (dependent test failed)');
      return { success: false, skipped: true, error: 'Dependent test failed' };
    }

    const content = dep.data.content[0].text;
    const id = extractId(content, test.idPattern);

    if (!id) {
      console.log('  Skipped (could not extract ID from previous test)');
      return { success: false, skipped: true, error: 'Could not extract ID' };
    }

    test.args = { [test.idField]: id, ...(test.extraArgs || {}) };
    console.log(`  Extracted ${test.idField}=${id} from ${test.dependsOn}`);
  }

  console.log(`  Tool: ${test.tool}`);
  console.log(`  Args: ${JSON.stringify(test.args)}`);

  try {
    const response = await sendMCPRequest(test.tool, test.args);

    if (response.error) {
      console.log(`  FAIL: ${response.error.message}`);
      return { success: false, error: response.error.message };
    }

    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;
      console.log('  PASS');
      console.log(`  Preview: ${preview}`);
      return { success: true, data: response.result };
    }

    console.log('  WARN: Unexpected response format');
    return { success: false, error: 'Unexpected response format' };

  } catch (error) {
    console.log(`  FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============================================================
// 메인 실행
// ============================================================

async function runAllTests() {
  console.log('========================================');
  console.log('Korean Law MCP - Tool Test Runner');
  console.log('========================================\n');

  if (!process.env.LAW_OC) {
    console.error('Error: LAW_OC 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  // 실행할 테스트 선택
  let selectedTests = [];

  if (toolFilter) {
    // 특정 도구만
    for (const [, tests] of Object.entries(testGroups)) {
      for (const t of tests) {
        if (t.tool === toolFilter || t.name === toolFilter) {
          // 의존성이 있으면 의존 대상도 포함
          if (t.dependsOn) {
            const dep = tests.find(d => d.name === t.dependsOn);
            if (dep) selectedTests.push(dep);
          }
          selectedTests.push(t);
        }
      }
    }
    if (selectedTests.length === 0) {
      console.error(`Tool "${toolFilter}" not found`);
      process.exit(1);
    }
  } else if (groupFilter) {
    // 특정 그룹만
    if (!testGroups[groupFilter]) {
      console.error(`Group "${groupFilter}" not found. Available: ${Object.keys(testGroups).join(', ')}`);
      process.exit(1);
    }
    selectedTests = testGroups[groupFilter];
  } else {
    // 전체
    for (const tests of Object.values(testGroups)) {
      selectedTests.push(...tests);
    }
  }

  console.log(`Running ${selectedTests.length} tests`);
  if (groupFilter) console.log(`Group: ${groupFilter}`);
  if (toolFilter) console.log(`Tool: ${toolFilter}`);
  console.log('');

  const resultMap = {};  // name -> result
  const results = [];

  try {
    await startServer();

    for (let i = 0; i < selectedTests.length; i++) {
      const test = selectedTests[i];
      const result = await runTest(test, i + 1, selectedTests.length, resultMap);
      resultMap[test.name] = result;
      results.push({ test: test.name, ...result });

      // API 요청 간 대기 (rate limit 방지)
      if (!result.skipped) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
      console.log('\nServer stopped');
    }
  }

  // ── 결과 요약 ──
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================\n');

  const passed = results.filter(r => r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success && !r.skipped).length;

  console.log(`Total: ${results.length}  |  Passed: ${passed}  |  Skipped: ${skipped}  |  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.success && !r.skipped).forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
    });
  }

  if (skipped > 0) {
    console.log('\nSkipped:');
    results.filter(r => r.skipped).forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
