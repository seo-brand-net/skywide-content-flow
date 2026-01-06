/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Version: 1.2.4
 * Last Updated: 2025-01-06
 * 
 * CHANGELOG v1.2.4:
 * - Added SERP analysis depth validation
 * - Validates minimum 5 competitor pages analyzed
 * - Validates word count variance (200-2000 word range)
 * - Validates pattern specificity (not generic fluff)
 * - Validates competitive gaps are identified
 * - Validates SERP features are specific
 * 
 * CHANGELOG v1.2.3:
 * - Added multi-turn conversation support for tool use
 * - Handles pause_turn stop reason automatically
 * - Continues conversation until brief is generated
 */

const CONFIG = {
  CLAUDE_MODEL: "claude-sonnet-4-20250514",
  CLAUDE_MAX_TOKENS: 24000,
  MAX_ROWS_PER_RUN: 1,
  // SHEET_NAME is now dynamic or uses this as default
  DEFAULT_SHEET_NAME: "Content Brief Automation",
  DOCS_FOLDER_ID: "1nk3KsqlCv5-ndsayI-K1EC8aJXqvoAVQ",
  MIN_INTERNAL_LINKS: 3,
  MAX_INTERNAL_LINKS: 8,
  MAX_EXTERNAL_LINKS: 4,
  USE_WEB_SEARCH: true,
  VERIFY_EXTERNAL_LINKS: true,
  DEEP_SERP_ANALYSIS: true,
  DEBUG: true
};

/**
 * Robustly opens a spreadsheet by URL or falls back to the active one.
 * Essential for "Master Brain" (headless/standalone) context.
 */
function openWorkbook(url) {
  if (url && url.trim().startsWith('http')) {
    try {
      const ss = SpreadsheetApp.openByUrl(url);
      debugLog('OPEN_WORKBOOK', `Opened by URL: "${ss.getName()}"`);
      return ss;
    } catch (e) {
      debugLog('OPEN_WORKBOOK_ERROR', `Failed to open by URL: ${e.message}`);
    }
  }
  
  const ss = SpreadsheetApp.getActive();
  if (ss) {
    debugLog('OPEN_WORKBOOK', `Using active spreadsheet: "${ss.getName()}"`);
    return ss;
  }
  
  throw new Error("Could not access spreadsheet. Please provide a valid workbook URL.");
}


const PAGE_TYPES = {
  'homepage': {
    requiresAnswerFirst: true,
    answerFirstLength: '60-100 words',
    answerFirstLabel: 'Brand intro',
    description: 'Brand homepage establishing credibility and routing traffic',
    targetWordCount: '800-1200'
  },
  'service page': {
    requiresAnswerFirst: true,
    answerFirstLength: '80-120 words',
    answerFirstLabel: 'AFP (Answer-First Paragraph)',
    description: 'Service/landing page for conversions',
    targetWordCount: '1500-2500'
  },
  'blog page': {
    requiresAnswerFirst: true,
    answerFirstLength: '40-60 words',
    answerFirstLabel: 'Short Answer',
    description: 'Informational/educational blog content',
    targetWordCount: '1200-2000'
  },
  'product page': {
    requiresAnswerFirst: true,
    answerFirstLength: '50-80 words',
    answerFirstLabel: 'Product intro',
    description: 'E-commerce product detail page',
    targetWordCount: '800-1500'
  },
  'category page': {
    requiresAnswerFirst: true,
    answerFirstLength: '60-100 words',
    answerFirstLabel: 'Category overview',
    description: 'E-commerce or content category page',
    targetWordCount: '600-1000'
  }
};

const SYSTEM_PROMPT = `You are an expert SEO content strategist creating simplified, high-performance content briefs for AI content generation machines.

Your briefs must be clear, actionable, and optimized for both traditional search engines and LLM-based search (AI Overviews, ChatGPT, Perplexity, etc.).

CRITICAL CLIENT RESEARCH WORKFLOW:
Before creating the brief, you MUST research the client's website thoroughly:

1. DISCOVER CLIENT PAGES:
   - Use web_search with "site:CLIENT_DOMAIN" to find relevant pages
   - Focus on: homepage, about, services, products, features pages
   - Identify the 6-8 most relevant pages based on the brief topic (prioritize quality over quantity)

2. ANALYZE CLIENT PAGES:
   - Use web_search to visit and analyze those pages
   - When you search for a specific URL, web_search will return content from that page
   - Extract factual information:
     * Products and services offered
     * Features and specifications
     * Certifications and awards
     * Warranty information
     * Service areas and locations
     * Company history and expertise
     * Pricing information (if available)
     * Competitive advantages
   - Use this information as GROUND TRUTH for the brief

3. NEVER HALLUCINATE CLIENT INFORMATION:
   - Only reference facts found on the client's actual website
   - If you don't find specific information, don't make it up
   - Base all client claims on pages you've researched

CRITICAL OUTPUT REQUIREMENTS:
1. ALL content must be in PLAIN TEXT with clear section headers
2. Use markdown headers (##) for main sections
3. Use bullet points (-) for lists
4. No complex formatting, tables, or nested structures
5. Keep instructions clear and direct for AI content machines

KEYWORD USAGE RULES:
- Primary keyword: MUST appear in H1 exactly as provided
- Secondary keyword: Use at least 2x in content, especially in H2s
- Long-tail keywords: Distribute naturally throughout (1x each minimum)
- First 150-200 words must include: Primary + Secondary + at least one long-tail

CONTENT STRUCTURE BY PAGE TYPE:
- Homepage: Value prop → Services grid → Why Us → Process → Social proof
- Service Page: AFP → USP → Benefits → Process → Objections → Action Section → [FAQ if beneficial]
- Blog Page: Short Answer → Definitions → Examples → Data → Actionable tips → [FAQ if beneficial]
- Product Page: Product intro → Features → Specs → Benefits → Comparison → Reviews → [FAQ if beneficial]
- Category Page: Category overview → Filter guidance → Featured products → Buying guide

FAQ SECTION LOGIC (CRITICAL):
- ONLY include FAQ section if ALL of the following are true:
  1. Top 3-5 ranking competitor pages have FAQ sections
  2. PAA (People Also Ask) boxes present in SERPs
  3. Featured Snippet opportunities exist for question-based queries
- If FAQ section is included:
  - Place towards the END of content outline (usually last or second-to-last section)
  - Can place just above final section if content flow benefits
  - Service pages: 3-5 questions maximum
  - Blog pages: 5-8 questions maximum
  - Product pages: 3-5 questions maximum
- If NO clear SEO/LLM benefit → DO NOT include FAQ section at all
- Each FAQ must target actual user questions from PAA or competitor analysis

ANSWER-FIRST PARAGRAPH (AFP) REQUIREMENTS:
- DO NOT write the exact AFP text - only provide guidance on what it should cover
- AFP guidance should be included as the first item in the content outline (after H1)
- Specify:
  - Length requirement (varies by page type)
  - Key points to address
  - Primary keyword placement requirement (first 20 words)
  - Tone/approach
- The AI content machine will write the actual AFP based on this guidance

LINK VERIFICATION REQUIREMENTS:

INTERNAL LINKS:
- After generating internal link suggestions, VERIFY each URL with web_search
- Search for the exact URL to check if it exists and is accessible
- If URL appears to be 404 or not found:
  * Search for an alternative relevant page on the domain
  * Provide BOTH the original suggestion AND the alternative
  * Format: Include both url_status and alternative_url in JSON
  * Include verification_note that strategist should verify if page was moved/renamed
- All internal links must be contextually relevant to the content section
- Minimum 3, maximum 8 per brief
- Prioritize: category pages > service pages > cornerstone content > blog posts
- Avoid: tag pages, search results, archives, author pages

EXTERNAL LINKS:
- After generating external link suggestions, VERIFY each URL with web_search
- Search for the exact URL to check if it's accessible and contains relevant content
- If URL is broken or inaccessible:
  * Search for an alternative authoritative source
  * Provide BOTH the original suggestion AND the alternative
  * Format: Include both url_status and alternative_url in JSON
  * Include verification_note for strategist to verify
- Maximum 4 per brief
- Prefer: .gov, .edu, industry standards, trade organizations, research studies
- Avoid: competitor commercial pages, spammy domains

MANDATORY SERP RESEARCH PROTOCOL:
You MUST complete thorough SERP analysis before generating the brief. Briefs with insufficient research will be REJECTED.

REQUIRED STEPS:
1. Search for the primary keyword and analyze the top 7 ranking pages
2. Use web_search to visit each of these pages individually
3. Extract the actual word count from each page (use web_search to get content length)
4. Calculate word count range using P25-P75 (25th to 75th percentile, rounded to nearest 50)
5. Identify SPECIFIC content patterns (not generic descriptions)
6. Note competitive gaps we can exploit
7. Document SERP features with specific details

MINIMUM REQUIREMENTS (YOUR BRIEF WILL BE REJECTED IF YOU DON'T MEET THESE):
- Analyze AT LEAST 5 competitor pages (7 is ideal)
- Word count range MUST have at least 200-word variance (e.g., "1800-2000" is TOO NARROW)
- Maximum variance is 2000 words (if wider, you didn't analyze enough pages)
- Identify AT LEAST 3 specific content patterns
- Identify AT LEAST 1 competitive gap

GOOD vs BAD PATTERN EXAMPLES:

❌ BAD (Too generic - WILL BE REJECTED):
- "Articles are comprehensive and detailed"
- "Content is well-written"
- "Pages have good structure"
- "High-quality information"

✅ GOOD (Specific and actionable - WILL BE ACCEPTED):
- "6 out of 7 pages include pricing comparison tables with 8-12 products"
- "All top-ranking pages use 6-8 H2 sections with average 300 words per section"
- "5 out of 7 include expert quotes or citations (average 3-4 per article)"
- "Top 3 pages feature video demonstrations (2-4 minutes each)"
- "All pages include 'How to Choose' sections with 5-7 decision criteria"

SERP FEATURES - BE SPECIFIC:

❌ BAD (Vague - WILL BE REJECTED):
- "Featured Snippets"
- "People Also Ask"
- "Images"

✅ GOOD (Specific - WILL BE ACCEPTED):
- "List-based Featured Snippet showing '7 Best [Product]' with prices"
- "People Also Ask with 4 questions about pricing and durability"
- "Image carousel with 6 product comparison images"

SELF-CHECK BEFORE GENERATING JSON:
Before you output the JSON brief, verify:
□ Did I analyze 5+ competitor pages using web_search?
□ Did I extract actual word counts (not guess)?
□ Is my word count variance between 200-2000 words?
□ Are my patterns specific with numbers/examples (not generic adjectives)?
□ Did I identify at least 1 clear competitive gap?
□ Are my SERP features described in detail?

If you answer NO to any of these, DO MORE RESEARCH before generating the JSON.

WEB SEARCH USAGE:
- Use web_search tool to analyze SERPs for primary keyword
- Use site:DOMAIN searches to discover internal link candidates
- Verify external link quality and relevance
- Check competitor content patterns

OUTPUT FORMAT:
You MUST return ONLY valid JSON. No preamble, no explanation, no commentary, no markdown code blocks.
Do NOT include ANY text before or after the JSON object.
Do NOT wrap the JSON in triple-backtick code blocks or any other formatting.
Start your response with { and end with }

Return ONLY a JSON object with this exact structure:
{
  "h1": "string - must include primary keyword",
  "title": "string - page title for reference",
  "meta_title": "string - 55-60 chars",
  "meta_description": "string - 150-160 chars",
  "word_count_range": "string - e.g. '1600-2050 words' from SERP analysis",
  "client_research": {
    "pages_analyzed": ["array of URLs fetched"],
    "key_facts": ["array of factual findings about client"],
    "products_services": ["array of actual offerings"],
    "competitive_advantages": ["array of real differentiators"]
  },
  "serp_analysis": {
    "top_ranking_patterns": ["array of strings"],
    "competitive_gaps": ["array of strings"],
    "serp_features": ["array of strings"]
  },
  "outline": [
    {
      "heading": "string - H2 or H3, or 'H1' for first item, or 'AFP Guidance' for answer-first paragraph",
      "level": "number - 1 for H1, 2 or 3 for others, 0 for AFP guidance",
      "guidance": "string - what to cover in this section",
      "word_count_estimate": "string - e.g. '200-300 words'",
      "keywords_to_include": ["array of strings"],
      "is_faq_section": "boolean - true only if this is the FAQ section",
      "is_afp_guidance": "boolean - true only if this is AFP guidance",
      "faq_questions": [
        {
          "question": "string - only if is_faq_section is true",
          "answer_guidance": "string - what the answer should cover"
        }
      ]
    }
  ],
  "faq_analysis": {
    "include_faq": "boolean - true if FAQ section should be included",
    "competitors_have_faq": "boolean",
    "paa_boxes_present": "boolean",
    "featured_snippet_opportunity": "boolean",
    "rationale": "string - explanation of FAQ decision"
  },
  "keyword_strategy": {
    "primary_usage": "string - where/how to use primary keyword",
    "secondary_usage": "string - where/how to use secondary keyword",
    "longtail_distribution": "string - how to distribute long-tails"
  },
  "style_guidelines": {
    "tone": "string",
    "reading_level": "string",
    "sentence_structure": "string",
    "formatting_notes": "string"
  },
  "internal_links": [
    {
      "anchor": "string",
      "url": "string - original URL suggestion",
      "url_status": "string - '200' or '404'",
      "alternative_url": "string or null - if original was 404",
      "alternative_status": "string or null - status of alternative",
      "placement": "string - where in content",
      "rationale": "string",
      "verification_note": "string or null - note for strategist if issues"
    }
  ],
  "external_links": [
    {
      "anchor": "string",
      "url": "string - original URL suggestion",
      "url_status": "string - 'verified' or 'broken'",
      "alternative_url": "string or null - if original was broken",
      "alternative_status": "string or null",
      "placement": "string - where in content",
      "rationale": "string",
      "domain_authority": "string - high/medium/low",
      "verification_note": "string or null - note for strategist if issues"
    }
  ]
}

RULES:
1. ALWAYS research client pages using web_search BEFORE creating brief
2. NEVER invent facts about the client - use only researched information
3. ALWAYS verify ALL internal and external links using web_search
4. ALWAYS use web_search to analyze SERPs and find links
5. ONLY return real, verified URLs - no placeholders or tool IDs
6. Keep internal links between MIN and MAX (3-8)
7. Verify all external links are accessible and credible
8. Base word count ranges on actual SERP analysis
9. Provide specific, actionable guidance for AI content generation
10. Remember: this brief will be fed to an AI content machine, so be precise
11. CRITICAL: After completing all research, IMMEDIATELY generate the complete JSON brief in a single response - do not pause or wait for confirmation

RESEARCH PROTOCOL:
- When using tools, do NOT include ANY text, explanations, or "Searching..." markers. 
- Provide ONLY the tool call block. This is mandatory for protocol stability.

CLIENT_DOMAIN will be replaced with actual domain before sending.`;

function logToDebugSheet(label, payload, responseData = null) {
  try {
    const ss = SpreadsheetApp.getActive();
    let debugSheet = ss.getSheetByName('DEBUG_LOGS');
    if (!debugSheet) {
      debugSheet = ss.insertSheet('DEBUG_LOGS');
      debugSheet.appendRow(['Timestamp', 'Label', 'Request Payload', 'Response Body']);
      debugSheet.getRange(1, 1, 1, 4).setBold(true).setBackground('#f3f3f3');
      debugSheet.setColumnWidth(3, 500);
      debugSheet.setColumnWidth(4, 500);
    }
    const reqStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    const resStr = responseData ? (typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2)) : 'N/A';
    debugSheet.insertRowAfter(1);
    debugSheet.getRange(2, 1, 1, 4).setValues([[
      new Date().toISOString(),
      label,
      reqStr.substring(0, 50000),
      resStr.substring(0, 50000)
    ]]);
    if (debugSheet.getLastRow() > 105) {
      debugSheet.deleteRows(100, debugSheet.getLastRow() - 100);
    }
  } catch (e) {
    Logger.log('Error logging to Debug Sheet: ' + e);
  }
}

function debugLog(label, data) {
  if (!CONFIG.DEBUG) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const logMsg = `[${timestamp}] [${label}] ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  Logger.log(logMsg);
}

function robustFetch(url, options, maxRetries = 2) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return UrlFetchApp.fetch(url, options);
    } catch (e) {
      lastError = e;
      const msg = e.message || '';
      if (msg.includes('Address unavailable') || msg.includes('limit exceeded') || msg.includes('DNS')) {
        debugLog('RETRY_FETCH', `Attempt ${i+1} failed: ${msg}. Retrying...`);
        Utilities.sleep(1500 * (i + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

function safeAlert(message, title = 'Notification') {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    debugLog('HEADLESS_ALERT', `${title}: ${message}`);
    if (message.includes('unavailable') || message.includes('Missing required')) {
      throw new Error(message);
    }
  }
}

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean);
  }
  return String(value).split(/[,;|\n]/g).map(s => s.trim()).filter(Boolean);
}

function getSanitizedFolderId() {
  if (!CONFIG.DOCS_FOLDER_ID) return '';
  try {
    if (CONFIG.DOCS_FOLDER_ID.includes('/folders/')) {
      const match = CONFIG.DOCS_FOLDER_ID.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : '';
    }
    return CONFIG.DOCS_FOLDER_ID.split('?')[0];
  } catch (e) {
    return '';
  }
}

function calculateOptimalDelay() {
  const RATE_LIMIT_CONFIG = {
    TOKENS_PER_MINUTE: 30000,
    ESTIMATED_INPUT_TOKENS: 8000,
    ESTIMATED_OUTPUT_TOKENS: 6000,
    SAFETY_MARGIN: 0.8
  };
  const totalTokensPerRequest = RATE_LIMIT_CONFIG.ESTIMATED_INPUT_TOKENS + RATE_LIMIT_CONFIG.ESTIMATED_OUTPUT_TOKENS;
  const safeTokensPerMinute = RATE_LIMIT_CONFIG.TOKENS_PER_MINUTE * RATE_LIMIT_CONFIG.SAFETY_MARGIN;
  const secondsPerRequest = (60 / safeTokensPerMinute) * totalTokensPerRequest;
  const delayMs = Math.ceil(secondsPerRequest * 1000);
  debugLog('RATE_LIMIT_CALC', {
    tokensPerRequest: totalTokensPerRequest,
    safeTokensPerMinute: safeTokensPerMinute,
    optimalDelaySeconds: secondsPerRequest.toFixed(1),
    delayMs: delayMs
  });
  return delayMs;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Content Briefs')
    .addItem('Generate Briefs (Next Batch)', 'runBriefGeneration')
    .addItem('Setup Script Properties', 'showSetupDialog')
    .addSeparator()
    .addItem('Set 10-min Auto-Run', 'createTimeTrigger')
    .addItem('Clear All Triggers', 'deleteAllTriggers')
    .addToUi();
}

function showSetupDialog() {
  const html = HtmlService.createHtmlOutput(`
    <h3>Setup Instructions</h3>
    <ol>
      <li>Get your Claude API key from: <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></li>
      <li>Go to Apps Script: <strong>Project Settings</strong> (gear icon)</li>
      <li>Click <strong>Script Properties</strong></li>
      <li>Add property: <code>ANTHROPIC_API_KEY</code></li>
      <li>Paste your API key as the value</li>
      <li>Save and close</li>
    </ol>
    <p>Once set up, use the menu to generate briefs!</p>
  `).setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Claude API Key');
}

function ensureRequiredColumns(sheet) {
  const lastCol = sheet.getLastColumn();
  debugLog('COLUMN_CHECK_START', { sheetName: sheet.getName(), lastCol: lastCol });
  if (lastCol === 0) {
    throw new Error(`Sheet "${sheet.getName()}" is empty. No headers found.`);
  }
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const normalizedHeaders = rawHeaders.map(h => String(h || '').toLowerCase().trim().replace(/[\s_]+/g, '_'));
  const debugInfo = rawHeaders.map((h, i) => `${i}: "${h}" -> "${normalizedHeaders[i]}"`).join(', ');
  debugLog('NORMALIZED_HEADERS_DETAIL', debugInfo);
  const requiredHeaders = [
    'url', 'url_type', 'page_type', 'primary_keyword', 
    'secondary_keyword', 'longtail_keywords', 'location', 'intent'
  ];
  requiredHeaders.forEach(header => {
    if (!normalizedHeaders.includes(header)) {
      throw new Error(`Missing required column: ${header}`);
    }
  });
  const outputHeaders = ['id', 'status', 'brief_url', 'run_id', 'notes'];
  const toAdd = outputHeaders.filter(h => !normalizedHeaders.includes(h));
  if (toAdd.length > 0) {
    sheet.insertColumnsAfter(rawHeaders.length, toAdd.length);
    const startCol = rawHeaders.length + 1;
    sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  }
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h || '').toLowerCase().trim().replace(/[\s_]+/g, '_');
    map[key] = { index: i, name: h };
  });
  return map;
}

function rowToObject(row, headerMap) {
  const obj = {};
  Object.keys(headerMap).forEach(key => {
    const idx = headerMap[key].index;
    obj[key] = (row.length > idx) ? row[idx] : "";
  });
  return obj;
}

function discoverDataSheet(ssOverride) {
  const ss = ssOverride || SpreadsheetApp.getActive();
  if (!ss) throw new Error("No active spreadsheet found for discovery.");
  let sheet = ss.getActiveSheet();
  function hasUrlColumn(sh) {
    if (!sh || sh.getLastColumn() === 0) return false;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(h => String(h || '').toLowerCase().trim().replace(/[\s_]+/g, '_'));
    return headers.includes('url');
  }
  if (sheet && hasUrlColumn(sheet)) return sheet;
  debugLog('SHEET_DISCOVERY', `Targeting spreadsheet "${ss.getName()}". Searching for 'url' column...`);
  const target = ss.getSheets().find(sh => hasUrlColumn(sh));
  if (!target) {
    throw new Error("Could not find a sheet with the required 'url' column in this workbook.");
  }
  return target;
}

function getSheetFromUrl(ss, url) {
  if (!url) return null;
  const gidMatch = url.match(/[?#]gid=([0-9]+)/);
  if (gidMatch) {
    const gid = parseInt(gidMatch[1]);
    return ss.getSheets().find(s => s.getSheetId() === gid) || null;
  }
  return null;
}

function runBriefGeneration(overrideFolderId, workbookUrl, fallbackClientId) {
  const ss = openWorkbook(workbookUrl);
  let sheet = null;
  
  if (workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
    if (sheet) debugLog('TARGET_SHEET', `Found by GID: "${sheet.getName()}"`);
  }
  
  if (!sheet) {
    try {
      sheet = discoverDataSheet(ss);
      debugLog('TARGET_SHEET', `Found by discovery: "${sheet.getName()}"`);
    } catch (e) {
      throw e;
    }
  }

  debugLog('TARGET_SHEET_FINAL', { name: sheet.getName(), lastCol: sheet.getLastColumn() });
  ensureRequiredColumns(sheet);
  const headers = getHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  const statusCol = headers['status']?.index;
  const runIdCol = headers['run_id']?.index;
  if (statusCol === undefined || runIdCol === undefined) {
    throw new Error('Missing required columns: status or run_id');
  }
  const runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const targets = [];
  for (let r = 1; r < data.length; r++) {
    const status = String(data[r][statusCol] || '').toUpperCase().trim();
    if (status === '' || status === 'NEW') {
      targets.push(r);
      if (targets.length >= CONFIG.MAX_ROWS_PER_RUN) break;
    }
  }
  if (targets.length === 0) {
    safeAlert('No new rows to process', 'Batch Information');
    return;
  }
  targets.forEach(r => {
    const idCol = headers['id']?.index;
    const rowIdString = Utilities.getUuid();
    if (idCol !== undefined) {
      sheet.getRange(r + 1, idCol + 1).setValue(rowIdString);
    }
    sheet.getRange(r + 1, statusCol + 1).setValue('IN_PROGRESS');
    sheet.getRange(r + 1, runIdCol + 1).setValue(runId);
    const rowObj = rowToObject(data[r], headers);
    rowObj.id = rowIdString;
    rowObj.client_id = rowObj.client_id || fallbackClientId;
    notifyDashboardStatus({ ...rowObj, run_id: runId, status: 'IN_PROGRESS' }, null);
  });
  targets.forEach(r => {
    try {
      const rowObj = rowToObject(data[r], headers);
      const strategy = buildStrategy(rowObj);
      debugLog('STRATEGY', strategy);
      const brief = generateBriefWithClaude(strategy);
      debugLog('BRIEF GENERATED', { 
        h1: brief.h1, 
        sections: brief.outline?.length,
        internal_links: brief.internal_links?.length,
        external_links: brief.external_links?.length
      });
      const docUrl = renderBriefToGoogleDoc(brief, strategy, overrideFolderId);
      sheet.getRange(r + 1, headers['brief_url'].index + 1).setValue(docUrl);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('DONE');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue('');
      const freshRowValues = sheet.getRange(r + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const freshRowObj = rowToObject(freshRowValues, headers);
      if (!freshRowObj.client_id && fallbackClientId) freshRowObj.client_id = fallbackClientId;
      if (!freshRowObj.id) {
        const idCol = headers['id']?.index;
        freshRowObj.id = (idCol !== undefined) ? String(freshRowValues[idCol]).trim() : '';
      }
      notifyDashboardStatus(freshRowObj, docUrl, brief);
      const clientWorkbookUrl = rowObj['client_workbook'] || rowObj['workbook_url'];
      if (clientWorkbookUrl && String(clientWorkbookUrl).trim().startsWith('http')) {
        debugLog('CROSS-POSTING', { to: clientWorkbookUrl });
        appendToWorkbook(String(clientWorkbookUrl).trim(), {
          ...rowObj,
          brief_url: docUrl,
          status: 'DONE',
          notes: 'Synced from Master'
        });
      }
    } catch (e) {
      debugLog('ERROR', e);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('ERROR');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue(
        String(e.message || e).substring(0, 1000)
      );
      const rowObj = rowToObject(data[r], headers);
      if (!rowObj.client_id && fallbackClientId) rowObj.client_id = fallbackClientId;
      const idCol = headers['id']?.index;
      if (!rowObj.id && idCol !== undefined) {
        const freshId = sheet.getRange(r + 1, idCol + 1).getValue();
        rowObj.id = freshId;
      }
      notifyDashboardStatus({ ...rowObj, status: 'ERROR', notes: e.toString() }, null);
    }
    if (targets.indexOf(r) < targets.length - 1) {
      const delay = calculateOptimalDelay();
      debugLog('BATCH_PACING', `Waiting ${delay/1000}s before next row...`);
      Utilities.sleep(delay);
    }
  });
  safeAlert(
    `Processed ${targets.length} row(s)\n\nCheck the 'status' and 'brief_url' columns for results.`,
    'Batch Complete'
  );
}

function buildStrategy(row) {
  const clientDomain = extractDomain(row.url);
  const urlType = String(row.url_type || '').toLowerCase().trim();
  const pageType = String(row.page_type || 'blog page').toLowerCase().trim();
  if (!PAGE_TYPES[pageType]) {
    throw new Error(
      `Invalid page_type: "${pageType}". Must be one of: ${Object.keys(PAGE_TYPES).join(', ')}`
    );
  }
  return {
    client_url: String(row.url || '').trim(),
    client_domain: clientDomain,
    url_type: urlType,
    is_existing: urlType === 'existing',
    page_type: pageType,
    page_config: PAGE_TYPES[pageType],
    primary_keyword: String(row.primary_keyword || '').trim(),
    secondary_keyword: String(row.secondary_keyword || '').trim(),
    longtail_keywords: normalizeList(row.longtail_keywords),
    location: String(row.location || '').trim(),
    intent: String(row.intent || 'informational').toLowerCase().trim()
  };
}

function generateBriefWithClaude(strategy, retryCount = 0) {
  const MAX_RETRIES = 3;
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY in Script Properties. ' +
      'Go to Project Settings > Script Properties and add your Claude API key.'
    );
  }
  const systemPrompt = SYSTEM_PROMPT.replace(/CLIENT_DOMAIN/g, strategy.client_domain);
  const userMessage = `Create a complete SEO content brief for AI content generation.

STRATEGY DETAILS:
${JSON.stringify(strategy, null, 2)}

CRITICAL WORKFLOW:
1. FIRST: Research client website (${strategy.client_domain})
   - Use site: search to find 6-8 most relevant pages
   - Use web_search to analyze those pages (search for specific URLs)
   - Extract factual information about client offerings
   
2. THEN: Analyze SERPs for "${strategy.primary_keyword}"
   - Find top ranking pages
   - Identify content patterns and gaps
   
3. THEN: Generate internal/external link suggestions
   - Use site: search for internal link candidates
   - Verify ALL links with web_search (search for the exact URL)
   - Provide alternatives for any broken/404 links
   
4. FINALLY: Create the complete JSON brief in this response
   - Do NOT pause or wait after research
   - Generate the full JSON brief immediately

REQUIREMENTS:
1. Research 6-8 most relevant pages from ${strategy.client_domain} using web_search
2. Use only REAL facts found on client site - never hallucinate
3. Find ${CONFIG.MIN_INTERNAL_LINKS}-${CONFIG.MAX_INTERNAL_LINKS} verified internal links
4. Find up to ${CONFIG.MAX_EXTERNAL_LINKS} verified external links
5. Verify ALL link URLs using web_search (show original + alternative if broken)
6. Base word count on actual top-ranking pages
7. Provide specific, actionable guidance for AI content machines

CONTENT OUTLINE STRUCTURE:
- First item: H1 (level: 1)
- Second item: AFP Guidance (level: 0, is_afp_guidance: true) - DO NOT write exact AFP text, only provide guidance on what it should cover (${strategy.page_config.answerFirstLength})
- Remaining items: H2/H3 sections with detailed guidance
- FAQ section (if beneficial): towards end of outline

FAQ ANALYSIS (CRITICAL):
- Check if top 3-5 ranking pages have FAQ sections
- Look for PAA (People Also Ask) boxes in SERPs
- Identify Featured Snippet opportunities for questions
- ONLY include FAQ section in outline if ALL THREE conditions are met
- If FAQ is included: ${strategy.page_type === 'blog page' ? '5-8 questions' : '3-5 questions'} maximum
- Place FAQ towards end of outline (last or second-to-last section)
- If no clear benefit → Set include_faq: false and explain in rationale

CRITICAL OUTPUT REQUIREMENT:
Return ONLY the JSON object. Do NOT include:
- Any preamble or introduction
- Any explanation of your process
- Any commentary about searches performed
- Any markdown code blocks
- Any text before { or after }

Your response must start with { and end with }. Nothing else.`;

  const requestBody = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: []
  };
  if (CONFIG.USE_WEB_SEARCH) {
    requestBody.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search'
      }
    ];
  }
  debugLog('CLAUDE REQUEST', { model: CONFIG.CLAUDE_MODEL, has_tools: !!requestBody.tools, retry: retryCount });
  if (retryCount === 0) {
    const optimalDelay = calculateOptimalDelay();
    debugLog('RATE_LIMIT_DELAY', `Waiting ${(optimalDelay / 1000).toFixed(1)}s before API call`);
    Utilities.sleep(optimalDelay);
  } else {
    const retryDelay = Math.pow(2, retryCount - 1) * 30000;
    debugLog('RETRY_DELAY', `Retry ${retryCount}: waiting ${retryDelay / 1000}s`);
    Utilities.sleep(retryDelay);
  }
  try {
    let conversationMessages = [
      {
        role: 'user',
        content: userMessage
      }
    ];
    let briefText = '';
    let maxTurns = 12;
    let currentTurn = 0;
    while (currentTurn < maxTurns) {
      currentTurn++;
      debugLog('CONVERSATION_TURN', `Turn ${currentTurn}/${maxTurns}`);
      requestBody.messages = conversationMessages;
      logToDebugSheet(`TURN_${currentTurn}_REQ`, requestBody);
      const auditLog = conversationMessages.map((m, idx) => {
        const types = Array.isArray(m.content) ? m.content.map(b => b.type).join(',') : 'string';
        return `[${idx}] ${m.role}: ${types}`;
      }).join(' | ');
      debugLog('CONVERSATION_AUDIT', auditLog);
      const response = robustFetch('https://api.anthropic.com/v1/messages', {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05'
        },
        payload: JSON.stringify(requestBody)
      });
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      debugLog('CLAUDE RESPONSE CODE', statusCode);
      if (statusCode === 429 || statusCode === 529) {
        if (retryCount < MAX_RETRIES) {
          const waitTime = Math.pow(2, retryCount) * 30;
          const errorType = statusCode === 429 ? 'RATE LIMIT' : 'SERVER OVERLOAD';
          debugLog(`${errorType} HIT`, `Waiting ${waitTime} seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
          Logger.log(`${errorType} error. Waiting ${waitTime} seconds before retry...`);
          Utilities.sleep(waitTime * 1000);
          return generateBriefWithClaude(strategy, retryCount + 1);
        } else {
          const errorMsg = statusCode === 429 
            ? `Rate limit exceeded after ${MAX_RETRIES} retries. Please wait a few minutes or upgrade your API tier.`
            : `Anthropic servers are overloaded (529) after ${MAX_RETRIES} retries. Please try again in 5-10 minutes.`;
          throw new Error(errorMsg);
        }
      }
      if (statusCode !== 200) {
        logToDebugSheet(`ERROR_${statusCode}`, requestBody, responseText);
        debugLog('CLAUDE_ERROR_BODY', responseText);
        if (statusCode === 400 && responseText.includes('invalid_request_error') && retryCount < MAX_RETRIES) {
          debugLog('STABILIZATION_RETRY', 'Caught 400 protocol error. Retrying with fresh state...');
          Utilities.sleep(5000); 
          return generateBriefWithClaude(strategy, retryCount + 1);
        }
        throw new Error(`Claude API error ${statusCode}: ${responseText}`);
      }
      if (currentTurn === 1) logToDebugSheet('TURN_1_SUCCESS', requestBody, 'Check next log for response');
      const responseData = JSON.parse(responseText);
      debugLog('RESPONSE_STOP_REASON', responseData.stop_reason);
      debugLog('RESPONSE_CONTENT_TYPES', responseData.content?.map(b => b.type).join(', '));
      let assistantContent = responseData.content;
      const hasWebSearch = assistantContent.some(block => 
        (block.type === 'tool_use' && block.name === 'web_search') || 
        (block.type === 'server_tool_use')
      );
      if (hasWebSearch) {
        const lastBlock = assistantContent[assistantContent.length - 1];
        if (responseData.stop_reason === 'pause_turn' && lastBlock && lastBlock.type === 'server_tool_use') {
          debugLog('PROTOCOL_FIX', `Dropping orphaned server_tool_use ID: ${lastBlock.id}`);
          assistantContent.pop();
        }
        assistantContent = assistantContent.filter(block => 
          block.type === 'tool_use' || 
          block.type === 'server_tool_use' || 
          block.type === 'web_search_tool_result' ||
          (block.type === 'text' && block.text.trim().startsWith('{'))
        );
      }
      conversationMessages.push({
        role: 'assistant',
        content: assistantContent
      });
      const toolUses = assistantContent.filter(block => block.type === 'tool_use');
      if (toolUses.length > 0) {
        debugLog('TOOL_USE_DETECTED', `Claude requested ${toolUses.length} tools`);
        const toolResults = toolUses.map(toolUse => {
          if (toolUse.name === 'web_search') {
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: [{ type: 'web_search_tool_result' }]
            };
          }
          return {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: "Success"
          };
        });
        conversationMessages.push({
          role: 'user',
          content: toolResults
        });
        debugLog('STABILIZATION', 'Turn complete. Pacing 2s before next turn...');
        Utilities.sleep(2000);
        continue;
      }
      const textBlocks = assistantContent.filter(block => block.type === 'text');
      if (textBlocks.length > 0) {
        briefText = textBlocks.map(block => block.text).join('\n');
        debugLog('TEXT_CONTENT_FOUND', `Found ${briefText.length} chars of text`);
        break;
      }
      if (responseData.stop_reason === 'pause_turn') {
        debugLog('PAUSE_TURN_DETECTED', 'Continuing conversation...');
        conversationMessages.push({
          role: 'user',
          content: 'Please continue and provide the complete JSON brief now.'
        });
        continue;
      }
      if (responseData.stop_reason === 'end_turn') {
        debugLog('END_TURN_NO_TEXT', 'Claude ended turn but provided no text content');
        break;
      }
      if (responseData.stop_reason === 'max_tokens') {
        throw new Error(
          'Claude response was cut off due to max_tokens limit. ' +
          'Try increasing CLAUDE_MAX_TOKENS in CONFIG or simplifying the request.'
        );
      }
      debugLog('UNEXPECTED_STOP_REASON', responseData.stop_reason);
      break;
    }
    if (!briefText) {
      const lastResponse = conversationMessages[conversationMessages.length - 1];
      const contentTypes = lastResponse.content?.map(b => b.type) || [];
      debugLog('NO_TEXT_AFTER_TURNS', {
        totalTurns: currentTurn,
        lastContentTypes: contentTypes,
        conversationLength: conversationMessages.length
      });
      throw new Error(
        `No text content after ${currentTurn} conversation turns. ` +
        'Last content types: ' + contentTypes.join(', ') + '. ' +
        'This may indicate Claude is stuck in tool use or the brief generation failed.'
      );
    }
    debugLog('BRIEF TEXT LENGTH', briefText.length);
    const brief = parseClaudeResponse(briefText);
    validateBrief(brief, strategy);
    return brief;
  } catch (error) {
    if (error.message && error.message.includes('rate_limit') && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 30;
      debugLog('RATE LIMIT ERROR', `Waiting ${waitTime} seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
      Logger.log(`Rate limit error. Waiting ${waitTime} seconds before retry...`);
      Utilities.sleep(waitTime * 1000);
      return generateBriefWithClaude(strategy, retryCount + 1);
    }
    throw error;
  }
}

function parseClaudeResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    debugLog('JSON_EXTRACTION_FAILED', 'No JSON object found in response');
    throw new Error(
      'No JSON object found in response. ' +
      'Response may be entirely text without JSON structure.\n\n' +
      'First 500 chars:\n' + cleaned.substring(0, 500)
    );
  }
  let jsonStr = jsonMatch[0];
  debugLog('JSON_EXTRACTED', `Successfully extracted JSON object (${jsonStr.length} chars)`);
  try {
    const parsed = JSON.parse(jsonStr);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed on first attempt');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_1_FAILED', e.message);
  }
  let cleanedJson = jsonStr
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
  try {
    const parsed = JSON.parse(cleanedJson);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after cleaning (attempt 2)');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_2_FAILED', e.message);
  }
  let quoteFix = cleanedJson.replace(/:\s*'([^']*?)'/g, ': "$1"');
  try {
    const parsed = JSON.parse(quoteFix);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after quote fixing (attempt 3)');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_3_FAILED', e.message);
  }
  debugLog('JSON_PARSE_ALL_FAILED', {
    extractedJsonLength: jsonStr.length,
    firstChars: jsonStr.substring(0, 300),
    lastChars: jsonStr.substring(Math.max(0, jsonStr.length - 200))
  });
  throw new Error(
    'Failed to parse Claude response as JSON after 3 attempts.\n\n' +
    'Extracted JSON preview (first 500 chars):\n' +
    jsonStr.substring(0, 500) + '\n\n' +
    'Last 300 chars:\n' +
    jsonStr.substring(Math.max(0, jsonStr.length - 300))
  );
}

function validateSerpAnalysis(brief, strategy) {
  const serp = brief.serp_analysis;
  const clientResearch = brief.client_research;
  const pagesAnalyzed = clientResearch.pages_analyzed?.length || 0;
  if (pagesAnalyzed < 5) {
    throw new Error(
      `Insufficient SERP research: Only ${pagesAnalyzed} pages analyzed. ` +
      'Minimum 5 competitor pages required for quality analysis.'
    );
  }
  const wordCountPattern = /(\d+)-(\d+)/;
  const match = brief.word_count_range.match(wordCountPattern);
  if (!match) {
    throw new Error(
      'Invalid word count range format. Must be "X-Y words" based on competitor analysis.'
    );
  }
  const min = parseInt(match[1]);
  const max = parseInt(match[2]);
  const variance = max - min;
  if (variance < 200) {
    throw new Error(
      `Word count range too narrow (${variance} words). ` +
      'Suggests insufficient competitor analysis. Expected variance of at least 200-400 words.'
    );
  }
  if (variance > 2000) {
    Logger.log(
      `WARNING: Very wide word count range (${variance} words). ` +
      'This suggests high variance in competitor content or shallow analysis.'
    );
  }
  const patterns = serp.top_ranking_patterns || [];
  if (patterns.length < 3) {
    throw new Error(
      `Insufficient SERP pattern analysis: Only ${patterns.length} patterns identified. ` +
      'Expected at least 3 specific content patterns from top-ranking pages.'
    );
  }
  const genericPatterns = [
    'comprehensive', 'detailed', 'well-written', 'high-quality', 
    'good content', 'informative', 'helpful'
  ];
  const specificPatternCount = patterns.filter(pattern => {
    const lowerPattern = pattern.toLowerCase();
    return !genericPatterns.some(generic => 
      lowerPattern.includes(generic) && lowerPattern.length < 50
    );
  }).length;
  if (specificPatternCount < 2) {
    Logger.log(
      'WARNING: SERP patterns appear generic. Expected specific, actionable insights ' +
      '(e.g., "All top 5 include pricing tables", "Average of 8 H2 sections").'
    );
  }
  const gaps = serp.competitive_gaps || [];
  if (gaps.length === 0) {
    Logger.log(
      'WARNING: No competitive gaps identified. This suggests incomplete SERP analysis.'
    );
  }
  const features = serp.serp_features || [];
  if (features.length > 0) {
    const vagueFeaturesCount = features.filter(f => {
      const lower = f.toLowerCase();
      return lower === 'featured snippets' || 
             lower === 'paa' || 
             lower === 'people also ask' ||
             lower === 'images' ||
             lower === 'videos';
    }).length;
    if (vagueFeaturesCount === features.length) {
      Logger.log(
        'WARNING: SERP features are vague. Expected specific details ' +
        '(e.g., "List-based Featured Snippet with 5 items", not just "Featured Snippets").'
      );
    }
  }
  debugLog('SERP ANALYSIS VALIDATED', {
    pages_analyzed: pagesAnalyzed,
    word_count_variance: variance,
    pattern_count: patterns.length,
    specific_patterns: specificPatternCount,
    gaps_identified: gaps.length,
    serp_features: features.length
  });
}

function validateBrief(brief, strategy) {
  const required = [
    'h1', 'title', 'meta_title', 'meta_description',
    'word_count_range', 'outline', 'keyword_strategy', 'internal_links', 'external_links', 
    'faq_analysis', 'client_research', 'serp_analysis'
  ];
  required.forEach(field => {
    if (!brief[field]) {
      throw new Error(`Missing required field in brief: ${field}`);
    }
  });
  if (!brief.client_research.pages_analyzed || brief.client_research.pages_analyzed.length === 0) {
    throw new Error(
      'CRITICAL: No client pages were analyzed. This likely means web_search tool was unavailable. ' +
      'Brief cannot be generated without web research. Please try again in a few minutes.'
    );
  }
  const briefString = JSON.stringify(brief).toLowerCase();
  if (briefString.includes('web_search') && briefString.includes('unavailable')) {
    throw new Error(
      'CRITICAL: web_search tool was unavailable during generation. ' +
      'Brief cannot be generated without web research. Please try again in a few minutes.'
    );
  }
  const h1Section = brief.outline.find(section => section.level === 1);
  const afpSection = brief.outline.find(section => section.is_afp_guidance);
  if (!h1Section) {
    Logger.log('WARNING: No H1 found in outline');
  }
  if (!afpSection) {
    Logger.log('WARNING: No AFP guidance found in outline');
  }
  const h1Lower = brief.h1.toLowerCase();
  const primaryLower = strategy.primary_keyword.toLowerCase();
  if (!h1Lower.includes(primaryLower)) {
    Logger.log(`WARNING: H1 "${brief.h1}" doesn't include primary keyword "${strategy.primary_keyword}"`);
  }
  if (brief.faq_analysis.include_faq === undefined) {
    throw new Error('Missing faq_analysis.include_faq boolean');
  }
  const faqSection = brief.outline.find(section => section.is_faq_section);
  if (faqSection) {
    const questionCount = faqSection.faq_questions?.length || 0;
    const maxQuestions = strategy.page_type === 'blog page' ? 8 : 5;
    const minQuestions = 3;
    if (questionCount < minQuestions) {
      Logger.log(`WARNING: FAQ section has only ${questionCount} questions (minimum ${minQuestions})`);
    }
    if (questionCount > maxQuestions) {
      Logger.log(`WARNING: FAQ section has ${questionCount} questions (maximum ${maxQuestions}), trimming...`);
      faqSection.faq_questions = faqSection.faq_questions.slice(0, maxQuestions);
    }
  }
  const internalCount = brief.internal_links?.length || 0;
  if (internalCount < CONFIG.MIN_INTERNAL_LINKS) {
    throw new Error(
      `Not enough internal links: ${internalCount}. Minimum required: ${CONFIG.MIN_INTERNAL_LINKS}`
    );
  }
  if (internalCount > CONFIG.MAX_INTERNAL_LINKS) {
    brief.internal_links = brief.internal_links.slice(0, CONFIG.MAX_INTERNAL_LINKS);
  }
  if (brief.external_links?.length > CONFIG.MAX_EXTERNAL_LINKS) {
    brief.external_links = brief.external_links.slice(0, CONFIG.MAX_EXTERNAL_LINKS);
  }
  if (brief.meta_title.length > 60) {
    brief.meta_title = brief.meta_title.substring(0, 60);
  }
  if (brief.meta_description.length > 160) {
    brief.meta_description = brief.meta_description.substring(0, 160);
  }
  validateSerpAnalysis(brief, strategy);
  debugLog('BRIEF VALIDATED', {
    h1_length: brief.h1.length,
    has_afp_guidance: !!afpSection,
    client_pages_analyzed: brief.client_research.pages_analyzed.length,
    outline_sections: brief.outline.length,
    internal_links: internalCount,
    external_links: brief.external_links.length,
    faq_included: brief.faq_analysis.include_faq,
    faq_questions: faqSection?.faq_questions?.length || 0
  });
}

function renderBriefToGoogleDoc(brief, strategy, overrideFolderId) {
  const docName = `Brief - ${brief.title} - ${new Date().toISOString().slice(0, 10)}`;
  const doc = DocumentApp.create(docName);
  const folderId = overrideFolderId || getSanitizedFolderId();
  if (folderId) {
    try {
      const file = DriveApp.getFileById(doc.getId());
      DriveApp.getFolderById(folderId).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
      debugLog('Folder move failed', e.message);
    }
  }
  const body = doc.getBody();
  body.clear();
  addHeading(body, brief.title, DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('');
  addHeading(body, 'Keyword Usage Instructions', DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Usage Requirements:').setBold(true).setFontSize(11);
  body.appendParagraph('');
  const usageItems = [
    brief.keyword_strategy.primary_usage,
    brief.keyword_strategy.secondary_usage,
    brief.keyword_strategy.longtail_distribution
  ];
  usageItems.forEach(item => {
    body.appendListItem(item)
      .setGlyphType(DocumentApp.GlyphType.BULLET)
      .setBold(false)
      .setFontSize(11);
  });
  body.appendParagraph('');
  addHeading(body, 'Content Outline', DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Target Word Count: ${brief.word_count_range}`).setItalic(true);
  body.appendParagraph('');
  if (brief.faq_analysis.include_faq) {
    body.appendParagraph('Note: FAQ section is included in this outline based on competitor analysis and SERP features.')
      .setItalic(true)
      .setFontSize(10)
      .setForegroundColor('#666666');
    body.appendParagraph('');
  }
  brief.outline.forEach((section, idx) => {
    if (section.level === 1) {
      body.appendParagraph(`H1: ${brief.h1}`)
        .setBold(true)
        .setFontSize(13);
      body.appendParagraph('');
      return;
    }
    if (section.is_afp_guidance) {
      body.appendParagraph(`${strategy.page_config.answerFirstLabel} (${strategy.page_config.answerFirstLength})`)
        .setBold(true)
        .setFontSize(12);
      body.appendParagraph(section.guidance)
        .setFontSize(11);
      if (section.keywords_to_include?.length > 0) {
        body.appendParagraph(`Keywords to include: ${section.keywords_to_include.join(', ')}`)
          .setFontSize(9)
          .setForegroundColor('#666666')
          .setItalic(true);
      }
      body.appendParagraph('');
      return;
    }
    const headingMarker = section.level === 2 ? 'H2' : 'H3';
    if (section.is_faq_section) {
      body.appendParagraph(`${headingMarker}: ${section.heading}`)
        .setBold(true)
        .setFontSize(12);
    } else {
      body.appendParagraph(`${headingMarker}: ${section.heading}`)
        .setBold(true)
        .setFontSize(12);
    }
    if (section.word_count_estimate) {
      body.appendParagraph(`Target: ${section.word_count_estimate}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#666666');
    }
    body.appendParagraph(section.guidance)
      .setFontSize(11)
      .setBold(false);
    if (section.keywords_to_include?.length > 0) {
      body.appendParagraph(`Keywords to include: ${section.keywords_to_include.join(', ')}`)
        .setFontSize(9)
        .setForegroundColor('#666666')
        .setItalic(true);
    }
    if (section.is_faq_section && section.faq_questions?.length > 0) {
      body.appendParagraph('');
      body.appendParagraph('FAQ Questions:')
        .setBold(true)
        .setFontSize(11);
      section.faq_questions.forEach((faq, faqIdx) => {
        body.appendParagraph(`${faqIdx + 1}. ${faq.question}`)
          .setBold(true)
          .setFontSize(10)
          .setIndentStart(18);
        body.appendParagraph(`Answer guidance: ${faq.answer_guidance}`)
          .setIndentStart(36)
          .setFontSize(10)
          .setBold(false);
      });
    }
    body.appendParagraph('');
  });
  addHeading(body, 'Style Guidelines', DocumentApp.ParagraphHeading.HEADING1);
  const styleItems = [
    `Tone: ${brief.style_guidelines.tone}`,
    `Reading Level: ${brief.style_guidelines.reading_level}`,
    `Sentence Structure: ${brief.style_guidelines.sentence_structure}`,
    `Formatting: ${brief.style_guidelines.formatting_notes}`
  ];
  styleItems.forEach(item => {
    body.appendListItem(item)
      .setGlyphType(DocumentApp.GlyphType.BULLET)
      .setBold(false)
      .setFontSize(11);
  });
  body.appendParagraph('');
  body.appendHorizontalRule();
  body.appendParagraph('');
  const strategistHeader = body.appendParagraph('STRATEGIST SECTION');
  strategistHeader.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  strategistHeader.setBold(true);
  strategistHeader.setFontSize(16);
  strategistHeader.setForegroundColor('#cc0000');
  body.appendParagraph('The following sections are for the strategist/editorial team and should NOT be passed to the AI content machine.')
    .setItalic(true)
    .setFontSize(10)
    .setForegroundColor('#cc0000');
  body.appendParagraph('');
  if (brief.client_research) {
    addHeading(body, 'Client Research', DocumentApp.ParagraphHeading.HEADING2);
    if (brief.client_research.pages_analyzed?.length > 0) {
      body.appendParagraph('Pages Analyzed:').setBold(true).setFontSize(11);
      brief.client_research.pages_analyzed.forEach(url => {
        body.appendParagraph(url)
          .setFontFamily('Courier New')
          .setFontSize(9)
          .setBold(false)
          .setForegroundColor('#0066cc')
          .setIndentStart(18);
      });
      body.appendParagraph('');
    }
    if (brief.client_research.key_facts?.length > 0) {
      body.appendParagraph('Key Facts Found:').setBold(true).setFontSize(11);
      brief.client_research.key_facts.forEach(fact => {
        body.appendListItem(fact)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
    if (brief.client_research.products_services?.length > 0) {
      body.appendParagraph('Products & Services:').setBold(true).setFontSize(11);
      brief.client_research.products_services.forEach(item => {
        body.appendListItem(item)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
    if (brief.client_research.competitive_advantages?.length > 0) {
      body.appendParagraph('Competitive Advantages:').setBold(true).setFontSize(11);
      brief.client_research.competitive_advantages.forEach(adv => {
        body.appendListItem(adv)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
  }
  if (brief.serp_analysis) {
    addHeading(body, 'SERP Analysis', DocumentApp.ParagraphHeading.HEADING2);
    if (brief.serp_analysis.top_ranking_patterns?.length > 0) {
      body.appendParagraph('Top Ranking Content Patterns:').setBold(true).setFontSize(11);
      brief.serp_analysis.top_ranking_patterns.forEach(pattern => {
        body.appendListItem(pattern)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
    if (brief.serp_analysis.competitive_gaps?.length > 0) {
      body.appendParagraph('Competitive Gaps to Exploit:').setBold(true).setFontSize(11);
      brief.serp_analysis.competitive_gaps.forEach(gap => {
        body.appendListItem(gap)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
    if (brief.serp_analysis.serp_features?.length > 0) {
      body.appendParagraph('SERP Features Present:').setBold(true).setFontSize(11);
      brief.serp_analysis.serp_features.forEach(feature => {
        body.appendListItem(feature)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
  }
  if (!brief.faq_analysis.include_faq) {
    addHeading(body, 'FAQ Analysis (Not Included)', DocumentApp.ParagraphHeading.HEADING2);
    const faqItems = [
      `Competitors have FAQ: ${brief.faq_analysis.competitors_have_faq ? 'Yes' : 'No'}`,
      `PAA boxes present: ${brief.faq_analysis.paa_boxes_present ? 'Yes' : 'No'}`,
      `Featured snippet opportunity: ${brief.faq_analysis.featured_snippet_opportunity ? 'Yes' : 'No'}`
    ];
    faqItems.forEach(item => {
      body.appendListItem(item)
        .setGlyphType(DocumentApp.GlyphType.BULLET)
        .setBold(false)
        .setFontSize(11);
    });
    body.appendParagraph(`Rationale: ${brief.faq_analysis.rationale}`)
      .setItalic(true)
      .setFontSize(10);
    body.appendParagraph('');
  }
  addHeading(body, 'Internal Links (For Editorial Team)', DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('The following internal links should be added during content editing:')
    .setFontSize(10)
    .setItalic(true);
  body.appendParagraph('');
  brief.internal_links.forEach((link, idx) => {
    body.appendParagraph(`${idx + 1}. Anchor Text: "${link.anchor}"`)
      .setBold(true)
      .setFontSize(11);
    const statusIndicator = link.url_status === '200' ? ' (VERIFIED)' : ' (404 - NOT FOUND)';
    const urlColor = link.url_status === '200' ? '#006600' : '#cc0000';
    body.appendParagraph(`   URL: ${link.url}${statusIndicator}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor(urlColor);
    if (link.alternative_url) {
      const altStatusIndicator = link.alternative_status === '200' ? ' (VERIFIED)' : ' (ISSUE)';
      const altColor = link.alternative_status === '200' ? '#006600' : '#cc6600';
      body.appendParagraph(`   ALTERNATIVE: ${link.alternative_url}${altStatusIndicator}`)
        .setFontFamily('Courier New')
        .setFontSize(9)
        .setBold(false)
        .setForegroundColor(altColor);
    }
    body.appendParagraph(`   Placement: ${link.placement}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Rationale: ${link.rationale}`)
      .setFontSize(10)
      .setBold(false);
    if (link.verification_note) {
      body.appendParagraph(`   NOTE: ${link.verification_note}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#0066cc');
    }
    body.appendParagraph('');
  });
  addHeading(body, 'External Links (For Editorial Team)', DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('The following external links should be added during content editing:')
    .setFontSize(10)
    .setItalic(true);
  body.appendParagraph('');
  brief.external_links.forEach((link, idx) => {
    body.appendParagraph(`${idx + 1}. Anchor Text: "${link.anchor}"`)
      .setBold(true)
      .setFontSize(11);
    const statusIndicator = link.url_status === 'verified' ? ' (VERIFIED)' : ' (BROKEN/INACCESSIBLE)';
    const urlColor = link.url_status === 'verified' ? '#006600' : '#cc0000';
    body.appendParagraph(`   URL: ${link.url}${statusIndicator}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor(urlColor);
    if (link.alternative_url) {
      const altStatusIndicator = link.alternative_status === 'verified' ? ' (VERIFIED)' : ' (ISSUE)';
      const altColor = link.alternative_status === 'verified' ? '#006600' : '#cc6600';
      body.appendParagraph(`   ALTERNATIVE: ${link.alternative_url}${altStatusIndicator}`)
        .setFontFamily('Courier New')
        .setFontSize(9)
        .setBold(false)
        .setForegroundColor(altColor);
    }
    body.appendParagraph(`   Placement: ${link.placement}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Domain Authority: ${link.domain_authority || 'Not specified'}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Rationale: ${link.rationale}`)
      .setFontSize(10)
      .setBold(false);
    if (link.verification_note) {
      body.appendParagraph(`   NOTE: ${link.verification_note}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#0066cc');
    }
    body.appendParagraph('');
  });
  addHeading(body, 'Target Keywords Reference', DocumentApp.ParagraphHeading.HEADING2);
  const keywordItems = [
    `Primary Keyword: ${strategy.primary_keyword}`,
    `Secondary Keyword: ${strategy.secondary_keyword}`,
    strategy.longtail_keywords.length > 0 ? `Long-tail Keywords: ${strategy.longtail_keywords.join(', ')}` : null,
    `Location: ${strategy.location || 'Not specified'}`,
    `Page Type: ${strategy.page_type}`,
    `Intent: ${strategy.intent}`,
    `URL: ${strategy.client_url} (${strategy.is_existing ? 'existing page' : 'new page'})`
  ].filter(Boolean);
  keywordItems.forEach(item => {
    body.appendListItem(item)
      .setGlyphType(DocumentApp.GlyphType.BULLET)
      .setBold(false)
      .setFontSize(11);
  });
  body.appendParagraph('');
  body.appendHorizontalRule();
  body.appendParagraph('Notes for AI Content Machine:').setBold(true);
  body.appendParagraph('This brief is optimized for AI content generation. Follow all instructions precisely.');
  body.appendParagraph('Do NOT include internal links, external links, meta data, or SERP analysis in the generated content.');
  body.appendParagraph('Those elements are handled by the editorial team after content generation.');
  doc.saveAndClose();
  return doc.getUrl();
}

function addHeading(body, text, level) {
  body.appendParagraph(text).setHeading(level);
}

function addBullet(body, text) {
  body.appendListItem(text).setGlyphType(DocumentApp.GlyphType.BULLET);
}

function createTimeTrigger() {
  ScriptApp.newTrigger('runBriefGeneration')
    .timeBased()
    .everyMinutes(10)
    .create();
  SpreadsheetApp.getUi().alert('Auto-run trigger created (every 10 minutes)');
}

function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  try {
    SpreadsheetApp.getUi().alert(`Deleted ${triggers.length} trigger(s)`);
  } catch (e) {
    Logger.log(`Deleted ${triggers.length} triggers (no UI)`);
  }
}

function deleteGenerationTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'asyncRunBriefGeneration') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function asyncRunBriefGeneration() {
  const userProps = PropertiesService.getUserProperties();
  const folderId = userProps.getProperty('PENDING_FOLDER_ID');
  const workbookUrl = userProps.getProperty('PENDING_WORKBOOK_URL');
  const clientId = userProps.getProperty('PENDING_CLIENT_ID');
  deleteGenerationTrigger();
  runBriefGeneration(folderId, workbookUrl, clientId);
}

function notifyDashboardStatus(rowObj, briefUrl, briefData = null) {
  try {
    const props = PropertiesService.getScriptProperties();
    const baseUrl = props.getProperty('DASHBOARD_URL');
    const secret = props.getProperty('GAS_CALLBACK_SECRET');
    if (baseUrl && secret) {
      const payload = {
        id: (rowObj.id && rowObj.id !== '') ? rowObj.id : null,
        client_id: (rowObj.client_id && rowObj.client_id !== '') ? rowObj.client_id : null,
        primary_keyword: rowObj.primary_keyword,
        status: rowObj.status || 'DONE',
        brief_url: briefUrl || rowObj.brief_url || '',
        brief_data: briefData,
        run_id: rowObj.run_id,
        notes: rowObj.notes,
        secret: secret
      };
      if (payload.id || (payload.client_id && payload.primary_keyword)) {
        UrlFetchApp.fetch(`${baseUrl}/api/content-briefs/callback`, {
          method: 'POST',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
      }
    }
  } catch (e) {
    debugLog('CALLBACK_UNHANDLED_ERROR', e.toString());
  }
  syncToSupabaseDirect(rowObj, briefUrl, briefData);
}

function syncToSupabaseDirect(rowObj, briefUrl, briefData = null) {
  debugLog('SUPABASE_SYNC_START', rowObj);
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_URL');
  const supabaseKey = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    debugLog('SUPABASE_DIRECT_SKIP', 'SUPABASE_URL/KEY not set.');
    return;
  }
  if (!rowObj.id) {
    debugLog('SUPABASE_DIRECT_MISSING_ID', 'row id missing from row object');
    if (!rowObj.client_id || !rowObj.primary_keyword) {
      debugLog('SUPABASE_DIRECT_ABORT', 'Cannot sync: Missing id and fallback identifiers');
      return;
    }
  }
  const payload = {
    id: (rowObj.id && rowObj.id !== '') ? rowObj.id : null,
    client_id: (rowObj.client_id && rowObj.client_id !== '') ? rowObj.client_id : null,
    primary_keyword: rowObj.primary_keyword,
    status: rowObj.status || 'DONE',
    brief_url: briefUrl || rowObj.brief_url || '',
    brief_data: briefData,
    run_id: rowObj.run_id,
    notes: (rowObj.notes || '').toString().substring(0, 1000),
    updated_at: new Date().toISOString()
  };
  const url = `${supabaseUrl}/rest/v1/workbook_rows?on_conflict=id`;
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: { 
        'apikey': supabaseKey, 
        'Authorization': `Bearer ${supabaseKey}`, 
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' 
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      debugLog('SUPABASE_DIRECT_SUCCESS', `Synced ID: ${rowObj.id} (${rowObj.primary_keyword})`);
    } else {
      debugLog('SUPABASE_DIRECT_FAIL', `Code ${code}: ${response.getContentText()}`);
    }
  } catch (e) {
    debugLog('SUPABASE_DIRECT_ERROR', e.toString());
  }
}

function setAnthropicKey(apiKey) {
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', apiKey);
  Logger.log('Anthropic API key saved');
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const command = params.command || 'runBriefGeneration';
    const workbookUrl = params.workbookUrl;
    let result;
    if (command === 'getWorkbookData') {
      result = getWorkbookData(workbookUrl);
    } else if (command === 'appendToClient') {
      result = appendToWorkbook(workbookUrl, params.formData);
    } else {
      const userProps = PropertiesService.getUserProperties();
      userProps.setProperty('PENDING_FOLDER_ID', params.folderId || '');
      userProps.setProperty('PENDING_WORKBOOK_URL', workbookUrl || '');
      userProps.setProperty('PENDING_CLIENT_ID', params.clientId || '');
      ScriptApp.newTrigger('asyncRunBriefGeneration')
        .timeBased()
        .after(1000)
        .create();
      result = { status: "triggered", message: "Automation started in background" };
    }
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "result": result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getWorkbookData(workbookUrl) {
  const ss = openWorkbook(workbookUrl);
  let sheet = null;
  
  if (workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
  }

  if (!sheet) {
    try {
      sheet = discoverDataSheet(ss);
    } catch (e) {
      return { status: "error", message: e.message, rows: [] };
    }
  }
  const data = sheet.getDataRange().getValues();
  const headerMap = getHeaderMap(sheet);
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = rowToObject(data[i], headerMap);
    if (rowObj.primary_keyword) rows.push(rowObj);
  }
  debugLog('DATASYNC_SUCCESS', { count: rows.length, sheet: sheet.getName() });
  return { count: rows.length, sheet: sheet.getName(), rows: rows };
}

function appendToWorkbook(workbookUrl, formData) {
  try {
    const ss = openWorkbook(workbookUrl);
    
    let sheet = getSheetFromUrl(ss, workbookUrl);
    if (!sheet) {
      sheet = ss.getSheetByName(CONFIG.DEFAULT_SHEET_NAME) || ss.getSheets()[0];
    }
    ensureRequiredColumns(sheet);
    const headerMap = getHeaderMap(sheet);
    const newRow = new Array(Object.keys(headerMap).length).fill('');
    Object.keys(headerMap).forEach(header => {
      const value = formData[header] || 
                    formData[header.replace(/\s+/g, '_').toLowerCase()] ||
                    formData[header.replace(/_/g, ' ')];
      if (value !== undefined) {
        newRow[headerMap[header].index] = value;
      }
    });
    if (headerMap['status']) {
      newRow[headerMap['status'].index] = formData.status || 'NEW';
    }
    sheet.appendRow(newRow);
    debugLog('APPEND_SUCCESS', { workbook: ss.getName(), sheet: sheet.getName() });
    return { status: "success", message: `Appended row to ${ss.getName()}` };
  } catch (e) {
    debugLog('APPEND_ERROR', e);
    return { status: "error", message: e.toString() };
  }
}