/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Creates simplified, high-performance content briefs for AI content generation
 * Optimized for both traditional SEO and LLM optimization
 * 
 * Author: Mike (SEO & LLM Optimization Expert)
 * Version: 1.2.5 (High Fidelity Restoration + Dashboard Fixes)
 * Last Updated: 2024-12-29
 */

/***** CONFIGURATION *****/
const CONFIG = {
  // Claude API Settings
  CLAUDE_MODEL: "claude-sonnet-4-20250514",
  CLAUDE_MAX_TOKENS: 24000,
  
  // Processing Settings
  MAX_ROWS_PER_RUN: 1,
  SHEET_NAME: "Content Brief Automation", // Default sheet to look for
  DEFAULT_SHEET_NAME: "Content Brief Automation",
  
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
 * Checks if Claude's web_search tool is currently available
 */
function checkWebSearchAvailability() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not found in Script Properties');
  
  const testRequest = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Test' }],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }]
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(testRequest)
    });
    return response.getResponseCode() === 200;
  } catch (e) { return false; }
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
  return Math.ceil(secondsPerRequest * 1000);
}

/***** SPREADSHEET SETUP *****/
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Content Briefs')
    .addItem('Generate Briefs (Next Batch)', 'runBriefGeneration')
    .addItem('Setup Script Properties', 'showSetupDialog')
    .addSeparator()
    .addItem('Set 10-min Auto-Run', 'createTimeTrigger')
    .addItem('Clear All Triggers', 'deleteAllTriggers')
    .addToUi();
}

function showSetupDialog() {
  const html = HtmlService.createHtmlOutput('<h3>Setup Instructions</h3><ol><li>Add property: <code>ANTHROPIC_API_KEY</code> in Project Settings > Script Properties</li></ol>')
    .setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Claude API Key');
}

/**
 * Ensures required columns exist, handling case-insensitive checks
 */
function ensureRequiredColumns(sheet) {
  const lastCol = sheet.getLastColumn();
  let headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());
  }
  
  const requiredHeaders = ['url', 'url_type', 'page_type', 'primary_keyword', 'secondary_keyword', 'longtail_keywords', 'location', 'intent'];
  
  requiredHeaders.forEach(req => {
    if (!headers.includes(req)) {
      // If sheet is empty or column missing, add it
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(req);
      headers.push(req);
    }
  });
  
  const outputHeaders = ['status', 'brief_url', 'run_id', 'notes'];
  outputHeaders.forEach(out => {
    if (!headers.includes(out)) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(out);
      headers.push(out);
    }
  });
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    map[String(h || '').trim().toLowerCase()] = { index: i, name: h };
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

/***** MAIN EXECUTION *****/
function runBriefGeneration(workbookUrl) {
  const ss = workbookUrl ? SpreadsheetApp.openByUrl(workbookUrl) : SpreadsheetApp.getActive();
  // Try to find the specific sheet from GID if provided in URL, otherwise fallback to name or default
  let sheet = null;
  if (workbookUrl) sheet = getSheetFromUrl(ss, workbookUrl);
  if (!sheet) sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheetByName(CONFIG.DEFAULT_SHEET_NAME) || ss.getSheets()[0];
  
  if (!sheet) throw new Error(`Sheet not found. Checked: ${CONFIG.SHEET_NAME} and ${CONFIG.DEFAULT_SHEET_NAME}`);
  
  ensureRequiredColumns(sheet);
  
  if (CONFIG.USE_WEB_SEARCH && !checkWebSearchAvailability()) {
    if (!workbookUrl) {
      SpreadsheetApp.getUi().alert('⚠️ Web Search Unavailable. Please try again in 10-15 minutes.');
    }
    return { status: "error", message: "Web Search Unavailable" };
  }
  
  const headers = getHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  const statusCol = headers['status']?.index;
  const runIdCol = headers['run_id']?.index;
  
  if (statusCol === undefined || runIdCol === undefined) throw new Error('Missing columns: status or run_id');
  
  const runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const targets = [];
  
  for (let r = 1; r < data.length; r++) {
    const status = String(data[r][statusCol] || '').toUpperCase().trim();
    if (status === '' || status === 'NEW') {
      targets.push(r);
      if (targets.length >= CONFIG.MAX_ROWS_PER_RUN) break;
    }
  }
  
  if (targets.length === 0) return { status: "success", message: "No new rows" };
  
  targets.forEach(r => {
    sheet.getRange(r + 1, statusCol + 1).setValue('IN_PROGRESS');
    sheet.getRange(r + 1, runIdCol + 1).setValue(runId);
  });
  
  targets.forEach(r => {
    try {
      const rowObj = rowToObject(data[r], headers);
      const strategy = buildStrategy(rowObj);
      const brief = generateBriefWithClaude(strategy);
      const docUrl = renderBriefToGoogleDoc(brief, strategy);
      
      sheet.getRange(r + 1, headers['brief_url'].index + 1).setValue(docUrl);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('DONE');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue('');
      
    } catch (e) {
      debugLog('ERROR', e);
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('ERROR');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue(String(e.message || e).substring(0, 1000));
    }
  });
  
  return { status: "success", processed: targets.length };
}

function buildStrategy(row) {
  const clientDomain = extractDomain(row.url);
  const urlType = String(row.url_type || '').toLowerCase().trim();
  const pageType = String(row.page_type || 'blog page').toLowerCase().trim();
  if (!PAGE_TYPES[pageType]) throw new Error(`Invalid page_type: "${pageType}"`);
  
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
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  
  const systemPrompt = SYSTEM_PROMPT.replace(/CLIENT_DOMAIN/g, strategy.client_domain);
  const userMessage = `Create a complete SEO content brief for AI content generation.\n\nSTRATEGY DETAILS:\n${JSON.stringify(strategy, null, 2)}`;

  const requestBody = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [],
    tools: CONFIG.USE_WEB_SEARCH ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined
  };
  
  if (retryCount === 0) Utilities.sleep(calculateOptimalDelay());
  else Utilities.sleep(Math.pow(2, retryCount - 1) * 30000);
  
  try {
    let conversationMessages = [{ role: 'user', content: userMessage }];
    let briefText = '';
    let currentTurn = 0;
    
    while (currentTurn < 5) {
      currentTurn++;
      requestBody.messages = conversationMessages;
      
      const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        payload: JSON.stringify(requestBody)
      });
      
      const statusCode = response.getResponseCode();
      if (statusCode === 429 && retryCount < MAX_RETRIES) return generateBriefWithClaude(strategy, retryCount + 1);
      if (statusCode !== 200) throw new Error(`Claude API error ${statusCode}: ${response.getContentText()}`);
      
      const responseData = JSON.parse(response.getContentText());
      conversationMessages.push({ role: 'assistant', content: responseData.content });
      
      const toolUses = responseData.content.filter(block => block.type === 'tool_use');
      if (toolUses.length > 0) {
        const toolResults = toolUses.map(toolUse => ({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolUse.name === 'web_search' ? [{ type: 'web_search_tool_result' }] : "Success"
        }));
        conversationMessages.push({ role: 'user', content: toolResults });
        continue;
      }
      
      const textBlocks = responseData.content.filter(block => block.type === 'text');
      if (textBlocks.length > 0) {
        briefText = textBlocks.map(block => block.text).join('\n');
        break;
      }
      
      if (responseData.stop_reason === 'pause_turn') {
        conversationMessages.push({ role: 'user', content: 'Please continue and provide the complete JSON brief now.' });
        continue;
      }
      break;
    }
    
    if (!briefText) throw new Error(`No text content after ${currentTurn} turns.`);
    const brief = parseClaudeResponse(briefText);
    validateBrief(brief, strategy);
    return brief;
    
  } catch (error) {
    if (error.message.includes('rate_limit') && retryCount < MAX_RETRIES) return generateBriefWithClaude(strategy, retryCount + 1);
    throw error;
  }
}

function parseClaudeResponse(text) {
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found');
  let jsonStr = jsonMatch[0];
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    let cleanedJson = jsonStr
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1').replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":')
      .replace(/:\s*'([^']*?)'/g, ': "$1"');
    return JSON.parse(cleanedJson);
  }
}

function validateBrief(brief, strategy) {
  const req = ['h1', 'title', 'meta_title', 'meta_description', 'word_count_range', 'outline', 'keyword_strategy', 'internal_links', 'external_links', 'faq_analysis', 'client_research'];
  req.forEach(f => { if (!brief[f]) throw new Error(`Missing field: ${f}`); });
}

function renderBriefToGoogleDoc(brief, strategy) {
  const docName = `Brief - ${brief.title} - ${new Date().toISOString().slice(0, 10)}`;
  const doc = DocumentApp.create(docName);
  const folderId = getSanitizedFolderId();
  if (folderId) {
    try {
      const file = DriveApp.getFileById(doc.getId());
      DriveApp.getFolderById(folderId).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) { debugLog('Folder move failed', e.message); }
  }
  
  const body = doc.getBody();
  body.clear();
  addHeading(body, brief.title, DocumentApp.ParagraphHeading.TITLE);
  
  addHeading(body, 'Keyword Usage Instructions', DocumentApp.ParagraphHeading.HEADING1);
  [brief.keyword_strategy.primary_usage, brief.keyword_strategy.secondary_usage, brief.keyword_strategy.longtail_distribution].forEach(item => {
    body.appendListItem(item).setGlyphType(DocumentApp.GlyphType.BULLET);
  });
  
  addHeading(body, 'Content Outline', DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Target Word Count: ${brief.word_count_range}`).setItalic(true);
  
  brief.outline.forEach(section => {
    if (section.level === 1) {
      body.appendParagraph(`H1: ${brief.h1}`).setBold(true).setFontSize(13);
      return;
    }
    if (section.is_afp_guidance) {
      body.appendParagraph(`${strategy.page_config.answerFirstLabel} (${strategy.page_config.answerFirstLength})`).setBold(true).setFontSize(12);
      body.appendParagraph(section.guidance).setFontSize(11);
      return;
    }
    const marker = section.level === 2 ? 'H2' : 'H3';
    body.appendParagraph(`${marker}: ${section.heading}`).setBold(true).setFontSize(12);
    body.appendParagraph(section.guidance).setFontSize(11);
    if (section.is_faq_section && section.faq_questions) {
      section.faq_questions.forEach(faq => {
        body.appendParagraph(`Q: ${faq.question}`).setBold(true).setIndentStart(18);
        body.appendParagraph(`Answer guidance: ${faq.answer_guidance}`).setIndentStart(36).setFontSize(10);
      });
    }
  });

  body.appendHorizontalRule();
  const strategistHeader = body.appendParagraph('STRATEGIST SECTION');
  strategistHeader.setHeading(DocumentApp.ParagraphHeading.HEADING1).setBold(true).setForegroundColor('#cc0000');
  
  if (brief.client_research) {
    addHeading(body, 'Client Research', DocumentApp.ParagraphHeading.HEADING2);
    brief.client_research.key_facts?.forEach(f => body.appendListItem(f).setGlyphType(DocumentApp.GlyphType.BULLET));
    brief.client_research.products_services?.forEach(f => body.appendListItem(f).setGlyphType(DocumentApp.GlyphType.BULLET));
  }
  
  addHeading(body, 'Internal Links', DocumentApp.ParagraphHeading.HEADING2);
  brief.internal_links.forEach(link => {
    const color = link.url_status === '200' ? '#006600' : '#cc0000';
    body.appendParagraph(`${link.anchor}: ${link.url}`).setFontFamily('Courier New').setForegroundColor(color);
  });

  addHeading(body, 'External Links', DocumentApp.ParagraphHeading.HEADING2);
  brief.external_links.forEach(link => {
    const color = link.url_status === 'verified' ? '#006600' : '#cc0000';
    body.appendParagraph(`${link.anchor}: ${link.url}`).setFontFamily('Courier New').setForegroundColor(color);
  });
  
  doc.saveAndClose();
  return doc.getUrl();
}

function addHeading(body, text, level) { body.appendParagraph(text).setHeading(level); }

function createTimeTrigger() { ScriptApp.newTrigger('runBriefGeneration').timeBased().everyMinutes(10).create(); }
function deleteAllTriggers() { ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t)); }
function setAnthropicKey(apiKey) { PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', apiKey); }

/***** WEB APP HANDLERS *****/
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const command = params.command || 'runBriefGeneration';
    const workbookUrl = params.workbookUrl;
    let result;
    if (command === 'generateDirectly') result = runClientBriefDirectly(params.folderId, params.data, workbookUrl);
    else if (command === 'getWorkbookData' && workbookUrl) result = getWorkbookData(workbookUrl);
    else if (command === 'appendToWorkbook' && workbookUrl) {
      result = appendToWorkbook(workbookUrl, params.data);
      if (result) result.generation = runBriefGeneration(workbookUrl);
    } else result = runBriefGeneration(workbookUrl);
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "command": command, "result": result })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendToWorkbook(workbookUrl, formData) {
  const ss = SpreadsheetApp.openByUrl(workbookUrl);
  let sheet = getSheetFromUrl(ss, workbookUrl) || ss.getSheetByName(CONFIG.DEFAULT_SHEET_NAME) || ss.insertSheet(CONFIG.DEFAULT_SHEET_NAME);
  ensureRequiredColumns(sheet);
  const headerMap = getHeaderMap(sheet);
  const newRow = new Array(Object.keys(headerMap).length).fill('');
  Object.keys(headerMap).forEach(header => {
    const value = formData[header] || formData[header.replace(/\s+/g, '_')] || formData[header.replace(/_/g, ' ')];
    if (value !== undefined) newRow[headerMap[header].index] = value;
  });
  if (headerMap['status']) newRow[headerMap['status'].index] = formData.status || 'NEW';
  sheet.appendRow(newRow);
  return { message: "Appended row successfully" };
}

function runClientBriefDirectly(folderId, formData, workbookUrl) {
  const strategy = buildStrategy({ ...formData, url_type: formData.url_type || 'new' });
  const brief = generateBriefWithClaude(strategy);
  const docUrl = renderBriefToGoogleDoc(brief, strategy);
  const runId = `run_${Date.now()}`;
  if (workbookUrl) appendToWorkbook(workbookUrl, { ...formData, brief_url: docUrl, run_id: runId, status: 'DONE' });
  return { message: "Directly generated brief", urls: [docUrl], run_id: runId };
}

function getWorkbookData(workbookUrl) {
  const ss = SpreadsheetApp.openByUrl(workbookUrl);
  let sheet = getSheetFromUrl(ss, workbookUrl) || ss.getSheetByName(CONFIG.DEFAULT_SHEET_NAME);
  if (!sheet) return { message: 'Sheet not found', rows: [] };
  const data = sheet.getDataRange().getValues();
  const headerMap = getHeaderMap(sheet);
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = rowToObject(data[i], headerMap);
    if (rowObj.primary_keyword) rows.push(rowObj);
  }
  return { count: rows.length, rows: rows };
}

function getSheetFromUrl(ss, url) {
  const gidMatch = url.match(/[?#]gid=([0-9]+)/);
  if (gidMatch) {
    const gid = parseInt(gidMatch[1]);
    return ss.getSheets().find(s => s.getSheetId() === gid) || null;
  }
  return null;
}
