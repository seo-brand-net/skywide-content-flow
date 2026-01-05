/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Creates simplified, high-performance content briefs for AI content generation
 * Optimized for both traditional SEO and LLM optimization
 * 
 * Author: Mike (SEO & LLM Optimization Expert)
 * Version: 1.2.3
 * Last Updated: 2024-12-19
 * 
 * CHANGELOG v1.2.3:
 * - Added multi-turn conversation support for tool use
 * - Handles pause_turn stop reason automatically
 * - Continues conversation until brief is generated
 * 
 * CHANGELOG v1.2.2:
 * - Improved rate limiting with intelligent token-based delays
 * - Automatic calculation of optimal delays based on API tier limits
 * - Better handling of batch processing without hitting rate limits
 * 
 * CHANGELOG v1.2.1:
 * - Enhanced error diagnostics for "No text content" errors
 * - Better detection of max_tokens and incomplete responses
 * 
 * CHANGELOG v1.2.0:
 * - Improved JSON parsing with regex extraction
 * - More reliable handling of Claude responses with preambles
 * - Better error messages for parsing failures
 * 
 * CHANGELOG v1.1.0:
 * - Added pre-flight web_search availability check
 * - Prevents wasted API credits on requests that will fail
 * - Provides immediate feedback when web_search is unavailable
 */

/***** CONFIGURATION *****/
const CONFIG = {
  // Claude API Settings
  CLAUDE_MODEL: "claude-sonnet-4-20250514",
  CLAUDE_MAX_TOKENS: 24000,
  
  // Processing Settings
  MAX_ROWS_PER_RUN: 1,
  SHEET_NAME: SpreadsheetApp.getActiveSheet().getName(),
  
  // Google Drive folder for output docs (paste folder ID or URL)
  DOCS_FOLDER_ID: "1nk3KsqlCv5-ndsayI-K1EC8aJXqvoAVQ",
  
  // Link Settings
  MIN_INTERNAL_LINKS: 3,
  MAX_INTERNAL_LINKS: 8,
  MAX_EXTERNAL_LINKS: 4,
  
  // Feature Flags
  USE_WEB_SEARCH: true,
  VERIFY_EXTERNAL_LINKS: true,
  DEEP_SERP_ANALYSIS: true,
  
  // Debug
  DEBUG: true,
  
  // Anthropic API Tier Limits (Free/Tier 1 defaults)
  API_LIMITS: {
    RPM: 5,        // Requests Per Minute
    TPM: 40000,    // Tokens Per Minute
    RPD: 1000      // Requests Per Day
  }
};

/***** PAGE TYPE CONFIGURATIONS *****/
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

/***** SYSTEM PROMPT FOR CLAUDE *****/
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

SERP ANALYSIS:
- Analyze top 7 ranking pages for target keyword
- Extract word count range (P25-P75, rounded to nearest 50)
- Identify content patterns and topics they cover
- Note competitive gaps we can exploit
- Look for SERP features: Featured Snippets, PAA, Images, Videos

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

// *** UTILITY FUNCTIONS *****/
function debugLog(label, data) {
  if (!CONFIG.DEBUG) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const logMsg = `[${timestamp}] [${label}] ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  Logger.log(logMsg);
}

/**
 * Robust fetcher with retry for connectivity issues
 */
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

/**
 * Safely shows an alert if UI is available, otherwise logs/throws for headless contexts
 */
function safeAlert(message, title = 'Notification') {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    debugLog('HEADLESS_ALERT', `${title}: ${message}`);
    // If it's a critical error (no rows found or web search missing), 
    // throwing allows the Web App to signal failure to the dashboard.
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


/**
 * Calculates optimal delay between API requests to stay under rate limits
 * Based on Tier 4 limits: 30k tokens/minute
 * Returns delay in milliseconds
 */
function calculateOptimalDelay() {
  const RATE_LIMIT_CONFIG = {
    TOKENS_PER_MINUTE: 30000,        // Tier 4 limit
    ESTIMATED_INPUT_TOKENS: 8000,    // Conservative estimate for prompt + context
    ESTIMATED_OUTPUT_TOKENS: 6000,   // Conservative estimate for brief JSON
    SAFETY_MARGIN: 0.8               // Use only 80% of limit for safety
  };
  
  // Calculate total tokens per request
  const totalTokensPerRequest = RATE_LIMIT_CONFIG.ESTIMATED_INPUT_TOKENS + 
                                 RATE_LIMIT_CONFIG.ESTIMATED_OUTPUT_TOKENS;
  
  // Calculate safe tokens per minute
  const safeTokensPerMinute = RATE_LIMIT_CONFIG.TOKENS_PER_MINUTE * 
                               RATE_LIMIT_CONFIG.SAFETY_MARGIN;
  
  // Calculate seconds to wait between requests
  const secondsPerRequest = (60 / safeTokensPerMinute) * totalTokensPerRequest;
  
  // Convert to milliseconds and add small buffer
  const delayMs = Math.ceil(secondsPerRequest * 1000);
  
  debugLog('RATE_LIMIT_CALC', {
    tokensPerRequest: totalTokensPerRequest,
    safeTokensPerMinute: safeTokensPerMinute,
    optimalDelaySeconds: secondsPerRequest.toFixed(1),
    delayMs: delayMs
  });
  
  return delayMs;
}

/***** SPREADSHEET SETUP *****/
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
  `)
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Claude API Key');
}

function ensureRequiredColumns(sheet) {
  const lastCol = sheet.getLastColumn();
  debugLog('COLUMN_CHECK_START', { sheetName: sheet.getName(), lastCol: lastCol });
  
  let rawHeaders = [];
  let normalizedHeaders = [];
  
  if (lastCol > 0) {
    rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    normalizedHeaders = rawHeaders.map(h => String(h || '').toLowerCase().trim().replace(/[\s_]+/g, '_'));
  }
  
  const debugInfo = rawHeaders.map((h, i) => `${i}: "${h}" -> "${normalizedHeaders[i]}"`).join(', ');
  debugLog('NORMALIZED_HEADERS_DETAIL', debugInfo);
  
  const requiredHeaders = [
    'url', 'url_type', 'page_type', 'primary_keyword', 
    'secondary_keyword', 'longtail_keywords', 'location', 'intent'
  ];
  
  // Check required headers exist (case-insensitive & flexible spaces)
  requiredHeaders.forEach(header => {
    if (!normalizedHeaders.includes(header)) {
      throw new Error(`Missing required column: ${header}`);
    }
  });
  
  // Add output columns if missing
  const outputHeaders = ['status', 'brief_url', 'run_id', 'notes'];
  const toAdd = outputHeaders.filter(h => !normalizedHeaders.includes(h));
  
  if (toAdd.length > 0) {
    const attachCol = Math.max(1, lastCol);
    sheet.insertColumnsAfter(attachCol, toAdd.length);
    const startCol = attachCol + 1;
    sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  }
}

function getHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {}; // Handle empty sheet gracefully
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
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
    obj[key] = row[headerMap[key].index];
  });
  return obj;
}

/**
 * Global helper to find the sheet containing the 'url' column.
 * Essential for Web App context where getActiveSheet() is unreliable.
 */
function discoverDataSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getActiveSheet();
  
  function hasUrlColumn(sh) {
    if (!sh || sh.getLastColumn() === 0) return false;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(h => String(h || '').toLowerCase().trim().replace(/[\s_]+/g, '_'));
    return headers.includes('url');
  }

  if (hasUrlColumn(sheet)) return sheet;

  debugLog('SHEET_DISCOVERY', `Active sheet "${sheet.getName()}" lacks 'url' column. Searching all...`);
  const target = ss.getSheets().find(sh => hasUrlColumn(sh));
  
  if (!target) {
    throw new Error("Could not find a sheet with the required 'url' column in this workbook.");
  }
  
  return target;
}

/**
 * Finds a specific sheet within a spreadsheet using the 'gid' parameter from a URL.
 */
function getSheetFromUrl(ss, url) {
  if (!url) return null;
  const gidMatch = url.match(/[?#]gid=([0-9]+)/);
  if (gidMatch) {
    const gid = parseInt(gidMatch[1]);
    return ss.getSheets().find(s => s.getSheetId() === gid) || null;
  }
  return null;
}

/***** MAIN EXECUTION *****/
function runBriefGeneration(overrideFolderId, workbookUrl) {
  // === TRIGGER STATE HANDLING ===
  // If no arguments, check if we were called by a background trigger
  if (!overrideFolderId && !workbookUrl) {
    const props = PropertiesService.getScriptProperties();
    overrideFolderId = props.getProperty('BG_RUN_FOLDER_ID');
    workbookUrl = props.getProperty('BG_RUN_WORKBOOK_URL');
    
    // Cleanup temporary state
    props.deleteProperty('BG_RUN_FOLDER_ID');
    props.deleteProperty('BG_RUN_WORKBOOK_URL');
    
    // Cleanup the trigger itself to keep list clean
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'runBriefGeneration') {
        ScriptApp.deleteTrigger(t);
      }
    });
    
    debugLog('ASYNC_RUN_START', { folder: overrideFolderId, workbook: workbookUrl });
  }

  const ss = SpreadsheetApp.getActive();
  let sheet = null;
  
  // 1. Precise GID Discovery (Highest Priority)
  if (workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
    if (sheet) debugLog('TARGET_SHEET', `Found by GID: "${sheet.getName()}"`);
  }
  
  // 2. Global Robust Discovery (Fallback)
  if (!sheet) {
    try {
      sheet = discoverDataSheet();
      debugLog('TARGET_SHEET', `Found by discovery: "${sheet.getName()}"`);
    } catch (e) {
      throw e;
    }
  }

  debugLog('TARGET_SHEET_FINAL', { name: sheet.getName(), lastCol: sheet.getLastColumn() });
  
  // Ensure all other columns exist
  ensureRequiredColumns(sheet);
  
  
  const headers = getHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  const statusCol = headers['status']?.index;
  const runIdCol = headers['run_id']?.index;
  
  if (statusCol === undefined || runIdCol === undefined) {
    throw new Error('Missing required columns: status or run_id');
  }
  
  // Find rows to process
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
  
  // Mark as in progress
  targets.forEach(r => {
    sheet.getRange(r + 1, statusCol + 1).setValue('IN_PROGRESS');
    sheet.getRange(r + 1, runIdCol + 1).setValue(runId);
  });
  
  // Process each row
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

      // === CROSS-POSTING (Dual-Workbook Sync) ===
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

      // === SUPABASE PERSISTENCY (Dashboard Sync) ===
      updateSupabaseRow(rowObj, docUrl);
      
    } catch (e) {
      debugLog('ERROR', e);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('ERROR');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue(
        String(e.message || e).substring(0, 1000)
      );
    }
    
    // No additional delay needed between rows - calculateOptimalDelay() handles it
  });
  
  safeAlert(
    `Processed ${targets.length} row(s)\n\nCheck the 'status' and 'brief_url' columns for results.`,
    'Batch Complete'
  );
}

/***** STRATEGY BUILDER *****/
function buildStrategy(row) {
  const clientDomain = extractDomain(row.url);
  const urlType = String(row.url_type || '').toLowerCase().trim();
  const pageType = String(row.page_type || 'blog page').toLowerCase().trim();
  
  // Validate page type
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
    
    // Keywords
    primary_keyword: String(row.primary_keyword || '').trim(),
    secondary_keyword: String(row.secondary_keyword || '').trim(),
    longtail_keywords: normalizeList(row.longtail_keywords),
    
    // Context
    location: String(row.location || '').trim(),
    intent: String(row.intent || 'informational').toLowerCase().trim()
  };
}

/***** CLAUDE API CALL *****/
function generateBriefWithClaude(strategy, retryCount = 0) {
  const MAX_RETRIES = 3;
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  
  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY in Script Properties. ' +
      'Go to Project Settings > Script Properties and add your Claude API key.'
    );
  }
  
  // Build the system prompt with domain replacement
  const systemPrompt = SYSTEM_PROMPT.replace(/CLIENT_DOMAIN/g, strategy.client_domain);
  
  // Build the user message
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

  // Prepare the API request
  const requestBody = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [] // Will be populated in the loop
  };
  
  // Add tools if web search is enabled
  if (CONFIG.USE_WEB_SEARCH) {
    requestBody.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search'
      }
    ];
  }
  
  debugLog('CLAUDE REQUEST', { model: CONFIG.CLAUDE_MODEL, has_tools: !!requestBody.tools, retry: retryCount });
  
  // Add intelligent delay to avoid rate limits
  if (retryCount === 0) {
    const optimalDelay = calculateOptimalDelay();
    debugLog('RATE_LIMIT_DELAY', `Waiting ${(optimalDelay / 1000).toFixed(1)}s before API call`);
    Utilities.sleep(optimalDelay);
  } else {
    // On retries after rate limit hit, use exponential backoff
    const retryDelay = Math.pow(2, retryCount - 1) * 30000; // 30s, 60s, 120s
    debugLog('RETRY_DELAY', `Retry ${retryCount}: waiting ${retryDelay / 1000}s`);
    Utilities.sleep(retryDelay);
  }
  
  try {
    // Multi-turn conversation loop to handle tool use
    let conversationMessages = [
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    let briefText = '';
    let maxTurns = 5;  // Prevent infinite loops
    let currentTurn = 0;
    
    while (currentTurn < maxTurns) {
      currentTurn++;
      debugLog('CONVERSATION_TURN', `Turn ${currentTurn}/${maxTurns}`);
      
      // Update request body with current conversation
      requestBody.messages = conversationMessages;
      
      // Audit conversation for protocol compliance
      const auditLog = conversationMessages.map((m, idx) => {
        const types = Array.isArray(m.content) ? m.content.map(b => b.type).join(',') : 'string';
        return `[${idx}] ${m.role}: ${types}`;
      }).join(' | ');
      debugLog('CONVERSATION_AUDIT', auditLog);
      
      // Make the API call
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
      
      // Handle rate limiting (429)
      if (statusCode === 429) {
        if (retryCount < MAX_RETRIES) {
          const waitTime = Math.pow(2, retryCount) * 30;
          debugLog('RATE LIMIT HIT', `Waiting ${waitTime} seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
          Logger.log(`Rate limit hit. Waiting ${waitTime} seconds before retry...`);
          Utilities.sleep(waitTime * 1000);
          return generateBriefWithClaude(strategy, retryCount + 1);
        } else {
          throw new Error(
            `Rate limit exceeded after ${MAX_RETRIES} retries. ` +
            'Please wait a few minutes and try again, or upgrade your Anthropic API tier for higher limits.'
          );
        }
      }

      if (statusCode !== 200) {
        debugLog('CLAUDE_ERROR_BODY', responseText);
        
        // STABILIZATION: Selective retry on 400 protocol glitches
        if (statusCode === 400 && responseText.includes('invalid_request_error') && retryCount < MAX_RETRIES) {
          debugLog('STABILIZATION_RETRY', 'Caught 400 protocol error. Retrying with fresh state...');
          Utilities.sleep(5000); 
          return generateBriefWithClaude(strategy, retryCount + 1);
        }
        
        throw new Error(`Claude API error ${statusCode}: ${responseText}`);
      }
      
      const responseData = JSON.parse(responseText);
      
      debugLog('RESPONSE_STOP_REASON', responseData.stop_reason);
      debugLog('RESPONSE_CONTENT_TYPES', responseData.content?.map(b => b.type).join(', '));
      
      // Add Claude's response to conversation
      let assistantContent = responseData.content;
      
      // ===== WEB SEARCH BETA SAFETY: STRIP TEXT IF TOOLS USED =====
      // To comply with the beta protocol and prevent Error 400, assistant messages 
      // containing web_search tool calls must follow specific block rules in multi-turn.
      const hasWebSearch = assistantContent.some(block => block.type === 'tool_use' && block.name === 'web_search');
      if (hasWebSearch) {
        // If there are tool uses, the assistant message should ideally only contain those tool uses
        // to avoid protocol conflicts between experimental and standard content blocks.
        assistantContent = assistantContent.filter(block => block.type === 'tool_use');
      }
      
      conversationMessages.push({
        role: 'assistant',
        content: assistantContent
      });
      
      // Handle Tool Use (Multi-turn Research)
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
        
        // STABILIZATION: Inter-turn research delay
        debugLog('STABILIZATION', 'Turn complete. Pacing 2s before next turn...');
        Utilities.sleep(2000);
        
        continue; // Proceed to next turn with the results
      }
      
      // Check if Claude finished with text content
      const textBlocks = assistantContent.filter(block => block.type === 'text');
      if (textBlocks.length > 0) {
        briefText = textBlocks.map(block => block.text).join('\n');
        debugLog('TEXT_CONTENT_FOUND', `Found ${briefText.length} chars of text`);
        break;  // We got the brief, exit loop
      }
      
      // If stop_reason is 'pause_turn', continue the conversation
      if (responseData.stop_reason === 'pause_turn') {
        debugLog('PAUSE_TURN_DETECTED', 'Continuing conversation...');
        
        // Add a user message to continue
        conversationMessages.push({
          role: 'user',
          content: 'Please continue and provide the complete JSON brief now.'
        });
        
        // Continue to next turn
        continue;
      }
      
      // If stop_reason is 'end_turn' but no text, something's wrong
      if (responseData.stop_reason === 'end_turn') {
        debugLog('END_TURN_NO_TEXT', 'Claude ended turn but provided no text content');
        break;
      }
      
      // If stop_reason is 'max_tokens', we ran out of space
      if (responseData.stop_reason === 'max_tokens') {
        throw new Error(
          'Claude response was cut off due to max_tokens limit. ' +
          'Try increasing CLAUDE_MAX_TOKENS in CONFIG or simplifying the request.'
        );
      }
      
      // Any other stop reason
      debugLog('UNEXPECTED_STOP_REASON', responseData.stop_reason);
      break;
    }
    
    // After loop, check if we got text
    if (!briefText) {
      // Enhanced diagnostics
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
    
    // Parse the JSON from the response (using robust parser)
    const brief = parseClaudeResponse(briefText);
    
    // Validate the brief
    validateBrief(brief, strategy);
    
    return brief;
    
  } catch (error) {
    // If it's a rate limit error in the catch and we haven't exceeded retries, retry
    if (error.message && error.message.includes('rate_limit') && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 30;
      debugLog('RATE LIMIT ERROR', `Waiting ${waitTime} seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
      Logger.log(`Rate limit error. Waiting ${waitTime} seconds before retry...`);
      Utilities.sleep(waitTime * 1000);
      return generateBriefWithClaude(strategy, retryCount + 1);
    }
    
    // Otherwise, throw the error
    throw error;
  }
}

/***** RESPONSE PARSING - IMPROVED VERSION *****/
function parseClaudeResponse(text) {
  let cleaned = text.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
  }
  
  // ===== NEW APPROACH: Extract JSON object directly using regex =====
  // This is more reliable than trying to detect and remove preambles
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
  
  // ===== ATTEMPT 1: Parse as-is =====
  try {
    const parsed = JSON.parse(jsonStr);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed on first attempt');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_1_FAILED', e.message);
  }
  
  // ===== ATTEMPT 2: Clean common JSON issues =====
  let cleanedJson = jsonStr
    .replace(/\/\/.*$/gm, '')                    // Remove // comments
    .replace(/\/\*[\s\S]*?\*\//g, '')           // Remove /* */ comments
    .replace(/,(\s*[}\]])/g, '$1')              // Remove trailing commas
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');  // Quote unquoted keys
  
  try {
    const parsed = JSON.parse(cleanedJson);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after cleaning (attempt 2)');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_2_FAILED', e.message);
  }
  
  // ===== ATTEMPT 3: Fix quote inconsistencies (CAREFUL) =====
  // Only fix property values with single quotes, not apostrophes in content
  let quoteFix = cleanedJson.replace(/:\s*'([^']*?)'/g, ': "$1"');
  
  try {
    const parsed = JSON.parse(quoteFix);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after quote fixing (attempt 3)');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_3_FAILED', e.message);
  }
  
  // ===== ALL ATTEMPTS FAILED =====
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

/***** VALIDATION *****/
function validateBrief(brief, strategy) {
  const required = [
    'h1', 'title', 'meta_title', 'meta_description',
    'word_count_range', 'outline', 'keyword_strategy', 'internal_links', 'external_links', 
    'faq_analysis', 'client_research'
  ];
  
  required.forEach(field => {
    if (!brief[field]) {
      throw new Error(`Missing required field in brief: ${field}`);
    }
  });
  
  // Validate client_research
  if (!brief.client_research.pages_analyzed || brief.client_research.pages_analyzed.length === 0) {
    throw new Error(
      'CRITICAL: No client pages were analyzed. This likely means web_search tool was unavailable. ' +
      'Brief cannot be generated without web research. Please try again in a few minutes.'
    );
  }
  
  // Check if the brief mentions web_search being unavailable
  const briefString = JSON.stringify(brief).toLowerCase();
  if (briefString.includes('web_search') && briefString.includes('unavailable')) {
    throw new Error(
      'CRITICAL: web_search tool was unavailable during generation. ' +
      'Brief cannot be generated without web research. Please try again in a few minutes.'
    );
  }
  
  // Validate outline has H1 and AFP guidance
  const h1Section = brief.outline.find(section => section.level === 1);
  const afpSection = brief.outline.find(section => section.is_afp_guidance);
  
  if (!h1Section) {
    Logger.log('WARNING: No H1 found in outline');
  }
  
  if (!afpSection) {
    Logger.log('WARNING: No AFP guidance found in outline');
  }
  
  // Validate H1 includes primary keyword
  const h1Lower = brief.h1.toLowerCase();
  const primaryLower = strategy.primary_keyword.toLowerCase();
  if (!h1Lower.includes(primaryLower)) {
    Logger.log(`WARNING: H1 "${brief.h1}" doesn't include primary keyword "${strategy.primary_keyword}"`);
  }
  
  // Validate FAQ analysis
  if (brief.faq_analysis.include_faq === undefined) {
    throw new Error('Missing faq_analysis.include_faq boolean');
  }
  
  // If FAQ is included in outline, validate question count
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
  
  // Validate internal links count
  const internalCount = brief.internal_links?.length || 0;
  if (internalCount < CONFIG.MIN_INTERNAL_LINKS) {
    throw new Error(
      `Not enough internal links: ${internalCount}. Minimum required: ${CONFIG.MIN_INTERNAL_LINKS}`
    );
  }
  if (internalCount > CONFIG.MAX_INTERNAL_LINKS) {
    brief.internal_links = brief.internal_links.slice(0, CONFIG.MAX_INTERNAL_LINKS);
  }
  
  // Validate external links count
  if (brief.external_links?.length > CONFIG.MAX_EXTERNAL_LINKS) {
    brief.external_links = brief.external_links.slice(0, CONFIG.MAX_EXTERNAL_LINKS);
  }
  
  // Trim meta fields if needed
  if (brief.meta_title.length > 60) {
    brief.meta_title = brief.meta_title.substring(0, 60);
  }
  if (brief.meta_description.length > 160) {
    brief.meta_description = brief.meta_description.substring(0, 160);
  }
  
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

/***** GOOGLE DOC RENDERING *****/
function renderBriefToGoogleDoc(brief, strategy, overrideFolderId) {
  const docName = `Brief - ${brief.title} - ${new Date().toISOString().slice(0, 10)}`;
  const doc = DocumentApp.create(docName);
  
  // Prioritize folderId: 1. Passed from Dashboard, 2. Global Config, 3. Root
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
  
  // Add title
  addHeading(body, brief.title, DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('');
  
  // === SECTION 1: KEYWORD USAGE INSTRUCTIONS ===
  addHeading(body, 'Keyword Usage Instructions', DocumentApp.ParagraphHeading.HEADING1);
  
  body.appendParagraph('Usage Requirements:').setBold(true).setFontSize(11);
  body.appendParagraph('');
  
  // Add bullets without bold
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
  
  // === SECTION 2: CONTENT OUTLINE ===
  addHeading(body, 'Content Outline', DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Target Word Count: ${brief.word_count_range}`).setItalic(true);
  body.appendParagraph('');
  
  // Show FAQ analysis if FAQ is included
  if (brief.faq_analysis.include_faq) {
    body.appendParagraph('Note: FAQ section is included in this outline based on competitor analysis and SERP features.')
      .setItalic(true)
      .setFontSize(10)
      .setForegroundColor('#666666');
    body.appendParagraph('');
  }
  
  brief.outline.forEach((section, idx) => {
    // Handle H1
    if (section.level === 1) {
      body.appendParagraph(`H1: ${brief.h1}`)
        .setBold(true)
        .setFontSize(13);
      body.appendParagraph('');
      return;
    }
    
    // Handle AFP Guidance
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
    
    // Handle regular sections
    const headingMarker = section.level === 2 ? 'H2' : 'H3';
    
    // Section heading - bold but clean
    if (section.is_faq_section) {
      body.appendParagraph(`${headingMarker}: ${section.heading}`)
        .setBold(true)
        .setFontSize(12);
    } else {
      body.appendParagraph(`${headingMarker}: ${section.heading}`)
        .setBold(true)
        .setFontSize(12);
    }
    
    // Word count estimate - gray, italic, smaller
    if (section.word_count_estimate) {
      body.appendParagraph(`Target: ${section.word_count_estimate}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#666666');
    }
    
    // Guidance - normal text
    body.appendParagraph(section.guidance)
      .setFontSize(11)
      .setBold(false);
    
    // Keywords - gray, small, italic
    if (section.keywords_to_include?.length > 0) {
      body.appendParagraph(`Keywords to include: ${section.keywords_to_include.join(', ')}`)
        .setFontSize(9)
        .setForegroundColor('#666666')
        .setItalic(true);
    }
    
    // If this is FAQ section, show the questions
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
  
  // === SECTION 3: STYLE GUIDELINES ===
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
  
  // === SEPARATOR FOR STRATEGIST SECTION ===
  body.appendHorizontalRule();
  body.appendParagraph('');
  
  // Make strategist header very prominent
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
  
  // === CLIENT RESEARCH (Strategist) ===
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
  
  // === SERP ANALYSIS (Strategist) ===
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
  
  // === FAQ ANALYSIS (Strategist - only if NOT included) ===
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
  
  // === INTERNAL LINKS (Strategist) ===
  addHeading(body, 'Internal Links (For Editorial Team)', DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('The following internal links should be added during content editing:')
    .setFontSize(10)
    .setItalic(true);
  body.appendParagraph('');
  
  brief.internal_links.forEach((link, idx) => {
    // Anchor text - bold
    body.appendParagraph(`${idx + 1}. Anchor Text: "${link.anchor}"`)
      .setBold(true)
      .setFontSize(11);
    
    // Show original URL with status - color coded
    const statusIndicator = link.url_status === '200' ? ' (VERIFIED)' : ' (404 - NOT FOUND)';
    const urlColor = link.url_status === '200' ? '#006600' : '#cc0000';
    body.appendParagraph(`   URL: ${link.url}${statusIndicator}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor(urlColor);
    
    // Show alternative if exists
    if (link.alternative_url) {
      const altStatusIndicator = link.alternative_status === '200' ? ' (VERIFIED)' : ' (ISSUE)';
      const altColor = link.alternative_status === '200' ? '#006600' : '#cc6600';
      body.appendParagraph(`   ALTERNATIVE: ${link.alternative_url}${altStatusIndicator}`)
        .setFontFamily('Courier New')
        .setFontSize(9)
        .setBold(false)
        .setForegroundColor(altColor);
    }
    
    // Placement and rationale - normal text
    body.appendParagraph(`   Placement: ${link.placement}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Rationale: ${link.rationale}`)
      .setFontSize(10)
      .setBold(false);
    
    // Show verification note if exists
    if (link.verification_note) {
      body.appendParagraph(`   NOTE: ${link.verification_note}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#0066cc');
    }
    
    body.appendParagraph('');
  });
  
  // === EXTERNAL LINKS (Strategist) ===
  addHeading(body, 'External Links (For Editorial Team)', DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('The following external links should be added during content editing:')
    .setFontSize(10)
    .setItalic(true);
  body.appendParagraph('');
  
  brief.external_links.forEach((link, idx) => {
    // Anchor text - bold
    body.appendParagraph(`${idx + 1}. Anchor Text: "${link.anchor}"`)
      .setBold(true)
      .setFontSize(11);
    
    // Show original URL with status - color coded
    const statusIndicator = link.url_status === 'verified' ? ' (VERIFIED)' : ' (BROKEN/INACCESSIBLE)';
    const urlColor = link.url_status === 'verified' ? '#006600' : '#cc0000';
    body.appendParagraph(`   URL: ${link.url}${statusIndicator}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor(urlColor);
    
    // Show alternative if exists
    if (link.alternative_url) {
      const altStatusIndicator = link.alternative_status === 'verified' ? ' (VERIFIED)' : ' (ISSUE)';
      const altColor = link.alternative_status === 'verified' ? '#006600' : '#cc6600';
      body.appendParagraph(`   ALTERNATIVE: ${link.alternative_url}${altStatusIndicator}`)
        .setFontFamily('Courier New')
        .setFontSize(9)
        .setBold(false)
        .setForegroundColor(altColor);
    }
    
    // Placement, domain authority, rationale - normal text
    body.appendParagraph(`   Placement: ${link.placement}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Domain Authority: ${link.domain_authority || 'Not specified'}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Rationale: ${link.rationale}`)
      .setFontSize(10)
      .setBold(false);
    
    // Show verification note if exists
    if (link.verification_note) {
      body.appendParagraph(`   NOTE: ${link.verification_note}`)
        .setItalic(true)
        .setFontSize(9)
        .setForegroundColor('#0066cc');
    }
    
    body.appendParagraph('');
  });
  
  // === TARGET KEYWORDS (Strategist) ===
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
  
  // === FOOTER NOTES ===
  body.appendHorizontalRule();
  body.appendParagraph('Notes for AI Content Machine:').setBold(true);
  body.appendParagraph('This brief is optimized for AI content generation. Follow all instructions precisely.');
  body.appendParagraph('Do NOT include internal links, external links, meta data, or SERP analysis in the generated content.');
  body.appendParagraph('Those elements are handled by the editorial team after content generation.');
  
  doc.saveAndClose();
  return doc.getUrl();
}

/***** DOCUMENT FORMATTING HELPERS *****/
function addHeading(body, text, level) {
  body.appendParagraph(text).setHeading(level);
}

function addBullet(body, text) {
  body.appendListItem(text).setGlyphType(DocumentApp.GlyphType.BULLET);
}

/***** TRIGGER MANAGEMENT *****/
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
  
  SpreadsheetApp.getUi().alert(`Deleted ${triggers.length} trigger(s)`);
}

/***** ONE-TIME SETUP *****/
function setAnthropicKey(apiKey) {
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', apiKey);
  Logger.log('Anthropic API key saved');
}

function setSupabaseConfig(url, serviceRoleKey) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SUPABASE_URL', url);
  props.setProperty('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
  Logger.log('Supabase config saved');
}

/***** WEB APP HANDLERS *****/
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
      // Default: Trigger Brief Generation in Background (Async to avoid Vercel Timeouts)
      result = triggerBackgroundRun(params.folderId, workbookUrl);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "result": result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getWorkbookData(workbookUrl) {
  const ss = workbookUrl ? SpreadsheetApp.openByUrl(workbookUrl) : SpreadsheetApp.getActive();
  let sheet = null;
  
  // 1. Precise GID Discovery
  if (workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
  }
  
  // 2. Global Robust Discovery
  if (!sheet) {
    try {
      sheet = discoverDataSheet();
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

/**
 * Appends or updates a row in a specific workbook/sheet
 */
function appendToWorkbook(workbookUrl, formData) {
  try {
    const ss = SpreadsheetApp.openByUrl(workbookUrl);
    
    // Try to targeting specific sheet from URL, or fallback to name, or default
    let sheet = getSheetFromUrl(ss, workbookUrl);
    if (!sheet) {
      sheet = ss.getSheetByName('Content Brief Automation') || ss.getSheets()[0];
    }

    ensureRequiredColumns(sheet);
    const headerMap = getHeaderMap(sheet);
    
    // Check if row already exists (by run_id or URL if applicable)
    // For now, simpler implementation: just append. 
    // In future: findRow(sheet, run_id) if we want to update.

    const newRow = new Array(Object.keys(headerMap).length).fill('');
    Object.keys(headerMap).forEach(header => {
      // Try multiple field names (snake_case, Space Case)
      const value = formData[header] || 
                    formData[header.replace(/\s+/g, '_').toLowerCase()] ||
                    formData[header.replace(/_/g, ' ')];
      
      if (value !== undefined) {
        newRow[headerMap[header].index] = value;
      }
    });

    // Special status override
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

/**
 * Updates a row in the Supabase database
 */
function updateSupabaseRow(rowObj, briefUrl) {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_URL');
  const supabaseKey = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    debugLog('SUPABASE_SYNC_SKIP', 'Missing credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    return;
  }

  const clientId = rowObj.client_id;
  const primaryKeyword = rowObj.primary_keyword;

  if (!clientId || !primaryKeyword) {
    debugLog('SUPABASE_SYNC_SKIP', 'Missing client_id or primary_keyword in row data');
    return;
  }

  const payload = {
    status: 'DONE',
    brief_url: briefUrl,
    run_id: rowObj.run_id,
    notes: rowObj.notes || '',
    updated_at: new Date().toISOString()
  };

  // Match by client_id and primary_keyword
  const url = `${supabaseUrl}/rest/v1/workbook_rows?client_id=eq.${clientId}&primary_keyword=eq.${encodeURIComponent(primaryKeyword)}`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      debugLog('SUPABASE_SYNC_SUCCESS', { keyword: primaryKeyword });
    } else {
      debugLog('SUPABASE_SYNC_ERROR', { code: code, body: response.getContentText() });
    }
  } catch (e) {
    debugLog('SUPABASE_SYNC_EXCEPTION', e.toString());
  }
}

/**
 * Schedules runBriefGeneration to run in the background
 * Returns immediately to caller (Next.js Proxy)
 */
function triggerBackgroundRun(folderId, workbookUrl) {
  try {
    const props = PropertiesService.getScriptProperties();
    
    // Store params for the triggered instance
    if (folderId) props.setProperty('BG_RUN_FOLDER_ID', folderId);
    if (workbookUrl) props.setProperty('BG_RUN_WORKBOOK_URL', workbookUrl);
    
    // Create one-time trigger for 5 seconds from now
    ScriptApp.newTrigger('runBriefGeneration')
      .timeBased()
      .after(5000)
      .create();
      
    debugLog('ASYNC_TRIGGERED', { workbook: workbookUrl });
    return { status: "success", message: "Background research engine triggered successfully" };
  } catch (e) {
    debugLog('TRIGGER_ERROR', e);
    return { status: "error", message: "Failed to schedule background task: " + e.toString() };
  }
}

/**
 * Calculates optimal delay between API calls based on tier limits
 * Prevents 429 errors during batch processing.
 */
function calculateOptimalDelay() {
  const rpm = CONFIG.API_LIMITS.RPM;
  const tpm = CONFIG.API_LIMITS.TPM;
  
  // Calculate delay based on RPM (Requests Per Minute)
  // 60,000ms / RPM = ms per request
  const delayByRpm = (60000 / rpm) + 1000; // Add 1s buffer
  
  // For Tier 1/Free, TPM is usually the bottleneck for long briefs
  // If we assume a brief + strategy is ~10-15k tokens (including research)
  // we can only do ~2-3 per minute.
  const estimatedTokensPerRun = 15000; 
  const delayByTpm = (60000 / (tpm / estimatedTokensPerRun)) + 2000;
  
  const finalDelay = Math.max(delayByRpm, delayByTpm);
  
  debugLog('CALCULATE_DELAY', { rpm_delay: delayByRpm, tpm_delay: delayByTpm, chosen: finalDelay });
  return finalDelay;
}
