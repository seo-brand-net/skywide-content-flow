/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Version: 1.5.0
 * Last Updated: 2025-01-20
 *
 * CHANGELOG v1.5.0:
 * - ADDED: Comprehensive Local SEO optimization when location is provided
 * - ADDED: analyzeLocationInKeywords() helper to detect location overlap in keywords
 * - ADDED: Smart H1 location logic - only adds location if not already in primary keyword
 * - ADDED: AFP geographic variation guidance - uses state/region/county if city already in primary
 * - ADDED: H2 localization guidance - 1-2 non-keyword H2s can include location naturally
 * - ADDED: Geographic entity guidance - county/region/state allowed, nearby cities excluded
 * - ADDED: Local trust signals search during client research phase
 * - ADDED: local_trust_signals field in client_research JSON output
 * - ADDED: Local authority external links requirement (state .gov, county sites, etc.)
 * - ADDED: Local SEO self-check in user message for location-based briefs
 * - UPDATED: Client research instructions to look for local awards, memberships, community involvement
 * - UPDATED: External links section to prioritize local authority sources when location provided
 * - UPDATED: Google Doc rendering to display local trust signals if found
 * 
 * v1.5.0 Local SEO Improvements:
 * - REQUIRED: AFP must include BOTH city AND county/region/state (not just city)
 * - REQUIRED: At least 1 H2 must include county or region name (not just city)
 * - FIXED: Local trust signals now must be SPECIFIC to target location
 *   (no longer includes trust signals for other locations the client serves)
 * - ADDED: local_geographic_details field with county, region, state, neighborhoods
 * - ADDED: Topic-specific local entity guidance for use in section guidance text
 * - ADDED: Topic-relevant entities go in guidance text or keywords_to_include (not headers)
 * - UPDATED: Self-check includes new requirements for geographic depth
 * 
 * v1.5.0 Relevant Landmarks Feature:
 * - CHANGED: Now searches for TOPIC-SPECIFIC local entities instead of generic landmarks
 *   * Old approach: Search "Tampa landmarks" → filter for relevance → often missed relevant entities
 *   * New approach: Identify topic first → search specifically (e.g., "nursing homes in Tampa") → get relevant results
 * - IMPROVED: Examples guide Claude on what to search for each topic type:
 *   * Nursing home abuse → nursing homes, assisted living facilities
 *   * Car accidents → dangerous intersections, highways
 *   * Medical malpractice → hospitals, medical centers
 *   * Workers comp → major employers, industrial areas
 * - REMOVED: Generic "landmarks" array - now just neighborhoods + relevant_to_topic
 * - REQUIRED: 2-3 topic-relevant entities MUST be used in section guidance text
 * 
 * v1.5.0 Sitemap-First Internal Links:
 * - ADDED: fetchAndFilterSitemap() function to pre-fetch and categorize sitemap URLs
 * - ADDED: Sitemap is fetched BEFORE Claude runs (in buildStrategy)
 * - ADDED: URLs are filtered to exclude junk (tags, authors, archives, pagination, etc.)
 * - ADDED: URLs are categorized (services, practice_areas, blog, locations, about, other)
 * - ADDED: Pre-verified URLs are passed to Claude in the user message
 * - CHANGED: Claude now picks internal links from provided list instead of guessing
 * - CHANGED: No need for Claude to use site: search for internal links
 * - CHANGED: All internal links are guaranteed to exist (pre-verified from sitemap)
 * - BENEFIT: Eliminates "not_found_in_sitemap" errors and saves API calls
 * - FALLBACK: If no sitemap found, Claude falls back to site: search method
 * 
 * v1.5.0 Bug Fixes:
 * - FIXED: extractDomain() now uses regex instead of URL constructor (not available in Apps Script)
 * - FIXED: extractDomain() now handles URLs without protocol (adds https:// automatically)
 * - FIXED: fetchAndFilterSitemap() now adds protocol to domain before fetching
 * - FIXED: Empty domain now handled gracefully with warning log
 * - FIXED: Quality scoring now uses cleanKeyword() to remove zero-width characters
 *   (prevents false "keyword missing" errors when spreadsheet has hidden characters)
 * - FIXED: Internal link status rendering now accepts both '200' and 'verified' as valid
 * - ADDED: Debug logging for domain extraction and sitemap URL construction
 * - ADDED: getSitemapUrlsFromRobots() - extracts sitemap URLs from robots.txt
 * - ADDED: Sitemap discovery now checks robots.txt FIRST for Sitemap: directives
 * - ADDED: Fallback to common sitemap paths if robots.txt has no sitemap directives
 * - SIMPLIFIED: Removed URL categorization - now shows flat list of all sitemap URLs
 * - IMPROVED: Instructions to Claude now explicitly say to use url_status "200" for sitemap URLs
 * - IMPROVED: URL verification now normalizes URLs before comparing (handles trailing slashes,
 *   protocol differences http/https, and www vs non-www)
 * - IMPROVED: SERP validation now more forgiving for niche keywords:
 *   * 5+ pages = full pass (ideal)
 *   * 3-4 pages = pass with warning (acceptable for niche keywords)
 *   * 0-2 pages = hard fail (truly insufficient)
 * 
 * v1.5.0 Validation Retry System:
 * - ADDED: runAllValidations() function to collect pass/fail results for all validations
 * - ADDED: constructValidationRetryMessage() to create targeted fix instructions
 * - ADDED: Automatic internal retry when validation fails
 *   * First attempt: Run all validations
 *   * If failed: Ask Claude to fix specific issues while preserving correct content
 *   * Second attempt: Run ALL validations again (not just the failed ones)
 *   * If still failed: Then show error to user
 * - IMPROVED: Error messages now show what passed AND what failed
 * - BENEFIT: Reduces manual reruns - Claude often fixes issues on first retry
 *
 * CHANGELOG v1.4.9:
 * - IMPROVED: "Keyword Usage Instructions" section now shows clear writer requirements
 * - ADDED: Primary keyword requirements (H1, first 20 words, 5-7x usage)
 * - ADDED: Secondary keyword requirements (opening paragraph, H2 heading, 3x total)
 * - ADDED: Longtail/semantic keywords listed with usage requirements
 * - CHANGED: Section now pulls directly from strategy inputs for clarity
 * 
 * - OVERHAULED: Quality scoring system completely restructured (100 pts total)
 * - FIXED: AFP keyword check now uses correct field name (guidance vs content_guidance)
 * - FIXED: Point totals now properly add to 100 with no impossible points
 * - ADDED: EEAT Signals scoring (15 pts) - Expertise, Experience, Authority, Trust
 * - ADDED: Intent Alignment scoring (10 pts) - section count + intent-appropriate sections
 * - ADDED: Content Format Alignment scoring (10 pts) - tables/lists per competitor analysis
 * - REBALANCED: Keyword Strategy (20), Content Outline (15), SERP Analysis (15), 
 *   EEAT (15), Intent Alignment (10), Link Quality (10), Content Format (10), FAQ (5)
 * 
 * - FIXED: Text block filter no longer discards text that doesn't start with '{'
 *   (was causing intermittent "No text content after N turns" errors)
 *
 * CHANGELOG v1.4.8:
 * - FIXED: System prompt now says "EACH secondary keyword" instead of ambiguous "at least 1"
 * - REMOVED: Confusing "OR shared H2" language that allowed keywords to share one H2
 * - ADDED: Explicit "If you have 2 secondary keywords, you need 2 different H2s"
 * - ADDED: "DO NOT just put secondary keywords in keywords_to_include arrays"
 * - CLARIFIED: AFP requirements now say "EACH secondary keyword" and "ALL secondary keywords"
 *
 * CHANGELOG v1.4.7:
 * - STRENGTHENED: Secondary keyword H2 instructions now PRESCRIPTIVE, not just instructive
 * - ADDED: Suggested H2 formats for each secondary keyword (5 options per keyword)
 * - ADDED: Explicit "DO NOT just put it in keywords_to_include" instruction
 * - ADDED: Visual separators to make secondary keyword section stand out
 * - CLARIFIED: Rule 2 emphasizes keyword must be IN THE H2 TITLE TEXT
 *
 * CHANGELOG v1.4.6:
 * - ADDED: Prominent secondary keyword requirements in USER MESSAGE (dynamic, per-brief)
 * - ADDED: Example showing how to use secondary keyword in AFP, H2, and throughout outline
 * - ADDED: Verification checklist for secondary keywords in user message
 * - ADDED: Secondary keyword self-check in SELF-CHECK section of system prompt
 * - UPDATED: keyword_strategy JSON now requires detailed secondary_keywords array with tracking
 * - IMPROVED: Secondary keyword instructions now appear BEFORE longtail instructions for emphasis
 *
 * CHANGELOG v1.4.5:
 * - ADDED: validateSecondaryKeywordDistribution() function with strict enforcement
 * - ADDED: Secondary keyword MUST appear in AFP/first paragraph (enforced)
 * - ADDED: Secondary keyword MUST appear in at least 1 H2 heading (enforced)
 * - CHANGED: Secondary keyword minimum occurrences from 2x to 3x (enforced)
 * - ADDED: Support for multiple secondary keywords (comma-separated)
 * - UPDATED: Quality scoring now checks AFP, H2, and 3x requirements
 * - UPDATED: System prompt with detailed secondary keyword requirements
 * - UPDATED: AFP requirements now explicitly require secondary keyword
 *
 * CHANGELOG v1.4.4:
 * - ADDED: Content format analysis (tables/lists) based on competitor research
 * - ADDED: content_format_analysis field in serp_analysis JSON output
 * - ADDED: Instructions to check competitors for tables, numbered lists, bulleted lists
 * - ADDED: Decision logic: 3+ competitors with tables = recommend tables
 * - ADDED: Decision logic: 4+ competitors with lists = recommend lists
 * - ADDED: Validation to check if format recommendations appear in outline guidance
 *
 * CHANGELOG v1.4.3:
 * - ADDED: Section count analysis based on competitor H2/H3 counting
 * - ADDED: Intent modifier to competitor section average calculation
 * - ADDED: section_count_analysis field in serp_analysis JSON output
 * - ADDED: Validation for section count alignment with competitor research
 * - ADDED: Quality scoring rewards matching competitor section counts
 *
 * CHANGELOG v1.4.2:
 * - ADDED: parseIntent() function for hybrid intent support (e.g., "transactional/informational")
 * - ADDED: All 12 hybrid intent combinations in CONTENT_STRUCTURES
 * - CHANGED: Longtail distribution now requires 100% (was 70%)
 * - CHANGED: Longtails now SHAPE the outline structure, not just get distributed
 * - IMPROVED: System prompt emphasizes longtails as inputs that inform section creation
 * - KEPT: All original working logic unchanged (row processing, status checking, etc.)
 *
 * CHANGELOG v1.3.0:
 * - Added two-pass longtail/semantic distribution system
 * - Implemented intent-based content structures (Page Type x Intent matrix)
 * - Added sitemap-based link verification (10x faster, more accurate)
 * - Fixed quality score overflow (proper capping at category maximums)
 * - Separated longtail vs semantic keyword handling
 * - Added early fail-fast validation for keyword distribution
 * - Enhanced entity optimization for LLM search
 * - Improved answer patterns for AI Overviews
 *
 * CHANGELOG v1.2.6:
 * - Fixed threshold-based scoring (5+ pages = full points, 3+ patterns = full points)
 * - Enhanced longtail keyword distribution requirements in system prompt
 * - Improved longtail scoring with N/A handling when no longtails provided
 * - Added longtail distribution validation warning
 *
 * CHANGELOG v1.2.5:
 * - Added comprehensive quality scoring system (0-100)
 * - Scores SERP analysis depth, content outline, link quality, keyword strategy, FAQ analysis
 * - Visual quality score display at top of Google Doc
 * - Quality score stored in spreadsheet for tracking
 * - Detailed breakdown shows exactly what scored well/poorly
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

// Intent-based content structure adjustments
const CONTENT_STRUCTURES = {
  'transactional': {
    afp_focus: 'value proposition with price signal',
    section_count: '5-6 sections',
    section_depth: 'shallow, persuasive',
    cta_frequency: 'every section',
    cta_type: 'strong action (Get Quote, Buy Now, Contact)',
    word_count_modifier: 0.8,
    emphasis: 'pricing, trust signals, customization options, delivery',
    tone: 'confident, benefit-focused, action-oriented'
  },
  'informational': {
    afp_focus: 'direct answer to query',
    section_count: '7-10 sections',
    section_depth: 'very deep, educational',
    cta_frequency: 'end only',
    cta_type: 'soft (Learn More, Explore)',
    word_count_modifier: 1.5,
    emphasis: 'step-by-step processes, detailed explanations, examples',
    tone: 'helpful, patient, educational'
  },
  'commercial': {
    afp_focus: 'specs and price range',
    section_count: '6-8 sections',
    section_depth: 'moderate, comparison-focused',
    cta_frequency: 'every 2-3 sections',
    cta_type: 'medium (Compare, Get Quote, See Options)',
    word_count_modifier: 1.2,
    emphasis: 'comparisons, pros/cons, alternatives, reviews',
    tone: 'objective, detailed, honest'
  },
  'navigational': {
    afp_focus: 'who we are and what we do',
    section_count: '5-6 sections',
    section_depth: 'broad overview',
    cta_frequency: 'one main CTA',
    cta_type: 'contact, navigation',
    word_count_modifier: 0.7,
    emphasis: 'brand info, services overview, locations, contact',
    tone: 'professional, welcoming, clear'
  },
  // === HYBRID INTENTS ===
  'transactional/informational': {
    afp_focus: 'value proposition + immediate answer to capability question',
    section_count: '8-10 sections',
    section_depth: 'tiered: shallow product-focused first 3-4, then deep educational',
    cta_frequency: 'strong after product showcase, soft after education, strong at end',
    cta_type: 'mixed (Get Quote early, Learn More middle, Contact end)',
    word_count_modifier: 1.3,
    emphasis: 'product info/pricing first 40%, how-to middle 50%, conversion last 10%',
    tone: 'confident early, helpful middle, action-oriented end'
  },
  'informational/transactional': {
    afp_focus: 'direct answer to query + soft value proposition',
    section_count: '8-10 sections',
    section_depth: 'deep educational first, then conversion-focused',
    cta_frequency: 'soft early, medium middle, strong late',
    cta_type: 'Learn More → Compare → Get Quote',
    word_count_modifier: 1.4,
    emphasis: 'education first 60%, product info middle 30%, conversion last 10%',
    tone: 'helpful early, confident middle, action-oriented end'
  },
  'commercial/informational': {
    afp_focus: 'comparison overview + specs summary',
    section_count: '8-10 sections',
    section_depth: 'moderate comparison first, then deep educational',
    cta_frequency: 'medium early, soft middle, medium end',
    cta_type: 'Compare Options → Learn More → See Details',
    word_count_modifier: 1.3,
    emphasis: 'comparison first 40%, educational middle 50%, decision help last 10%',
    tone: 'objective early, educational middle, helpful end'
  },
  'informational/commercial': {
    afp_focus: 'educational answer + buying guidance',
    section_count: '8-10 sections',
    section_depth: 'deep educational first, then comparison-focused',
    cta_frequency: 'soft early, medium late',
    cta_type: 'Learn More → Compare → See Options',
    word_count_modifier: 1.4,
    emphasis: 'education first 60%, comparison last 40%',
    tone: 'educational throughout, objective comparison at end'
  },
  'transactional/commercial': {
    afp_focus: 'strong value proposition + competitive positioning',
    section_count: '6-8 sections',
    section_depth: 'shallow persuasive with comparison elements',
    cta_frequency: 'every section with comparison CTAs',
    cta_type: 'Get Quote, Compare, See Why We\'re Better',
    word_count_modifier: 1.0,
    emphasis: 'pricing and value first 50%, competitive comparison last 50%',
    tone: 'confident and competitive throughout'
  },
  'commercial/transactional': {
    afp_focus: 'comparison-driven with clear winner positioning',
    section_count: '6-8 sections',
    section_depth: 'comparison-heavy leading to conversion',
    cta_frequency: 'comparison CTAs early, strong action late',
    cta_type: 'Compare → See Why → Get Started',
    word_count_modifier: 1.0,
    emphasis: 'objective comparison first 60%, conversion push last 40%',
    tone: 'objective early, confident and action-oriented end'
  }
};

/**
 * Parse intent string to detect hybrid intents
 * Supports formats like "transactional/informational", "transactional + informational", etc.
 */
function parseIntent(intentString) {
  const intentLower = intentString.toLowerCase().trim();

  // Support all hybrid intent combinations
  const hybridPatterns = [
    /transactional\s*[\/\+&]\s*informational/i,
    /informational\s*[\/\+&]\s*transactional/i,
    /commercial\s*[\/\+&]\s*informational/i,
    /informational\s*[\/\+&]\s*commercial/i,
    /transactional\s*[\/\+&]\s*commercial/i,
    /commercial\s*[\/\+&]\s*transactional/i,
    /transactional\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*transactional/i,
    /informational\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*informational/i,
    /commercial\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*commercial/i
  ];

  for (const pattern of hybridPatterns) {
    if (pattern.test(intentLower)) {
      const parts = intentLower.split(/[\/\+&]/).map(s => s.trim()).filter(s => s.length > 0);
      return {
        isHybrid: true,
        primary: parts[0],
        secondary: parts[1] || null,
        hybridKey: `${parts[0]}/${parts[1] || parts[0]}`
      };
    }
  }

  return {
    isHybrid: false,
    primary: intentLower,
    secondary: null,
    hybridKey: intentLower
  };
}

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
   - LOCAL TRUST SIGNALS (if location is provided):
     * CRITICAL: Only include trust signals RELEVANT TO THE TARGET LOCATION
     * If target is "Tampa", only include Tampa/Hillsborough County trust signals
     * DO NOT include trust signals for other locations the client serves (e.g., Miami awards for a Tampa page)
     * Local awards or recognition mentioning the target city/county/region
     * Local/regional memberships (Bar associations, Chamber of Commerce, trade groups)
     * Community involvement in the target area specifically
     * Years serving the target location specifically
     * Local case results or testimonials from the target area
     * If NO location-specific trust signals exist, leave empty or note "No [location]-specific trust signals found"
     * Only document signals ACTUALLY FOUND - never fabricate
   - LOCAL GEOGRAPHIC DETAILS (if location is provided):
     * Research and document the county name for the target city
     * Research and document the region/metro area name
     * Identify neighborhoods within the target city
     * Identify relevant local landmarks (hospitals, courthouses, government buildings, institutions)
     * These will be used in guidance text and keywords_to_include arrays
   - Use this information as GROUND TRUTH for the brief

3. NEVER HALLUCINATE CLIENT INFORMATION:
   - Only reference facts found on the client's actual website
   - If you don't find specific information, don't make it up
   - Base all client claims on pages you've researched

ENTITY OPTIMIZATION (CRITICAL FOR LLM SEARCH):
- Extract and note the client's business name (use 3-5x in content guidance)
- Identify location entities (city, state, region) for local SEO
- Note product/service names and ensure consistent formatting
- Document certifications, standards, industry organizations mentioned
- These entities are crucial for AI Overview inclusion

CRITICAL OUTPUT REQUIREMENTS:
1. ALL content must be in PLAIN TEXT with clear section headers
2. Use markdown headers (##) for main sections
3. Use bullet points (-) for lists
4. No complex formatting, tables, or nested structures
5. Keep instructions clear and direct for AI content machines

CONTENT STRUCTURE ADAPTATION:
You will receive both PAGE_TYPE and INTENT which determine content structure.

INTENT-BASED STRUCTURE:
[INTENT_STRUCTURE_PLACEHOLDER]

Apply the intent-specific guidance to the page type structure. For example:
- Transactional + Service Page: Heavy pricing focus, strong CTAs, conversion-oriented
- Informational + Blog Page: Deep educational content, step-by-step processes, minimal CTAs
- Commercial + Product Page: Comparison focus, pros/cons, review emphasis

KEYWORD USAGE RULES:
- Primary keyword: MUST appear in H1 exactly as provided
- Secondary keyword(s): MANDATORY REQUIREMENTS (WILL BE VALIDATED AND REJECTED IF NOT MET)
  * EACH secondary keyword MUST appear in AFP/first paragraph guidance (in guidance text or keywords_to_include)
  * EACH secondary keyword MUST appear in its own H2 heading - the keyword text must be IN the H2 title itself
  * EACH secondary keyword MUST appear at least 3x total across the outline
  * DO NOT just put secondary keywords in keywords_to_include arrays - they MUST be in H2 heading text
  * If you have 2 secondary keywords, you need 2 different H2s (one containing each keyword)
  * VERIFICATION: Before returning JSON, verify EACH secondary keyword has: AFP ✓, H2 heading ✓, 3x total ✓
  * REJECTION: Briefs missing ANY secondary keyword from AFP or H2 headings will be automatically rejected
- Longtail/Semantic Keywords: MANDATORY 100% DISTRIBUTION
  * YOU WILL RECEIVE A KEYWORD_DISTRIBUTION_PLAN listing all terms to distribute
  * ALL terms MUST appear in the outline - these keywords SHAPE your section structure
  * Preferred: Use longtails in H2/H3 headings where they fit naturally
  * Alternative: Place in keywords_to_include arrays or guidance text
  * EVERY SINGLE longtail keyword must be accounted for (100% requirement)
  * VERIFICATION: Before returning JSON, verify ALL longtails are placed somewhere
  * REJECTION: Briefs missing ANY longtail keyword will be automatically rejected
- First 150-200 words (AFP) must include: Primary + Secondary + at least one longtail keyword

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
  - EACH secondary keyword MUST be mentioned in AFP guidance or AFP keywords_to_include
  - Tone/approach
- The AI content machine will write the actual AFP based on this guidance
- CRITICAL: AFP guidance MUST instruct that primary AND ALL secondary keywords appear in the first paragraph

LLM OPTIMIZATION PATTERNS (CRITICAL):
- DIRECT ANSWERS FIRST: Content should answer questions immediately, not build up to answers
- NUMBERED LISTS: Use "5 Steps to..." or "7 Benefits of..." format when applicable
- COMPARISON TABLES: Suggest side-by-side comparisons in outline guidance for specs/features
- EXPERT ATTRIBUTION: Recommend citing industry sources, standards, or research
- TEMPORAL MARKERS: Include date/recency signals when relevant
- ENTITY CLARITY: Ensure client name, location, and key entities appear consistently

LINK VERIFICATION REQUIREMENTS:

INTERNAL LINKS (PRE-VERIFIED FROM SITEMAP):
- Internal link URLs are PRE-FETCHED from the client sitemap and provided in the user message
- ONLY select internal links from the provided list - do NOT guess or make up URLs
- All URLs in the provided list are verified and live on the client website
- NO need to use web_search to verify internal links - they are pre-verified
- If no sitemap URLs are provided, fall back to site: search and verify with web_search
- All internal links must be contextually relevant to the content section
- Minimum 3, maximum 8 per brief
- Prioritize: service/practice area pages > relevant blog posts > location pages
- Avoid: tag pages, search results, archives, author pages (these are pre-filtered)

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
- LOCAL SEO: If location is provided, include 1-2 local authority links:
  * State .gov websites (agencies, regulations, licensing boards)
  * County/city government sites
  * Local courts or legal resources (for law-related content)
  * State-specific laws or statutes
  * Local institutions (hospitals, universities) relevant to the topic
  These strengthen local relevance for both traditional SEO and LLM search.

MANDATORY SERP RESEARCH PROTOCOL:
You MUST complete thorough SERP analysis before generating the brief. Briefs with insufficient research will be REJECTED.

REQUIRED STEPS:
1. Search for the primary keyword and analyze the top 7 ranking pages
2. Use web_search to visit each of these pages individually
3. Extract the actual word count from each page (use web_search to get content length)
4. Calculate word count range using P25-P75 (25th to 75th percentile, rounded to nearest 50)
5. COUNT THE H2/H3 SECTIONS on each competitor page - this determines your outline structure
6. Identify SPECIFIC content patterns (not generic descriptions)
7. Note competitive gaps we can exploit
8. Document SERP features with specific details

SECTION COUNT CALCULATION (CRITICAL):
- Count the number of H2 and H3 headings on EACH of the top 5-7 competitor pages
- Calculate the AVERAGE section count across all analyzed pages
- Apply INTENT MODIFIER to the average:
  * Transactional intent: Use competitor average (conversion-focused, concise)
  * Informational intent: Add 1-2 sections to competitor average (educational depth)
  * Commercial intent: Use competitor average (comparison-focused)
  * Navigational intent: Subtract 1-2 sections from average (overview style)
  * Hybrid intents: Blend the modifiers appropriately
- Your final section count = Competitor Average ± Intent Modifier
- DOCUMENT this calculation in your serp_analysis.section_count_analysis field

CONTENT FORMAT ANALYSIS (CRITICAL):
When analyzing competitor pages, you MUST check for content formatting patterns:

1. TABLES: Check if competitors use tables for:
   - Pricing comparisons
   - Feature comparisons
   - Specifications
   - Data presentation
   - Record: How many of the top 5-7 pages use tables? What type?

2. LISTS (Numbered or Bulleted): Check if competitors use lists for:
   - Step-by-step processes
   - Benefits/features lists
   - Requirements/criteria
   - Tips or recommendations
   - Record: How many pages use lists? Are they numbered or bulleted?

3. DECISION LOGIC:
   - If 3+ of top 5 competitors use tables → RECOMMEND tables in your brief
   - If 4+ of top 5 competitors use numbered lists → RECOMMEND numbered lists
   - If Featured Snippet is list-based → STRONGLY RECOMMEND matching format
   - If NO competitors use tables/lists → May not be necessary for this topic

4. DOCUMENT your findings in serp_analysis.content_format_analysis field

MINIMUM REQUIREMENTS (YOUR BRIEF WILL BE REJECTED IF YOU DON'T MEET THESE):
- Analyze AT LEAST 5 competitor pages (7 is ideal)
- Word count range MUST have at least 200-word variance (e.g., "1800-2000" is TOO NARROW)
- Maximum variance is 2000 words (if wider, you didn't analyze enough pages)
- Count H2/H3 sections on AT LEAST 5 competitor pages
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
□ Did I COUNT H2/H3 sections on each competitor page?
□ Did I calculate section count average and apply intent modifier?
□ Did I check for TABLES in competitor content and document findings?
□ Did I check for LISTS (numbered/bulleted) and document findings?
□ Are my patterns specific with numbers/examples (not generic adjectives)?
□ Did I identify at least 1 clear competitive gap?
□ Are my SERP features described in detail?

CRITICAL KEYWORD SELF-CHECK (YOUR BRIEF WILL BE REJECTED WITHOUT THESE):
□ Is the PRIMARY keyword in the H1?
□ Is EACH SECONDARY keyword mentioned in the AFP guidance text or AFP keywords_to_include?
□ Does EACH SECONDARY keyword appear in at least ONE H2 heading?
□ Does EACH SECONDARY keyword appear at least 3x total across the outline?
□ Are ALL longtail/semantic keywords distributed in headings, guidance, or keywords_to_include?

If you answer NO to any of these, FIX IT before generating the JSON.

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
    "competitive_advantages": ["array of real differentiators"],
    "local_trust_signals": ["array of local awards, memberships, community involvement - ONLY signals relevant to the TARGET location, not other locations the client serves"],
    "local_geographic_details": {
      "county": "string - county name for target location",
      "region": "string - region/metro area name (e.g., 'Tampa Bay area')",
      "state": "string - state name",
      "neighborhoods": ["array of neighborhood names within the target city"],
      "relevant_to_topic": ["array of TOPIC-SPECIFIC local entities - NOT generic landmarks. Search for what matters to the page topic (nursing homes for nursing home abuse, intersections for car accidents, etc.) - these MUST be used in section guidance text"]
    },
    "key_entities": {
      "business_name": "exact business name from website",
      "locations": ["city, state entities"],
      "certifications": ["industry certs, standards, memberships"]
    }
  },
  "serp_analysis": {
    "top_ranking_patterns": ["array of strings"],
    "competitive_gaps": ["array of strings"],
    "serp_features": ["array of strings"],
    "section_count_analysis": {
      "competitor_counts": ["array of numbers - H2/H3 count per competitor page"],
      "competitor_average": "number - average section count across competitors",
      "intent_modifier": "number - adjustment based on intent (+2, 0, -2, etc.)",
      "recommended_sections": "number - final recommended section count for this brief",
      "rationale": "string - explanation of calculation"
    },
    "content_format_analysis": {
      "tables": {
        "competitors_using_tables": "number - how many of top 5-7 use tables",
        "table_types": ["array of strings - e.g. 'pricing comparison', 'feature specs'"],
        "recommend_tables": "boolean - true if 3+ competitors use tables",
        "table_recommendation": "string - specific table suggestion if recommended"
      },
      "lists": {
        "competitors_using_lists": "number - how many of top 5-7 use lists",
        "list_types": ["array of strings - e.g. 'numbered steps', 'bulleted benefits'"],
        "recommend_lists": "boolean - true if 4+ competitors use lists",
        "list_recommendation": "string - specific list suggestion if recommended"
      },
      "featured_snippet_format": "string or null - format of featured snippet if present (list, paragraph, table)",
      "rationale": "string - explanation of format recommendations"
    }
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
    "secondary_keywords": [
      {
        "keyword": "string - the secondary keyword",
        "in_afp": "boolean - true if keyword is in AFP guidance or AFP keywords_to_include",
        "afp_location": "string - how it appears in AFP (e.g., 'in guidance text' or 'in keywords_to_include')",
        "in_h2": "boolean - true if keyword appears in at least one H2 heading",
        "h2_heading": "string - the H2 heading that contains this keyword",
        "total_occurrences": "number - total times keyword appears across outline (minimum 3 required)",
        "other_locations": ["array of strings - other sections where keyword appears"]
      }
    ],
    "additional_keywords_distribution": "string - MUST explain how EACH longtail/semantic keyword is distributed across outline sections (in headings or keywords_to_include arrays). If any term is not included, explain why it doesn't fit the content naturally."
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
3. For INTERNAL links: If sitemap URLs are provided, select from that list and set url_status to "200" (pre-verified)
4. For INTERNAL links: Only use web_search to verify if NO sitemap URLs are provided
5. For EXTERNAL links: ALWAYS verify using web_search
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
    if (!url || url.trim() === '') return '';
    
    let urlString = url.trim();
    
    // Add protocol if missing (needed for consistent parsing)
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }
    
    // Extract domain using regex (Apps Script doesn't have URL constructor)
    const match = urlString.match(/^https?:\/\/([^\/]+)/i);
    if (!match || !match[1]) {
      debugLog('EXTRACT_DOMAIN_REGEX_FAIL', { url: urlString });
      return '';
    }
    
    let hostname = match[1];
    // Remove www. prefix
    hostname = hostname.replace(/^www\./, '');
    // Remove port if present
    hostname = hostname.replace(/:\d+$/, '');
    
    return hostname;
  } catch (e) {
    debugLog('EXTRACT_DOMAIN_ERROR', { url: url, error: e.message });
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
    'secondary_keyword', 'longtail_keywords_semantics', 'location', 'intent'
  ];
  requiredHeaders.forEach(header => {
    if (!normalizedHeaders.includes(header)) {
      throw new Error(`Missing required column: ${header}`);
    }
  });
  const outputHeaders = ['id', 'status', 'brief_url', 'run_id', 'notes', 'quality_score'];
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
      if (headers['quality_score']) {
        sheet.getRange(r + 1, headers['quality_score'].index + 1).setValue(brief.quality_score.total_score);
      }
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
  debugLog('BUILD_STRATEGY_INPUT', { url: row.url, primary_keyword: row.primary_keyword });
  const clientDomain = extractDomain(row.url);
  
  if (!clientDomain) {
    debugLog('BUILD_STRATEGY_WARNING', `Could not extract domain from URL: "${row.url}"`);
  }
  const urlType = String(row.url_type || '').toLowerCase().trim();
  const pageType = String(row.page_type || 'blog page').toLowerCase().trim();
  if (!PAGE_TYPES[pageType]) {
    throw new Error(
      `Invalid page_type: "${pageType}". Must be one of: ${Object.keys(PAGE_TYPES).join(', ')}`
    );
  }
  
  // Fetch and filter sitemap URLs upfront for internal linking
  debugLog('SITEMAP_PREFETCH', `Fetching sitemap for ${clientDomain}`);
  const sitemapData = fetchAndFilterSitemap(clientDomain);
  
  return {
    client_url: String(row.url || '').trim(),
    client_domain: clientDomain,
    url_type: urlType,
    is_existing: urlType === 'existing',
    page_type: pageType,
    page_config: PAGE_TYPES[pageType],
    primary_keyword: String(row.primary_keyword || '').trim(),
    secondary_keyword: String(row.secondary_keyword || '').trim(),
    longtail_keywords_semantics: String(row.longtail_keywords_semantics || '').trim(),
    location: String(row.location || '').trim(),
    intent: String(row.intent || 'informational').toLowerCase().trim(),
    sitemap_data: sitemapData
  };
}

function cleanKeyword(keyword) {
  if (!keyword) return '';

  // Normalize Unicode (handles different representations of same character)
  let cleaned = keyword.normalize('NFKC');

  // Remove zero-width spaces, zero-width joiners, and other invisible characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Remove any other control characters
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

function parseKeywords(keywordString) {
  if (!keywordString || keywordString.trim() === '') {
    return { terms: [] };
  }

  const terms = keywordString
    .split(',')
    .map(t => cleanKeyword(t))
    .filter(t => t.length > 0);

  return { terms };
}

/**
 * Analyzes which keywords already contain the location
 * Returns an object with location analysis for local SEO strategy
 */
function analyzeLocationInKeywords(strategy) {
  const location = (strategy.location || '').toLowerCase().trim();
  
  if (!location) {
    return {
      hasLocation: false,
      locationInPrimary: false,
      locationInSecondary: false,
      locationInLongtail: false,
      secondaryWithLocation: [],
      secondaryWithoutLocation: [],
      longtailWithLocation: [],
      longtailWithoutLocation: [],
      needsLocationInH1: false,
      needsLocationVariationInAFP: false
    };
  }
  
  const primary = (strategy.primary_keyword || '').toLowerCase();
  const locationInPrimary = primary.includes(location);
  
  // Parse secondary keywords
  const secondaryKeywords = (strategy.secondary_keyword || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  
  const secondaryWithLocation = secondaryKeywords.filter(k => k.toLowerCase().includes(location));
  const secondaryWithoutLocation = secondaryKeywords.filter(k => !k.toLowerCase().includes(location));
  const locationInSecondary = secondaryWithLocation.length > 0;
  
  // Parse longtail keywords
  const longtailKeywords = (strategy.longtail_keywords_semantics || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  
  const longtailWithLocation = longtailKeywords.filter(k => k.toLowerCase().includes(location));
  const longtailWithoutLocation = longtailKeywords.filter(k => !k.toLowerCase().includes(location));
  const locationInLongtail = longtailWithLocation.length > 0;
  
  return {
    hasLocation: true,
    location: strategy.location,
    locationInPrimary,
    locationInSecondary,
    locationInLongtail,
    secondaryWithLocation,
    secondaryWithoutLocation,
    longtailWithLocation,
    longtailWithoutLocation,
    // H1 needs location added only if primary keyword doesn't already have it
    needsLocationInH1: !locationInPrimary,
    // AFP needs location variation (state/region/county) if primary already has the city
    needsLocationVariationInAFP: locationInPrimary
  };
}

/**
 * Fetches robots.txt and extracts sitemap URLs
 * Returns array of sitemap URLs found, or empty array if none
 */
function getSitemapUrlsFromRobots(baseUrl) {
  const sitemapUrls = [];
  
  try {
    const robotsUrl = `${baseUrl}/robots.txt`;
    debugLog('ROBOTS_FETCH', `Checking ${robotsUrl}`);
    
    const response = UrlFetchApp.fetch(robotsUrl, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      debugLog('ROBOTS_FETCH', `No robots.txt found at ${robotsUrl}`);
      return sitemapUrls;
    }
    
    const robotsContent = response.getContentText();
    
    // Find all Sitemap: directives (case-insensitive)
    const sitemapMatches = robotsContent.match(/^sitemap:\s*(.+)$/gim);
    
    if (sitemapMatches && sitemapMatches.length > 0) {
      sitemapMatches.forEach(match => {
        const url = match.replace(/^sitemap:\s*/i, '').trim();
        if (url && url.startsWith('http')) {
          sitemapUrls.push(url);
        }
      });
      debugLog('ROBOTS_SITEMAPS', `Found ${sitemapUrls.length} sitemap(s) in robots.txt: ${sitemapUrls.join(', ')}`);
    } else {
      debugLog('ROBOTS_SITEMAPS', 'No Sitemap directives found in robots.txt');
    }
    
  } catch (e) {
    debugLog('ROBOTS_ERROR', e.message);
  }
  
  return sitemapUrls;
}

/**
 * Fetches sitemap and filters/categorizes URLs for internal linking
 * Returns pre-verified URLs that Claude can pick from
 */
function fetchAndFilterSitemap(domain) {
  const result = {
    total_found: 0,
    total_after_filter: 0,
    sitemap_source: null,
    urls_by_category: {
      services: [],
      practice_areas: [],
      locations: [],
      blog: [],
      about: [],
      other: []
    },
    all_filtered_urls: []
  };
  
  // Handle empty or invalid domain
  if (!domain || domain.trim() === '') {
    debugLog('SITEMAP_ERROR', 'Empty domain provided, skipping sitemap fetch');
    return result;
  }
  
  try {
    // Ensure domain has protocol
    let baseUrl = domain.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Step 1: Try to get sitemap URLs from robots.txt
    let sitemapUrls = getSitemapUrlsFromRobots(baseUrl);
    
    // Step 2: If no sitemaps in robots.txt, try common sitemap locations
    if (sitemapUrls.length === 0) {
      const commonSitemapPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap-index.xml',
        '/wp-sitemap.xml',
        '/sitemaps/sitemap.xml',
        '/sitemap/sitemap.xml'
      ];
      
      debugLog('SITEMAP_FALLBACK', 'No sitemaps in robots.txt, trying common locations...');
      
      for (const path of commonSitemapPaths) {
        const testUrl = baseUrl + path;
        try {
          const testResponse = UrlFetchApp.fetch(testUrl, { muteHttpExceptions: true });
          if (testResponse.getResponseCode() === 200) {
            const content = testResponse.getContentText();
            // Verify it's actually XML/sitemap content
            if (content.includes('<urlset') || content.includes('<sitemapindex') || content.includes('<loc>')) {
              sitemapUrls.push(testUrl);
              debugLog('SITEMAP_FOUND', `Found sitemap at ${testUrl}`);
              break; // Found one, stop looking
            }
          }
        } catch (e) {
          // Silently continue to next path
        }
      }
    }
    
    if (sitemapUrls.length === 0) {
      debugLog('SITEMAP_NOT_FOUND', `No sitemap found for ${baseUrl}`);
      return result;
    }
    
    result.sitemap_source = sitemapUrls[0];
    
    // Step 3: Fetch and parse sitemap(s)
    let allUrls = [];
    
    // Process each sitemap URL (limit to first 3 to avoid timeout)
    for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
      debugLog('SITEMAP_PROCESSING', sitemapUrl);
      
      try {
        const response = UrlFetchApp.fetch(sitemapUrl, { muteHttpExceptions: true });
        
        if (response.getResponseCode() !== 200) {
          debugLog('SITEMAP_FETCH_FAILED', `Could not fetch ${sitemapUrl}`);
          continue;
        }
        
        const xml = response.getContentText();
        
        // Check if this is a sitemap index (contains other sitemaps)
        const sitemapIndexMatches = xml.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g);
        
        if (sitemapIndexMatches && sitemapIndexMatches.length > 0) {
          // This is a sitemap index - fetch child sitemaps (limit to first 3 to avoid timeout)
          debugLog('SITEMAP_INDEX', `Found sitemap index with ${sitemapIndexMatches.length} child sitemaps`);
          const childSitemapUrls = sitemapIndexMatches
            .slice(0, 3)
            .map(match => {
              const locMatch = match.match(/<loc>(.*?)<\/loc>/);
              return locMatch ? locMatch[1] : null;
            })
            .filter(url => url);
          
          for (const childUrl of childSitemapUrls) {
            try {
              const childResponse = UrlFetchApp.fetch(childUrl, { muteHttpExceptions: true });
              if (childResponse.getResponseCode() === 200) {
                const childXml = childResponse.getContentText();
                const childUrlMatches = childXml.match(/<loc>(.*?)<\/loc>/g);
                if (childUrlMatches) {
                  const childUrls = childUrlMatches.map(match => match.replace(/<\/?loc>/g, ''));
                  allUrls = allUrls.concat(childUrls);
                }
              }
            } catch (e) {
              debugLog('CHILD_SITEMAP_ERROR', e.message);
            }
          }
        } else {
          // Regular sitemap - extract URLs directly
          const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
          if (urlMatches) {
            const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));
            allUrls = allUrls.concat(urls);
          }
        }
      } catch (e) {
        debugLog('SITEMAP_PARSE_ERROR', e.message);
      }
    }

    result.total_found = allUrls.length;
    debugLog('SITEMAP_FETCH', `Found ${allUrls.length} total URLs`);

    // Filter out junk URLs
    const excludePatterns = [
      /\/tag\//i,
      /\/tags\//i,
      /\/author\//i,
      /\/authors\//i,
      /\/category\//i,
      /\/categories\//i,
      /\/archive\//i,
      /\/page\/\d+/i,
      /\/search\//i,
      /\/search\?/i,
      /\?s=/i,
      /\/feed\//i,
      /\/rss\//i,
      /\/amp\//i,
      /\/amp$/i,
      /\/print\//i,
      /\/attachment\//i,
      /\/wp-content\//i,
      /\/wp-admin\//i,
      /\/wp-includes\//i,
      /\/cdn-cgi\//i,
      /\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js)$/i,
      /\/\d{4}\/\d{2}\/\d{2}\//,  // Date-based archives like /2024/01/15/
      /#/,  // Anchor links
    ];

    const filteredUrls = allUrls.filter(url => {
      // Must be same domain
      if (!url.toLowerCase().includes(domain.toLowerCase().replace(/^https?:\/\//, ''))) {
        return false;
      }
      // Must not match exclude patterns
      return !excludePatterns.some(pattern => pattern.test(url));
    });

    result.total_after_filter = filteredUrls.length;
    result.all_filtered_urls = filteredUrls;
    debugLog('SITEMAP_FILTER', `${filteredUrls.length} URLs after filtering`);

    // Categorize URLs
    filteredUrls.forEach(url => {
      const urlLower = url.toLowerCase();
      
      if (/\/(service|services|what-we-do)\//i.test(urlLower)) {
        result.urls_by_category.services.push(url);
      } else if (/\/(practice-area|practice-areas|areas-of-practice|legal-services)\//i.test(urlLower)) {
        result.urls_by_category.practice_areas.push(url);
      } else if (/\/(location|locations|office|offices|areas-served|service-area)\//i.test(urlLower)) {
        result.urls_by_category.locations.push(url);
      } else if (/\/(blog|news|articles|resources|insights|posts)\//i.test(urlLower)) {
        result.urls_by_category.blog.push(url);
      } else if (/\/(about|about-us|our-team|attorneys|team|staff|who-we-are)\//i.test(urlLower)) {
        result.urls_by_category.about.push(url);
      } else {
        result.urls_by_category.other.push(url);
      }
    });

    debugLog('SITEMAP_CATEGORIZED', {
      services: result.urls_by_category.services.length,
      practice_areas: result.urls_by_category.practice_areas.length,
      locations: result.urls_by_category.locations.length,
      blog: result.urls_by_category.blog.length,
      about: result.urls_by_category.about.length,
      other: result.urls_by_category.other.length
    });

    return result;

  } catch (e) {
    debugLog('SITEMAP_ERROR', e.message);
    return result;
  }
}

/**
 * Legacy function - kept for backward compatibility
 * Now just calls fetchAndFilterSitemap and returns raw URLs
 */
function getSitemapLinks(domain) {
  const result = fetchAndFilterSitemap(domain);
  return result.all_filtered_urls;
}

function verifyInternalLinks(suggestedLinks, sitemapData) {
  // If no sitemap data provided, try to get it (backward compatibility)
  if (!sitemapData || !sitemapData.all_filtered_urls) {
    debugLog('LINK_VERIFICATION', 'No pre-fetched sitemap, skipping verification');
    return suggestedLinks.map(link => ({
      ...link,
      url_status: 'unverified',
      verification_method: 'none'
    }));
  }

  const sitemapUrls = sitemapData.all_filtered_urls;
  debugLog('LINK_VERIFICATION_START', `Verifying ${suggestedLinks.length} links against ${sitemapUrls.length} sitemap URLs`);
  
  // Normalize URL for comparison (handles trailing slashes, www, protocol)
  function normalizeUrl(url) {
    if (!url) return '';
    return url.toLowerCase()
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/^www\./, '')         // Remove www
      .replace(/\/+$/, '');          // Remove trailing slashes
  }
  
  // Pre-normalize sitemap URLs for faster comparison
  const normalizedSitemapUrls = sitemapUrls.map(url => ({
    original: url,
    normalized: normalizeUrl(url)
  }));

  return suggestedLinks.map(link => {
    const normalizedLinkUrl = normalizeUrl(link.url);
    const match = normalizedSitemapUrls.find(item => item.normalized === normalizedLinkUrl);

    if (match) {
      debugLog('LINK_VERIFIED', `✓ ${link.url} → matched ${match.original}`);
      return {
        ...link,
        url: match.original,  // Use the original sitemap URL (correct format)
        url_status: 'verified',
        verification_method: 'sitemap'
      };
    } else {
      // Try to find a similar URL by matching the last path segment
      const lastSegment = normalizedLinkUrl.split('/').filter(Boolean).pop();
      const similarMatch = normalizedSitemapUrls.find(item => 
        item.normalized.split('/').filter(Boolean).pop() === lastSegment
      );
      
      debugLog('LINK_NOT_FOUND', `✗ ${link.url} (normalized: ${normalizedLinkUrl}) - similar: ${similarMatch ? similarMatch.original : 'none'}`);

      return {
        ...link,
        url_status: 'not_found_in_sitemap',
        alternative_url: similarMatch ? similarMatch.original : null,
        verification_note: 'URL not in provided sitemap list',
        verification_method: 'sitemap'
      };
    }
  });
}

function generateKeywordDistributionPlan(parsed, strategy) {
  const plan = {
    terms: [],
    validation_requirements: {
      min_terms_distributed: parsed.terms.length, // 100% required
      total_terms: parsed.terms.length
    }
  };

  // All terms treated equally - distribute in headings or keywords_to_include
  parsed.terms.forEach((term, idx) => {
    plan.terms.push({
      term: term,
      priority: idx < 3 ? 'high' : 'medium',
      placement: 'heading or keywords_to_include',
      suggested_section: `Section ${idx + 1}`
    });
  });

  return plan;
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

  // Parse and categorize keywords
  const parsed = parseKeywords(strategy.longtail_keywords_semantics);
  const distributionPlan = generateKeywordDistributionPlan(parsed, strategy);
  
  // Analyze location in keywords for local SEO strategy
  const locationAnalysis = analyzeLocationInKeywords(strategy);
  
  // Parse intent to handle hybrid formats like "transactional/informational"
  const intentData = parseIntent(strategy.intent);

  debugLog('KEYWORD_PARSING', {
    total_terms: parsed.terms.length,
    distribution_plan: distributionPlan,
    intent_parsed: intentData,
    location_analysis: locationAnalysis
  });

  let systemPrompt = SYSTEM_PROMPT.replace(/CLIENT_DOMAIN/g, strategy.client_domain);

  // Replace intent placeholder with actual structure (supports hybrid intents)
  const intentKey = intentData.hybridKey;
  const intentStruct = CONTENT_STRUCTURES[intentKey] || CONTENT_STRUCTURES[intentData.primary] || CONTENT_STRUCTURES['informational'];
  const intentGuidance = `
${strategy.intent.toUpperCase()} INTENT STRUCTURE:
- AFP Focus: ${intentStruct.afp_focus}
- Section Count: ${intentStruct.section_count}
- Section Depth: ${intentStruct.section_depth}
- CTA Frequency: ${intentStruct.cta_frequency}
- CTA Type: ${intentStruct.cta_type}
- Emphasis: ${intentStruct.emphasis}
- Tone: ${intentStruct.tone}
`;
  systemPrompt = systemPrompt.replace('[INTENT_STRUCTURE_PLACEHOLDER]', intentGuidance);

  // Create a copy of strategy without sitemap_data for the JSON dump (sitemap URLs are shown separately)
  const strategyForDisplay = { ...strategy };
  delete strategyForDisplay.sitemap_data;

  let userMessage = `Create a complete SEO content brief for AI content generation.

STRATEGY DETAILS:
${JSON.stringify(strategyForDisplay, null, 2)}

`;

  // Add secondary keyword requirements FIRST (before longtails)
  if (strategy.secondary_keyword && strategy.secondary_keyword.trim()) {
    const secondaryKeywords = strategy.secondary_keyword.split(',').map(k => k.trim()).filter(Boolean);
    userMessage += `\n════════════════════════════════════════════════════════════\n`;
    userMessage += `🔴 SECONDARY KEYWORD H2 REQUIREMENTS - READ CAREFULLY 🔴\n`;
    userMessage += `════════════════════════════════════════════════════════════\n\n`;
    userMessage += `Secondary keyword(s): ${secondaryKeywords.map(k => `"${k}"`).join(', ')}\n\n`;
    
    userMessage += `⛔ YOUR BRIEF WILL BE AUTOMATICALLY REJECTED IF YOU DO NOT FOLLOW THESE RULES:\n\n`;
    
    userMessage += `RULE 1 - AFP REQUIREMENT:\n`;
    userMessage += `Each secondary keyword MUST be mentioned in the AFP/brand intro guidance.\n`;
    userMessage += `Either in the guidance text OR in the keywords_to_include array.\n\n`;
    
    userMessage += `RULE 2 - H2 HEADING REQUIREMENT (MOST IMPORTANT):\n`;
    userMessage += `Each secondary keyword MUST appear in at least ONE H2 heading.\n`;
    userMessage += `DO NOT just put it in keywords_to_include - the keyword must be IN THE H2 TITLE TEXT.\n\n`;
    
    userMessage += `REQUIRED H2 HEADINGS - You MUST create H2s similar to these:\n`;
    secondaryKeywords.forEach(kw => {
      const kwTitleCase = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      userMessage += `\n   For "${kw}", use ONE of these H2 formats:\n`;
      userMessage += `   • "Why Choose [Brand] ${kwTitleCase}"\n`;
      userMessage += `   • "${kwTitleCase} - Sizes, Pricing & Options"\n`;
      userMessage += `   • "Best ${kwTitleCase} for Your Needs"\n`;
      userMessage += `   • "${kwTitleCase}: What to Know Before Buying"\n`;
      userMessage += `   • "Finding Quality ${kwTitleCase}"\n`;
      userMessage += `   (Or create your own H2 that CONTAINS the exact phrase "${kw}")\n`;
    });
    
    userMessage += `\nRULE 3 - TOTAL DISTRIBUTION:\n`;
    userMessage += `Each secondary keyword must appear at least 3x total across the outline.\n`;
    userMessage += `This includes: H2 heading + AFP + keywords_to_include arrays.\n\n`;
    
    userMessage += `⚠️ SELF-CHECK BEFORE GENERATING JSON:\n`;
    secondaryKeywords.forEach(kw => {
      userMessage += `   □ "${kw}" → In AFP guidance? ___ | IN an H2 title? ___ | 3x total? ___\n`;
    });
    userMessage += `\n   If ANY checkbox is NO, FIX IT before outputting JSON.\n`;
    userMessage += `════════════════════════════════════════════════════════════\n\n`;
  }

  // Add LOCAL SEO requirements if location is provided
  if (locationAnalysis.hasLocation) {
    userMessage += `\n════════════════════════════════════════════════════════════\n`;
    userMessage += `📍 LOCAL SEO OPTIMIZATION REQUIREMENTS 📍\n`;
    userMessage += `════════════════════════════════════════════════════════════\n\n`;
    userMessage += `Target Location: "${strategy.location}"\n\n`;
    
    // H1 Location Requirements
    userMessage += `H1 LOCATION STRATEGY:\n`;
    if (locationAnalysis.needsLocationInH1) {
      userMessage += `✅ ADD location to H1 - Primary keyword "${strategy.primary_keyword}" does NOT contain "${strategy.location}"\n`;
      userMessage += `   Example formats:\n`;
      userMessage += `   • "[Primary Keyword] in ${strategy.location}"\n`;
      userMessage += `   • "${strategy.location} [Primary Keyword]"\n`;
      userMessage += `   • "[Primary Keyword] | ${strategy.location}"\n\n`;
    } else {
      userMessage += `⏭️ SKIP adding location to H1 - Primary keyword already contains "${strategy.location}"\n`;
      userMessage += `   Just use the primary keyword as-is in the H1.\n\n`;
    }
    
    // H2 Location Strategy - NOW REQUIRES county/region in at least 1 H2
    userMessage += `H2 LOCATION STRATEGY (MANDATORY):\n`;
    userMessage += `⚠️ IMPORTANT: If a keyword already contains "${strategy.location}", do NOT add it again.\n\n`;
    userMessage += `   Keywords that ALREADY have location (no need to add): ${locationAnalysis.secondaryWithLocation.length > 0 ? locationAnalysis.secondaryWithLocation.map(k => `"${k}"`).join(', ') : 'None'}${locationAnalysis.longtailWithLocation.length > 0 ? ', ' + locationAnalysis.longtailWithLocation.map(k => `"${k}"`).join(', ') : ''}\n`;
    userMessage += `   Keywords WITHOUT location (location can be added if using in generic H2): ${locationAnalysis.secondaryWithoutLocation.length > 0 ? locationAnalysis.secondaryWithoutLocation.map(k => `"${k}"`).join(', ') : 'None'}${locationAnalysis.longtailWithoutLocation.length > 0 ? ', ' + locationAnalysis.longtailWithoutLocation.map(k => `"${k}"`).join(', ') : ''}\n\n`;
    userMessage += `🔴 REQUIRED: At least ONE H2 must include COUNTY or REGION name (not just city).\n`;
    userMessage += `   This provides geographic depth beyond just repeating "${strategy.location}".\n`;
    userMessage += `   Examples:\n`;
    userMessage += `   • "Serving [County] County Families"\n`;
    userMessage += `   • "Why [Region] Residents Choose Us"\n`;
    userMessage += `   • "[County] County [Service] Resources"\n`;
    userMessage += `   • "Our [Region] Experience"\n\n`;
    userMessage += `   You may also localize 1-2 additional H2s with the city name where natural.\n`;
    userMessage += `   Limit: 2-3 localized H2s maximum to avoid over-optimization.\n\n`;
    
    // AFP Location Requirements - NOW REQUIRES county/region
    userMessage += `AFP (OPENING PARAGRAPH) LOCATION REQUIREMENTS (MANDATORY):\n`;
    userMessage += `🔴 REQUIRED: AFP guidance MUST include BOTH:\n`;
    userMessage += `   1. The target location "${strategy.location}"\n`;
    userMessage += `   2. At least ONE geographic variation (county, region, OR state)\n\n`;
    if (locationAnalysis.needsLocationVariationInAFP) {
      userMessage += `Since primary keyword already contains "${strategy.location}", emphasize the variations:\n`;
    }
    userMessage += `   Geographic variations to use:\n`;
    userMessage += `   • County name (e.g., "Hillsborough County", "Harris County")\n`;
    userMessage += `   • Region/Metro area (e.g., "Tampa Bay area", "Greater Houston")\n`;
    userMessage += `   • State name (e.g., "Florida", "Texas")\n`;
    userMessage += `   This expands geographic relevance and signals local expertise.\n\n`;
    
    // Geographic Entity Guidance - NOW INCLUDES neighborhoods and landmarks
    userMessage += `GEOGRAPHIC ENTITIES TO USE THROUGHOUT CONTENT:\n`;
    userMessage += `When writing guidance, include references to these geographic entities where natural:\n`;
    userMessage += `   • Primary location: ${strategy.location}\n`;
    userMessage += `   • County name (REQUIRED - find during research)\n`;
    userMessage += `   • Region/Metro area (REQUIRED - find during research)\n`;
    userMessage += `   • State name\n`;
    userMessage += `   ⛔ DO NOT use nearby cities - we may have separate pages for those.\n`;
    userMessage += `   ✅ DO use: county names, regions, state references\n\n`;
    
    // UPDATED: Topic-Specific Local Entities (not generic landmarks)
    userMessage += `TOPIC-SPECIFIC LOCAL ENTITIES (Search Smart, Not Generic):\n\n`;
    userMessage += `STEP 1 - IDENTIFY WHAT'S RELEVANT TO THE TOPIC:\n`;
    userMessage += `   Based on the primary keyword "${strategy.primary_keyword}", determine what LOCAL entities matter:\n`;
    userMessage += `   • Nursing home abuse → Search for "nursing homes in ${strategy.location}", "assisted living facilities ${strategy.location}"\n`;
    userMessage += `   • Car accident → Search for "dangerous intersections ${strategy.location}", "major highways ${strategy.location}"\n`;
    userMessage += `   • Medical malpractice → Search for "hospitals in ${strategy.location}", "medical centers ${strategy.location}"\n`;
    userMessage += `   • Workers comp → Search for "major employers ${strategy.location}", "industrial areas ${strategy.location}"\n`;
    userMessage += `   • Real estate → Search for "neighborhoods ${strategy.location}", "school districts ${strategy.location}"\n`;
    userMessage += `   • General/other → Search for neighborhoods and general landmarks\n\n`;
    
    userMessage += `STEP 2 - SEARCH FOR TOPIC-SPECIFIC ENTITIES:\n`;
    userMessage += `   • Use web_search to find actual names of relevant local entities\n`;
    userMessage += `   • Example for nursing home abuse: Find actual nursing home/facility names in ${strategy.location} area\n`;
    userMessage += `   • Store in local_geographic_details.relevant_to_topic (these are already relevant - no filtering needed)\n`;
    userMessage += `   • Also document neighborhoods in local_geographic_details.neighborhoods\n\n`;
    
    userMessage += `STEP 3 - USE IN GUIDANCE TEXT (REQUIRED):\n`;
    userMessage += `   ⚠️ You MUST use at least 2-3 topic-relevant local entities in your section guidance text.\n`;
    userMessage += `   • Reference specific facility names, intersections, employers, etc. relevant to the topic\n`;
    userMessage += `   • Example: "Mention facilities throughout Hillsborough County including [specific nursing home areas]"\n`;
    userMessage += `   • Neighborhoods can be referenced in contact/service area sections\n\n`;
    userMessage += `   ⛔ DO NOT search for generic "landmarks" and hope something is relevant\n`;
    userMessage += `   ⛔ DO NOT put local entities in H2 headings - only in guidance text or keywords_to_include\n`;
    userMessage += `   ✅ DO search for what actually matters to someone reading about "${strategy.primary_keyword}"\n\n`;
    
    // Local Trust Signals - NOW REQUIRES relevance to TARGET location
    userMessage += `LOCAL TRUST SIGNALS (MUST BE RELEVANT TO TARGET LOCATION):\n`;
    userMessage += `When researching the client website, look for trust signals SPECIFIC TO "${strategy.location}":\n`;
    userMessage += `   • Local awards/recognition mentioning ${strategy.location} or its county/region\n`;
    userMessage += `   • Memberships in ${strategy.location}-area organizations\n`;
    userMessage += `   • Community involvement in ${strategy.location}\n`;
    userMessage += `   • Years serving ${strategy.location} specifically\n`;
    userMessage += `   • Case results or testimonials from ${strategy.location} area\n\n`;
    userMessage += `   ⛔ DO NOT include trust signals for OTHER locations the client serves.\n`;
    userMessage += `      Example: If target is "Tampa" but client has awards in "Miami" - do NOT include Miami awards.\n`;
    userMessage += `   ⛔ DO NOT include generic company-wide trust signals unless they apply to ${strategy.location}.\n`;
    userMessage += `   ✅ If NO ${strategy.location}-specific trust signals exist, leave local_trust_signals empty or note "No location-specific trust signals found".\n`;
    userMessage += `   ⚠️ Never fabricate trust signals - only include what is actually on the client website AND relevant to ${strategy.location}.\n\n`;
    
    // Local External Links
    userMessage += `LOCAL EXTERNAL LINK REQUIREMENTS:\n`;
    userMessage += `Within your external links (max 4 total), prioritize 1-2 local authority sources:\n`;
    userMessage += `   • State .gov websites (state agencies, regulations)\n`;
    userMessage += `   • County/city government sites for ${strategy.location}\n`;
    userMessage += `   • Local courts or legal resources (if applicable)\n`;
    userMessage += `   • Local hospitals or institutions in ${strategy.location} (if applicable)\n`;
    userMessage += `   • State-specific laws or regulations\n`;
    userMessage += `   These strengthen local relevance signals for both traditional SEO and LLM optimization.\n\n`;
    
    // Self-check - UPDATED with new requirements
    userMessage += `⚠️ LOCAL SEO SELF-CHECK BEFORE GENERATING JSON:\n`;
    if (locationAnalysis.needsLocationInH1) {
      userMessage += `   □ H1 includes "${strategy.location}"? ___\n`;
    }
    userMessage += `   □ AFP guidance includes BOTH city AND county/region/state? ___\n`;
    userMessage += `   □ At least 1 H2 includes county or region name (not just city)? ___\n`;
    userMessage += `   □ Searched for TOPIC-SPECIFIC local entities (not generic landmarks)? ___\n`;
    userMessage += `   □ Stored topic-relevant entities in local_geographic_details.relevant_to_topic? ___\n`;
    userMessage += `   □ Used 2-3 topic-relevant entities in section GUIDANCE TEXT? ___\n`;
    userMessage += `   □ Local trust signals are SPECIFIC to ${strategy.location} (not other locations)? ___\n`;
    userMessage += `   □ Included at least 1 local/state authority external link? ___\n`;
    userMessage += `   □ Did NOT use nearby cities (only county/region/state)? ___\n`;
    userMessage += `════════════════════════════════════════════════════════════\n\n`;
  }

  userMessage += `KEYWORD DISTRIBUTION PLAN (MANDATORY):\n`;

  if (parsed.terms.length > 0) {
    userMessage += `\n⚠️  CRITICAL KEYWORD DISTRIBUTION REQUIREMENT ⚠️\n`;
    userMessage += `The following ${parsed.terms.length} longtail/semantic keywords MUST ALL be distributed throughout your outline:\n\n`;
    parsed.terms.forEach((term, idx) => {
      userMessage += `${idx + 1}. "${term}"\n`;
    });
    userMessage += `\n🔴 MANDATORY DISTRIBUTION RULES (BRIEF WILL BE REJECTED IF NOT FOLLOWED):\n`;
    userMessage += `- ALL ${parsed.terms.length} keywords MUST appear in the outline (100% REQUIRED)\n`;
    userMessage += `- These keywords should INFORM and SHAPE your section structure - create sections that naturally target these terms\n`;
    userMessage += `- Preferred placement: Use longtails in H2/H3 headings where they fit naturally\n`;
    userMessage += `  Example: If given "bedsore lawsuit settlements" → Create section "Understanding Bedsore Lawsuit Settlements"\n`;
    userMessage += `- Secondary placement: In a section's keywords_to_include array\n`;
    userMessage += `- Tertiary placement: In the guidance text for a section\n`;
    userMessage += `- DO NOT skip ANY keywords - each one represents user intent and must be addressed\n`;
    userMessage += `- VERIFICATION STEP: Before returning the JSON, count your longtails and where you placed them. ALL ${parsed.terms.length} MUST be accounted for.\n\n`;
  }

  // Add AVAILABLE INTERNAL LINKS section with pre-fetched sitemap URLs
  userMessage += `\n════════════════════════════════════════════════════════════\n`;
  userMessage += `🔗 AVAILABLE INTERNAL LINKS (PRE-VERIFIED FROM SITEMAP) 🔗\n`;
  userMessage += `════════════════════════════════════════════════════════════\n\n`;
  
  if (strategy.sitemap_data && strategy.sitemap_data.total_after_filter > 0) {
    userMessage += `We have pre-fetched ${strategy.sitemap_data.total_after_filter} verified URLs from the client sitemap.\n`;
    userMessage += `⚠️ IMPORTANT: ONLY select internal links from this list. These URLs are verified and live.\n\n`;
    
    // Show all filtered URLs as a simple flat list
    userMessage += `AVAILABLE PAGES (${strategy.sitemap_data.all_filtered_urls.length} total):\n`;
    strategy.sitemap_data.all_filtered_urls.forEach(url => {
      userMessage += `  • ${url}\n`;
    });
    userMessage += `\n`;
    
    userMessage += `INTERNAL LINK SELECTION RULES:\n`;
    userMessage += `1. Select ${CONFIG.MIN_INTERNAL_LINKS}-${CONFIG.MAX_INTERNAL_LINKS} links from the list above\n`;
    userMessage += `2. Choose links contextually relevant to "${strategy.primary_keyword}"\n`;
    userMessage += `3. All URLs above are PRE-VERIFIED - set url_status to "200" for all selected links\n`;
    userMessage += `4. DO NOT invent URLs that are not in the list above\n`;
    userMessage += `5. DO NOT use web_search to verify these internal links - they are already verified\n\n`;
  } else {
    userMessage += `⚠️ No sitemap found for ${strategy.client_domain}.\n`;
    userMessage += `You will need to use site:${strategy.client_domain} search to discover internal link candidates.\n`;
    userMessage += `Verify each discovered URL with web_search before including.\n\n`;
  }
  userMessage += `════════════════════════════════════════════════════════════\n\n`;

  userMessage += `CRITICAL WORKFLOW:
1. FIRST: Research client website (${strategy.client_domain})
   - Use site: search to find 6-8 most relevant pages
   - Use web_search to analyze those pages (search for specific URLs)
   - Extract factual information about client offerings
   
2. THEN: Analyze SERPs for "${strategy.primary_keyword}"
   - Find top ranking pages
   - Identify content patterns and gaps
   
3. THEN: Select internal links from PRE-VERIFIED list above
   - Choose ${CONFIG.MIN_INTERNAL_LINKS}-${CONFIG.MAX_INTERNAL_LINKS} relevant URLs from the sitemap lists provided
   - DO NOT use site: search for internal links - they are already provided
   - All URLs in the list are verified and live
   
4. THEN: Find external link suggestions
   - Verify external links with web_search
   - Provide alternatives for any broken/404 links
   
5. FINALLY: Create the complete JSON brief in this response
   - Do NOT pause or wait after research
   - Generate the full JSON brief immediately

REQUIREMENTS:
1. Research 6-8 most relevant pages from ${strategy.client_domain} using web_search
2. Use only REAL facts found on client site - never hallucinate
3. Select ${CONFIG.MIN_INTERNAL_LINKS}-${CONFIG.MAX_INTERNAL_LINKS} internal links FROM THE PRE-VERIFIED LIST ABOVE
4. Find up to ${CONFIG.MAX_EXTERNAL_LINKS} verified external links
5. Verify EXTERNAL link URLs using web_search (internal links are pre-verified)
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
        // Filter to keep tool-related blocks and ALL text blocks (parser handles JSON extraction)
        assistantContent = assistantContent.filter(block => 
          block.type === 'tool_use' || 
          block.type === 'server_tool_use' || 
          block.type === 'web_search_tool_result' ||
          block.type === 'text'
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

        // Force generation after sufficient research (prevent infinite tool use loop)
        if (currentTurn >= 3) {
          debugLog('FORCING_GENERATION', `After ${currentTurn} turns, forcing brief generation`);
          toolResults.push({
            type: 'text',
            text: 'You have completed sufficient research. Now generate the complete JSON brief immediately. Return ONLY the JSON object starting with { and ending with }. Do NOT use any more tools.'
          });
        }

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

    // Verify internal links against pre-fetched sitemap
    if (brief.internal_links && brief.internal_links.length > 0) {
      brief.internal_links = verifyInternalLinks(brief.internal_links, strategy.sitemap_data);
      debugLog('LINK_VERIFICATION', `Verified ${brief.internal_links.length} internal links`);
    }

    // Run all validations with retry support
    let validationResults = runAllValidations(brief, strategy);
    
    if (!validationResults.allPassed) {
      debugLog('VALIDATION_FAILED_FIRST_ATTEMPT', {
        passed: validationResults.passed,
        failed: validationResults.failed,
        error_count: validationResults.errors.length
      });
      
      // Construct retry message and ask Claude to fix
      const retryMessage = constructValidationRetryMessage(validationResults, brief);
      
      conversationMessages.push({
        role: 'assistant',
        content: [{ type: 'text', text: briefText }]
      });
      conversationMessages.push({
        role: 'user', 
        content: retryMessage
      });
      
      debugLog('VALIDATION_RETRY', 'Asking Claude to fix validation errors...');
      
      // Make one more API call to get the fixed brief
      requestBody.messages = conversationMessages;
      
      const retryResponse = robustFetch('https://api.anthropic.com/v1/messages', {
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
      
      const retryStatusCode = retryResponse.getResponseCode();
      const retryResponseText = retryResponse.getContentText();
      
      if (retryStatusCode !== 200) {
        debugLog('VALIDATION_RETRY_API_ERROR', retryStatusCode);
        // Fall through to throw original validation errors
      } else {
        const retryData = JSON.parse(retryResponseText);
        const retryTextBlocks = retryData.content.filter(block => block.type === 'text');
        
        if (retryTextBlocks.length > 0) {
          const retryBriefText = retryTextBlocks.map(block => block.text).join('\n');
          debugLog('VALIDATION_RETRY_RESPONSE_LENGTH', retryBriefText.length);
          
          try {
            const retryBrief = parseClaudeResponse(retryBriefText);
            
            // Re-verify internal links against pre-fetched sitemap
            if (retryBrief.internal_links && retryBrief.internal_links.length > 0) {
              retryBrief.internal_links = verifyInternalLinks(retryBrief.internal_links, strategy.sitemap_data);
            }
            
            // Run ALL validations again on the retry brief
            validationResults = runAllValidations(retryBrief, strategy);
            
            if (validationResults.allPassed) {
              debugLog('VALIDATION_RETRY_SUCCESS', 'All validations passed on retry');
              return retryBrief;
            } else {
              debugLog('VALIDATION_RETRY_STILL_FAILED', {
                passed: validationResults.passed,
                failed: validationResults.failed
              });
              // Fall through to throw errors
            }
          } catch (parseError) {
            debugLog('VALIDATION_RETRY_PARSE_ERROR', parseError.message);
            // Fall through to throw original validation errors
          }
        }
      }
      
      // If we get here, retry didn't fix the issues - throw the original errors
      const errorMessages = validationResults.errors.map(e => e.message).join('\n\n---\n\n');
      throw new Error(
        `VALIDATION FAILED AFTER RETRY ATTEMPT:\n\n${errorMessages}\n\n` +
        `Passed: ${validationResults.passed.join(', ') || 'None'}\n` +
        `Failed: ${validationResults.failed.join(', ')}`
      );
    }
    
    debugLog('VALIDATION_SUCCESS', 'All validations passed on first attempt');
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

  // Attempt 3: Fix unescaped characters in strings
  let escapedJson = cleanedJson
    .replace(/"((?:[^"\\]|\\.)*)"/g, function(match, content) {
      // Properly escape special characters inside strings
      let escaped = content
        .replace(/\\/g, '\\\\')           // Escape backslashes
        .replace(/\n/g, '\\n')            // Escape newlines
        .replace(/\r/g, '\\r')            // Escape carriage returns
        .replace(/\t/g, '\\t')            // Escape tabs
        .replace(/"/g, '\\"');            // Escape quotes
      return '"' + escaped + '"';
    });

  try {
    const parsed = JSON.parse(escapedJson);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after escape fix');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_3_FAILED', e.message);
  }

  let quoteFix = cleanedJson.replace(/:\s*'([^']*?)'/g, ': "$1"');
  try {
    const parsed = JSON.parse(quoteFix);
    debugLog('JSON_PARSE_SUCCESS', 'Parsed after quote fixing (attempt 4)');
    return parsed;
  } catch (e) {
    debugLog('JSON_PARSE_ATTEMPT_4_FAILED', e.message);
  }
  debugLog('JSON_PARSE_ALL_FAILED', {
    extractedJsonLength: jsonStr.length,
    firstChars: jsonStr.substring(0, 300),
    lastChars: jsonStr.substring(Math.max(0, jsonStr.length - 200))
  });
  throw new Error(
    'Failed to parse Claude response as JSON after 4 attempts.\n\n' +
    'Extracted JSON preview (first 500 chars):\n' +
    jsonStr.substring(0, 500) + '\n\n' +
    'Last 300 chars:\n' +
    jsonStr.substring(Math.max(0, jsonStr.length - 300))
  );
}

/**
 * Runs all validations and returns results object instead of throwing
 * Used for validation retry system - allows collecting pass/fail status for each validation
 */
function runAllValidations(brief, strategy) {
  const results = {
    allPassed: true,
    passed: [],
    failed: [],
    errors: []
  };
  
  // 1. Secondary keyword validation
  try {
    validateSecondaryKeywordDistribution(brief, strategy);
    results.passed.push('Secondary keywords (AFP ✓, H2 ✓, 3x+ ✓)');
  } catch (e) {
    results.allPassed = false;
    results.failed.push('Secondary keyword distribution');
    results.errors.push({
      type: 'secondary_keywords',
      message: e.message
    });
  }
  
  // 2. Longtail keyword validation
  try {
    validateLongtailDistribution(brief, strategy);
    results.passed.push('Longtail keywords (100% distributed)');
  } catch (e) {
    results.allPassed = false;
    results.failed.push('Longtail keyword distribution');
    results.errors.push({
      type: 'longtail_keywords',
      message: e.message
    });
  }
  
  // 3. Brief structure validation (includes SERP analysis)
  try {
    validateBrief(brief, strategy);
    results.passed.push('Brief structure (SERP analysis, required fields)');
  } catch (e) {
    results.allPassed = false;
    results.failed.push('Brief structure/SERP analysis');
    results.errors.push({
      type: 'brief_structure',
      message: e.message
    });
  }
  
  return results;
}

/**
 * Constructs a targeted retry message for Claude based on validation failures
 */
function constructValidationRetryMessage(validationResults, brief) {
  let message = `\n\n⚠️ VALIDATION FAILED - PLEASE FIX AND REGENERATE JSON ⚠️\n\n`;
  
  message += `YOUR BRIEF HAD THE FOLLOWING ISSUES:\n`;
  validationResults.errors.forEach((error, idx) => {
    message += `\n${idx + 1}. ${error.type.toUpperCase()}:\n`;
    // Include just the key part of the error, not the full message
    const shortError = error.message.split('\n').slice(0, 5).join('\n');
    message += `${shortError}\n`;
  });
  
  message += `\n✅ THESE PARTS WERE CORRECT (DO NOT CHANGE):\n`;
  validationResults.passed.forEach(item => {
    message += `   • ${item}\n`;
  });
  
  message += `\n🔴 INSTRUCTIONS FOR FIX:\n`;
  message += `1. Review the errors above\n`;
  message += `2. Fix ONLY the failed validations\n`;
  message += `3. DO NOT remove or change any content that was already correct\n`;
  message += `4. Maintain all secondary keywords in H2s, all longtails distributed, all local SEO requirements\n`;
  message += `5. Return the COMPLETE corrected JSON brief\n\n`;
  
  message += `Return ONLY the corrected JSON object starting with { and ending with }.\n`;
  message += `Do NOT use any more tools - just output the fixed JSON immediately.`;
  
  return message;
}

/**
 * Validates that secondary keyword(s) are properly distributed:
 * 1. MUST appear in AFP/first paragraph guidance
 * 2. MUST appear in at least 1 H2 heading
 * 3. MUST appear at least 3x total across the outline
 */
function validateSecondaryKeywordDistribution(brief, strategy) {
  const secondaryRaw = strategy.secondary_keyword;
  
  // If no secondary keyword provided, skip validation
  if (!secondaryRaw || secondaryRaw.trim() === '') {
    debugLog('SECONDARY_VALIDATION', 'No secondary keyword provided, skipping validation');
    return { valid: true, message: 'No secondary keyword provided' };
  }
  
  // Handle multiple secondary keywords (comma-separated)
  const secondaryKeywords = secondaryRaw.split(',').map(k => cleanKeyword(k.trim())).filter(Boolean);
  
  debugLog('SECONDARY_KEYWORD_PARSING', {
    raw: secondaryRaw,
    parsed: secondaryKeywords,
    count: secondaryKeywords.length
  });
  
  const results = {
    keywords: [],
    allValid: true,
    errors: []
  };
  
  secondaryKeywords.forEach(secondary => {
    const secondaryLower = secondary.toLowerCase();
    const keywordResult = {
      keyword: secondary,
      inAFP: false,
      inH2: false,
      totalOccurrences: 0,
      locations: []
    };
    
    // Check each section of the outline
    brief.outline.forEach(section => {
      const headingLower = (section.heading || '').toLowerCase();
      const guidanceLower = (section.guidance || '').toLowerCase();
      const keywordsArray = section.keywords_to_include || [];
      const keywordsLower = keywordsArray.map(k => k.toLowerCase()).join(' ');
      
      // Check AFP/first paragraph
      if (section.is_afp_guidance || section.level === 0) {
        if (guidanceLower.includes(secondaryLower) || keywordsLower.includes(secondaryLower)) {
          keywordResult.inAFP = true;
          keywordResult.totalOccurrences++;
          keywordResult.locations.push('AFP guidance');
        }
      }
      
      // Check H2 headings (level 2)
      if (section.level === 2 && headingLower.includes(secondaryLower)) {
        keywordResult.inH2 = true;
        keywordResult.totalOccurrences++;
        keywordResult.locations.push(`H2: "${section.heading}"`);
      }
      
      // Count other occurrences (guidance text, keywords_to_include for non-AFP sections)
      if (!section.is_afp_guidance && section.level !== 0) {
        if (guidanceLower.includes(secondaryLower)) {
          keywordResult.totalOccurrences++;
          keywordResult.locations.push(`guidance in "${section.heading}"`);
        }
        if (keywordsLower.includes(secondaryLower)) {
          keywordResult.totalOccurrences++;
          keywordResult.locations.push(`keywords_to_include in "${section.heading}"`);
        }
      }
    });
    
    // Check for failures
    if (!keywordResult.inAFP) {
      results.allValid = false;
      results.errors.push(`Secondary keyword "${secondary}" NOT found in AFP/first paragraph guidance`);
    }
    
    if (!keywordResult.inH2) {
      results.allValid = false;
      results.errors.push(`Secondary keyword "${secondary}" NOT found in any H2 heading`);
    }
    
    if (keywordResult.totalOccurrences < 3) {
      results.allValid = false;
      results.errors.push(`Secondary keyword "${secondary}" only appears ${keywordResult.totalOccurrences}x (minimum 3x required)`);
    }
    
    results.keywords.push(keywordResult);
  });
  
  debugLog('SECONDARY_KEYWORD_VALIDATION', {
    keywords: results.keywords,
    allValid: results.allValid,
    errors: results.errors
  });
  
  // Throw error if validation fails
  if (!results.allValid) {
    throw new Error(
      `SECONDARY KEYWORD DISTRIBUTION FAILURE:\n\n` +
      results.errors.map((e, i) => `${i + 1}. ${e}`).join('\n') +
      `\n\nSecondary keyword(s) MUST:\n` +
      `- Appear in AFP/first paragraph guidance\n` +
      `- Appear in at least 1 H2 heading\n` +
      `- Appear at least 3x total across the outline (headings, guidance, or keywords_to_include)\n\n` +
      `Found locations:\n${results.keywords.map(k => `"${k.keyword}": ${k.locations.join(', ') || 'NONE'}`).join('\n')}\n\n` +
      `This is a CRITICAL requirement - the brief will be regenerated.`
    );
  }
  
  return results;
}

function validateLongtailDistribution(brief, strategy) {
  // First, log the raw input to see what we're dealing with
  const rawKeywords = strategy.longtail_keywords_semantics
    ? strategy.longtail_keywords_semantics.split(',').map(t => t.trim())
    : [];

  // Parse the string into array and CLEAN each keyword
  const keywordsArray = rawKeywords.map(t => cleanKeyword(t)).filter(Boolean);

  debugLog('KEYWORD_CLEANING', {
    raw_input: rawKeywords,
    raw_lengths: rawKeywords.map(k => k.length),
    cleaned_output: keywordsArray,
    cleaned_lengths: keywordsArray.map(k => k.length),
    chars_removed: rawKeywords.map((raw, idx) => raw.length - (keywordsArray[idx] || '').length)
  });

  if (keywordsArray.length === 0) {
    return { valid: true, message: 'No longtail keywords provided' };
  }

  // Debug: Log what we're looking for (with char codes to see invisible chars)
  debugLog('VALIDATION_KEYWORDS_SEARCH', {
    keywords: keywordsArray,
    keyword_lengths: keywordsArray.map(k => k.length),
    outline_sections: brief.outline.length
  });

  // Debug: Log what's in the brief
  const outlineHeadings = brief.outline.map(s => s.heading || '[no heading]');
  const outlineKeywords = brief.outline.map(s => s.keywords_to_include || []);
  debugLog('VALIDATION_BRIEF_CONTENT', {
    headings: outlineHeadings,
    keywords_arrays: outlineKeywords
  });

  // Track which keywords are found and where
  const distributed = [];
  const missing = [];
  
  keywordsArray.forEach(lt => {
    const ltLower = lt.toLowerCase();
    let found = false;
    let foundLocation = '';
    
    brief.outline.forEach(s => {
      if (found) return;
      
      // Check if longtail appears in heading
      if (s.heading && s.heading.toLowerCase().includes(ltLower)) {
        found = true;
        foundLocation = `heading: "${s.heading}"`;
        debugLog('KEYWORD_FOUND_IN_HEADING', { keyword: lt, heading: s.heading });
        return;
      }
      // Check if longtail appears in keywords_to_include
      if (s.keywords_to_include &&
          s.keywords_to_include.some(k => k.toLowerCase().includes(ltLower))) {
        found = true;
        foundLocation = `keywords_to_include in "${s.heading}"`;
        debugLog('KEYWORD_FOUND_IN_ARRAY', { keyword: lt, section: s.heading });
        return;
      }
      // Check if longtail appears in guidance text
      if (s.guidance && s.guidance.toLowerCase().includes(ltLower)) {
        found = true;
        foundLocation = `guidance in "${s.heading}"`;
        debugLog('KEYWORD_FOUND_IN_GUIDANCE', { keyword: lt, section: s.heading });
        return;
      }
    });
    
    if (found) {
      distributed.push({ keyword: lt, location: foundLocation });
    } else {
      missing.push(lt);
      debugLog('KEYWORD_NOT_FOUND', { keyword: lt, length: lt.length });
    }
  });

  const distributionRate = distributed.length / keywordsArray.length;

  debugLog('LONGTAIL_CHECK', {
    provided: keywordsArray.length,
    distributed: distributed.length,
    missing: missing.length,
    rate: (distributionRate * 100).toFixed(0) + '%',
    missing_keywords: missing
  });

  // 100% REQUIRED - throw error if ANY keyword is missing
  if (missing.length > 0) {
    throw new Error(
      `LONGTAIL DISTRIBUTION FAILURE: ${missing.length}/${keywordsArray.length} longtail keywords NOT distributed.\n\n` +
      `Missing keywords:\n${missing.map((k, i) => `  ${i + 1}. "${k}"`).join('\n')}\n\n` +
      `Distributed keywords:\n${distributed.map((d, i) => `  ${i + 1}. "${d.keyword}" → ${d.location}`).join('\n')}\n\n` +
      `ALL longtail/semantic keywords MUST appear in the outline (headings, keywords_to_include, or guidance).\n` +
      `This is a CRITICAL requirement - the brief will be regenerated.`
    );
  }
  
  return { valid: true, distributed: distributed.length, total: keywordsArray.length };
}

function validateSerpAnalysis(brief, strategy) {
  const serp = brief.serp_analysis;
  const clientResearch = brief.client_research;
  const pagesAnalyzed = clientResearch.pages_analyzed?.length || 0;
  
  // Hard fail only if truly insufficient (0-2 pages)
  // 3-4 pages = warning but acceptable for niche keywords
  // 5+ pages = ideal
  if (pagesAnalyzed < 3) {
    throw new Error(
      `Insufficient SERP research: Only ${pagesAnalyzed} pages analyzed. ` +
      'Minimum 3 competitor pages required. Ideally analyze 5+ for comprehensive coverage.'
    );
  }
  if (pagesAnalyzed < 5) {
    Logger.log(
      `WARNING: Only ${pagesAnalyzed} competitor pages analyzed. ` +
      'This may be acceptable for niche keywords, but 5+ is recommended for quality analysis.'
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
  
  // Validate section count analysis
  const sectionAnalysis = serp.section_count_analysis;
  if (!sectionAnalysis) {
    Logger.log(
      'WARNING: No section_count_analysis provided. Section count should be based on competitor research.'
    );
  } else {
    const competitorCounts = sectionAnalysis.competitor_counts || [];
    if (competitorCounts.length < 3) {
      Logger.log(
        `WARNING: Only ${competitorCounts.length} competitor section counts recorded. ` +
        'Expected counts from at least 5 competitor pages.'
      );
    }
    
    // Verify the outline section count is reasonable based on analysis
    const outlineSections = brief.outline.filter(s => s.level === 2 || s.level === 3).length;
    const recommended = sectionAnalysis.recommended_sections || 0;
    
    if (recommended > 0 && Math.abs(outlineSections - recommended) > 3) {
      Logger.log(
        `WARNING: Outline has ${outlineSections} H2/H3 sections but analysis recommended ${recommended}. ` +
        'Section count should align with competitor research + intent modifier.'
      );
    }
    
    debugLog('SECTION_COUNT_VALIDATION', {
      competitor_counts: competitorCounts,
      competitor_average: sectionAnalysis.competitor_average,
      intent_modifier: sectionAnalysis.intent_modifier,
      recommended: recommended,
      actual_outline_sections: outlineSections
    });
  }
  
  // Validate content format analysis
  const formatAnalysis = serp.content_format_analysis;
  if (!formatAnalysis) {
    Logger.log(
      'WARNING: No content_format_analysis provided. Tables/lists recommendations should be based on competitor research.'
    );
  } else {
    debugLog('CONTENT_FORMAT_VALIDATION', {
      tables_competitors: formatAnalysis.tables?.competitors_using_tables || 0,
      tables_recommended: formatAnalysis.tables?.recommend_tables || false,
      lists_competitors: formatAnalysis.lists?.competitors_using_lists || 0,
      lists_recommended: formatAnalysis.lists?.recommend_lists || false,
      featured_snippet_format: formatAnalysis.featured_snippet_format || 'none'
    });
    
    // Check if recommendations are being followed in outline guidance
    if (formatAnalysis.tables?.recommend_tables) {
      const outlineText = JSON.stringify(brief.outline).toLowerCase();
      if (!outlineText.includes('table')) {
        Logger.log(
          'WARNING: Tables recommended based on competitor analysis but no table guidance found in outline.'
        );
      }
    }
    
    if (formatAnalysis.lists?.recommend_lists) {
      const outlineText = JSON.stringify(brief.outline).toLowerCase();
      if (!outlineText.includes('list') && !outlineText.includes('steps') && !outlineText.includes('numbered')) {
        Logger.log(
          'WARNING: Lists recommended based on competitor analysis but no list guidance found in outline.'
        );
      }
    }
  }
  
  debugLog('SERP ANALYSIS VALIDATED', {
    pages_analyzed: pagesAnalyzed,
    word_count_variance: variance,
    pattern_count: patterns.length,
    specific_patterns: specificPatternCount,
    gaps_identified: gaps.length,
    serp_features: features.length,
    section_count_analyzed: !!sectionAnalysis,
    content_format_analyzed: !!formatAnalysis
  });
}

function calculateQualityScore(brief, strategy) {
  let score = 0;
  
  // Point distribution: 100 points total
  // Keyword Strategy: 20, Content Outline: 15, SERP Analysis: 15, EEAT: 15, 
  // Intent Alignment: 10, Link Quality: 10, Content Format: 10, FAQ: 5
  let breakdown = {
    keyword_strategy: { score: 0, max: 20, details: [] },
    content_outline: { score: 0, max: 15, details: [] },
    serp_analysis: { score: 0, max: 15, details: [] },
    eeat_signals: { score: 0, max: 15, details: [] },
    intent_alignment: { score: 0, max: 10, details: [] },
    link_quality: { score: 0, max: 10, details: [] },
    content_format: { score: 0, max: 10, details: [] },
    faq_analysis: { score: 0, max: 5, details: [] }
  };
  
  // ============================================================
  // KEYWORD STRATEGY (20 points)
  // ============================================================
  const parsed = parseKeywords(strategy.longtail_keywords_semantics || '');

  // Clean primary keyword for comparison (removes zero-width characters)
  const cleanedPrimary = cleanKeyword(strategy.primary_keyword).toLowerCase();

  // Primary in H1 (5 points)
  if (brief.h1.toLowerCase().includes(cleanedPrimary)) {
    breakdown.keyword_strategy.score += 5;
    breakdown.keyword_strategy.details.push('✓ Primary keyword in H1 (5pts)');
  } else {
    breakdown.keyword_strategy.details.push('✗ Primary keyword missing from H1 (0pts)');
  }

  // Secondary keyword usage (5 points)
  if (strategy.secondary_keyword && strategy.secondary_keyword.trim()) {
    const secondaryKeywords = strategy.secondary_keyword.split(',').map(k => cleanKeyword(k.trim()).toLowerCase()).filter(Boolean);
    let allInAFP = true;
    let allInH2 = true;
    let totalMet = 0;
    
    secondaryKeywords.forEach(secondaryLower => {
      let inH2 = false;
      let inAFP = false;
      let count = 0;
      
      brief.outline.forEach(section => {
        const headingLower = (section.heading || '').toLowerCase();
        const guidanceLower = (section.guidance || '').toLowerCase();
        const keywordsLower = (section.keywords_to_include || []).join(' ').toLowerCase();
        
        if (section.is_afp_guidance || section.level === 0) {
          if (guidanceLower.includes(secondaryLower) || keywordsLower.includes(secondaryLower)) {
            inAFP = true;
            count++;
          }
        }
        
        if (section.level === 2 && headingLower.includes(secondaryLower)) {
          inH2 = true;
          count++;
        }
        
        if (!section.is_afp_guidance && section.level !== 0) {
          if (guidanceLower.includes(secondaryLower)) count++;
          if (keywordsLower.includes(secondaryLower)) count++;
        }
      });
      
      if (!inAFP) allInAFP = false;
      if (!inH2) allInH2 = false;
      if (inAFP && inH2 && count >= 3) totalMet++;
    });
    
    const metRate = totalMet / secondaryKeywords.length;
    if (metRate >= 1.0) {
      breakdown.keyword_strategy.score += 5;
      breakdown.keyword_strategy.details.push(`✓ All secondary keywords: AFP ✓, H2 ✓, 3x+ (5pts)`);
    } else if (metRate >= 0.5) {
      breakdown.keyword_strategy.score += 3;
      breakdown.keyword_strategy.details.push(`○ ${totalMet}/${secondaryKeywords.length} secondary keywords fully distributed (3pts)`);
    } else {
      breakdown.keyword_strategy.score += 1;
      breakdown.keyword_strategy.details.push(`✗ Secondary keywords poorly distributed (1pt)`);
    }
  } else {
    breakdown.keyword_strategy.score += 5;
    breakdown.keyword_strategy.details.push('○ No secondary keyword provided (5pts - N/A)');
  }

  // Longtail distribution (5 points)
  if (parsed.terms.length > 0) {
    const validation = validateKeywordDistribution(brief, strategy);
    const termsDistributed = validation.stats.terms_distributed;
    const distributionRate = termsDistributed / parsed.terms.length;

    if (distributionRate >= 1.0) {
      breakdown.keyword_strategy.score += 5;
      breakdown.keyword_strategy.details.push(`✓ ${termsDistributed}/${parsed.terms.length} longtails distributed (5pts)`);
    } else if (distributionRate >= 0.8) {
      breakdown.keyword_strategy.score += 3;
      breakdown.keyword_strategy.details.push(`○ ${termsDistributed}/${parsed.terms.length} longtails distributed (3pts)`);
    } else {
      breakdown.keyword_strategy.score += 1;
      breakdown.keyword_strategy.details.push(`✗ Only ${termsDistributed}/${parsed.terms.length} longtails distributed (1pt)`);
    }
  } else {
    breakdown.keyword_strategy.score += 5;
    breakdown.keyword_strategy.details.push('○ No longtail keywords provided (5pts - N/A)');
  }

  // First paragraph/AFP keyword guidance (5 points) - FIXED: was checking wrong field
  const afpSection = brief.outline.find(s => s.is_afp_guidance || s.level === 0);
  if (afpSection && afpSection.guidance) {
    const guidanceLower = afpSection.guidance.toLowerCase();
    const keywordsLower = (afpSection.keywords_to_include || []).join(' ').toLowerCase();
    const combinedText = guidanceLower + ' ' + keywordsLower;
    
    let afpScore = 0;
    // Use cleaned keywords for comparison
    const primaryInAFP = combinedText.includes(cleanedPrimary);
    const cleanedSecondary = strategy.secondary_keyword ? 
      cleanKeyword(strategy.secondary_keyword.split(',')[0].trim()).toLowerCase() : '';
    const secondaryInAFP = !cleanedSecondary || combinedText.includes(cleanedSecondary);
    const longtailInAFP = parsed.terms.length === 0 || 
      parsed.terms.some(term => combinedText.includes(term.toLowerCase()));
    
    if (primaryInAFP) afpScore += 2;
    if (secondaryInAFP) afpScore += 2;
    if (longtailInAFP) afpScore += 1;

    breakdown.keyword_strategy.score += afpScore;
    breakdown.keyword_strategy.details.push(`${afpScore >= 4 ? '✓' : '○'} AFP keyword coverage: primary=${primaryInAFP ? '✓' : '✗'}, secondary=${secondaryInAFP ? '✓' : '✗'}, longtail=${longtailInAFP ? '✓' : '✗'} (${afpScore}/5pts)`);
  } else {
    breakdown.keyword_strategy.details.push('✗ No AFP guidance section found (0/5pts)');
  }

  // ============================================================
  // CONTENT OUTLINE (15 points)
  // ============================================================
  const outlineSections = brief.outline.filter(s => s.level === 2 || s.level === 3).length;
  const sectionAnalysis = brief.serp_analysis.section_count_analysis;
  
  // Section count alignment (10 points)
  if (sectionAnalysis && sectionAnalysis.recommended_sections) {
    const recommended = sectionAnalysis.recommended_sections;
    const diff = Math.abs(outlineSections - recommended);
    
    if (diff <= 1) {
      breakdown.content_outline.score += 10;
      breakdown.content_outline.details.push(`✓ Section count (${outlineSections}) matches recommendation (${recommended}) (10pts)`);
    } else if (diff <= 2) {
      breakdown.content_outline.score += 7;
      breakdown.content_outline.details.push(`○ Section count (${outlineSections}) close to recommendation (${recommended}) (7pts)`);
    } else if (diff <= 3) {
      breakdown.content_outline.score += 4;
      breakdown.content_outline.details.push(`⚠ Section count (${outlineSections}) differs from recommendation (${recommended}) (4pts)`);
    } else {
      breakdown.content_outline.details.push(`✗ Section count (${outlineSections}) far from recommendation (${recommended}) (0pts)`);
    }
  } else {
    // Fallback scoring without competitor data
    if (outlineSections >= 7) {
      breakdown.content_outline.score += 10;
      breakdown.content_outline.details.push(`✓ Strong section count: ${outlineSections} sections (10pts)`);
    } else if (outlineSections >= 5) {
      breakdown.content_outline.score += 6;
      breakdown.content_outline.details.push(`○ Adequate section count: ${outlineSections} sections (6pts)`);
    } else {
      breakdown.content_outline.score += 2;
      breakdown.content_outline.details.push(`✗ Minimal section count: ${outlineSections} sections (2pts)`);
    }
  }

  // Section detail quality (5 points)
  const sectionsWithGuidance = brief.outline.filter(s => 
    s.guidance && s.guidance.length > 50 && 
    s.keywords_to_include && s.keywords_to_include.length > 0
  ).length;
  const h2h3Sections = brief.outline.filter(s => s.level === 2 || s.level === 3).length;
  const detailRate = h2h3Sections > 0 ? sectionsWithGuidance / h2h3Sections : 0;
  
  if (detailRate >= 0.9) {
    breakdown.content_outline.score += 5;
    breakdown.content_outline.details.push('✓ All sections well-detailed with guidance + keywords (5pts)');
  } else if (detailRate >= 0.7) {
    breakdown.content_outline.score += 3;
    breakdown.content_outline.details.push(`○ ${Math.round(detailRate * 100)}% sections detailed (3pts)`);
  } else {
    breakdown.content_outline.score += 1;
    breakdown.content_outline.details.push(`✗ Only ${Math.round(detailRate * 100)}% sections detailed (1pt)`);
  }

  // ============================================================
  // SERP ANALYSIS (15 points)
  // ============================================================
  const pagesAnalyzed = brief.client_research.pages_analyzed?.length || 0;
  const patterns = brief.serp_analysis.top_ranking_patterns || [];
  const gaps = brief.serp_analysis.competitive_gaps || [];
  
  // Pages analyzed (5 points)
  // 5+ = full points, 3-4 = acceptable for niche keywords, 0-2 = insufficient
  if (pagesAnalyzed >= 5) {
    breakdown.serp_analysis.score += 5;
    breakdown.serp_analysis.details.push(`✓ Analyzed ${pagesAnalyzed} competitor pages (5pts)`);
  } else if (pagesAnalyzed >= 3) {
    breakdown.serp_analysis.score += 3;
    breakdown.serp_analysis.details.push(`○ Analyzed ${pagesAnalyzed} competitor pages - acceptable for niche keywords (3pts)`);
  } else {
    breakdown.serp_analysis.score += 1;
    breakdown.serp_analysis.details.push(`✗ Only ${pagesAnalyzed} pages analyzed (1pt)`);
  }

  // Word count variance (5 points)
  const wordCountPattern = /(\d+)-(\d+)/;
  const match = brief.word_count_range.match(wordCountPattern);
  const variance = match ? (parseInt(match[2]) - parseInt(match[1])) : 0;
  
  if (variance >= 400 && variance <= 800) {
    breakdown.serp_analysis.score += 5;
    breakdown.serp_analysis.details.push(`✓ Optimal word count variance: ${variance} words (5pts)`);
  } else if (variance >= 200 && variance <= 1200) {
    breakdown.serp_analysis.score += 3;
    breakdown.serp_analysis.details.push(`○ Acceptable word count variance: ${variance} words (3pts)`);
  } else {
    breakdown.serp_analysis.score += 1;
    breakdown.serp_analysis.details.push(`✗ Poor word count variance: ${variance} words (1pt)`);
  }

  // Specific patterns identified (5 points)
  const genericPatterns = ['comprehensive', 'detailed', 'well-written', 'high-quality', 'good content', 'informative', 'helpful'];
  const specificPatternCount = patterns.filter(pattern => {
    const lowerPattern = pattern.toLowerCase();
    return !genericPatterns.some(generic => lowerPattern.includes(generic) && lowerPattern.length < 50);
  }).length;
  
  if (specificPatternCount >= 4) {
    breakdown.serp_analysis.score += 5;
    breakdown.serp_analysis.details.push(`✓ ${specificPatternCount} specific patterns identified (5pts)`);
  } else if (specificPatternCount >= 2) {
    breakdown.serp_analysis.score += 3;
    breakdown.serp_analysis.details.push(`○ ${specificPatternCount} specific patterns identified (3pts)`);
  } else {
    breakdown.serp_analysis.score += 1;
    breakdown.serp_analysis.details.push(`✗ Only ${specificPatternCount} specific patterns (1pt)`);
  }

  // ============================================================
  // EEAT SIGNALS (15 points) - NEW
  // ============================================================
  const clientResearch = brief.client_research || {};
  const outlineText = JSON.stringify(brief.outline).toLowerCase();
  const keyFacts = clientResearch.key_facts || [];
  const certifications = clientResearch.key_entities?.certifications || [];
  const competitiveAdvantages = clientResearch.competitive_advantages || [];
  const externalLinks = brief.external_links || [];
  
  // Expertise signals (5 points) - technical specs, specific data, industry knowledge
  let expertiseScore = 0;
  const hasSpecificFacts = keyFacts.length >= 5;
  const hasTechnicalTerms = outlineText.includes('specification') || outlineText.includes('technical') || 
    outlineText.includes('engineering') || outlineText.includes('warranty') || outlineText.includes('certification');
  const hasDataPoints = keyFacts.some(f => /\d+/.test(f)); // Facts contain numbers
  
  if (hasSpecificFacts) expertiseScore += 2;
  if (hasTechnicalTerms) expertiseScore += 2;
  if (hasDataPoints) expertiseScore += 1;
  
  breakdown.eeat_signals.score += expertiseScore;
  breakdown.eeat_signals.details.push(`${expertiseScore >= 4 ? '✓' : '○'} Expertise: ${keyFacts.length} facts, technical depth=${hasTechnicalTerms ? '✓' : '✗'} (${expertiseScore}/5pts)`);

  // Experience signals (4 points) - real-world applications, testimonials, case studies
  let experienceScore = 0;
  const hasApplications = outlineText.includes('application') || outlineText.includes('use case') || 
    outlineText.includes('example') || outlineText.includes('testimonial') || outlineText.includes('customer');
  const hasCompetitiveAdvantages = competitiveAdvantages.length >= 3;
  
  if (hasApplications) experienceScore += 2;
  if (hasCompetitiveAdvantages) experienceScore += 2;
  
  breakdown.eeat_signals.score += experienceScore;
  breakdown.eeat_signals.details.push(`${experienceScore >= 3 ? '✓' : '○'} Experience: real-world examples=${hasApplications ? '✓' : '✗'}, advantages documented=${hasCompetitiveAdvantages ? '✓' : '✗'} (${experienceScore}/4pts)`);

  // Authoritativeness signals (3 points) - certifications, high-authority external links
  let authorityScore = 0;
  const hasCertifications = certifications.length >= 1;
  const hasHighAuthLinks = externalLinks.filter(l => l.domain_authority === 'high').length >= 1;
  const hasGovEduLinks = externalLinks.some(l => /\.(gov|edu|org)/.test(l.url || ''));
  
  if (hasCertifications) authorityScore += 1;
  if (hasHighAuthLinks) authorityScore += 1;
  if (hasGovEduLinks) authorityScore += 1;
  
  breakdown.eeat_signals.score += authorityScore;
  breakdown.eeat_signals.details.push(`${authorityScore >= 2 ? '✓' : '○'} Authority: certs=${hasCertifications ? '✓' : '✗'}, high-auth links=${hasHighAuthLinks ? '✓' : '✗'}, .gov/.edu=${hasGovEduLinks ? '✓' : '✗'} (${authorityScore}/3pts)`);

  // Trustworthiness signals (3 points) - warranty, pricing transparency, verifiable claims
  let trustScore = 0;
  const hasWarranty = outlineText.includes('warranty') || keyFacts.some(f => f.toLowerCase().includes('warranty'));
  const hasPricing = outlineText.includes('pricing') || outlineText.includes('cost') || outlineText.includes('price');
  const hasVerifiableClaims = keyFacts.some(f => /\d+/.test(f) && f.length > 20); // Specific factual claims
  
  if (hasWarranty) trustScore += 1;
  if (hasPricing) trustScore += 1;
  if (hasVerifiableClaims) trustScore += 1;
  
  breakdown.eeat_signals.score += trustScore;
  breakdown.eeat_signals.details.push(`${trustScore >= 2 ? '✓' : '○'} Trust: warranty=${hasWarranty ? '✓' : '✗'}, pricing=${hasPricing ? '✓' : '✗'}, verifiable claims=${hasVerifiableClaims ? '✓' : '✗'} (${trustScore}/3pts)`);

  // ============================================================
  // INTENT ALIGNMENT (10 points) - NEW
  // ============================================================
  const intentData = parseIntent(strategy.intent);
  const intentKey = intentData.hybridKey;
  const intentStruct = CONTENT_STRUCTURES[intentKey] || CONTENT_STRUCTURES[intentData.primary] || CONTENT_STRUCTURES['informational'];
  
  // Section count within intent range (5 points)
  const sectionCountStr = intentStruct.section_count || '5-8 sections';
  const sectionMatch = sectionCountStr.match(/(\d+)-(\d+)/);
  let intentSectionMin = 5, intentSectionMax = 10;
  if (sectionMatch) {
    intentSectionMin = parseInt(sectionMatch[1]);
    intentSectionMax = parseInt(sectionMatch[2]);
  }
  
  if (outlineSections >= intentSectionMin && outlineSections <= intentSectionMax) {
    breakdown.intent_alignment.score += 5;
    breakdown.intent_alignment.details.push(`✓ Section count (${outlineSections}) within ${strategy.intent} range (${intentSectionMin}-${intentSectionMax}) (5pts)`);
  } else if (outlineSections >= intentSectionMin - 1 && outlineSections <= intentSectionMax + 1) {
    breakdown.intent_alignment.score += 3;
    breakdown.intent_alignment.details.push(`○ Section count (${outlineSections}) close to ${strategy.intent} range (${intentSectionMin}-${intentSectionMax}) (3pts)`);
  } else {
    breakdown.intent_alignment.score += 1;
    breakdown.intent_alignment.details.push(`✗ Section count (${outlineSections}) outside ${strategy.intent} range (${intentSectionMin}-${intentSectionMax}) (1pt)`);
  }

  // Intent-appropriate content sections (5 points)
  let intentContentScore = 0;
  const headingsText = brief.outline.map(s => (s.heading || '').toLowerCase()).join(' ');
  
  if (intentData.primary === 'transactional' || intentData.secondary === 'transactional') {
    // Transactional should have pricing/cost/quote sections
    if (headingsText.includes('price') || headingsText.includes('cost') || headingsText.includes('quote') || headingsText.includes('order')) {
      intentContentScore += 3;
    }
    if (headingsText.includes('feature') || headingsText.includes('benefit') || headingsText.includes('why choose')) {
      intentContentScore += 2;
    }
  }
  
  if (intentData.primary === 'informational' || intentData.secondary === 'informational') {
    // Informational should have how-to/guide/process sections
    if (headingsText.includes('how') || headingsText.includes('guide') || headingsText.includes('step') || headingsText.includes('process')) {
      intentContentScore += 3;
    }
    if (headingsText.includes('what') || headingsText.includes('why') || headingsText.includes('understand')) {
      intentContentScore += 2;
    }
  }
  
  if (intentData.primary === 'commercial' || intentData.secondary === 'commercial') {
    // Commercial should have comparison/review/alternative sections
    if (headingsText.includes('compar') || headingsText.includes('vs') || headingsText.includes('review') || headingsText.includes('best')) {
      intentContentScore += 3;
    }
    if (headingsText.includes('alternative') || headingsText.includes('option') || headingsText.includes('pros') || headingsText.includes('cons')) {
      intentContentScore += 2;
    }
  }
  
  if (intentData.primary === 'navigational') {
    // Navigational should have overview/services/contact sections
    if (headingsText.includes('service') || headingsText.includes('about') || headingsText.includes('contact')) {
      intentContentScore += 3;
    }
    if (headingsText.includes('overview') || headingsText.includes('location')) {
      intentContentScore += 2;
    }
  }
  
  intentContentScore = Math.min(intentContentScore, 5);
  breakdown.intent_alignment.score += intentContentScore;
  breakdown.intent_alignment.details.push(`${intentContentScore >= 4 ? '✓' : '○'} Intent-appropriate sections for ${strategy.intent} (${intentContentScore}/5pts)`);

  // ============================================================
  // LINK QUALITY (10 points)
  // ============================================================
  const internalLinks = brief.internal_links || [];
  const internalVerified = internalLinks.filter(l => l.url_status === '200' || l.url_status === 'verified').length;
  const internalTotal = internalLinks.length;
  
  // Internal links (5 points)
  if (internalTotal >= 5 && internalVerified === internalTotal) {
    breakdown.link_quality.score += 5;
    breakdown.link_quality.details.push(`✓ ${internalTotal} internal links, all verified (5pts)`);
  } else if (internalTotal >= 3 && internalVerified >= internalTotal * 0.8) {
    breakdown.link_quality.score += 3;
    breakdown.link_quality.details.push(`○ ${internalVerified}/${internalTotal} internal links verified (3pts)`);
  } else {
    breakdown.link_quality.score += 1;
    breakdown.link_quality.details.push(`✗ ${internalVerified}/${internalTotal} internal links verified (1pt)`);
  }

  // External links (5 points)
  const externalVerified = externalLinks.filter(l => l.url_status === 'verified').length;
  const externalHighAuth = externalLinks.filter(l => l.url_status === 'verified' && l.domain_authority === 'high').length;
  const externalTotal = externalLinks.length;
  
  if (externalTotal >= 2 && externalVerified === externalTotal && externalHighAuth >= 1) {
    breakdown.link_quality.score += 5;
    breakdown.link_quality.details.push(`✓ ${externalTotal} external links, ${externalHighAuth} high authority (5pts)`);
  } else if (externalTotal >= 1 && externalVerified >= externalTotal * 0.75) {
    breakdown.link_quality.score += 3;
    breakdown.link_quality.details.push(`○ ${externalVerified}/${externalTotal} external links verified (3pts)`);
  } else {
    breakdown.link_quality.score += 1;
    breakdown.link_quality.details.push(`✗ ${externalVerified}/${externalTotal} external links verified (1pt)`);
  }

  // ============================================================
  // CONTENT FORMAT ALIGNMENT (10 points) - NEW
  // ============================================================
  const formatAnalysis = brief.serp_analysis.content_format_analysis;
  
  if (formatAnalysis) {
    const tablesRecommended = formatAnalysis.tables?.recommend_tables || false;
    const listsRecommended = formatAnalysis.lists?.recommend_lists || false;
    const outlineGuidanceText = brief.outline.map(s => (s.guidance || '').toLowerCase()).join(' ');
    
    // Check if table recommendation is followed (5 points)
    if (tablesRecommended) {
      const hasTableGuidance = outlineGuidanceText.includes('table') || outlineGuidanceText.includes('comparison chart');
      if (hasTableGuidance) {
        breakdown.content_format.score += 5;
        breakdown.content_format.details.push('✓ Tables recommended and included in guidance (5pts)');
      } else {
        breakdown.content_format.score += 2;
        breakdown.content_format.details.push('○ Tables recommended but not in guidance (2pts)');
      }
    } else {
      breakdown.content_format.score += 5;
      breakdown.content_format.details.push('✓ Tables not needed per competitor analysis (5pts)');
    }
    
    // Check if list recommendation is followed (5 points)
    if (listsRecommended) {
      const hasListGuidance = outlineGuidanceText.includes('list') || outlineGuidanceText.includes('steps') || 
        outlineGuidanceText.includes('numbered') || outlineGuidanceText.includes('bullet');
      if (hasListGuidance) {
        breakdown.content_format.score += 5;
        breakdown.content_format.details.push('✓ Lists recommended and included in guidance (5pts)');
      } else {
        breakdown.content_format.score += 2;
        breakdown.content_format.details.push('○ Lists recommended but not in guidance (2pts)');
      }
    } else {
      breakdown.content_format.score += 5;
      breakdown.content_format.details.push('✓ Lists not needed per competitor analysis (5pts)');
    }
    
  } else {
    // No format analysis available - award partial credit
    breakdown.content_format.score += 6;
    breakdown.content_format.details.push('○ No competitor format analysis available (6pts default)');
  }

  // ============================================================
  // FAQ ANALYSIS (5 points)
  // ============================================================
  const faqSection = brief.outline.find(s => s.is_faq_section);
  
  if (brief.faq_analysis.include_faq && faqSection) {
    // FAQ was included - score based on quality
    const questionCount = faqSection.faq_questions?.length || 0;
    const hasRationale = brief.faq_analysis.rationale && brief.faq_analysis.rationale.length > 20;
    
    if (questionCount >= 4 && hasRationale) {
      breakdown.faq_analysis.score += 5;
      breakdown.faq_analysis.details.push(`✓ FAQ included: ${questionCount} questions with clear rationale (5pts)`);
    } else if (questionCount >= 3) {
      breakdown.faq_analysis.score += 3;
      breakdown.faq_analysis.details.push(`○ FAQ included: ${questionCount} questions (3pts)`);
    } else {
      breakdown.faq_analysis.score += 1;
      breakdown.faq_analysis.details.push(`✗ FAQ included but only ${questionCount} questions (1pt)`);
    }
  } else if (!brief.faq_analysis.include_faq) {
    // FAQ was excluded - score based on rationale
    const hasRationale = brief.faq_analysis.rationale && brief.faq_analysis.rationale.length > 20;
    if (hasRationale) {
      breakdown.faq_analysis.score += 5;
      breakdown.faq_analysis.details.push('✓ FAQ excluded with clear rationale (5pts)');
    } else {
      breakdown.faq_analysis.score += 2;
      breakdown.faq_analysis.details.push('○ FAQ excluded but weak rationale (2pts)');
    }
  } else {
    breakdown.faq_analysis.score += 1;
    breakdown.faq_analysis.details.push('✗ FAQ decision unclear (1pt)');
  }

  // ============================================================
  // CALCULATE FINAL SCORE
  // ============================================================
  
  // Cap each category at its max
  Object.keys(breakdown).forEach(category => {
    breakdown[category].score = Math.min(breakdown[category].score, breakdown[category].max);
  });

  // Sum all categories
  score = Object.values(breakdown).reduce((sum, cat) => sum + cat.score, 0);
  
  // Determine rating
  let rating = 'POOR';
  if (score >= 90) rating = 'EXCELLENT';
  else if (score >= 80) rating = 'VERY GOOD';
  else if (score >= 70) rating = 'GOOD';
  else if (score >= 60) rating = 'ACCEPTABLE';
  
  return {
    total_score: score,
    max_score: 100,
    rating: rating,
    breakdown: breakdown
  };
}

function validateKeywordDistribution(brief, strategy) {
  const parsed = parseKeywords(strategy.longtail_keywords_semantics);

  if (parsed.terms.length === 0) {
    return { valid: true, warnings: ['No additional keywords provided'] };
  }

  // Count distributed terms (check both headings and keywords_to_include)
  const distributedTerms = new Set();

  brief.outline.forEach(section => {
    const headingLower = section.heading ? section.heading.toLowerCase() : '';

    // Check if terms appear in headings
    parsed.terms.forEach(term => {
      if (headingLower.includes(term.toLowerCase())) {
        distributedTerms.add(term);
      }
    });

    // Check if terms appear in keywords_to_include
    if (section.keywords_to_include) {
      section.keywords_to_include.forEach(kw => {
        const kwLower = kw.toLowerCase();
        parsed.terms.forEach(term => {
          if (kwLower.includes(term.toLowerCase())) {
            distributedTerms.add(term);
          }
        });
      });
    }
  });

  const distributionRate = parsed.terms.length > 0 ? distributedTerms.size / parsed.terms.length : 1;

  const warnings = [];
  if (distributionRate < 0.5) {
    warnings.push(`Only ${distributedTerms.size}/${parsed.terms.length} additional keywords distributed (${Math.round(distributionRate * 100)}%)`);
  }

  return {
    valid: warnings.length === 0,
    warnings: warnings,
    stats: {
      terms_distributed: distributedTerms.size,
      terms_total: parsed.terms.length,
      distribution_rate: distributionRate
    }
  };
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
  const primaryLower = cleanKeyword(strategy.primary_keyword).toLowerCase();
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
  
  const qualityScore = calculateQualityScore(brief, strategy);
  brief.quality_score = qualityScore;
  
  debugLog('BRIEF VALIDATED', {
    h1_length: brief.h1.length,
    has_afp_guidance: !!afpSection,
    client_pages_analyzed: brief.client_research.pages_analyzed.length,
    outline_sections: brief.outline.length,
    internal_links: internalCount,
    external_links: brief.external_links.length,
    faq_included: brief.faq_analysis.include_faq,
    faq_questions: faqSection?.faq_questions?.length || 0,
    quality_score: qualityScore.total_score,
    intent: strategy.intent
  });
}

function renderBriefToGoogleDoc(brief, strategy, overrideFolderId) {
  const docName = `Brief - ${brief.title} - ${new Date().toISOString().slice(0, 10)}`;
  const doc = DocumentApp.create(docName);
  const folderId = overrideFolderId || getSanitizedFolderId();
  const file = DriveApp.getFileById(doc.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  if (folderId) {
    try {
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
  
  const qs = brief.quality_score;
  const stars = qs.rating === 'EXCELLENT' ? '⭐⭐⭐⭐⭐' :
                qs.rating === 'VERY GOOD' ? '⭐⭐⭐⭐' :
                qs.rating === 'GOOD' ? '⭐⭐⭐' :
                qs.rating === 'ACCEPTABLE' ? '⭐⭐' : '⭐';
  
  body.appendParagraph('═'.repeat(60))
    .setFontFamily('Courier New')
    .setFontSize(10)
    .setForegroundColor('#666666');
  
  const scoreLine = body.appendParagraph(`BRIEF QUALITY SCORE: ${qs.total_score}/100 ${stars}`);
  scoreLine.setBold(true).setFontSize(14).setForegroundColor('#0066cc');
  
  const ratingLine = body.appendParagraph(`Rating: ${qs.rating}`);
  ratingLine.setItalic(true).setFontSize(11).setForegroundColor('#0066cc');
  
  body.appendParagraph('═'.repeat(60))
    .setFontFamily('Courier New')
    .setFontSize(10)
    .setForegroundColor('#666666');
  
  body.appendParagraph('');
  
  body.appendParagraph('Quality Breakdown:').setBold(true).setFontSize(11);
  body.appendParagraph('');
  
  Object.keys(qs.breakdown).forEach(category => {
    const cat = qs.breakdown[category];
    let catName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    // Special case for EEAT acronym
    if (category === 'eeat_signals') catName = 'EEAT Signals';
    
    body.appendParagraph(`${catName}: ${cat.score}/${cat.max}`)
      .setBold(true)
      .setFontSize(10)
      .setForegroundColor(cat.score >= cat.max * 0.8 ? '#006600' : '#cc6600');
    
    cat.details.forEach(detail => {
      body.appendParagraph('  ' + detail)
        .setFontFamily('Courier New')
        .setFontSize(9)
        .setIndentStart(18);
    });
    
    body.appendParagraph('');
  });
  
  body.appendParagraph('═'.repeat(60))
    .setFontFamily('Courier New')
    .setFontSize(10)
    .setForegroundColor('#666666');
  
  body.appendParagraph('');
  body.appendParagraph('');
  
  addHeading(body, 'Keyword Usage Instructions', DocumentApp.ParagraphHeading.HEADING1);
  
  // === PRIMARY KEYWORD ===
  body.appendParagraph(`Primary Keyword: "${strategy.primary_keyword}"`)
    .setBold(true)
    .setFontSize(12)
    .setForegroundColor('#1a5f2a');
  const primaryReqs = [
    'Use in H1 exactly as written',
    'Include in first 20 words of the opening paragraph',
    'Use 5-7 times naturally throughout the content'
  ];
  primaryReqs.forEach(req => {
    body.appendListItem(req)
      .setGlyphType(DocumentApp.GlyphType.BULLET)
      .setFontSize(10);
  });
  body.appendParagraph('');
  
  // === SECONDARY KEYWORDS ===
  if (strategy.secondary_keyword && strategy.secondary_keyword.trim()) {
    const secondaryKeywords = strategy.secondary_keyword.split(',').map(k => k.trim()).filter(Boolean);
    
    body.appendParagraph(`Secondary Keyword${secondaryKeywords.length > 1 ? 's' : ''}: ${secondaryKeywords.map(k => `"${k}"`).join(', ')}`)
      .setBold(true)
      .setFontSize(12)
      .setForegroundColor('#1a5f2a');
    
    const secondaryReqs = [
      'Each must appear in the opening paragraph',
      'Each must be used as part of an H2 heading',
      'Each should appear at least 3 times total in the content'
    ];
    secondaryReqs.forEach(req => {
      body.appendListItem(req)
        .setGlyphType(DocumentApp.GlyphType.BULLET)
        .setFontSize(10);
    });
    body.appendParagraph('');
  }
  
  // === LONGTAIL/SEMANTIC KEYWORDS ===
  if (strategy.longtail_keywords_semantics && strategy.longtail_keywords_semantics.trim()) {
    const longtails = strategy.longtail_keywords_semantics.split(',').map(k => k.trim()).filter(Boolean);
    
    body.appendParagraph('Longtail/Semantic Keywords:')
      .setBold(true)
      .setFontSize(12)
      .setForegroundColor('#1a5f2a');
    
    longtails.forEach(lt => {
      body.appendListItem(lt)
        .setGlyphType(DocumentApp.GlyphType.BULLET)
        .setFontSize(10);
    });
    body.appendParagraph('');
    
    body.appendParagraph('Requirements:').setBold(true).setFontSize(10);
    const longtailReqs = [
      'Use each keyword at least once naturally in the content',
      'Preferred: Incorporate into H2/H3 subheadings where it fits naturally',
      'Alternative: Weave into body copy within relevant sections'
    ];
    longtailReqs.forEach(req => {
      body.appendListItem(req)
        .setGlyphType(DocumentApp.GlyphType.BULLET)
        .setFontSize(10);
    });
    body.appendParagraph('');
  }
  body.appendParagraph('');
  addHeading(body, 'Content Outline', DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Target Word Count: ${brief.word_count_range}`).setItalic(true);
  body.appendParagraph(`Page Type: ${strategy.page_type}`).setItalic(true);
  body.appendParagraph(`Intent: ${strategy.intent}`).setItalic(true);
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
    if (brief.client_research.key_entities) {
      body.appendParagraph('Key Entities (for LLM optimization):').setBold(true);
      if (brief.client_research.key_entities.business_name) {
        body.appendParagraph(`  Business: ${brief.client_research.key_entities.business_name}`);
      }
      if (brief.client_research.key_entities.locations && brief.client_research.key_entities.locations.length > 0) {
        body.appendParagraph(`  Locations: ${brief.client_research.key_entities.locations.join(', ')}`);
      }
      if (brief.client_research.key_entities.certifications && brief.client_research.key_entities.certifications.length > 0) {
        body.appendParagraph(`  Certifications: ${brief.client_research.key_entities.certifications.join(', ')}`);
      }
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
    if (brief.client_research.local_trust_signals?.length > 0) {
      body.appendParagraph('Local Trust Signals:').setBold(true).setFontSize(11);
      brief.client_research.local_trust_signals.forEach(signal => {
        body.appendListItem(signal)
          .setGlyphType(DocumentApp.GlyphType.BULLET)
          .setBold(false)
          .setFontSize(11);
      });
      body.appendParagraph('');
    }
    if (brief.client_research.local_geographic_details) {
      const geo = brief.client_research.local_geographic_details;
      body.appendParagraph('Local Geographic Details:').setBold(true).setFontSize(11);
      if (geo.county) {
        body.appendParagraph(`  County: ${geo.county}`).setFontSize(11);
      }
      if (geo.region) {
        body.appendParagraph(`  Region: ${geo.region}`).setFontSize(11);
      }
      if (geo.state) {
        body.appendParagraph(`  State: ${geo.state}`).setFontSize(11);
      }
      if (geo.neighborhoods?.length > 0) {
        body.appendParagraph(`  Neighborhoods: ${geo.neighborhoods.join(', ')}`).setFontSize(11);
      }
      if (geo.relevant_to_topic?.length > 0) {
        body.appendParagraph(`  Topic-Specific Local Entities: ${geo.relevant_to_topic.join(', ')}`)
          .setFontSize(11)
          .setForegroundColor('#006600');
      }
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
    const isVerified = link.url_status === '200' || link.url_status === 'verified';
    const statusIndicator = isVerified ? ' (VERIFIED)' : ' (404 - NOT FOUND)';
    const urlColor = isVerified ? '#006600' : '#cc0000';
    body.appendParagraph(`   URL: ${link.url}${statusIndicator}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor(urlColor);
    if (link.alternative_url) {
      const altVerified = link.alternative_status === '200' || link.alternative_status === 'verified';
      const altStatusIndicator = altVerified ? ' (VERIFIED)' : ' (ISSUE)';
      const altColor = altVerified ? '#006600' : '#cc6600';
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
    strategy.longtail_keywords_semantics ? `Long-tail Keywords & Semantics: ${strategy.longtail_keywords_semantics}` : null,
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

/**
 * ============================================================================
 * WEBHOOK ENDPOINT FOR PUSHER INTEGRATION
 * ============================================================================
 * This doPost function receives HTTP POST requests from the Next.js app
 * and updates Supabase directly, enabling real-time progress tracking via Pusher.
 */
function doPost(e) {
  try {
    // Parse incoming JSON payload
    const payload = JSON.parse(e.postData.contents);
    
    debugLog('WEBHOOK_RECEIVED', {
      command: payload.command,
      hasData: !!payload.data,
      timestamp: new Date().toISOString()
    });
    
    // Route based on command
    if (payload.command === 'updateStatus') {
      // Update Supabase with status change
      const data = payload.data;
      notifyDashboardStatus(data, data.brief_url || null, data.briefObj || null);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Status update received and processed'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.command === 'getWorkbookData') {
      // Fetch workbook data for dashboard
      const workbookUrl = payload.workbookUrl;
      const result = getWorkbookData(workbookUrl);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        result: result
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.command === 'appendToWorkbook') {
      // Append new row to workbook
      const workbookUrl = payload.workbookUrl;
      const formData = payload.formData;
      const result = appendToWorkbook(workbookUrl, formData);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        result: result
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.command === 'runBriefGeneration') {
      // Trigger brief generation asynchronously
      const folderId = payload.folderId || null;
      const workbookUrl = payload.workbookUrl || null;
      const clientId = payload.clientId || null;
      
      debugLog('WEBHOOK_TRIGGER_GENERATION', {
        folderId: folderId,
        workbookUrl: workbookUrl,
        clientId: clientId
      });
      
      // Run in background (Apps Script will continue after response)
      runBriefGeneration(folderId, workbookUrl, clientId);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'triggered',
        message: 'Brief generation started in background'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Unknown command
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown command: ' + payload.command
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    debugLog('WEBHOOK_ERROR', error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getWorkbookData(workbookUrl) {
  const ss = workbookUrl ? SpreadsheetApp.openByUrl(workbookUrl) : SpreadsheetApp.getActive();
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
    const ss = SpreadsheetApp.openByUrl(workbookUrl);
    
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

