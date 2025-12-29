/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Creates simplified, high-performance content briefs for AI content generation
 * Optimized for both traditional SEO and LLM optimization
 * 
 * Author: Mike (SEO & LLM Optimization Expert)
 * Version: 1.0.0
 * Last Updated: 2024-12-10
 */

/***** CONFIGURATION *****/
const CONFIG = {
  // Claude API Settings
  CLAUDE_MODEL: "claude-sonnet-4-20250514",
  CLAUDE_MAX_TOKENS: 24000,
  
  // Processing Settings
  MAX_ROWS_PER_RUN: 1,
  SHEET_NAME: "Content Brief Automation", // Hardcoded default to avoid getActiveSheet() error in Web App
  
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
  DEBUG: true
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

CLIENT_DOMAIN will be replaced with actual domain before sending.`;

/***** UTILITY FUNCTIONS *****/
function debugLog(label, data) {
  if (!CONFIG.DEBUG) return;
  try {
    Logger.log(`[${label}] ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`);
  } catch (e) {
    Logger.log(`[${label}] (logging failed: ${e.message})`);
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

function getSanitizedFolderId(optionalFolderId) {
  const folderIdToSanitize = optionalFolderId || CONFIG.DOCS_FOLDER_ID;
  if (!folderIdToSanitize) return '';
  try {
    if (folderIdToSanitize.includes('/folders/')) {
      const match = folderIdToSanitize.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : '';
    }
    return folderIdToSanitize.split('?')[0];
  } catch (e) {
    return '';
  }
}

/***** SPREADSHEET SETUP *****/
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Content Briefs')
      .addItem('Generate Briefs (Next Batch)', 'runBriefGeneration')
      .addItem('Setup Script Properties', 'showSetupDialog')
      .addSeparator()
      .addItem('Set 10-min Auto-Run', 'createTimeTrigger')
      .addItem('Clear All Triggers', 'deleteAllTriggers')
      .addToUi();
  } catch (e) {
    // Silence UI errors when running as Web App
    debugLog('UI SETUP SKIPPED', 'Likely running in Web App context');
  }
}

/**
 * Entry point for Web App POST requests
 * Expected JSON payload: { "folderId": "string", "clientName": "string" (optional) }
 */
/**
 * Entry point for Web App POST requests
 * Expected JSON payload: { "folderId": "string", "clientName": "string" (optional) }
 */
/**
 * Entry point for Web App POST requests
 * Expected JSON payload: { 
 *   "command": "appendToWorkbook" | "runBriefGeneration",
 *   "folderId": "string",
 *   "workbookUrl": "string" (optional), 
 *   "data": { ...form data... } 
 * }
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const command = params.command || 'runBriefGeneration';
    const folderId = params.folderId;
    const workbookUrl = params.workbookUrl;
    
    debugLog('COMMAND RECEIVED', { command, folderId });

    let result;
    if (command === 'generateDirectly') {
      result = runClientBriefDirectly(folderId, params.data, workbookUrl);
    } else if (command === 'getWorkbookData' && workbookUrl) {
      result = getWorkbookData(workbookUrl);
    } else if (command === 'appendToWorkbook' && workbookUrl) {
      result = appendToWorkbook(workbookUrl, params.data);
      // After successfully appending, trigger generation
      const genResult = runBriefGeneration(folderId, params.data?.clientName, workbookUrl);
      if (result) {
        result.generation = genResult;
      }
    } else {
      result = runBriefGeneration(folderId, params.clientName, workbookUrl);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "command": command,
      "result": result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    debugLog('POST ERROR', error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Mike's Way: Appends a new row to the workbook based on dashboard data
 */
function appendToWorkbook(workbookUrl, formData) {
  if (!workbookUrl) throw new Error('Missing workbookUrl');
  
  const ss = SpreadsheetApp.openByUrl(workbookUrl);
  debugLog('WORKBOOK OPENED', ss.getName());
  
  let sheet = getSheetFromUrl(ss, workbookUrl);
  
  // Create sheet if missing and no GID was found in URL
  if (!sheet) {
    sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      const headers = ['url', 'url_type', 'page_type', 'primary_keyword', 'secondary_keyword', 'longtail_keywords', 'location', 'intent', 'status', 'brief_url', 'run_id', 'notes'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  ensureRequiredColumns(sheet);
  const headerMap = getHeaderMap(sheet);
  const newRow = new Array(sheet.getLastColumn()).fill('');
  
  // Directly map formData keys to spreadsheet headers with flexible matching
  Object.keys(headerMap).forEach(header => {
    const headerKey = header.toLowerCase().trim();
    // Try exact match, then replace spaces with underscores, then underscores with spaces
    const value = formData[headerKey] || 
                  formData[headerKey.replace(/\s+/g, '_')] || 
                  formData[headerKey.replace(/_/g, ' ')];

    if (value !== undefined) {
      newRow[headerMap[header].index] = value;
    }
  });

  // Default / Automated overrides
  const statusToSet = formData.status || 'NEW';
  if (headerMap['status']) newRow[headerMap['status'].index] = statusToSet;
  if (headerMap['url_type'] && !formData['url_type']) newRow[headerMap['url_type'].index] = 'new';
  if (headerMap['url'] && !formData['url']) {
     newRow[headerMap['url'].index] = `https://example.com/${(formData['primary_keyword'] || 'new-page').toLowerCase().replace(/\s+/g, '-')}`;
  }

  debugLog('APPENDING ROW', JSON.stringify(newRow));
  sheet.appendRow(newRow);
  
  return { message: "Appended row to Mike's workbook successfully" };
}

/**
 * Direct generation mode: Creates a brief from formData without reading/writing to a spreadsheet
 */
function runClientBriefDirectly(folderId, formData, workbookUrl) {
  if (!formData || !formData.primary_keyword) {
    throw new Error('Missing required data for direct generation (primary_keyword)');
  }

  const clientName = formData.clientName || 'Unknown Client';
  const runtimeFolderId = getSanitizedFolderId(folderId);
  const strategy = buildStrategy({
    url: formData.url || '',
    url_type: formData.url_type || 'new',
    page_type: formData.page_type || 'blog page',
    primary_keyword: formData.primary_keyword,
    secondary_keyword: formData.secondary_keyword || '',
    longtail_keywords: formData.longtail_keywords || '',
    location: formData.location || 'Global',
    intent: formData.intent || 'informational'
  });

  debugLog('DIRECT STRATEGY', strategy);

  const brief = generateBriefWithClaude(strategy);
  const docUrl = renderBriefToGoogleDoc(brief, strategy, runtimeFolderId);

  const runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  const result = {
    message: `Directly generated brief for ${clientName}`,
    processed: 1,
    urls: [docUrl],
    brief: brief,
    strategy: strategy,
    run_id: runId
  };

  // Append to workbook if URL provided
  if (workbookUrl) {
    try {
      const appendData = {
        ...formData,
        brief_url: docUrl,
        run_id: runId,
        status: 'DONE'
      };
      appendToWorkbook(workbookUrl, appendData);
      result.appended = true;
    } catch (e) {
      debugLog('APPEND FAILED IN DIRECT', e.toString());
      result.append_error = e.toString();
    }
  }

  return result;
}

/**
 * Extraction mode: Returns all rows from a workbook tab as JSON objects
 */
function getWorkbookData(workbookUrl) {
  if (!workbookUrl) throw new Error('Missing workbookUrl');
  
  const ss = SpreadsheetApp.openByUrl(workbookUrl);
  let sheet = getSheetFromUrl(ss, workbookUrl);
  
  if (!sheet) {
    sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  }
  
  if (!sheet) {
    return { message: 'Sheet not found', rows: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { message: 'No data rows', rows: [] };
  
  const headerMap = getHeaderMap(sheet);
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const rowObj = rowToObject(data[i], headerMap);
    // Sanitize row: only include if primary_keyword is present
    if (rowObj.primary_keyword) {
      rows.push(rowObj);
    }
  }
  
  return {
    client_name: ss.getName(),
    sheet_name: CONFIG.SHEET_NAME,
    count: rows.length,
    rows: rows
  };
}

function showSetupDialog() {
  try {
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
  } catch (e) {
    debugLog('UI DIALOG SKIPPED', 'Cannot show dialog in this context');
  }
}

function ensureRequiredColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').toLowerCase().trim());
  
  const requiredHeaders = [
    'url', 'url_type', 'page_type', 'primary_keyword', 
    'secondary_keyword', 'longtail_keywords', 'location', 'intent'
  ];
  
  // Check required headers exist
  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      throw new Error(`Missing required column: ${header}`);
    }
  });
  
  // Add output columns if missing
  const outputHeaders = ['status', 'brief_url', 'run_id', 'notes'];
  const toAdd = outputHeaders.filter(h => !headers.includes(h));
  
  if (toAdd.length > 0) {
    sheet.insertColumnsAfter(headers.length, toAdd.length);
    const startCol = headers.length + 1;
    sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  }
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h || '').toLowerCase().trim();
    if (key) map[key] = { index: i, name: h };
  });
  return map;
}

/**
 * Helper to extract gid from URL and find the corresponding sheet
 */
function getSheetFromUrl(ss, url) {
  try {
    const gidMatch = url.match(/[?#]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      const gid = parseInt(gidMatch[1]);
      const sheets = ss.getSheets();
      return sheets.find(s => s.getSheetId() === gid) || null;
    }
  } catch (e) {
    debugLog('GID EXTRACTION FAILED', e.toString());
  }
  return null;
}

function rowToObject(row, headerMap) {
  const obj = {};
  Object.keys(headerMap).forEach(key => {
    obj[key] = row[headerMap[key].index];
  });
  return obj;
}

/***** MAIN EXECUTION *****/
/***** MAIN EXECUTION *****/
function runBriefGeneration(runtimeFolderId, clientName, workbookUrl) {
  const ss = workbookUrl ? SpreadsheetApp.openByUrl(workbookUrl) : SpreadsheetApp.getActive();
  
  // 1. Try to find by specific name
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  // 2. If it's a URL with a GID, try to find that specific sheet
  if (!sheet && workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
  }
  
  // 3. FALLBACK: Use active sheet if run from menu (no workbookUrl) or if CONFIG.SHEET_NAME is missing
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }
  
  if (!sheet) {
    throw new Error(`Sheet not found. Please ensure you are on the correct tab or create a sheet named "${CONFIG.SHEET_NAME}".`);
  }
  
  // Ensure columns exist
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
  
  // No UI calls allowed in Web App context
  const generatedUrls = [];

  // FALLBACK: If no rows found and clientName provided (Simulation Mode Special)
  if (targets.length === 0 && clientName) {
    debugLog('SIMULATION FALLBACK', `No rows found in sheet, generating for client: ${clientName}`);
    
    // Create a dummy strategy for the mock brief
    const mockStrategy = {
      client_url: "https://example.com", // Fallback URL
      client_domain: clientName.toLowerCase().replace(/\s+/g, '') + ".com",
      url_type: "new",
      is_existing: false,
      page_type: "blog page",
      page_config: PAGE_TYPES["blog page"],
      primary_keyword: "SEO strategy for " + clientName,
      secondary_keyword: clientName + " services",
      longtail_keywords: ["best " + clientName + " tips", "how to use " + clientName],
      location: "Global",
      intent: "informational"
    };

    const brief = generateBriefWithClaude(mockStrategy);
    const docUrl = renderBriefToGoogleDoc(brief, mockStrategy, runtimeFolderId);
    generatedUrls.push(docUrl);

    return {
      message: `No new rows found in spreadsheet. Generated a simulated brief for ${clientName} directly.`,
      processed: 1,
      urls: generatedUrls
    };
  }
  
  if (targets.length === 0) {
    return { message: 'No new rows to process', processed: 0, urls: [] };
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
      
      const docUrl = renderBriefToGoogleDoc(brief, strategy, runtimeFolderId);
      generatedUrls.push(docUrl);
      
      sheet.getRange(r + 1, headers['brief_url'].index + 1).setValue(docUrl);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('DONE');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue('');
      
    } catch (e) {
      debugLog('ERROR', e);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('ERROR');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue(
        String(e.message || e).substring(0, 1000)
      );
    }
    
    Utilities.sleep(500); // Small delay between rows
  });
  
  // Process completion

  return {
    message: `Processed ${targets.length} row(s) from spreadsheet.`,
    processed: targets.length,
    urls: generatedUrls
  };
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

/***** CLAUDE API CALL (SIMULATED) *****/
function generateBriefWithClaude(strategy, retryCount = 0) {
  // SIMULATION MODE: Returning a mock brief to allow testing without Anthropic API keys
  // console.log('--- RUNNING IN SIMULATION MODE (Hardcoded Brief) ---');
  
  const mockBrief = {
    "h1": `How to Optimize ${strategy.primary_keyword} in 2025`,
    "title": `Optimizing ${strategy.primary_keyword}`,
    "meta_title": `Guide to ${strategy.primary_keyword} | SEO Experts`,
    "meta_description": `Learn the best strategies for ${strategy.primary_keyword} with our comprehensive 2025 guide for businesses and creators.`,
    "word_count_range": "1200-1800 words",
    "outline": [
      {
        "level": 1,
        "heading": `How to Optimize ${strategy.primary_keyword} in 2025`,
        "guidance": "Focus on user intent and high-quality content.",
        "word_count_estimate": "100 words"
      },
      {
        "level": 0,
        "is_afp_guidance": true,
        "guidance": "State clearly that optimization requires a data-driven approach based on SERP analysis.",
        "keywords_to_include": [strategy.primary_keyword, "strategy", "data"]
      },
      {
        "level": 2,
        "heading": "Understanding User Intent",
        "guidance": "Discuss informational vs transactional intent for this topic.",
        "word_count_estimate": "300 words",
        "keywords_to_include": ["intent", "audience"]
      },
      {
        "level": 2,
        "heading": "Top Competitor Strategies",
        "guidance": "Break down what the top 3 ranking pages are doing well.",
        "word_count_estimate": "400 words"
      },
      {
        "level": 2,
        "heading": "Implementation Checklist",
        "guidance": "List actionable steps for the writer.",
        "word_count_estimate": "200 words"
      },
      {
        "level": 2,
        "heading": "Frequently Asked Questions",
        "is_faq_section": true,
        "guidance": "Answer common queries about this topic.",
        "faq_questions": [
          { "question": `What is ${strategy.primary_keyword}?`, "answer_guidance": "Provide a simple definition." },
          { "question": "How long does it take to see results?", "answer_guidance": "Set realistic expectations (3-6 months)." }
        ]
      }
    ],
    "keyword_strategy": {
      "primary_usage": "Use in H1 and first 100 words.",
      "secondary_usage": "Use in at least 2 H2 headings.",
      "longtail_distribution": "Include naturally in body paragraphs."
    },
    "internal_links": [
      { "anchor": "SEO Services", "url": `${strategy.client_url}/services`, "rationale": "High relevance" },
      { "anchor": "Case Studies", "url": `${strategy.client_url}/case-studies`, "rationale": "Builds authority" },
      { "anchor": "Contact Us", "url": `${strategy.client_url}/contact`, "rationale": "Conversion point" }
    ],
    "external_links": [
      { "anchor": "Google Search Central", "url": "https://developers.google.com/search", "rationale": "Authoritative documentation" }
    ],
    "faq_analysis": {
      "include_faq": true,
      "competitors_have_faq": true,
      "paa_boxes_present": true,
      "featured_snippet_opportunity": true
    },
    "style_guidelines": {
      "tone": "Professional yet accessible",
      "reading_level": "Grade 10-12",
      "sentence_structure": "Varied, with focus on clarity",
      "formatting_notes": "Use bullet points and short paragraphs"
    },
    "client_research": {
      "pages_analyzed": [strategy.client_url || "https://example.com", `${strategy.client_url || "https://example.com"}/about`]
    }
  };

  if (typeof validateBrief === 'function') {
    validateBrief(mockBrief, strategy);
  }
  
  return mockBrief;

  /* 
  // ORIGINAL CODE (Commented for Simulation)
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
    messages: [
      {
        role: 'user',
        content: userMessage
      }
    ]
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
  
  // Add delay to avoid rate limits (30k tokens/minute limit)
  if (retryCount === 0) {
    Utilities.sleep(2000); // 2 second delay on first attempt
  }
  
  try {
    // Make the API call
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(requestBody)
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    debugLog('CLAUDE RESPONSE CODE', statusCode);
    
    // Handle rate limiting (429)
    if (statusCode === 429) {
      if (retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 30; // 30s, 60s, 120s
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
      throw new Error(`Claude API error ${statusCode}: ${responseText}`);
    }
    
    const responseData = JSON.parse(responseText);
    
    // Extract text content from Claude's response
    let briefText = '';
    if (responseData.content && Array.isArray(responseData.content)) {
      briefText = responseData.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }
    
    if (!briefText) {
      // Log what we actually got back
      debugLog('RESPONSE DATA STRUCTURE', {
        has_content: !!responseData.content,
        content_is_array: Array.isArray(responseData.content),
        content_length: responseData.content?.length,
        content_types: responseData.content?.map(b => b.type),
        stop_reason: responseData.stop_reason,
        full_response: JSON.stringify(responseData).substring(0, 1000)
      });
      throw new Error('No text content in Claude response');
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
  */
}

/***** RESPONSE PARSING *****/
function parseClaudeResponse(text) {
  // Claude might wrap JSON in markdown code blocks
  let cleaned = text.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
  }
  
  // Try 1: Standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    debugLog('JSON Parse Attempt 1 Failed', e.message);
  }
  
  // Try 2: Clean up common Claude JSON issues
  try {
    let fixed = cleaned
      // Remove comments (// and /* */)
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Fix trailing commas in arrays and objects
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix single quotes to double quotes (careful with apostrophes in content)
      .replace(/:\s*'([^']*?)'/g, ': "$1"')
      // Remove any leading/trailing whitespace
      .trim();
    
    return JSON.parse(fixed);
  } catch (e) {
    debugLog('JSON Parse Attempt 2 Failed', e.message);
  }
  
  // Try 3: Extract JSON object from surrounding text
  try {
    // First, try to remove obvious preamble text
    let textOnly = cleaned;
    
    // Remove common preamble patterns
    textOnly = textOnly.replace(/^.*?(I'll create|Let me|Now let me|Here's|Here is).*?(?=\{)/is, '');
    textOnly = textOnly.replace(/^.*?(?=\{)/s, ''); // Remove everything before first {
    
    // Look for the first { and last } to extract just the JSON
    const startIdx = textOnly.indexOf('{');
    const endIdx = textOnly.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const extracted = textOnly.substring(startIdx, endIdx + 1);
      
      // Try parsing the extracted JSON
      try {
        return JSON.parse(extracted);
      } catch (e) {
        // Try cleaning the extracted JSON
        let fixed = extracted
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/:\s*'([^']*?)'/g, ': "$1"')
          .trim();
        
        return JSON.parse(fixed);
      }
    }
  } catch (e) {
    debugLog('JSON Parse Attempt 3 Failed', e.message);
  }
  
  // Try 4: More aggressive quote fixing
  try {
    let fixed = cleaned
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      // Replace all single quotes with double quotes (risky but sometimes necessary)
      .replace(/'/g, '"')
      .trim();
    
    return JSON.parse(fixed);
  } catch (e) {
    debugLog('JSON Parse Attempt 4 Failed', e.message);
  }
  
  // All attempts failed - provide detailed error information
  debugLog('RAW CLAUDE RESPONSE (first 1000 chars)', cleaned.substring(0, 1000));
  debugLog('RAW CLAUDE RESPONSE (last 500 chars)', cleaned.substring(Math.max(0, cleaned.length - 500)));
  
  // Try to identify the problem area
  let errorMsg = 'Failed to parse Claude response as JSON after 4 attempts. ';
  
  if (cleaned.includes("'")) {
    errorMsg += 'Response contains single quotes - Claude may have used incorrect quote style. ';
  }
  if (/,\s*[}\]]/.test(cleaned)) {
    errorMsg += 'Response contains trailing commas. ';
  }
  if (/\/\/|\/\*/.test(cleaned)) {
    errorMsg += 'Response contains comments. ';
  }
  
  errorMsg += `\n\nFirst 500 chars of response:\n${cleaned.substring(0, 500)}`;
  errorMsg += `\n\nLast 300 chars of response:\n${cleaned.substring(Math.max(0, cleaned.length - 300))}`;
  
  throw new Error(errorMsg);
}

/***** VALIDATION *****/
function validateBrief(brief, strategy) {
  const required = [
    'h1', 'title', 'meta_title', 'meta_description',
    'word_count_range', 'outline', 'keyword_strategy', 'internal_links', 'external_links', 
    'faq_analysis', 'client_research', 'style_guidelines'
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
function renderBriefToGoogleDoc(brief, strategy, runtimeFolderId) {
  const docName = `Brief - ${brief.title} - ${new Date().toISOString().slice(0, 10)}`;
  const doc = DocumentApp.create(docName);
  
  // Move to folder if specified
  const folderId = getSanitizedFolderId(runtimeFolderId);
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
  if (brief.style_guidelines) {
    addHeading(body, 'Style Guidelines', DocumentApp.ParagraphHeading.HEADING1);
    
    const styleItems = [
      `Tone: ${brief.style_guidelines.tone || 'Not specified'}`,
      `Reading Level: ${brief.style_guidelines.reading_level || 'Not specified'}`,
      `Sentence Structure: ${brief.style_guidelines.sentence_structure || 'Not specified'}`,
      `Formatting: ${brief.style_guidelines.formatting_notes || 'Not specified'}`
    ];
    
    styleItems.forEach(item => {
      body.appendListItem(item)
        .setGlyphType(DocumentApp.GlyphType.BULLET)
        .setBold(false)
        .setFontSize(11);
    });
    
    body.appendParagraph('');
  }
  
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