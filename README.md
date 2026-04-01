# Korean Law MCP

**87 tools to search, retrieve, and analyze Korean law** — statutes, precedents, ordinances, treaties, and more.

[![npm version](https://img.shields.io/npm/v/korean-law-mcp.svg)](https://www.npmjs.com/package/korean-law-mcp)
[![MCP 1.27](https://img.shields.io/badge/MCP-1.27-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

> MCP server + CLI for Korea's official legal database (법제처 Open API). Works with Claude Desktop, Cursor, Windsurf, Zed, and any MCP-compatible client.

[한국어](./README-KR.md)

---

## What's New in v2.2.0

- **23 New Tools (64 → 87)** — Treaties, law-ordinance linkage, institutional rules (school/public corp/public institution), special administrative appeals, audit & inspection decisions, article detail, document analysis, admin rule comparison, and more.
- **Document Analysis Engine** — 8 document types, 17 risk rules, amount/period extraction, clause conflict detection. Feed a contract or MOU and get structured legal risk assessment.
- **Law-Ordinance Linkage (4 tools)** — Trace delegation chains between national laws and local ordinances in both directions. Find which ordinances implement a law, or which law a local ordinance derives from.
- **Treaty Support (2 tools)** — Search and retrieve bilateral/multilateral treaties Korea is party to.
- **Institutional Rules (6 tools)** — School rules, public corporation rules, and public institution rules — each with search + full text retrieval.
- **Special Administrative Appeals (4 tools)** — Board of Audit & Inspection special appeals and appeal review decisions.
- **Date Filter for Precedents** — `fromDate`/`toDate` parameters on precedent and interpretation search tools.
- **Natural Language Date Parser** — CLI now understands `"최근 3개월"`, `"작년"`, `"2024년 이후"` and converts to YYYYMMDD ranges.
- **Security Hardening** — CORS origin control, API key header-only (no query string), security headers, session ID masking.

<details>
<summary>v1.8.0 – v1.9.0 features</summary>

- **8 Chain Tools** — Composite research workflows in a single call: `chain_full_research` (AI search → statutes → precedents → interpretations), `chain_law_system`, `chain_action_basis`, `chain_dispute_prep`, `chain_amendment_track`, `chain_ordinance_compare`, `chain_procedure_detail`.
- **Batch Article Retrieval** — `get_batch_articles` accepts a `laws` array for multi-law queries in one call.
- **AI Search Type Filter** — `search_ai_law` now supports `lawTypes` filter.
- **Structured Error Format** — `[ErrorCode] + tool name + suggestion` across all 64 tools.
- **HWP Table Fix** — Legacy HWP parser now extracts tables from `paragraph.controls[].content` path.

</details>

---

## Why this exists

South Korea has **1,600+ active laws**, **10,000+ administrative rules**, and a precedent system spanning Supreme Court, Constitutional Court, tax tribunals, and customs rulings. All of this lives behind a clunky government API with zero developer experience.

This project wraps that entire legal system into **87 structured tools** that any AI assistant or script can call. Built by a Korean civil servant who got tired of manually searching [법제처](https://www.law.go.kr) for the hundredth time.

---

## Quick Start

### Option 1: MCP Server (Claude Desktop / Cursor / Windsurf)

```bash
npm install -g korean-law-mcp
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "korean-law": {
      "command": "korean-law-mcp",
      "env": {
        "LAW_OC": "your-api-key"
      }
    }
  }
}
```

Get your free API key at [법제처 Open API](https://open.law.go.kr/LSO/openApi/guideResult.do).

| Client | Config File |
|--------|------------|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` (Win) / `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| Continue | `~/.continue/config.json` |
| Zed | `~/.config/zed/settings.json` |

### Option 2: Remote (No Install)

```json
{
  "mcpServers": {
    "korean-law": {
      "url": "https://korean-law-mcp.fly.dev/mcp"
    }
  }
}
```

### Option 3: CLI

```bash
npm install -g korean-law-mcp
export LAW_OC=your-api-key

korean-law search_law --query "관세법"
korean-law get_law_text --mst 160001 --jo "제38조"
korean-law search_precedents --query "부당해고"
korean-law list                          # all 87 tools
korean-law list --category 판례          # filter by category
korean-law help search_law               # tool help
```

### Option 4: Docker

```bash
docker build -t korean-law-mcp .
docker run -e LAW_OC=your-api-key -p 3000:3000 korean-law-mcp
```

---

## Tool Categories (87 total)

### Search (11)

| Tool | Description |
|------|-------------|
| `search_law` | Search statutes (auto-resolves abbreviations) |
| `search_admin_rule` | Search administrative rules |
| `search_ordinance` | Search local ordinances |
| `search_precedents` | Search court precedents |
| `search_interpretations` | Search legal interpretations |
| `search_all` | Unified search across all categories |
| `suggest_law_names` | Law name autocomplete |
| `advanced_search` | Advanced search with date/keyword filters |
| `get_law_history` | Law amendment history by date |
| `get_annexes` | Retrieve annexes + extract HWPX/HWP to Markdown |
| `parse_jo_code` | Article number ↔ JO code conversion |

### Retrieve (9)

| Tool | Description |
|------|-------------|
| `get_law_text` | Full statute text |
| `get_admin_rule` | Full administrative rule |
| `get_ordinance` | Full local ordinance |
| `get_precedent_text` | Full precedent text |
| `get_interpretation_text` | Full interpretation text |
| `get_batch_articles` | Batch article retrieval (multiple laws) |
| `get_article_with_precedents` | Article + related precedents |
| `compare_old_new` | Old vs. new law comparison |
| `get_three_tier` | Law → Decree → Rule 3-tier comparison |

### Analyze (10)

| Tool | Description |
|------|-------------|
| `compare_articles` | Cross-law article comparison |
| `get_law_tree` | Delegation structure tree |
| `get_article_history` | Article amendment history |
| `summarize_precedent` | Precedent summary |
| `extract_precedent_keywords` | Precedent keyword extraction |
| `find_similar_precedents` | Similar precedent search |
| `get_law_statistics` | Law statistics |
| `parse_article_links` | Parse in-text legal references |
| `get_external_links` | Generate external links |
| `analyze_document` | Document analysis with legal context |

### Specialized: Tax & Customs (4)

| Tool | Description |
|------|-------------|
| `search_tax_tribunal_decisions` | Tax tribunal decision search |
| `get_tax_tribunal_decision_text` | Tax tribunal decision full text |
| `search_customs_interpretations` | Customs interpretation search |
| `get_customs_interpretation_text` | Customs interpretation full text |

### Specialized: Constitutional & Admin Appeals (4)

| Tool | Description |
|------|-------------|
| `search_constitutional_decisions` | Constitutional Court decision search |
| `get_constitutional_decision_text` | Constitutional Court decision full text |
| `search_admin_appeals` | Administrative appeal decision search |
| `get_admin_appeal_text` | Administrative appeal decision full text |

### Specialized: Committee Decisions (8)

| Tool | Description |
|------|-------------|
| `search_ftc_decisions` | Fair Trade Commission decision search |
| `get_ftc_decision_text` | Fair Trade Commission decision full text |
| `search_pipc_decisions` | Privacy Commission decision search |
| `get_pipc_decision_text` | Privacy Commission decision full text |
| `search_nlrc_decisions` | Labor Relations Commission decision search |
| `get_nlrc_decision_text` | Labor Relations Commission decision full text |
| `search_acr_decisions` | Board of Audit & Inspection decision search |
| `get_acr_decision_text` | Board of Audit & Inspection decision full text |

### Special Admin Appeals (4)

| Tool | Description |
|------|-------------|
| `search_acr_special_appeals` | Special administrative appeal search |
| `get_acr_special_appeal_text` | Special administrative appeal full text |
| `search_appeal_review_decisions` | Appeal review decision search |
| `get_appeal_review_decision_text` | Appeal review decision full text |

### Law-Ordinance Linkage (4)

| Tool | Description |
|------|-------------|
| `get_linked_ordinances` | Find ordinances linked to a law |
| `get_linked_ordinance_articles` | Get linked ordinance article details |
| `get_delegated_laws` | Find laws delegating to ordinances |
| `get_linked_laws_from_ordinance` | Find parent laws from an ordinance |

### Treaties (2)

| Tool | Description |
|------|-------------|
| `search_treaties` | Treaty search |
| `get_treaty_text` | Treaty full text |

### Institutional Rules (6)

| Tool | Description |
|------|-------------|
| `search_school_rules` | School rule search |
| `get_school_rule_text` | School rule full text |
| `search_public_corp_rules` | Public corporation rule search |
| `get_public_corp_rule_text` | Public corporation rule full text |
| `search_public_institution_rules` | Public institution rule search |
| `get_public_institution_rule_text` | Public institution rule full text |

### Knowledge Base (7)

| Tool | Description |
|------|-------------|
| `get_legal_term_kb` | Legal terminology search |
| `get_legal_term_detail` | Term definition |
| `get_daily_term` | Everyday language search |
| `get_daily_to_legal` | Everyday → legal term mapping |
| `get_legal_to_daily` | Legal → everyday term mapping |
| `get_term_articles` | Articles using a term |
| `get_related_laws` | Related laws |

### Chain Tools (8)

Composite research workflows — multiple tools in a single call.

| Tool | Workflow |
|------|----------|
| `chain_law_system` | Search → 3-tier comparison → batch articles |
| `chain_action_basis` | Law system → interpretations → precedents → appeals |
| `chain_dispute_prep` | Precedents + appeals + specialized decisions |
| `chain_amendment_track` | Old/new comparison + article history |
| `chain_ordinance_compare` | Parent law → nationwide ordinance search |
| `chain_full_research` | AI search → statutes → precedents → interpretations |
| `chain_procedure_detail` | Law system → annexes → enforcement rule annexes |
| `chain_document_review` | Document analysis → related laws → precedents |

### Other (10)

| Tool | Description |
|------|-------------|
| `search_ai_law` | Natural language AI search |
| `search_english_law` | English law search |
| `get_english_law_text` | English law full text |
| `search_historical_law` | Historical law search |
| `get_historical_law` | Historical law full text |
| `search_legal_terms` | Legal dictionary search |
| `get_law_system_tree` | Law system tree visualization |
| `get_law_abbreviations` | Law abbreviation list |
| `get_article_detail` | Single article detail retrieval |
| `compare_admin_rule_old_new` | Admin rule old vs. new comparison |

---

## Usage Examples

```
User: "관세법 제38조 알려줘"
→ search_law("관세법") → get_law_text(mst, jo="003800")

User: "화관법 최근 개정 비교"
→ "화관법" → "화학물질관리법" auto-resolved → compare_old_new(mst)

User: "근로기준법 제74조 해석례"
→ search_interpretations("근로기준법 제74조") → get_interpretation_text(id)

User: "산업안전보건법 별표1 내용"
→ get_annexes("산업안전보건법 별표1") → HWPX download → Markdown table
```

---

## Features

- **87 Legal Tools** — Statutes, precedents, admin rules, ordinances, constitutional decisions, tax rulings, customs interpretations, treaties, institutional rules, legal terminology
- **MCP + CLI** — Use from Claude Desktop or from your terminal. Same 87 tools.
- **Korean Law Intelligence** — Auto-resolves abbreviations (`화관법` → `화학물질관리법`), converts article numbers (`제38조` ↔ `003800`), visualizes 3-tier delegation
- **Annex Extraction** — Downloads HWPX/HWP annexes and converts tables to Markdown automatically
- **8 Chain Tools** — Composite research workflows in a single call (e.g. `chain_full_research`: AI search → statutes → precedents → interpretations)
- **Caching** — 1-hour search cache, 24-hour article cache
- **Remote Endpoint** — Use without installation via `https://korean-law-mcp.fly.dev/mcp`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LAW_OC` | Yes | — | 법제처 API key ([get one free](https://open.law.go.kr/LSO/openApi/guideResult.do)) |
| `PORT` | No | 3000 | HTTP server port |
| `CORS_ORIGIN` | No | `*` | CORS allowed origin |
| `RATE_LIMIT_RPM` | No | 60 | Requests per minute per IP |

## Documentation

- [docs/API.md](docs/API.md) — 87-tool reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — Development guide

## Credits

- [법제처](https://www.law.go.kr) Open API — Korea's official legal database
- [Anthropic](https://anthropic.com) — Model Context Protocol
- [kordoc](https://github.com/chrisryugj/kordoc) — HWP/HWPX parser (same author)

## License

[MIT](./LICENSE)

---

<sub>Made by a Korean civil servant @ 광진구청 AI동호회 AI.Do</sub>
