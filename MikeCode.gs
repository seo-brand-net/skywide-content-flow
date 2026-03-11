/**
 * ============================================================================
 * CLAUDE-POWERED SEO CONTENT BRIEF BUILDER
 * ============================================================================
 * Version: 2.1.1
 * Last Updated: 2026-02-19
 *
 * CHANGELOG v2.1.1:
 * - Removed external link validation (validateExternalLinksServerSide) — saved ~6 min per run
 * - External links now rely on search_suggestion for editorial verification (no server-side HTTP checks)
 * - Re-enabled web_search for Phase 3 (external link discovery) — Phase 3 is small enough (~13K) to handle tool state
 * - Tool isolation now Phase 2-only: Phase 1 gets all tools, Phase 3 gets web_search only, Phase 2 gets none
 * - Fixed: Phase 3 and competitor retry now strip context_management from payload (requires beta header not present)
 * - Added: Ahrefs fallback — if Ahrefs API fails or returns <3 competitors, Phase 1 discovers competitors
 *   via web_search, URLs are fetched server-side, and Phase 2 proceeds with pre-fetched content as normal.
 *   Fallback briefs write "Ahrefs fallback: Competitors discovered via web_search" to the notes column.
 * - Fixed: fetchCompetitorWordCounts now falls back to individual fetches when fetchAll crashes
 *   (one bad DNS no longer kills all competitor fetches — e.g. sfbradsutter.com DNS failure)
 * - Updated quality scoring to evaluate search_suggestion presence instead of verified status
 * - Updated Google Doc renderer to show search suggestions prominently for all links
 *
 * CHANGELOG v2.1.0:
 * - Fixed cross-phase context overflow caused by server-managed tool state persistence
 * - Phase 2 now uses server-side pre-fetched competitor content (no web_fetch needed)
 * - Phase 3 uses web_search only for external link discovery (no web_fetch, prevents state bloat)
 * - Only Phase 1 uses web_search/web_fetch, eliminating server state accumulation
 * - Added CODE_VERSION runtime log for deployment verification
 * - Added PRE_REQUEST_SIZE diagnostic logging
 *
 * CHANGELOG v2.0.0:
 *
 * AHREFS SERP API INTEGRATION:
 * - ADDED: fetchAhrefsSerpData() — fetches real Google SERP data from Ahrefs API
 *   * Endpoint: v3/serp-overview/serp-overview (top 20 positions)
 *   * Filters to 8 organic competitors (excludes Reddit, YouTube, Wikipedia, social media, aggregators)
 *   * Extracts People Also Ask (PAA) questions from SERP
 *   * Returns competitor URLs with position, title, and Domain Rating
 * - ADDED: CONFIG settings for AHREFS_SERP_COUNTRY, AHREFS_SERP_TOP_POSITIONS, AHREFS_MAX_COMPETITOR_URLS, AHREFS_SKIP_DOMAINS
 * - CHANGED: Phase 2 now uses Ahrefs competitor URLs directly (no web_search for competitor discovery)
 * - ADDED: Zero-width space stripping (U+200B, U+200C, U+200D, U+FEFF, U+00A0) before Ahrefs API call
 * - ADDED: Position-priority instruction — Claude analyzes highest-ranked successful fetches
 * - BENEFIT: Eliminates discovery overhead, ensures correct Google ranking data, zero web_search in Phase 2
 *
 * DETERMINISTIC FAQ LOGIC:
 * - REMOVED: Subjective 3-criteria FAQ decision (competitors + PAA + featured snippet)
 * - ADDED: Page-type-based deterministic FAQ rules:
 *   * Blog page: Always include FAQ
 *   * Homepage: Never include FAQ
 *   * Service/Category page: Include if 2+ of 4 competitors have FAQs
 *   * Product page: Include if 3+ of 4 competitors have FAQs
 * - ADDED: reconcileFaqAnalysis() — server-side safety net ensures include_faq matches outline
 * - CHANGED: faq_analysis schema simplified to include_faq, competitor_faq_count, rationale
 * - REMOVED: competitors_have_faq, paa_boxes_present, featured_snippet_opportunity fields
 * - BENEFIT: Consistent FAQ decisions across runs, no more coin-flip behavior
 *
 * SERVER-SIDE EXTERNAL LINK VALIDATION (PHASES 4-5 ELIMINATED):
 * - REMOVED: Phase 4 (Validate External Links Batch 1) — was burning ~580K input tokens
 * - REMOVED: Phase 5 (Validate External Links Batch 2) — was burning ~610K input tokens
 * - REMOVED: validateExternalLinksServerSide() — UrlFetchApp timeouts wasted ~6 min per run (v2.1.1)
 * - ADDED: search_suggestion field on external links — specific Google search query for each link
 *   * Primary method for editorial team to find and verify links
 *   * Shown prominently in Google Doc output for every link
 * - CHANGED: Phase count reduced from 5 → 3 (Client Research, Competitor Research, Write Brief)
 * - CHANGED: API calls per run reduced from 5-6 → 3
 * - BENEFIT: ~1.1-1.2M input tokens saved per run (~45-55% total token reduction)
 *
 * CHANGELOG v1.7.0:
 * 
 * INTENT RANGE EXPANSION + NAVIGATIONAL HYBRIDS:
 * - CHANGED: Widened all intent section count ranges for meaningful competitor influence:
 *   * transactional: 5-6 → 4-8 (lean tool pages to robust service pages)
 *   * informational: 7-10 → 5-11 (narrow definitions to comprehensive guides)
 *   * commercial: 6-8 → 5-9 (simple A-vs-B to full buying guides)
 *   * navigational: 5-6 → 3-6 (location/about pages to full homepages)
 *   * transactional/informational: 8-10 → 6-10
 *   * informational/commercial: 8-10 → 6-10
 *   * transactional/commercial: 6-8 → 5-8
 * - ADDED: 3 navigational hybrid intents (previously fell back to primary intent):
 *   * transactional/navigational (4-7)
 *   * informational/navigational (4-8)
 *   * commercial/navigational (4-7)
 * - REMOVED: 6 duplicate reverse-order hybrid entries (informational/transactional,
 *   commercial/informational, commercial/transactional, navigational/transactional,
 *   navigational/informational, navigational/commercial) — only 10 intents match dropdown
 * - ADDED: HYBRID_NORMALIZE map in parseIntent() — normalizes any reverse-order input
 *   to canonical key (e.g. "commercial/transactional" → "transactional/commercial")
 * - BENEFIT: Competitor average calculation now meaningful across all intents
 *   * Old tight ranges (width 2) made competitor analysis decorative
 *   * New ranges let SERP data drive section count within intent guardrails
 *
 * CHANGELOG v1.6.0:
 * 
 * INTERNAL LINKING OVERHAUL:
 * - REMOVED: URL cap limit - all filtered URLs are now sent to Claude
 *   * Product filtering makes this safe (no more 12,000 product URLs)
 * - ADDED: E-commerce product page filtering
 *   * Automatically skips child sitemaps with "product" in filename
 *   * New column: product_page_path - user can specify product URL pattern (e.g., "/products/")
 *   * If product link would be valuable, Claude recommends product type without specific URL
 * - ADDED: Intent-based filtering for transactional/commercial pages
 *   * Skips entire blog/post sitemaps (sitemap-level filtering)
 *   * Filters out informational URLs that slip through (URL-level filtering):
 *     - Blog/news/articles/posts/resources/guides content
 *     - About/team/our-story/leadership pages
 *     - FAQ/help-center/support pages
 *   * Keeps users at bottom of funnel for conversion-focused pages
 * - UNCHANGED: Informational/navigational/hybrid intents still get all page types
 * - REMOVED: Distributed sampling logic (no longer needed with filtering)
 * - REMOVED: URL categorization by path patterns (was law-firm specific, not reliable)
 * - CHANGED: Internal link target is now 10 (minimum 5)
 * - IMPROVED: Stricter instructions to Claude to NEVER invent URLs
 * - IMPROVED: Semantic relevance emphasized over keyword matching
 * 
 * EXTERNAL LINKING IMPROVEMENTS:
 * - CHANGED: Now provides 10 external link suggestions (strategist chooses best 2-4)
 * - ADDED: Simple anchor text requirement - no keyword-stuffed anchors
 *   * Good: "according to Moz", "this Harvard study", "per ABA guidelines"
 *   * Bad: "comprehensive law firm SEO best practices guide"
 * - CHANGED: .gov/.edu links only when genuinely relevant - don't force them
 * - IMPROVED: Anchor text must accurately describe destination page content
 * 
 * KEYWORD USAGE INSTRUCTIONS:
 * - ADDED: "Use once in conclusion paragraph" for primary keyword
 * - CHANGED: "Requirements" renamed to "Longtail/Semantic Keywords Requirements"
 * 
 * SITEMAP FETCHING:
 * - CHANGED: No longer limited to first 3 child sitemaps
 * - ADDED: 30-second timeout safeguard (SITEMAP_FETCH_TIMEOUT_MS)
 * - ADDED: Automatic skipping of product sitemaps for e-commerce sites
 * 
 * GOOGLE DOC SHARING:
 * - ADDED: Documents automatically set to "Anyone with link can edit"
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
 *   * 0-1 pages = hard fail (truly insufficient)
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
 * - Validates minimum 4 competitor pages analyzed
 * - Word count range calculated server-side from competitor data with intent modifier
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
  CODE_VERSION: "2.1.1",
  MAX_ROWS_PER_RUN: 5,
  // SHEET_NAME is now dynamic or uses this as default
  DEFAULT_SHEET_NAME: "Content Brief Automation",
  DOCS_FOLDER_ID: "1nk3KsqlCv5-ndsayI-K1EC8aJXqvoAVQ",
  MIN_INTERNAL_LINKS: 5,
  TARGET_INTERNAL_LINKS: 10,
  MAX_INTERNAL_LINKS: 10,
  MAX_EXTERNAL_LINKS: 10,
  SITEMAP_FETCH_TIMEOUT_MS: 30000,
  USE_WEB_SEARCH: true,
  VERIFY_EXTERNAL_LINKS: true,
  DEEP_SERP_ANALYSIS: true,
  CONTEXT_EDITING_THRESHOLD: 60000,
  WEB_FETCH_MAX_CONTENT_TOKENS: 80000,
  AHREFS_SERP_COUNTRY: 'us',
  AHREFS_SERP_TOP_POSITIONS: 20,
  AHREFS_MAX_COMPETITOR_URLS: 10,
  AHREFS_SKIP_DOMAINS: [
    'reddit.com', 'quora.com', 'wikipedia.org', 'youtube.com',
    'yelp.com', 'bbb.org', 'glassdoor.com', 'indeed.com',
    'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
    'pinterest.com', 'tiktok.com'
  ],
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
    section_count: '4-8 sections',
    section_depth: 'shallow, persuasive',
    cta_frequency: 'every section',
    cta_type: 'strong action (Get Quote, Buy Now, Contact)',
    word_count_modifier: 0.8,
    emphasis: 'pricing, trust signals, customization options, delivery',
    tone: 'confident, benefit-focused, action-oriented'
  },
  'informational': {
    afp_focus: 'direct answer to query',
    section_count: '5-11 sections',
    section_depth: 'very deep, educational',
    cta_frequency: 'end only',
    cta_type: 'soft (Learn More, Explore)',
    word_count_modifier: 1.5,
    emphasis: 'step-by-step processes, detailed explanations, examples',
    tone: 'helpful, patient, educational'
  },
  'commercial': {
    afp_focus: 'specs and price range',
    section_count: '5-9 sections',
    section_depth: 'moderate, comparison-focused',
    cta_frequency: 'every 2-3 sections',
    cta_type: 'medium (Compare, Get Quote, See Options)',
    word_count_modifier: 1.2,
    emphasis: 'comparisons, pros/cons, alternatives, reviews',
    tone: 'objective, detailed, honest'
  },
  'navigational': {
    afp_focus: 'who we are and what we do',
    section_count: '3-6 sections',
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
    section_count: '6-10 sections',
    section_depth: 'tiered: shallow product-focused first 3-4, then deep educational',
    cta_frequency: 'strong after product showcase, soft after education, strong at end',
    cta_type: 'mixed (Get Quote early, Learn More middle, Contact end)',
    word_count_modifier: 1.3,
    emphasis: 'product info/pricing first 40%, how-to middle 50%, conversion last 10%',
    tone: 'confident early, helpful middle, action-oriented end'
  },
  'informational/commercial': {
    afp_focus: 'educational answer + buying guidance',
    section_count: '6-10 sections',
    section_depth: 'deep educational first, then comparison-focused',
    cta_frequency: 'soft early, medium late',
    cta_type: 'Learn More → Compare → See Options',
    word_count_modifier: 1.4,
    emphasis: 'education first 60%, comparison last 40%',
    tone: 'educational throughout, objective comparison at end'
  },
  'transactional/commercial': {
    afp_focus: 'strong value proposition + competitive positioning',
    section_count: '5-8 sections',
    section_depth: 'shallow persuasive with comparison elements',
    cta_frequency: 'every section with comparison CTAs',
    cta_type: 'Get Quote, Compare, See Why We\'re Better',
    word_count_modifier: 1.0,
    emphasis: 'pricing and value first 50%, competitive comparison last 50%',
    tone: 'confident and competitive throughout'
  },
  // === NAVIGATIONAL HYBRIDS ===
  'transactional/navigational': {
    afp_focus: 'brand-specific action page with clear conversion path',
    section_count: '4-7 sections',
    section_depth: 'shallow, brand-focused with action elements',
    cta_frequency: 'every section',
    cta_type: 'strong action (Get Started, Contact Us, Sign Up)',
    word_count_modifier: 0.8,
    emphasis: 'brand identity first 30%, services/products 40%, conversion 30%',
    tone: 'professional, confident, action-oriented'
  },
  'informational/navigational': {
    afp_focus: 'educational answer with brand positioning',
    section_count: '4-8 sections',
    section_depth: 'educational with brand context',
    cta_frequency: 'soft throughout',
    cta_type: 'Learn More, Explore Our Resources',
    word_count_modifier: 1.0,
    emphasis: 'education first 60%, brand authority 30%, navigation 10%',
    tone: 'educational, authoritative, welcoming'
  },
  'commercial/navigational': {
    afp_focus: 'brand comparison page or branded product overview',
    section_count: '4-7 sections',
    section_depth: 'comparison elements with brand focus',
    cta_frequency: 'medium throughout',
    cta_type: 'Compare → See Our Options → Contact',
    word_count_modifier: 0.9,
    emphasis: 'brand positioning first 40%, comparisons 40%, navigation 20%',
    tone: 'objective, brand-confident, professional'
  },
};

/**
 * Parse intent string to detect hybrid intents
 * Supports formats like "transactional/informational", "transactional + informational", etc.
 * Normalizes reverse orders to match CONTENT_STRUCTURES keys
 */
function parseIntent(intentString) {
  const intentLower = intentString.toLowerCase().trim();

  // Canonical hybrid key mapping - normalizes any order to match dropdown/CONTENT_STRUCTURES
  const HYBRID_NORMALIZE = {
    'transactional/informational': 'transactional/informational',
    'informational/transactional': 'transactional/informational',
    'transactional/commercial': 'transactional/commercial',
    'commercial/transactional': 'transactional/commercial',
    'transactional/navigational': 'transactional/navigational',
    'navigational/transactional': 'transactional/navigational',
    'informational/commercial': 'informational/commercial',
    'commercial/informational': 'informational/commercial',
    'informational/navigational': 'informational/navigational',
    'navigational/informational': 'informational/navigational',
    'commercial/navigational': 'commercial/navigational',
    'navigational/commercial': 'commercial/navigational'
  };

  // Support all hybrid intent combinations
  const hybridPatterns = [
    /transactional\s*[\/\+&]\s*informational/i,
    /informational\s*[\/\+&]\s*transactional/i,
    /transactional\s*[\/\+&]\s*commercial/i,
    /commercial\s*[\/\+&]\s*transactional/i,
    /transactional\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*transactional/i,
    /informational\s*[\/\+&]\s*commercial/i,
    /commercial\s*[\/\+&]\s*informational/i,
    /informational\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*informational/i,
    /commercial\s*[\/\+&]\s*navigational/i,
    /navigational\s*[\/\+&]\s*commercial/i
  ];

  for (const pattern of hybridPatterns) {
    if (pattern.test(intentLower)) {
      const parts = intentLower.split(/[\/\+&]/).map(s => s.trim()).filter(s => s.length > 0);
      const rawKey = `${parts[0]}/${parts[1] || parts[0]}`;
      const normalizedKey = HYBRID_NORMALIZE[rawKey] || rawKey;
      const normalizedParts = normalizedKey.split('/');
      return {
        isHybrid: true,
        primary: normalizedParts[0],
        secondary: normalizedParts[1] || null,
        hybridKey: normalizedKey
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

/**
 * Checks if the intent is a hybrid format (e.g., "transactional/informational")
 * Used to determine if blog/informational content should be included in internal links
 */
function isHybridIntent(intent) {
  const intentData = parseIntent(intent);
  return intentData.isHybrid;
}

/**
 * Checks if the intent requires filtering out blog/informational content
 * Returns true for pure transactional or commercial intents
 * Returns false for informational, navigational, or any hybrid intent
 */
function shouldExcludeBlogContent(intent) {
  const intentData = parseIntent(intent);
  
  // Hybrid intents allow mixed content (user has mixed mindset)
  if (intentData.isHybrid) {
    return false;
  }
  
  // Pure transactional or commercial = exclude blogs (don't send users back down funnel)
  if (intentData.primary === 'transactional' || intentData.primary === 'commercial') {
    return true;
  }
  
  // Informational or navigational = include everything
  return false;
}

/**
 * Filters sitemap URLs based on intent
 * - Transactional/Commercial: Excludes blog/news/resource/article pages
 * - Informational/Navigational/Hybrid: Includes all page types
 */
function filterUrlsByIntent(urls, intent) {
  if (!shouldExcludeBlogContent(intent)) {
    debugLog('INTENT_FILTER', `Intent "${intent}" allows all content types - no filtering applied`);
    return urls;
  }
  
  // Patterns that indicate informational content - exclude for transactional/commercial intent
  // These pages don't support conversion and send users back up the funnel
  const informationalPatterns = [
    // Blog/news content
    /\/blog\//i,
    /\/blogs\//i,
    /\/news\//i,
    /\/articles?\//i,
    /\/posts?\//i,
    /\/resources?\//i,
    /\/insights?\//i,
    /\/guides?\//i,
    /\/tips\//i,
    /\/advice\//i,
    /\/learn\//i,
    /\/education\//i,
    /\/library\//i,
    /\/knowledge\//i,
    /\/how-to\//i,
    /\/what-is\//i,
    /\/understanding\//i,
    // About/team pages
    /\/about\//i,
    /\/about-us\//i,
    /\/our-team\//i,
    /\/our-story\//i,
    /\/who-we-are\//i,
    /\/meet-the-team\//i,
    /\/leadership\//i,
    /\/team\//i,
    /\/staff\//i,
    // FAQ pages
    /\/faq\//i,
    /\/faqs\//i,
    /\/frequently-asked/i,
    /\/questions\//i,
    /\/help-center\//i,
    /\/support\//i
  ];
  
  const filteredUrls = urls.filter(url => {
    const urlLower = url.toLowerCase();
    const isInformationalContent = informationalPatterns.some(pattern => pattern.test(urlLower));
    return !isInformationalContent;
  });
  
  debugLog('INTENT_FILTER', {
    intent: intent,
    original_count: urls.length,
    filtered_count: filteredUrls.length,
    removed: urls.length - filteredUrls.length,
    reason: 'Transactional/Commercial intent - informational content excluded'
  });
  
  return filteredUrls;
}

/**
 * Filters URLs by product page path
 * Used when user provides a product_page_path in the spreadsheet
 */
function filterProductUrls(urls, productPagePath) {
  if (!productPagePath || productPagePath.trim() === '') {
    return urls;
  }
  
  const productPath = productPagePath.trim().toLowerCase();
  const filtered = urls.filter(url => !url.toLowerCase().includes(productPath));
  
  debugLog('PRODUCT_URL_FILTER', {
    product_path: productPath,
    before: urls.length,
    after: filtered.length,
    removed: urls.length - filtered.length
  });
  
  return filtered;
}

const SYSTEM_PROMPT = `You are an expert SEO content strategist creating simplified, high-performance content briefs for AI content generation machines.

Your briefs must be clear, actionable, and optimized for both traditional search engines and LLM-based search (AI Overviews, ChatGPT, Perplexity, etc.).

CRITICAL CLIENT RESEARCH WORKFLOW:
Before creating the brief, you MUST research the client's website thoroughly:

1. DISCOVER CLIENT PAGES:
   - Use web_search with "site:CLIENT_DOMAIN" to find relevant pages
   - Focus on: homepage, about, services, products, features pages
   - Identify the 3-4 most relevant pages based on the brief topic

2. ANALYZE CLIENT PAGES WITH WEB_FETCH:
   - ALWAYS fetch foundational pages first:
     * Homepage (the root domain URL)
     * About/About Us/Our Story page (search for it with site: if needed)
     These provide essential brand context, company info, certifications, and trust signals for EEAT.
   - Then fetch 0-1 additional pages most relevant to the brief topic
   - Goal: 2-3 total client pages fetched (2 foundational + 0-1 keyword-relevant)
   - web_fetch gives you the full page content - use this for accurate information extraction
   - Extract factual information from the fetched content:
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
   - Only reference facts found on the client's actual website via web_fetch
   - If you don't find specific information, don't make it up
   - Base all client claims on pages you've actually fetched and read

ENTITY OPTIMIZATION (CRITICAL FOR LLM SEARCH):
- Extract and note the client's business name (use 3-5x in content guidance)
- Identify location entities (city, state, region) for local SEO
- Note product/service names and ensure consistent formatting
- Document certifications, standards, industry organizations mentioned
- These entities are crucial for AI Overview inclusion

PHASED RESEARCH WORKFLOW:
This brief is generated in multiple phases. After each research phase, you MUST write comprehensive RESEARCH NOTES summarizing everything you learned. These notes are your ONLY record — the raw page data will be cleared between phases to free up context space. Your notes MUST capture ALL facts, metrics, and observations needed for later phases.

PHASE 1 — CLIENT RESEARCH NOTES FORMAT:
After fetching client pages, write a text block starting with "=== CLIENT RESEARCH NOTES ===" containing:
- Business name, founding date, key personnel
- Products/services offered (with specifics)
- Certifications, awards, accreditations
- Service areas and locations
- Brand voice and messaging tone
- Unique selling propositions
- Trust signals (reviews, case results, testimonials)
- Local trust signals (if location provided)
- Geographic details (county, region, neighborhoods, landmarks)
- Content gaps identified on client site
- Key URLs fetched and what was on each page

PHASE 2 — COMPETITOR RESEARCH NOTES FORMAT:
After fetching competitor pages, write a text block starting with "=== COMPETITOR RESEARCH NOTES ===" containing:
- Each competitor URL analyzed with domain name
- Word count per competitor page (use server-provided word counts when shown in the competitor list)
- ACTUAL H2/H3 section count per competitor page
- Section count average + intent modifier calculation
- Content format patterns (tables, lists, media)
- FAQ presence/absence on each competitor page
- PAA questions found
- SERP features observed with specifics
- Content patterns (with numbers: "6/6 use pricing tables")
- Competitive gaps identified
- Featured Snippet format observed

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
  * ALL terms MUST appear in the outline — place them in headings when section count allows, otherwise use keywords_to_include arrays or guidance text
  * PRIORITY ORDER (non-negotiable):
    1. Primary keyword → H1 (always)
    2. Secondary keywords → dedicated H2 headings (always, one H2 per secondary keyword)
    3. Longtail keywords → H2/H3 headings IF section count allows, otherwise consolidate into keywords_to_include arrays or guidance text within existing sections
  * Never create extra sections just to house a longtail keyword — your section count from SERP analysis + intent is the ceiling
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

FAQ SECTION LOGIC:
The FAQ decision is made by the server based on page type and competitor data — you will receive a specific FAQ DECISION directive in Phase 3 telling you whether to include FAQ or not. Follow it exactly:
- If the directive says INCLUDE: add an FAQ outline section with is_faq_section: true and faq_questions populated
- If the directive says EXCLUDE: set include_faq: false and do NOT add an FAQ outline section
- If the directive says CONDITIONAL: count competitor FAQs from your research notes and apply the threshold given
- Place FAQ section towards the END of content outline (usually last or second-to-last section)
- Each FAQ must target actual user questions from PAA data or competitor analysis

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
- Select links that are CONTEXTUALLY and SEMANTICALLY relevant to the page topic
  * This includes directly related topics AND semantically related topics
  * Think about what topics a user interested in the primary keyword would also want to explore
  * Don't just match keywords - consider the user journey and related concepts
- Target: 10 internal links per brief (minimum 5)
- NOTE: For transactional/commercial intent pages, blog content is pre-filtered out
  (We don't want to send conversion-ready users back to informational content)
- NOTE: For e-commerce sites, product page URLs are pre-filtered out
  If a specific product link would add value, note this in recommendations with the product type and reasoning (no URL needed)
- CRITICAL: NEVER invent or guess URLs. If a URL is not in the provided list, do not include it.
- Avoid: tag pages, search results, archives, author pages (these are pre-filtered)

EXTERNAL LINKS:
- Provide 10 external link suggestions - the strategist will choose the best 2-4

SOURCE SELECTION (CRITICAL):
- Search for authoritative sources RELEVANT TO THE PRIMARY KEYWORD TOPIC
- Sources should support, validate, or provide additional context for the content being created
- Examples of good source types (adapt to the specific topic):
  * Official documentation and guidelines (.gov, .edu when relevant to topic)
  * Industry associations and trade organizations for the specific field
  * Research studies and data from reputable sources
  * Well-known industry publications in that vertical
  * Established brands/companies known for expertise in that topic area
- For legal topics: ABA, state bar associations, legal research sites, court resources
- For medical/health topics: CDC, NIH, medical journals, health organizations
- For marketing/SEO topics: Moz, Ahrefs, Search Engine Journal, HubSpot
- For technical topics: Official documentation, engineering associations, technical standards
- For local topics: State .gov sites, county resources, local institutions

SOURCE PRIORITIES:
- .gov and .edu links are valuable BUT only if genuinely relevant to the topic
- Do NOT force a .gov/.edu link if there isn't one that truly fits the content
- A relevant industry publication is better than an irrelevant .gov link
- Prefer: Topic-relevant industry publications, research studies, trade organizations, .gov/.edu (when relevant)
- Avoid: Direct competitors offering the same service as the client, spammy domains, low-authority sites

EXTERNAL LINK PROCESS:
Step 1: Use web_search to find specific, authoritative pages relevant to the topic
  - Search for specific content, not just the source name
  - Copy the EXACT full URL path from search results, not just the domain
  - Do NOT default to homepage URLs — find specific articles/pages

Step 2: Set ALL external links to url_status: "suggested"

Step 3: For EVERY external link, provide a search_suggestion
  - This is a SHORT, SPECIFIC Google search query the editorial team will use to find and verify the exact page
  - This is the PRIMARY way the content writer will locate each link — make it count

GOOD search_suggestion examples (specific, directly searchable):
  - "ABA Model Rule 7.3 attorney advertising"
  - "Moz what is domain authority"
  - "Google Search Console performance report guide"
  - "CDC hand hygiene guidelines healthcare"

BAD search_suggestion examples (too vague or conversational):
  - "Official ABA website for legal profession standards"
  - "Find the Google documentation about search"
  - "Moz SEO resources"
  - "Search for CDC guidelines"

The search_suggestion should be specific enough to return the exact page as a top Google result.

ANCHOR TEXT RULES (CRITICAL - FOLLOW EXACTLY):
- Use SHORT, SIMPLE anchor text - maximum 3-4 words
- Anchor text should reference the SOURCE, not describe the topic
- GOOD examples: "according to [source name]", "this [organization] guideline", "per official documentation", "[source] reports"
- BAD examples: Keyword phrases describing what the page is about
- The anchor should tell users WHO said it, not WHAT it's about
- Brand names and simple source references are preferred
- NEVER use the topic keywords as the anchor text

LOCAL SEO: If location is provided, include 1-2 local authority links:
  * State .gov websites (agencies, regulations, licensing boards)
  * County/city government sites
  * Local courts or legal resources (for law-related content)
  * State-specific laws or statutes
  * Local institutions (hospitals, universities) relevant to the topic
  These strengthen local relevance for both traditional SEO and LLM search.

MANDATORY SERP RESEARCH PROTOCOL:
You MUST complete thorough SERP analysis before generating the brief. Briefs with insufficient research will be REJECTED.

REQUIRED STEPS:
1. Real Google SERP data may be provided in Phase 2 via Ahrefs API — if competitor URLs are listed, fetch those directly IN ORDER (do NOT use web_search to find competitors)
2. If no Ahrefs data is provided, use web_search for the primary keyword to find the top ranking pages
3. Use web_fetch on the top 4 competitor pages to read their ACTUAL content
   IMPORTANT: Do NOT include the client's own domain as a competitor. The client's URL is provided in the spreadsheet - skip it when selecting competitor pages to analyze. Only analyze pages from OTHER domains.
4. WORD COUNTS: When Ahrefs data is provided, word counts are pre-calculated by the server and shown next to each competitor URL. Use those values directly. Only estimate word counts yourself if the server shows "word count unavailable" for a competitor.
5. From the fetched content, COUNT the actual H2/H3 sections on each page
6. Report word counts per competitor (use server-provided counts when available)
7. Identify SPECIFIC content patterns from the actual page content (not guessed from snippets)
8. Note competitive gaps based on what's actually missing from competitor pages
9. Document SERP features with specific details

WHY WEB_FETCH IS REQUIRED FOR SERP ANALYSIS:
- web_search only gives you snippets - you cannot accurately count sections from snippets
- web_fetch gives you the full page content so you can actually count and analyze
- Your section counts MUST be based on real data from web_fetch, not estimates

SECTION COUNT CALCULATION (CRITICAL):
- Count the number of H2 and H3 headings on EACH of the top 3-4 competitor pages
- Calculate the AVERAGE section count across all analyzed pages
- Apply INTENT MODIFIER to the average:
  * Transactional intent: Use competitor average (conversion-focused, concise)
  * Informational intent: Add 1-2 sections to competitor average (educational depth)
  * Commercial intent: Use competitor average (comparison-focused)
  * Navigational intent: Subtract 1-2 sections from average (overview style)
  * Hybrid intents: Blend the modifiers appropriately
- Your final section count = Competitor Average ± Intent Modifier
- HARD BOUNDARY: Your final section count MUST fall within the INTENT STRUCTURE section count range above.
  * If competitor average + modifier is BELOW the intent minimum, use the intent minimum.
  * If competitor average + modifier is ABOVE the intent maximum, use the intent maximum.
  * The intent range is your ceiling AND floor — do not exceed it or fall below it.
  * Example: If competitors average 3 sections but transactional intent says 4-8, use 4.
  * Example: If competitors average 12 sections but transactional intent says 4-8, use 8.
- DOCUMENT this calculation in your serp_analysis.section_count_analysis field

CONTENT FORMAT ANALYSIS (CRITICAL):
When analyzing competitor pages, you MUST check for content formatting patterns:

1. TABLES: Check if competitors use tables for:
   - Pricing comparisons
   - Feature comparisons
   - Specifications
   - Data presentation
   - Record: How many of the top 4 pages use tables? What type?

2. LISTS (Numbered or Bulleted): Check if competitors use lists for:
   - Step-by-step processes
   - Benefits/features lists
   - Requirements/criteria
   - Tips or recommendations
   - Record: How many pages use lists? Are they numbered or bulleted?

3. DECISION LOGIC:
   - If 2+ of top 4 competitors use tables → RECOMMEND tables in your brief
   - If 3+ of top 4 competitors use numbered lists → RECOMMEND numbered lists
   - If Featured Snippet is list-based → STRONGLY RECOMMEND matching format
   - If NO competitors use tables/lists → May not be necessary for this topic

4. DOCUMENT your findings in serp_analysis.content_format_analysis field

MINIMUM REQUIREMENTS (YOUR BRIEF WILL BE REJECTED IF YOU DON'T MEET THESE):
- Analyze AT LEAST 4 competitor pages
- Word count range is calculated server-side from server-measured word counts — just use the word counts shown in the competitor list
- If server word counts are unavailable, estimate MAIN BODY content only (exclude nav, sidebar, footer, comments)
- Count H2/H3 sections on AT LEAST 4 competitor pages
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
□ Did I analyze 4+ competitor pages using web_fetch?
□ Did I use the server-provided word counts (shown next to each URL)?
□ Did I COUNT H2/H3 sections on each competitor page?
□ Did I calculate section count average and apply intent modifier?
□ Is my final section count within the INTENT STRUCTURE section count range?
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
    "competitors_analyzed": [
      {
        "url": "string - full URL of the competitor page analyzed (NEVER include the client's own domain)",
        "title": "string - page title",
        "word_count": "number - use server-provided word count, or estimate if unavailable"
      }
    ],
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
        "competitors_using_tables": "number - how many of top 4 use tables",
        "table_types": ["array of strings - e.g. 'pricing comparison', 'feature specs'"],
        "recommend_tables": "boolean - true if 3+ competitors use tables",
        "table_recommendation": "string - specific table suggestion if recommended"
      },
      "lists": {
        "competitors_using_lists": "number - how many of top 4 use lists",
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
    "include_faq": "boolean - true if FAQ section is included (follow the FAQ DECISION directive)",
    "competitor_faq_count": "number - how many of the analyzed competitors have FAQ sections",
    "rationale": "string - brief explanation referencing competitor count and page type rule"
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
      "anchor": "string - SIMPLE anchor text only (brand name, 'this study', 'read more') - NOT keyword-stuffed",
      "url": "string - EXACT full URL from web_search results",
      "url_status": "string - always 'suggested' (content writer will verify using the search_suggestion)",
      "placement": "string - where in content",
      "rationale": "string",
      "domain_authority": "string - high/medium/low",
      "search_suggestion": "string - SHORT, SPECIFIC Google search query to find this exact page (e.g. 'ABA Model Rule 7.3 attorney advertising')"
    }
  ]
}

RULES:
1. ALWAYS research client pages using web_search BEFORE creating brief
2. NEVER invent facts about the client - use only researched information
3. For INTERNAL links: If sitemap URLs are provided, select from that list and set url_status to "200" (pre-verified)
4. For INTERNAL links: Only use web_search to verify if NO sitemap URLs are provided
5. For EXTERNAL links: Use web_search to find specific page URLs, set url_status to "suggested", and provide a search_suggestion for each
6. Do NOT use web_fetch on external links — the content writer will verify them using the search_suggestion
4. ALWAYS use web_search to analyze SERPs and find external links
5. ONLY return real URLs - no placeholders or tool IDs
6. Keep internal links between MIN and MAX (5-10)
7. Base word count ranges on actual SERP analysis
8. Provide specific, actionable guidance for AI content generation
9. Remember: this brief will be fed to an AI content machine, so be precise
10. CRITICAL: After completing all research, IMMEDIATELY generate the complete JSON brief in a single response - do not pause or wait for confirmation

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

/**
 * Fetches real Google SERP data from Ahrefs API for a given keyword.
 * Returns filtered organic competitor URLs with position and domain rating.
 * Falls back gracefully if API call fails — Phase 2 will use web_search instead.
 */
function fetchAhrefsSerpData(primaryKeyword, clientDomain) {
  const ahrefsApiKey = PropertiesService.getScriptProperties().getProperty('AHREFS_API_KEY');
  if (!ahrefsApiKey) {
    debugLog('AHREFS_SKIP', 'No AHREFS_API_KEY found in Script Properties — falling back to web_search');
    return null;
  }

  try {
    const params = [
      'select=position,url,title,domain_rating,type',
      'country=' + encodeURIComponent(CONFIG.AHREFS_SERP_COUNTRY),
      'keyword=' + encodeURIComponent(primaryKeyword.trim()),
      'top_positions=' + CONFIG.AHREFS_SERP_TOP_POSITIONS,
      'output=json'
    ].join('&');

    const url = 'https://api.ahrefs.com/v3/serp-overview/serp-overview?' + params;
    debugLog('AHREFS_REQUEST', { url: url.replace(ahrefsApiKey, '***') });
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + ahrefsApiKey.trim() },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();
    if (statusCode !== 200) {
      debugLog('AHREFS_API_ERROR', { statusCode: statusCode, body: responseBody.substring(0, 1000) });
      return null;
    }

    const data = JSON.parse(response.getContentText());
    const positions = data.positions || [];

    // Clean client domain for matching (already stripped of protocol/www by extractDomain)
    const cleanClient = (clientDomain || '').toLowerCase().trim();

    // Extract PAA questions
    const paaQuestions = positions
      .filter(p => p.type && p.type.includes('question') && p.title)
      .map(p => p.title);

    // Filter to organic results only, remove client domain, skip domains, deduplicate
    const seenDomains = new Set();
    const competitors = positions.filter(p => {
      if (!p.url || !p.type || !p.type.includes('organic')) return false;
      
      // Extract domain from URL using regex (Apps Script doesn't have URL constructor)
      const domainMatch = p.url.match(/^https?:\/\/([^\/]+)/i);
      if (!domainMatch || !domainMatch[1]) return false;
      const domain = domainMatch[1].replace(/^www\./, '').replace(/:\d+$/, '').toLowerCase();

      // Skip client domain (exact match or subdomain match with dot boundary)
      if (cleanClient && (domain === cleanClient || domain.endsWith('.' + cleanClient))) return false;

      // Skip excluded domains (exact match or subdomain match)
      if (CONFIG.AHREFS_SKIP_DOMAINS.some(skip => domain === skip || domain.endsWith('.' + skip))) return false;

      // Deduplicate by domain (keep first/highest position)
      if (seenDomains.has(domain)) return false;
      seenDomains.add(domain);

      return true;
    }).slice(0, CONFIG.AHREFS_MAX_COMPETITOR_URLS).map(p => ({
      position: p.position,
      url: p.url,
      title: p.title || '',
      domain_rating: p.domain_rating || 0
    }));

    debugLog('AHREFS_SERP_DATA', {
      keyword: primaryKeyword,
      total_positions: positions.length,
      organic_filtered: competitors.length,
      paa_questions: paaQuestions.length,
      competitors: competitors.map(c => ({ pos: c.position, url: c.url, dr: c.domain_rating }))
    });

    return {
      competitors: competitors,
      paa_questions: paaQuestions
    };

  } catch (e) {
    debugLog('AHREFS_FETCH_ERROR', e.message);
    return null;
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
  const urlAliases = ['url', 'target_url', 'target-url', 'website_url'];
  const hasUrl = normalizedHeaders.some(h => urlAliases.includes(h));
  
  requiredHeaders.forEach(header => {
    if (header === 'url' && hasUrl) return; // Skip if any alias exists
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
    const urlAliases = ['url', 'target_url', 'target-url', 'website_url'];
    return headers.some(h => urlAliases.includes(h));
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

function runBriefGeneration(overrideFolderId, workbookUrl, fallbackClientId, overrideUserId) {
  debugLog('CODE_VERSION', CONFIG.CODE_VERSION + ' | server-side competitor prefetch | Phase 2 no tools, Phase 3 web_search only | Ahrefs fallback');
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
  
  const EXECUTION_START_TIME = Date.now();
  const MAX_EXECUTION_TIME_MS = 5.5 * 60 * 1000; // 5.5 minutes

  targets.forEach(r => {
    const idCol = headers['id']?.index;
    let rowIdString = (idCol !== undefined) ? String(data[r][idCol] || '') : '';
    
    if (!rowIdString) {
      rowIdString = Utilities.getUuid();
      if (idCol !== undefined) {
        sheet.getRange(r + 1, idCol + 1).setValue(rowIdString);
        data[r][idCol] = rowIdString; // Save back to memory so loop 2 sees it
      }
    }
    
    sheet.getRange(r + 1, statusCol + 1).setValue('IN_PROGRESS');
    data[r][statusCol] = 'IN_PROGRESS';
    
    sheet.getRange(r + 1, runIdCol + 1).setValue(runId);
    data[r][runIdCol] = runId;
    
    const rowObj = rowToObject(data[r], headers);
    rowObj.client_id = rowObj.client_id || fallbackClientId;
    rowObj.user_id = overrideUserId || rowObj.user_id || '';
    
    notifyDashboardStatus({ ...rowObj, run_id: runId, status: 'IN_PROGRESS' }, null);
  });
  targets.forEach(r => {
    try {
      if (Date.now() - EXECUTION_START_TIME > MAX_EXECUTION_TIME_MS) {
         throw new Error("Execution time limit reached (5.5m). Script gracefully paused to avoid a hard Google timeout. Please restart this row later.");
      }
      
      const rowObj = rowToObject(data[r], headers);
      if (!rowObj.id) {
        const idCol = headers['id']?.index;
        rowObj.id = (idCol !== undefined) ? sheet.getRange(r + 1, idCol + 1).getValue() : '';
      }
      rowObj.user_id = overrideUserId || rowObj.user_id || '';
      
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
      debugLog('DOC_URL_CAPTURE', docUrl);
      
      const briefUrlCol = headers['brief_url']?.index;
      if (briefUrlCol !== undefined) {
        sheet.getRange(r + 1, briefUrlCol + 1).setValue(docUrl);
      }
      
      sheet.getRange(r + 1, headers['status'].index + 1).setValue('DONE');
      sheet.getRange(r + 1, headers['notes'].index + 1).setValue(
        strategy.ahrefsFallback ? 'Ahrefs fallback: Competitors discovered via web_search' : ''
      );
      if (headers['quality_score']) {
        sheet.getRange(r + 1, headers['quality_score'].index + 1).setValue(brief.quality_score.total_score);
      }
      const freshRowValues = sheet.getRange(r + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const freshRowObj = rowToObject(freshRowValues, headers);
      if (!freshRowObj.client_id && fallbackClientId) freshRowObj.client_id = fallbackClientId;
      if (!freshRowObj.user_id) freshRowObj.user_id = rowObj.user_id;
      if (!freshRowObj.id) freshRowObj.id = rowObj.id;
      
      // Ensure brief_url is populated in the object even if sheet update is slow or column is weird
      freshRowObj.brief_url = docUrl || freshRowObj.brief_url || '';
      
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
      // Since we updated data[r] in the first loop, rowObj is now fully accurate!
      const rowObj = rowToObject(data[r], headers);
      if (!rowObj.client_id && fallbackClientId) rowObj.client_id = fallbackClientId;
      rowObj.user_id = overrideUserId || rowObj.user_id || '';
      
      notifyDashboardStatus({ ...rowObj, run_id: runId, status: 'ERROR', notes: e.toString() }, null);
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
  const targetUrl = row.url || row.target_url || row['target-url'] || row.website_url || '';
  debugLog('BUILD_STRATEGY_INPUT', { url: targetUrl, primary_keyword: row.primary_keyword });
  const clientDomain = extractDomain(targetUrl);
  
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
  
  const intent = String(row.intent || 'informational').toLowerCase().trim();
  const productPagePath = String(row.product_page_path || '').trim();
  
  // Fetch and filter sitemap URLs upfront for internal linking
  // Pass intent so we can skip blog sitemaps for transactional/commercial intent
  // Pass product_page_path to filter out e-commerce product pages
  debugLog('SITEMAP_PREFETCH', `Fetching sitemap for ${clientDomain}${productPagePath ? `, filtering out product path: ${productPagePath}` : ''}${shouldExcludeBlogContent(intent) ? ', skipping blog sitemaps' : ''}`);
  const sitemapData = fetchAndFilterSitemap(clientDomain, productPagePath, intent);
  
  // Apply intent-based filtering to sitemap URLs (catches any blog URLs from non-blog sitemaps)
  // Transactional/Commercial = exclude blog/informational content (don't send users back down funnel)
  // Informational/Navigational/Hybrid = include all content types
  if (sitemapData.all_filtered_urls.length > 0) {
    const originalCount = sitemapData.all_filtered_urls.length;
    sitemapData.all_filtered_urls = filterUrlsByIntent(sitemapData.all_filtered_urls, intent);
    sitemapData.total_after_intent_filter = sitemapData.all_filtered_urls.length;
    
    debugLog('INTENT_FILTER_APPLIED', {
      intent: intent,
      before: originalCount,
      after: sitemapData.all_filtered_urls.length,
      removed: originalCount - sitemapData.all_filtered_urls.length
    });
  }
  
  return {
    client_url: String(targetUrl).trim(),
    client_domain: clientDomain,
    url_type: urlType,
    is_existing: urlType === 'existing',
    page_type: pageType,
    page_config: PAGE_TYPES[pageType],
    primary_keyword: String(row.primary_keyword || '').trim(),
    secondary_keyword: String(row.secondary_keyword || '').trim(),
    longtail_keywords_semantics: String(row.longtail_keywords_semantics || '').trim(),
    location: String(row.location || '').trim(),
    intent: intent,
    product_page_path: productPagePath,
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
        if (url && url.startsWith('http') && sitemapUrls.indexOf(url) === -1) {
          sitemapUrls.push(url);
        }
      });
      debugLog('ROBOTS_SITEMAPS', `Found ${sitemapUrls.length} unique sitemap(s) in robots.txt (${sitemapMatches.length} total directives): ${sitemapUrls.join(', ')}`);
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
 * 
 * v1.6.0 Changes:
 * - Removed arbitrary "first 3 sitemaps" limit
 * - Added timeout handling (stops after SITEMAP_FETCH_TIMEOUT_MS)
 * - Fetches ALL child sitemaps until timeout or completion
 * - Ensures relevant pages aren't missed due to sitemap order
 * - Skips child sitemaps with "product" in filename (e-commerce)
 * - Skips child sitemaps with "blog" or "post" in filename for transactional/commercial intent
 */
function fetchAndFilterSitemap(domain, productPagePath, intent) {
  const startTime = Date.now();
  const skipBlogSitemaps = shouldExcludeBlogContent(intent);
  const result = {
    total_found: 0,
    total_after_filter: 0,
    sitemap_source: null,
    all_filtered_urls: [],
    fetch_timeout_reached: false,
    product_urls_removed: 0,
    blog_sitemaps_skipped: 0
  };
  
  // Handle empty or invalid domain
  if (!domain || domain.trim() === '') {
    debugLog('SITEMAP_ERROR', 'Empty domain provided, skipping sitemap fetch');
    return result;
  }
  
  // Helper to check if we've exceeded timeout
  function isTimedOut() {
    const elapsed = Date.now() - startTime;
    if (elapsed >= CONFIG.SITEMAP_FETCH_TIMEOUT_MS) {
      debugLog('SITEMAP_TIMEOUT', `Timeout reached after ${elapsed}ms - proceeding with URLs collected so far`);
      result.fetch_timeout_reached = true;
      return true;
    }
    return false;
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
        if (isTimedOut()) break;
        
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
    
    // Step 3: Fetch and parse sitemap(s) - NO ARBITRARY LIMIT, use timeout instead
    let allUrls = [];
    let sitemapsProcessed = 0;
    
    for (const sitemapUrl of sitemapUrls) {
      if (isTimedOut()) break;
      
      debugLog('SITEMAP_PROCESSING', sitemapUrl);
      sitemapsProcessed++;
      
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
          // This is a sitemap index - fetch ALL child sitemaps (no arbitrary limit)
          debugLog('SITEMAP_INDEX', `Found sitemap index with ${sitemapIndexMatches.length} child sitemaps`);
          
          const childSitemapUrls = sitemapIndexMatches
            .map(match => {
              const locMatch = match.match(/<loc>(.*?)<\/loc>/);
              return locMatch ? locMatch[1] : null;
            })
            .filter(url => url)
            .filter(url => {
              const urlLower = url.toLowerCase();
              
              // Skip child sitemaps with "product" in the filename (e-commerce product sitemaps)
              if (urlLower.includes('product')) {
                debugLog('SITEMAP_SKIP_PRODUCT', `Skipping product sitemap: ${url}`);
                return false;
              }
              
              // Skip child sitemaps with "blog" or "post" in filename for transactional/commercial intent
              if (skipBlogSitemaps) {
                if (urlLower.includes('blog') || urlLower.includes('post')) {
                  debugLog('SITEMAP_SKIP_BLOG', `Skipping blog/post sitemap (transactional/commercial intent): ${url}`);
                  result.blog_sitemaps_skipped++;
                  return false;
                }
              }
              
              return true;
            });
          
          debugLog('SITEMAP_INDEX_FILTERED', `${childSitemapUrls.length} child sitemaps after filtering`);
          
          let childSitemapsProcessed = 0;
          for (const childUrl of childSitemapUrls) {
            if (isTimedOut()) {
              debugLog('SITEMAP_CHILD_TIMEOUT', `Processed ${childSitemapsProcessed}/${childSitemapUrls.length} child sitemaps before timeout`);
              break;
            }
            
            try {
              const childResponse = UrlFetchApp.fetch(childUrl, { muteHttpExceptions: true });
              if (childResponse.getResponseCode() === 200) {
                const childXml = childResponse.getContentText();
                const childUrlMatches = childXml.match(/<loc>(.*?)<\/loc>/g);
                if (childUrlMatches) {
                  const childUrls = childUrlMatches.map(match => match.replace(/<\/?loc>/g, ''));
                  allUrls = allUrls.concat(childUrls);
                }
                childSitemapsProcessed++;
              }
            } catch (e) {
              debugLog('CHILD_SITEMAP_ERROR', e.message);
            }
          }
          
          debugLog('SITEMAP_INDEX_COMPLETE', `Processed ${childSitemapsProcessed}/${childSitemapUrls.length} child sitemaps, collected ${allUrls.length} URLs`);
          
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

    const fetchDuration = Date.now() - startTime;
    result.total_found = allUrls.length;
    debugLog('SITEMAP_FETCH', `Found ${allUrls.length} total URLs in ${fetchDuration}ms (${sitemapsProcessed} sitemaps processed)`);

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

    let filteredUrls = allUrls.filter(url => {
      // Must be same domain
      if (!url.toLowerCase().includes(domain.toLowerCase().replace(/^https?:\/\//, ''))) {
        return false;
      }
      // Must not match exclude patterns
      return !excludePatterns.some(pattern => pattern.test(url));
    });

    debugLog('SITEMAP_FILTER', `${filteredUrls.length} URLs after junk filtering (removed ${allUrls.length - filteredUrls.length} junk URLs)`);

    // Dedup URLs (same sitemap processed multiple times, or overlapping child sitemaps)
    const beforeDedup = filteredUrls.length;
    const seen = {};
    filteredUrls = filteredUrls.filter(url => {
      if (seen[url]) return false;
      seen[url] = true;
      return true;
    });
    if (beforeDedup !== filteredUrls.length) {
      debugLog('SITEMAP_DEDUP', `Removed ${beforeDedup - filteredUrls.length} duplicate URLs (${beforeDedup} -> ${filteredUrls.length})`);
    }

    // Filter locale/language duplicate URLs (e.g., /en-gb/pages/faq, /en-ca/pages/faq)
    // Only removes a locale URL if the equivalent base path URL already exists in the list
    const localePattern = /^(https?:\/\/[^\/]+)\/(en-gb|en-ca|en-au|en-eu|en-us|fr|de|es|it|ja|zh|ko|pt|nl|sv|da|no|fi|pl|cs|ru)\/(.*)/i;
    const baseUrls = {};
    filteredUrls.forEach(function(url) { baseUrls[url] = true; });
    const beforeLocale = filteredUrls.length;
    filteredUrls = filteredUrls.filter(function(url) {
      var match = url.match(localePattern);
      if (!match) return true; // not a locale URL, keep it
      var basePath = match[1] + '/' + match[3]; // reconstruct without locale prefix
      return !baseUrls[basePath]; // only remove if base version exists
    });
    if (beforeLocale !== filteredUrls.length) {
      debugLog('SITEMAP_LOCALE_FILTER', `Removed ${beforeLocale - filteredUrls.length} locale duplicate URLs (${beforeLocale} -> ${filteredUrls.length})`);
    }

    // Filter out product page URLs if product_page_path is provided
    if (productPagePath && productPagePath.trim() !== '') {
      const productPath = productPagePath.trim().toLowerCase();
      const beforeProductFilter = filteredUrls.length;
      
      filteredUrls = filteredUrls.filter(url => {
        const urlLower = url.toLowerCase();
        return !urlLower.includes(productPath);
      });
      
      result.product_urls_removed = beforeProductFilter - filteredUrls.length;
      debugLog('PRODUCT_FILTER', {
        product_path: productPath,
        before: beforeProductFilter,
        after: filteredUrls.length,
        removed: result.product_urls_removed
      });
    }

    result.total_after_filter = filteredUrls.length;
    result.all_filtered_urls = filteredUrls;
    debugLog('SITEMAP_FINAL', `${filteredUrls.length} URLs ready for Claude`);

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
    userMessage += `- Place longtails in H2/H3 headings when your section count allows it\n`;
    userMessage += `  Example: If given "bedsore lawsuit settlements" and section count allows → Create section "Understanding Bedsore Lawsuit Settlements"\n`;
    userMessage += `- If your section count is already at the intent maximum, consolidate longtails into existing sections' keywords_to_include arrays or guidance text instead\n`;
    userMessage += `  Example: If section count is capped at 6 and all sections are filled → Add "bedsore lawsuit settlements" to the most relevant section's keywords_to_include\n`;
    userMessage += `- PRIORITY: Primary keyword (H1) → Secondary keywords (dedicated H2s) → Longtails (H2s if room, otherwise keywords_to_include)\n`;
    userMessage += `- DO NOT skip ANY keywords - each one represents user intent and must be addressed\n`;
    userMessage += `- VERIFICATION STEP: Before returning the JSON, count your longtails and where you placed them. ALL ${parsed.terms.length} MUST be accounted for.\n\n`;
  }

  // Build INTERNAL LINKS section separately — only needed for Phase 3 (internal link selection).
  // Keeping this OUT of userMessage (Phase 1) saves ~8K chars of tokens during Phases 1-2,
  // preventing context overflow since web_search/web_fetch tool definitions consume ~195K tokens.
  let sitemapBlock = '';
  sitemapBlock += `\n════════════════════════════════════════════════════════════\n`;
  sitemapBlock += `🔗 AVAILABLE INTERNAL LINKS (PRE-VERIFIED FROM SITEMAP) 🔗\n`;
  sitemapBlock += `════════════════════════════════════════════════════════════\n\n`;
  
  if (strategy.sitemap_data && strategy.sitemap_data.all_filtered_urls.length > 0) {
    sitemapBlock += `We have pre-fetched ${strategy.sitemap_data.all_filtered_urls.length} verified URLs from the client sitemap.\n`;
    
    // Note if intent filtering was applied
    if (shouldExcludeBlogContent(strategy.intent)) {
      sitemapBlock += `📋 NOTE: This is a ${strategy.intent} intent page - informational content has been filtered out:\n`;
      sitemapBlock += `   - Blog/post sitemaps were skipped entirely\n`;
      sitemapBlock += `   - About, FAQ, team, and other informational pages were excluded\n`;
      sitemapBlock += `   (We keep users at the bottom of the funnel for conversion-focused pages.)\n`;
    }
    
    // Note if product pages were filtered out
    if (strategy.sitemap_data.product_urls_removed > 0) {
      sitemapBlock += `📋 NOTE: ${strategy.sitemap_data.product_urls_removed} product page URLs were filtered out.\n`;
      sitemapBlock += `   If a specific product link would be valuable for this content, describe the type of product and why in your suggestions (without a specific URL).\n`;
    }
    
    sitemapBlock += `\n⚠️ CRITICAL: You MUST ONLY select internal links from this list. DO NOT invent or guess URLs.\n`;
    sitemapBlock += `If a URL is not in this list, it does not exist. Do not make up URLs under any circumstances.\n\n`;
    
    // Show all filtered URLs as a simple flat list
    sitemapBlock += `AVAILABLE PAGES (${strategy.sitemap_data.all_filtered_urls.length} total):\n`;
    strategy.sitemap_data.all_filtered_urls.forEach(url => {
      sitemapBlock += `  • ${url}\n`;
    });
    sitemapBlock += `\n`;
    
    sitemapBlock += `INTERNAL LINK SELECTION RULES:\n`;
    sitemapBlock += `1. Select ${CONFIG.TARGET_INTERNAL_LINKS} internal links from the list above (minimum ${CONFIG.MIN_INTERNAL_LINKS})\n`;
    sitemapBlock += `2. Choose links that are CONTEXTUALLY and SEMANTICALLY relevant to "${strategy.primary_keyword}"\n`;
    sitemapBlock += `   - This includes directly related topics AND semantically related topics\n`;
    sitemapBlock += `   - Example: For "truck accident lawyer", relevant links include truck accidents, commercial vehicle injuries, wrongful death, FMCSA regulations, etc.\n`;
    sitemapBlock += `   - Don't just match keywords - think about what topics a user interested in "${strategy.primary_keyword}" would also want to explore\n`;
    sitemapBlock += `3. All URLs above are PRE-VERIFIED - set url_status to "200" for all selected links\n`;
    sitemapBlock += `4. NEVER invent URLs - if a page isn't in the list above, do not include it\n`;
    sitemapBlock += `5. DO NOT use web_search to find or verify internal links - only use the list provided\n`;
    if (strategy.sitemap_data.product_urls_removed > 0) {
      sitemapBlock += `6. If a specific product page link would add value, note this in your recommendations with the product type and reasoning (no URL needed)\n`;
    }
    sitemapBlock += `\n`;
  } else {
    sitemapBlock += `⚠️ No sitemap found for ${strategy.client_domain}.\n`;
    sitemapBlock += `You will need to use site:${strategy.client_domain} search to discover internal link candidates.\n`;
    sitemapBlock += `Verify each discovered URL with web_search before including.\n`;
    sitemapBlock += `Target: ${CONFIG.TARGET_INTERNAL_LINKS} internal links (minimum ${CONFIG.MIN_INTERNAL_LINKS})\n\n`;
  }
  sitemapBlock += `════════════════════════════════════════════════════════════\n\n`;

  userMessage += `════════════════════════════════════════════════════════════
📌 PHASE 1 — CLIENT RESEARCH
════════════════════════════════════════════════════════════

Your task is split into multiple phases. In THIS phase, research the client website ONLY.

INSTRUCTIONS:
1. Use web_search with "site:${strategy.client_domain}" to find relevant pages
2. ALWAYS fetch foundational pages first: homepage and about/about-us/our-story page
   (These provide brand context, company info, certifications, and trust signals for EEAT)
3. Then fetch 0-1 additional pages most relevant to "${strategy.primary_keyword}"
4. Goal: 2-3 total client pages fetched (2 foundational + 0-1 keyword-relevant)
5. Extract factual information from the fetched pages

AFTER FETCHING ALL CLIENT PAGES:
Write comprehensive "=== CLIENT RESEARCH NOTES ===" summarizing EVERYTHING you found.
These notes are your ONLY record — raw page data will be cleared before the next phase.
Include: business name, services, certifications, awards, trust signals, brand voice, 
service areas, key facts, content gaps, and what was on each URL you fetched.

DO NOT research competitors yet. DO NOT write the brief yet. ONLY research the client.
End with your CLIENT RESEARCH NOTES text block.`;

  // Fetch real Google SERP data from Ahrefs API
  // Strip zero-width spaces (U+200B, U+FEFF, etc.) that can come from spreadsheet copy/paste
  const cleanedKeyword = strategy.primary_keyword.replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, '').trim();
  const ahrefsSerpData = fetchAhrefsSerpData(cleanedKeyword, strategy.client_domain);

  // Fallback flag: if Ahrefs fails, Phase 1 discovers competitors via web_search
  var ahrefsFallback = false;
  if (!ahrefsSerpData || ahrefsSerpData.competitors.length < 3) {
    ahrefsFallback = true;
    strategy.ahrefsFallback = true;  // Store on strategy for access in calling scope
    var fallbackReason = !ahrefsSerpData ? 'Ahrefs API returned no data' : 
      'Ahrefs returned only ' + ahrefsSerpData.competitors.length + ' competitors (need 3+)';
    debugLog('AHREFS_FALLBACK', {
      reason: fallbackReason,
      competitors_returned: ahrefsSerpData ? ahrefsSerpData.competitors.length : 0,
      action: 'Phase 1 will discover competitors via web_search'
    });
    
    // Append competitor discovery task to Phase 1 message
    userMessage += `

════════════════════════════════════════════════════════════
⚠️ ADDITIONAL TASK — COMPETITOR DISCOVERY (Ahrefs unavailable)
════════════════════════════════════════════════════════════

The SERP data API is unavailable for this keyword. You MUST also discover competitor pages.
After completing your client research above, do ONE web_search for "${strategy.primary_keyword}" 
and identify the top 6-8 organic result URLs (skip ads, PAA boxes, and the client domain ${strategy.client_domain}).

List discovered competitor URLs at the END of your research notes in this EXACT format:

=== DISCOVERED COMPETITOR URLS ===
COMPETITOR_URL: https://example.com/full-page-path
COMPETITOR_URL: https://example2.com/full-page-path
(one per line, full URL including path, 6-8 URLs)

These URLs will be fetched server-side for competitor analysis in Phase 2.
Include your regular CLIENT RESEARCH NOTES first, then the DISCOVERED COMPETITOR URLS section last.`;
  }

  // Fetch competitor page word counts server-side (deterministic, matches Ahrefs UI)
  if (ahrefsSerpData && ahrefsSerpData.competitors.length >= 3) {
    fetchCompetitorWordCounts(ahrefsSerpData.competitors);
    // Store server word counts on strategy for recalculateWordCountRange
    strategy.server_word_counts = ahrefsSerpData.competitors
      .filter(c => c.word_count > 0)
      .map(c => ({ url: c.url, position: c.position, word_count: c.word_count }));
  }

  // Build Phase 2-5 messages (used later in the phased turn loop)
  let phase2Message;
  
  if (ahrefsSerpData && ahrefsSerpData.competitors.length >= 3) {
    // Build competitor content blocks from server-side pre-fetched content
    var competitorsWithContent = ahrefsSerpData.competitors.filter(function(c) { 
      return c.extracted_content && c.extracted_content.length > 100; 
    });
    var competitorsWithoutContent = ahrefsSerpData.competitors.filter(function(c) { 
      return !c.extracted_content || c.extracted_content.length <= 100; 
    });
    
    debugLog('PHASE2_CONTENT_PREP', {
      total_competitors: ahrefsSerpData.competitors.length,
      with_content: competitorsWithContent.length,
      without_content: competitorsWithoutContent.length,
      skipped_urls: competitorsWithoutContent.map(function(c) { return c.url; })
    });
    
    // Build content blocks for each competitor that has pre-fetched content
    var contentBlocks = competitorsWithContent.map(function(c, i) {
      var wcLabel = c.word_count > 0 ? '~' + c.word_count + ' words' : 'word count unavailable';
      return '────────────────────────────────────────\n' +
        'COMPETITOR ' + (i + 1) + ': [Position #' + c.position + ', DR ' + c.domain_rating + ', ' + wcLabel + ']\n' +
        'URL: ' + c.url + '\n' +
        '────────────────────────────────────────\n' +
        c.extracted_content;
    }).join('\n\n');
    
    // List any competitors that couldn't be fetched
    var failedList = competitorsWithoutContent.length > 0
      ? '\nNOTE: The following competitors could not be fetched server-side (blocked/error):\n' +
        competitorsWithoutContent.map(function(c) { 
          return '   - [Position #' + c.position + '] ' + c.url + ' (fetch status: ' + c.word_count_source + ')'; 
        }).join('\n') + '\n'
      : '';
    
    const paaSection = ahrefsSerpData.paa_questions.length > 0
      ? '\nPEOPLE ALSO ASK questions found in SERPs:\n' + ahrefsSerpData.paa_questions.map(q => '   - ' + q).join('\n') + '\nUse these to identify content gaps and as source material for FAQ questions if FAQ is included.\n'
      : '';

    phase2Message = `════════════════════════════════════════════════════════════
📌 PHASE 2 — COMPETITOR RESEARCH  
════════════════════════════════════════════════════════════

Analyze the top competitors for "${strategy.primary_keyword}".

The server has already fetched the competitor page content from the real Google SERPs (via Ahrefs).
Their extracted text content is provided below. You do NOT need to use web_search or web_fetch.

${competitorsWithContent.length} COMPETITOR PAGES (pre-fetched, analyzed by Google position order):

${contentBlocks}
${failedList}${paaSection}
INSTRUCTIONS:
1. Analyze ALL ${competitorsWithContent.length} competitor pages provided above by GOOGLE POSITION ORDER
   - These pages are ranked by Google — analyze them in position order, not by DR or perceived quality
2. WORD COUNTS — Pre-calculated by the server (shown above as "~X words"):
   - Use the server-provided word counts in your research notes. Do NOT re-count words yourself.
   - If a competitor shows "word count unavailable", estimate from the provided content (main body only).
   - The server will use these word counts to calculate the target word count range.
3. From the provided content, COUNT:
   - Actual H2/H3 section count per page (look for heading patterns in the text)
4. Calculate section count average + apply intent modifier
5. Check for content format patterns (tables, lists, media references)
6. For EACH competitor, note whether the page has a FAQ section (yes/no). Report the total count: "X of Y competitors have FAQ sections"
7. Identify competitive gaps

AFTER ANALYZING ALL COMPETITOR PAGES:
Write comprehensive "=== COMPETITOR RESEARCH NOTES ===" summarizing EVERYTHING you found.
These notes are your ONLY record — the competitor content will be cleared before the next phase.
Include: each competitor URL + domain, word counts, section counts, calculations, patterns, gaps.

DO NOT write the brief yet. ONLY research competitors.
End with your COMPETITOR RESEARCH NOTES text block.`;

  } else {
    // Fallback — no Ahrefs data OR insufficient competitor content
    // Phase 1 has been instructed to discover competitor URLs via web_search.
    // After Phase 1 completes, those URLs will be fetched server-side and
    // this placeholder message will be replaced with pre-fetched content.
    debugLog('AHREFS_FALLBACK_PHASE2', {
      reason: 'Phase 2 message will be rebuilt after Phase 1 discovers competitors',
      ahrefsFallback: ahrefsFallback
    });
    phase2Message = `════════════════════════════════════════════════════════════
📌 PHASE 2 — COMPETITOR RESEARCH (FALLBACK MODE)
════════════════════════════════════════════════════════════

Analyze the competitor pages for "${strategy.primary_keyword}".

NOTE: The Ahrefs SERP API was unavailable. Competitor content was discovered via web_search 
and fetched server-side. If no competitor content appears above this message, use your 
research notes from Phase 1 to provide the best competitor analysis you can.

INSTRUCTIONS:
1. Analyze ALL competitor pages provided above by position order
2. Count H2/H3 sections, note content structure and patterns
3. Identify content gaps and opportunities
4. For EACH competitor, note whether the page has a FAQ section (yes/no)

AFTER ANALYZING ALL COMPETITOR PAGES:
Write comprehensive "=== COMPETITOR RESEARCH NOTES ===" summarizing EVERYTHING you found.
These notes are your ONLY record — the competitor content will be cleared before the next phase.
Include: each competitor URL + domain, word counts, section counts, calculations, patterns, gaps.

DO NOT write the brief yet. ONLY research competitors.
End with your COMPETITOR RESEARCH NOTES text block.`;
  }

  // Build deterministic FAQ directive based on page type
  // Blog: always include | Service/Category: 2+ of 4 competitors | Product: 3+ of 4 | Homepage: never
  let faqDirective;
  let faqThreshold;
  const faqQuestionRange = strategy.page_type === 'blog page' ? '5-8' : '3-5';
  
  switch (strategy.page_type) {
    case 'blog page':
      faqDirective = `FAQ DECISION: INCLUDE FAQ SECTION.
Blog pages always include FAQ for long-tail keyword coverage and LLM/GEO citation value.
- Add ${faqQuestionRange} questions targeting real user queries from PAA data and competitor analysis
- Set include_faq: true and add an outline section with is_faq_section: true and faq_questions populated`;
      faqThreshold = 0;
      break;
    case 'homepage':
      faqDirective = `FAQ DECISION: DO NOT INCLUDE FAQ SECTION.
Homepages never include FAQ sections.
- Set include_faq: false with rationale "Homepage — FAQ not applicable"
- Do NOT add any outline section with is_faq_section: true`;
      faqThreshold = 5; // impossible threshold
      break;
    case 'product page':
      faqDirective = `FAQ DECISION: CONDITIONAL — Check your COMPETITOR RESEARCH NOTES.
Count how many of the competitors you analyzed have FAQ sections.
- If 3 or more competitors have FAQs → INCLUDE FAQ: Set include_faq: true, add ${faqQuestionRange} questions in an outline section with is_faq_section: true
- If fewer than 3 have FAQs → EXCLUDE FAQ: Set include_faq: false with rationale stating the competitor FAQ count
- This is a strict count-based rule. Do NOT use judgment — just count and apply.`;
      faqThreshold = 3;
      break;
    default: // service page, category page
      faqDirective = `FAQ DECISION: CONDITIONAL — Check your COMPETITOR RESEARCH NOTES.
Count how many of the competitors you analyzed have FAQ sections.
- If 2 or more competitors have FAQs → INCLUDE FAQ: Set include_faq: true, add ${faqQuestionRange} questions in an outline section with is_faq_section: true
- If fewer than 2 have FAQs → EXCLUDE FAQ: Set include_faq: false with rationale stating the competitor FAQ count
- This is a strict count-based rule. Do NOT use judgment — just count and apply.`;
      faqThreshold = 2;
      break;
  }
  
  // Store threshold for server-side reconciliation
  strategy.faq_threshold = faqThreshold;
  
  debugLog('FAQ_RULES', {
    page_type: strategy.page_type,
    threshold: faqThreshold,
    question_range: faqQuestionRange
  });

  const phase3Message = `════════════════════════════════════════════════════════════
📌 PHASE 3 — WRITE CONTENT BRIEF
════════════════════════════════════════════════════════════

Using your CLIENT RESEARCH NOTES and COMPETITOR RESEARCH NOTES, write the complete JSON content brief.

${sitemapBlock}
REQUIREMENTS:
1. Use ONLY facts from your research notes — never hallucinate
2. Select ${CONFIG.TARGET_INTERNAL_LINKS} internal links FROM THE PRE-VERIFIED SITEMAP LIST above (minimum ${CONFIG.MIN_INTERNAL_LINKS})
3. Find ${CONFIG.MAX_EXTERNAL_LINKS} external link suggestions:
   - Use web_search to find specific, authoritative pages relevant to "${strategy.primary_keyword}"
   - Copy the EXACT full URL from search results (NOT homepage URLs)
   - Set ALL external links to url_status: "suggested"
   - Do NOT use web_fetch on external links — it wastes tokens
   - For EACH link, include a search_suggestion: a SHORT, SPECIFIC Google search query the content writer can use to find and verify the exact page
   - Use SIMPLE anchor text (brand names, "this study", etc.) — NOT keyword-stuffed anchors
   - AVOID linking to competitors offering the same service as the client
4. Base word count on actual competitor pages from your COMPETITOR RESEARCH NOTES
5. Provide specific, actionable guidance for AI content machines

CONTENT OUTLINE STRUCTURE:
- First item: H1 (level: 1)
- Second item: AFP Guidance (level: 0, is_afp_guidance: true) — DO NOT write exact AFP text, only provide guidance on what it should cover (${strategy.page_config.answerFirstLength})
- Remaining items: H2/H3 sections with detailed guidance
- FAQ section (if applicable — see FAQ DECISION below): towards end of outline

${faqDirective}
${ahrefsSerpData && ahrefsSerpData.paa_questions.length > 0 ? `\nPAA QUESTIONS FROM GOOGLE (use for FAQ content if FAQ is included):\n${ahrefsSerpData.paa_questions.map(q => '  - ' + q).join('\n')}\n` : ''}
⚠️ CONSISTENCY: include_faq and outline MUST agree. If include_faq is true, outline must have is_faq_section. If false, outline must NOT have is_faq_section.

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
    messages: [],
    context_management: {
      edits: [
        {
          type: 'clear_tool_uses_20250919',
          trigger: { type: 'input_tokens', value: CONFIG.CONTEXT_EDITING_THRESHOLD },
          keep: { type: 'tool_uses', value: 3 }
        }
      ]
    }
  };
  if (CONFIG.USE_WEB_SEARCH) {
    requestBody.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search'
      },
      {
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_content_tokens: CONFIG.WEB_FETCH_MAX_CONTENT_TOKENS
      }
    ];
  }
  debugLog('CLAUDE REQUEST', { 
    model: CONFIG.CLAUDE_MODEL, 
    has_tools: !!requestBody.tools, 
    retry: retryCount,
    context_editing_threshold: CONFIG.CONTEXT_EDITING_THRESHOLD,
    web_fetch_max_content_tokens: CONFIG.WEB_FETCH_MAX_CONTENT_TOKENS,
    tool_isolation: 'Phase 1: all tools | Phase 2: none | Phase 3: web_search only (v2.1.1)',
    prefetched_competitors: ahrefsSerpData ? ahrefsSerpData.competitors.filter(function(c) { return c.extracted_content && c.extracted_content.length > 100; }).length : 0
  });
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
    // ═══════════════════════════════════════════════════════════════════
    // PHASE-BASED TURN LOOP — FRESH CONTEXT PER PHASE
    // ═══════════════════════════════════════════════════════════════════
    // Phase 1: Client research → CLIENT RESEARCH NOTES
    // Phase 2: Competitor research → COMPETITOR RESEARCH NOTES  
    // Phase 3: Write brief JSON (external links as "suggested" with search_suggestions for editorial verification)
    //
    // CRITICAL: Each phase starts with a FRESH conversation (no history).
    // Server-managed tools (web_search, web_fetch) persist tool results
    // server-side. Even if stripped from the conversation, the server
    // re-injects ~44K tokens of tool results, causing context overflow
    // (tool definitions alone consume ~163K of the 200K limit).
    //
    // Solution: Research notes from completed phases are extracted as plain
    // text and injected directly into the next phase's user message.
    // This keeps each phase under ~166K tokens total.
    //
    // Context editing (clear_tool_uses) fires WITHIN a phase when multiple
    // tool turns cause input_tokens > CONTEXT_EDITING_THRESHOLD.
    //
    // External link validation is handled server-side using UrlFetchApp
    // after the brief JSON is parsed — no additional API calls needed.
    // ═══════════════════════════════════════════════════════════════════

    const phases = [
      { name: 'CLIENT_RESEARCH', message: userMessage, maxToolTurns: 6, expectJSON: false },
      { name: 'COMPETITOR_RESEARCH', message: phase2Message, maxToolTurns: 8, expectJSON: false },
      { name: 'WRITE_BRIEF', message: phase3Message, maxToolTurns: 6, expectJSON: true }
    ];

    let conversationMessages = [];
    let briefText = '';
    let totalApiCalls = 0;
    
    // Accumulate research notes between phases. Each phase starts with a FRESH
    // conversation (no history) to avoid server-side tool result re-injection.
    // Server-managed tools (web_search, web_fetch) persist their tool results
    // server-side — even if stripped from the conversation, the server re-injects
    // ~44K tokens of tool results, causing context overflow. By resetting the
    // conversation and injecting only the research notes text, each phase stays
    // within the ~5K token budget left after tool definitions (~163K) + system prompt (~8K).
    let previousPhaseNotes = [];
    
    // Debug: Log sizes of key components
    var userMsgChars = userMessage.length;
    var systemPromptChars = JSON.stringify(requestBody.system || '').length;
    var estimatedTokens = Math.round((userMsgChars + systemPromptChars) / 3);
    debugLog('MESSAGE_SIZES', {
      user_message_chars: userMsgChars,
      system_prompt_chars: systemPromptChars,
      combined_chars: userMsgChars + systemPromptChars,
      estimated_tokens: estimatedTokens,
      sitemap_urls_count: strategy.sitemap_data?.total_after_filter || 0,
      context_limit: 200000,
      context_editing_threshold: CONFIG.CONTEXT_EDITING_THRESHOLD,
      total_phases: phases.length
    });

    // ─── PHASE LOOP ─────────────────────────────────────────────────
    for (var phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
      var phase = phases[phaseIndex];
      debugLog('PHASE_START', { 
        phase: phase.name, 
        index: phaseIndex + 1,
        totalPhases: phases.length,
        conversationLength: conversationMessages.length,
        expectJSON: phase.expectJSON
      });

      // ─── FRESH CONTEXT PER PHASE ───────────────────────────────────
      // Reset conversation to avoid server-side tool result re-injection.
      // Inject previous phase notes directly into the user message.
      conversationMessages = [];
      var phaseMessageContent = phase.message;
      
      if (previousPhaseNotes.length > 0) {
        var notesPrefix = '════════════════════════════════════════════════════════════\n' +
          '📋 RESEARCH FROM PREVIOUS PHASES (for reference)\n' +
          '════════════════════════════════════════════════════════════\n\n' +
          previousPhaseNotes.join('\n\n') + '\n\n';
        phaseMessageContent = notesPrefix + phaseMessageContent;
        debugLog('NOTES_INJECTED', {
          phase: phase.name,
          notes_count: previousPhaseNotes.length,
          notes_chars: notesPrefix.length,
          total_message_chars: phaseMessageContent.length
        });
      }
      
      conversationMessages.push({
        role: 'user',
        content: phaseMessageContent
      });

      // Log conversation size entering this phase
      var convJson = JSON.stringify(conversationMessages);
      var convChars = convJson.length;
      var convEstTokens = Math.round(convChars / 3);
      debugLog('PHASE_CONTEXT_SIZE', {
        phase: phase.name,
        conversation_chars: convChars,
        estimated_tokens: convEstTokens,
        message_count: conversationMessages.length,
        will_context_edit: convEstTokens > CONFIG.CONTEXT_EDITING_THRESHOLD
      });

      logToDebugSheet('PHASE_' + (phaseIndex + 1) + '_START_' + phase.name, {
        estimated_input_tokens: convEstTokens,
        message_count: conversationMessages.length,
        context_editing_threshold: CONFIG.CONTEXT_EDITING_THRESHOLD
      });

      var phaseComplete = false;
      var phaseToolTurns = 0;
      var phaseText = '';

      // ─── INNER TOOL-CONTINUATION LOOP (per phase) ──────────────────
      var phaseRetries = 0;
      var MAX_PHASE_RETRIES = 3;
      
      while (!phaseComplete && phaseToolTurns < phase.maxToolTurns) {
        phaseToolTurns++;
        totalApiCalls++;
        debugLog('PHASE_TURN', phase.name + ' tool turn ' + phaseToolTurns + '/' + phase.maxToolTurns + ' (API call #' + totalApiCalls + ')');

        requestBody.messages = conversationMessages;
        
        // ── TOOL ISOLATION: Strip tools from Phase 2 only ─────────────
        // Server-managed tools (web_search, web_fetch) maintain implicit server-side
        // state between API calls. Phase 1's tool results (~88K tokens) get re-injected
        // into subsequent phases even with fresh conversations, causing 208K+ overflow.
        // Solution: Phase 2 uses pre-fetched competitor content (no tools needed).
        // Phase 3 (~13K tokens) re-enables web_search for external link discovery —
        // even with Phase 1 state re-injected (~88K), total is ~130K, well under 200K limit.
        var toolsBackup = null;
        var contextMgmtBackup = null;
        var betaHeader = 'web-search-2025-03-05,web-fetch-2025-09-10,context-management-2025-06-27';
        if (phase.name === 'COMPETITOR_RESEARCH') {
          // Phase 2 only: Remove ALL tools and context_management to prevent server state re-injection
          if (requestBody.tools) {
            toolsBackup = requestBody.tools;
            delete requestBody.tools;
          }
          if (requestBody.context_management) {
            contextMgmtBackup = requestBody.context_management;
            delete requestBody.context_management;
          }
          // Strip server-tool betas from header entirely
          betaHeader = '';
          debugLog('TOOLS_STRIPPED', { phase: phase.name, turn: phaseToolTurns, reason: 'prevent server state re-injection' });
        } else if (phase.name === 'WRITE_BRIEF') {
          // Phase 3: Only web_search for external link discovery (no web_fetch, no context_management)
          if (requestBody.tools) {
            toolsBackup = requestBody.tools;
            requestBody.tools = requestBody.tools.filter(function(t) {
              return t.type === 'web_search_20250305' || t.name === 'web_search';
            });
            if (requestBody.tools.length === 0) delete requestBody.tools;
          }
          if (requestBody.context_management) {
            contextMgmtBackup = requestBody.context_management;
            delete requestBody.context_management;
          }
          betaHeader = 'web-search-2025-03-05';
          debugLog('TOOLS_FILTERED', { phase: phase.name, turn: phaseToolTurns, tools_kept: 'web_search only', reason: 'external link discovery' });
        }
        
        // Log request for first turn of each phase
        if (phaseToolTurns === 1) {
          logToDebugSheet('PHASE_' + (phaseIndex + 1) + '_REQ', requestBody);
        }

        var fetchHeaders = {
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01'
          };
        if (betaHeader) {
          fetchHeaders['anthropic-beta'] = betaHeader;
        }
        
        // PRE_REQUEST_SIZE diagnostic
        var payloadStr = JSON.stringify(requestBody);
        debugLog('PRE_REQUEST_SIZE', {
          phase: phase.name,
          turn: phaseToolTurns,
          payload_chars: payloadStr.length,
          payload_est_tokens: Math.round(payloadStr.length / 3),
          has_tools: !!requestBody.tools,
          has_beta: !!betaHeader,
          beta_header: betaHeader || 'none',
          message_count: requestBody.messages ? requestBody.messages.length : 0,
          message_roles: requestBody.messages ? requestBody.messages.map(function(m) { return m.role; }).join(',') : 'none'
        });

        var response = robustFetch('https://api.anthropic.com/v1/messages', {
          method: 'post',
          contentType: 'application/json',
          muteHttpExceptions: true,
          headers: fetchHeaders,
          payload: payloadStr
        });

        var statusCode = response.getResponseCode();
        var responseText = response.getContentText();
        debugLog('PHASE_RESPONSE', { phase: phase.name, turn: phaseToolTurns, statusCode: statusCode });

        // Restore tools and context_management if they were removed for this phase
        if (toolsBackup) {
          requestBody.tools = toolsBackup;
          toolsBackup = null;
        }
        if (contextMgmtBackup) {
          requestBody.context_management = contextMgmtBackup;
          contextMgmtBackup = null;
        }

        // ── Error handling: retry in-place to preserve conversation history ──
        if (statusCode === 429 || statusCode === 500 || statusCode === 529) {
          if (phaseRetries < MAX_PHASE_RETRIES) {
            phaseRetries++;
            var waitTime = Math.pow(2, phaseRetries) * 30;
            var errorType = statusCode === 429 ? 'RATE LIMIT' : 'SERVER ERROR';
            debugLog(errorType + '_PHASE_RETRY', {
              phase: phase.name,
              attempt: phaseRetries + '/' + MAX_PHASE_RETRIES,
              statusCode: statusCode,
              waitSeconds: waitTime,
              conversationPreserved: true,
              messagesInHistory: conversationMessages.length
            });
            Utilities.sleep(waitTime * 1000);
            // Undo the turn/call counters since we're retrying the same call
            phaseToolTurns--;
            totalApiCalls--;
            continue;  // Retry the same API call with conversation intact
          } else {
            var errorMsg = statusCode === 429 
              ? 'Rate limit exceeded after ' + MAX_PHASE_RETRIES + ' in-place retries in phase ' + phase.name
              : 'Anthropic server error (' + statusCode + ') after ' + MAX_PHASE_RETRIES + ' in-place retries in phase ' + phase.name;
            throw new Error(errorMsg);
          }
        }
        
        if (statusCode !== 200) {
          logToDebugSheet('ERROR_' + statusCode + '_PHASE_' + phase.name, requestBody, responseText);
          debugLog('CLAUDE_ERROR_BODY', responseText.substring(0, 1000));
          
          // Handle context limit / prompt too long errors (deterministic — retrying won't help)
          if (statusCode === 400 && (responseText.includes('context limit') || responseText.includes('prompt is too long') || responseText.includes('too many tokens'))) {
            debugLog('CONTEXT_LIMIT_HIT', 'Phase ' + phase.name + ': Input too large for context window (' + responseText.substring(0, 200) + ')');
            
            // Log detailed context analysis
            var msgAnalysis = conversationMessages.map(function(m, idx) {
              var blockTypes = Array.isArray(m.content) ? m.content.map(function(b) { return b.type; }).join(',') : 'string';
              var msgChars = JSON.stringify(m.content).length;
              return { idx: idx, role: m.role, types: blockTypes, chars: msgChars, est_tokens: Math.round(msgChars / 3) };
            });
            debugLog('CONTEXT_LIMIT_ANALYSIS', JSON.stringify(msgAnalysis));
            
            throw new Error(
              'Context limit exceeded in phase ' + phase.name + ' (turn ' + phaseToolTurns + '). ' +
              'Total API calls so far: ' + totalApiCalls + '. ' +
              'Check CONTEXT_LIMIT_ANALYSIS log for message breakdown.'
            );
          }
          
          if (statusCode === 400 && responseText.includes('invalid_request_error') && phaseRetries < MAX_PHASE_RETRIES) {
            phaseRetries++;
            debugLog('STABILIZATION_RETRY', {
              phase: phase.name,
              attempt: phaseRetries + '/' + MAX_PHASE_RETRIES,
              conversationPreserved: true
            });
            Utilities.sleep(5000);
            phaseToolTurns--;
            totalApiCalls--;
            continue;
          }
          throw new Error('Claude API error ' + statusCode + ' in phase ' + phase.name + ': ' + responseText.substring(0, 500));
        }

        // Reset phase retry counter on successful 200 response
        phaseRetries = 0;

        // ── Parse response ──
        var responseData = JSON.parse(responseText);
        debugLog('PHASE_STOP_REASON', { phase: phase.name, stop_reason: responseData.stop_reason });

        // Log usage data if available (shows actual input tokens after context editing)
        if (responseData.usage) {
          debugLog('PHASE_USAGE', {
            phase: phase.name,
            turn: phaseToolTurns,
            input_tokens: responseData.usage.input_tokens,
            output_tokens: responseData.usage.output_tokens,
            cache_creation_input_tokens: responseData.usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: responseData.usage.cache_read_input_tokens || 0
          });
          
          // Log on first turn of each phase to show context editing impact
          if (phaseToolTurns === 1) {
            logToDebugSheet('PHASE_' + (phaseIndex + 1) + '_USAGE', {
              phase: phase.name,
              input_tokens: responseData.usage.input_tokens,
              output_tokens: responseData.usage.output_tokens,
              estimated_pre_edit_tokens: convEstTokens,
              tokens_cleared: Math.max(0, convEstTokens - responseData.usage.input_tokens)
            });
          }
        }

        var assistantContent = responseData.content;
        
        // Log content block analysis
        if (assistantContent) {
          var blockSummary = assistantContent.map(function(block, idx) {
            return { idx: idx, type: block.type, name: block.name || '', chars: JSON.stringify(block).length };
          });
          debugLog('PHASE_BLOCKS', { phase: phase.name, turn: phaseToolTurns, blocks: JSON.stringify(blockSummary) });
          
          // Log details of any small/failed fetch or search results for diagnostics
          assistantContent.forEach(function(block, idx) {
            if ((block.type === 'web_fetch_tool_result' || block.type === 'web_search_tool_result') 
                && JSON.stringify(block).length < 500) {
              var errorDetail = '';
              try {
                if (block.content) {
                  errorDetail = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                }
              } catch(e) {
                errorDetail = 'Unable to extract content';
              }
              // Find the preceding server_tool_use to get the URL that was fetched
              var fetchUrl = '';
              if (idx > 0) {
                var prevBlock = assistantContent[idx - 1];
                if (prevBlock.type === 'server_tool_use' && prevBlock.input) {
                  fetchUrl = prevBlock.input.url || prevBlock.input.query || '';
                }
              }
              debugLog('FETCH_ERROR_DETAIL', { 
                phase: phase.name, 
                block_idx: idx, 
                type: block.type, 
                chars: JSON.stringify(block).length,
                url: fetchUrl,
                error_content: errorDetail.substring(0, 300)
              });
            }
          });
        }

        // Clean up orphaned server_tool_use at end of response
        var hasWebTools = assistantContent.some(function(block) {
          return (block.type === 'tool_use' && (block.name === 'web_search' || block.name === 'web_fetch')) || 
                 (block.type === 'server_tool_use');
        });
        if (hasWebTools) {
          var lastBlock = assistantContent[assistantContent.length - 1];
          if (responseData.stop_reason === 'pause_turn' && lastBlock && lastBlock.type === 'server_tool_use') {
            debugLog('PROTOCOL_FIX', 'Phase ' + phase.name + ': Dropping orphaned server_tool_use ID: ' + lastBlock.id);
            assistantContent.pop();
          }
          assistantContent = assistantContent.filter(function(block) {
            return block.type === 'tool_use' || 
                   block.type === 'server_tool_use' || 
                   block.type === 'web_search_tool_result' ||
                   block.type === 'web_fetch_tool_result' ||
                   block.type === 'text';
          });
        }

        // Add assistant response to conversation
        conversationMessages.push({
          role: 'assistant',
          content: assistantContent
        });

        // Check for tool use blocks (need continuation)
        var toolUses = assistantContent.filter(function(block) { return block.type === 'tool_use'; });
        if (toolUses.length > 0) {
          debugLog('PHASE_TOOL_USE', phase.name + ': Claude requested ' + toolUses.length + ' tools');
          var toolResults = toolUses.map(function(toolUse) {
            if (toolUse.name === 'web_search') {
              return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: [{ type: 'web_search_tool_result' }]
              };
            }
            if (toolUse.name === 'web_fetch') {
              return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: [{ type: 'web_fetch_tool_result' }]
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

          debugLog('PHASE_CONTINUE', phase.name + ': Tool turn complete. Pacing 2s...');
          Utilities.sleep(2000);
          continue;
        }

        // No tool use — check for text content (phase complete)
        var textBlocks = assistantContent.filter(function(block) { return block.type === 'text'; });
        if (textBlocks.length > 0) {
          phaseText = textBlocks.map(function(block) { return block.text; }).join('\n');
          debugLog('PHASE_TEXT_FOUND', { 
            phase: phase.name, 
            chars: phaseText.length,
            hasResearchNotes: phaseText.indexOf('=== CLIENT RESEARCH NOTES ===') > -1 || phaseText.indexOf('=== COMPETITOR RESEARCH NOTES ===') > -1,
            startsWithBrace: phaseText.trim().charAt(0) === '{',
            preview: phaseText.substring(0, 200)
          });
          
          logToDebugSheet('PHASE_' + (phaseIndex + 1) + '_COMPLETE', {
            phase: phase.name,
            text_length: phaseText.length,
            tool_turns: phaseToolTurns,
            total_api_calls: totalApiCalls
          });

          // If this phase expects JSON output, capture it as the briefText
          if (phase.expectJSON) {
            briefText = phaseText;
            debugLog('BRIEF_TEXT_CAPTURED', { phase: phase.name, length: briefText.length });
          }

          phaseComplete = true;
          break;
        }

        // Handle pause_turn without text or tool use (Claude needs a nudge)
        if (responseData.stop_reason === 'pause_turn') {
          debugLog('PHASE_PAUSE_NUDGE', phase.name + ': pause_turn with no tools/text, nudging...');
          conversationMessages.push({
            role: 'user',
            content: 'Please continue with ' + phase.name + '.'
          });
          continue;
        }

        if (responseData.stop_reason === 'end_turn') {
          debugLog('PHASE_END_NO_TEXT', phase.name + ': end_turn but no text content');
          phaseComplete = true;
          break;
        }

        if (responseData.stop_reason === 'max_tokens') {
          throw new Error(
            'Response cut off in phase ' + phase.name + ' (max_tokens). ' +
            'Try increasing CLAUDE_MAX_TOKENS in CONFIG.'
          );
        }

        debugLog('PHASE_UNEXPECTED_STOP', { phase: phase.name, stop_reason: responseData.stop_reason });
        break;
      }

      // Check if phase completed
      if (!phaseComplete) {
        debugLog('PHASE_TIMEOUT', phase.name + ': Did not complete within ' + phase.maxToolTurns + ' tool turns');
        
        // For non-JSON phases, this is a warning — we can still continue
        if (!phase.expectJSON) {
          debugLog('PHASE_TIMEOUT_CONTINUE', phase.name + ': Continuing to next phase despite timeout');
        } else {
          throw new Error(
            'Phase ' + phase.name + ' did not complete within ' + phase.maxToolTurns + ' tool turns. ' +
            'Total API calls: ' + totalApiCalls
          );
        }
      }

      debugLog('PHASE_COMPLETE', { 
        phase: phase.name, 
        toolTurns: phaseToolTurns, 
        totalApiCalls: totalApiCalls,
        textLength: phaseText.length,
        conversationMessages: conversationMessages.length
      });

      // ─── COMPETITOR COUNT ENFORCEMENT (Phase 2 only) ────────────────
      // After COMPETITOR_RESEARCH completes, verify Claude analyzed 4+ competitors.
      // If fewer than 4, send it back with the next Ahrefs URLs in SERP order.
      if (phase.name === 'COMPETITOR_RESEARCH' && ahrefsSerpData && ahrefsSerpData.competitors.length > 0) {
        // Count SUCCESSFULLY analyzed competitors — must have word count data, not just a mention.
        // Claude often writes "coalitiontechnologies.com — failed to fetch" which is NOT an analysis.
        const notesLower = (phaseText || '').toLowerCase();
        const analyzedUrls = ahrefsSerpData.competitors.filter(c => {
          const urlLower = c.url.toLowerCase();
          const domainMatch = urlLower.match(/^https?:\/\/([^\/]+)/i);
          const domain = domainMatch ? domainMatch[1].replace(/^www\./, '') : '';
          
          // Must appear in notes AND have word count data nearby (within ~200 chars)
          const domainIdx = domain ? notesLower.indexOf(domain) : -1;
          const urlIdx = notesLower.indexOf(urlLower);
          const foundIdx = urlIdx > -1 ? urlIdx : domainIdx;
          
          if (foundIdx === -1) return false;
          
          // Check for word count pattern near the mention (indicates successful analysis)
          const nearby = notesLower.substring(foundIdx, foundIdx + 300);
          const hasWordCount = /\d+\s*words/.test(nearby) || /word\s*count[:\s]+\d/.test(nearby);
          
          // Also exclude if "failed" or "not accessible" or "blocked" appears before word count
          const hasFailure = /fail|not accessible|blocked|error|unavailable|could not/.test(nearby);
          
          return hasWordCount && !hasFailure;
        });
        
        const analyzedCount = analyzedUrls.length;
        debugLog('COMPETITOR_COUNT_CHECK', { 
          analyzed: analyzedCount, 
          required: 4,
          found_urls: analyzedUrls.map(c => c.url)
        });
        
        if (analyzedCount < 4) {
          // Find URLs not successfully analyzed — remaining list stays in SERP position order
          const analyzedSet = new Set(analyzedUrls.map(c => c.url.toLowerCase()));
          const remainingUrls = ahrefsSerpData.competitors.filter(c => 
            !analyzedSet.has(c.url.toLowerCase())
          );
          
          if (remainingUrls.length > 0) {
            const needed = 4 - analyzedCount;
            
            // Check if remaining URLs have pre-fetched content available
            var remainingWithContent = remainingUrls.filter(function(c) { 
              return c.extracted_content && c.extracted_content.length > 100; 
            });
            
            if (remainingWithContent.length > 0) {
              // Build content blocks for remaining competitors
              var retryContentBlocks = remainingWithContent.slice(0, needed + 2).map(function(c, i) {
                var wcLabel = c.word_count > 0 ? '~' + c.word_count + ' words' : 'word count unavailable';
                return '────────────────────────────────────────\n' +
                  'COMPETITOR [Position #' + c.position + ', DR ' + c.domain_rating + ', ' + wcLabel + ']\n' +
                  'URL: ' + c.url + '\n' +
                  '────────────────────────────────────────\n' +
                  c.extracted_content;
              }).join('\n\n');
              
              const retryMessage = `You only successfully analyzed ${analyzedCount} competitor pages — the minimum is 4.

Here are ${remainingWithContent.length} additional competitor pages (pre-fetched content provided). Analyze them now:

${retryContentBlocks}

APPEND to your existing research notes with the same format (word count, H2/H3 count, patterns, FAQ presence). Do NOT rewrite your existing notes — just add the new competitors.`;

              debugLog('COMPETITOR_RETRY', { 
                analyzed: analyzedCount, 
                needed: needed, 
                remaining_with_content: remainingWithContent.map(c => c.url) 
              });
            
              // Push retry message and make one API call (no tools needed)
              conversationMessages.push({ role: 'user', content: retryMessage });
            
              Utilities.sleep(CONFIG.RATE_LIMIT_DELAY_MS || 35000);
              totalApiCalls++;
              debugLog('PHASE_TURN', 'COMPETITOR_RETRY (API call #' + totalApiCalls + ')');
            
              requestBody.messages = conversationMessages;
              // No tools, no beta header needed — just plain text analysis
              // Temporarily strip context_management (requires beta header not present here)
              var retryCtxBackup = requestBody.context_management || null;
              if (retryCtxBackup) delete requestBody.context_management;
              var retryToolsBackup = requestBody.tools || null;
              if (retryToolsBackup) delete requestBody.tools;
              var retryResponse = robustFetch('https://api.anthropic.com/v1/messages', {
                method: 'post',
                contentType: 'application/json',
                muteHttpExceptions: true,
                headers: {
                  'x-api-key': apiKey.trim(),
                  'anthropic-version': '2023-06-01'
                },
                payload: JSON.stringify(requestBody)
              });
              // Restore after retry call
              if (retryCtxBackup) requestBody.context_management = retryCtxBackup;
              if (retryToolsBackup) requestBody.tools = retryToolsBackup;
            
            var retryStatus = retryResponse.getResponseCode();
            if (retryStatus === 200) {
              var retryData = JSON.parse(retryResponse.getContentText());
              debugLog('PHASE_USAGE', {
                phase: 'COMPETITOR_RETRY',
                turn: 1,
                input_tokens: retryData.usage?.input_tokens || 0,
                output_tokens: retryData.usage?.output_tokens || 0
              });
              
              var retryContent = retryData.content || [];
              conversationMessages.push({ role: 'assistant', content: retryContent });
              
              // Extract text and append to phase notes
              var retryTextBlocks = retryContent.filter(function(b) { return b.type === 'text'; });
              if (retryTextBlocks.length > 0) {
                var retryText = retryTextBlocks.map(function(b) { return b.text; }).join('\n');
                phaseText = phaseText + '\n\n' + retryText;
                debugLog('COMPETITOR_RETRY_COMPLETE', { 
                  added_chars: retryText.length,
                  total_notes_chars: phaseText.length
                });
              } else {
                debugLog('COMPETITOR_RETRY_NO_TEXT', { 
                  stop_reason: retryData.stop_reason,
                  block_types: retryContent.map(function(b) { return b.type; })
                });
              }
            } else {
              debugLog('COMPETITOR_RETRY_FAILED', { statusCode: retryStatus });
              // Non-fatal — proceed with fewer competitors
            }
            } else {
              // No remaining URLs have pre-fetched content — can't retry without tools
              debugLog('COMPETITOR_RETRY_SKIPPED', { 
                reason: 'no pre-fetched content available for remaining URLs',
                remaining_urls: remainingUrls.map(function(c) { return c.url; })
              });
            }
          }
        }
      }
      // ─── END COMPETITOR COUNT ENFORCEMENT ────────────────────────────

      // ─── SAVE RESEARCH NOTES FOR NEXT PHASE ──────────────────────
      // Each phase produces research notes that subsequent phases need.
      // Instead of carrying conversation history (which triggers server-side
      // tool result re-injection of ~44K tokens), we save just the text and
      // inject it into the next phase's user message.
      // NOTE: This runs AFTER competitor retry so phaseText includes any appended retry notes.
      if (phaseIndex < phases.length - 1 && phaseText.length > 0) {
        previousPhaseNotes.push(phaseText);
        debugLog('NOTES_SAVED', {
          phase_completed: phase.name,
          notes_chars: phaseText.length,
          total_accumulated_notes: previousPhaseNotes.reduce(function(sum, n) { return sum + n.length; }, 0),
          notes_count: previousPhaseNotes.length
        });
      }

      // ─── AHREFS FALLBACK: Rebuild Phase 2 after Phase 1 discovers competitors ──
      // When Ahrefs was unavailable, Phase 1 was instructed to discover competitor URLs
      // via web_search. Parse those URLs, fetch content server-side, and rebuild Phase 2.
      if (ahrefsFallback && phase.name === 'CLIENT_RESEARCH' && phaseText.length > 0) {
        // Parse COMPETITOR_URL lines from Phase 1 notes
        var urlMatches = phaseText.match(/COMPETITOR_URL:\s*(https?:\/\/[^\s]+)/g) || [];
        var discoveredUrls = urlMatches.map(function(m) { return m.replace(/COMPETITOR_URL:\s*/, '').trim(); });
        
        // Deduplicate and filter out client domain
        var seenFallbackDomains = {};
        discoveredUrls = discoveredUrls.filter(function(url) {
          var domainMatch = url.match(/^https?:\/\/([^\/]+)/i);
          var domain = domainMatch ? domainMatch[1].replace(/^www\./, '').toLowerCase() : '';
          if (!domain) return false;
          if (domain === strategy.client_domain.toLowerCase()) return false;
          if (seenFallbackDomains[domain]) return false;
          seenFallbackDomains[domain] = true;
          return true;
        });
        
        debugLog('AHREFS_FALLBACK_URLS_PARSED', {
          raw_matches: urlMatches.length,
          after_dedup: discoveredUrls.length,
          urls: discoveredUrls
        });
        
        if (discoveredUrls.length >= 2) {
          // Build competitor structure matching Ahrefs format
          var fallbackCompetitors = discoveredUrls.slice(0, 10).map(function(url, i) {
            return {
              position: i + 1,
              url: url,
              title: '',
              domain_rating: 0
            };
          });
          
          // Fetch content server-side (same function used for Ahrefs competitors)
          fetchCompetitorWordCounts(fallbackCompetitors);
          
          // Store server word counts for recalculateWordCountRange
          strategy.server_word_counts = fallbackCompetitors
            .filter(function(c) { return c.word_count > 0; })
            .map(function(c) { return { url: c.url, position: c.position, word_count: c.word_count }; });
          
          // Filter to those with successfully fetched content
          var fallbackWithContent = fallbackCompetitors.filter(function(c) { 
            return c.extracted_content && c.extracted_content.length > 100; 
          });
          var fallbackWithoutContent = fallbackCompetitors.filter(function(c) { 
            return !c.extracted_content || c.extracted_content.length <= 100; 
          });
          
          debugLog('AHREFS_FALLBACK_CONTENT', {
            total: fallbackCompetitors.length,
            with_content: fallbackWithContent.length,
            without_content: fallbackWithoutContent.length,
            skipped_urls: fallbackWithoutContent.map(function(c) { return c.url; })
          });
          
          if (fallbackWithContent.length >= 2) {
            // Build content blocks — same format as normal Phase 2
            var fallbackContentBlocks = fallbackWithContent.map(function(c, i) {
              var wcLabel = c.word_count > 0 ? '~' + c.word_count + ' words' : 'word count unavailable';
              return '────────────────────────────────────────\n' +
                'COMPETITOR ' + (i + 1) + ': [Position #' + c.position + ', DR ' + c.domain_rating + ', ' + wcLabel + ']\n' +
                'URL: ' + c.url + '\n' +
                '────────────────────────────────────────\n' +
                c.extracted_content;
            }).join('\n\n');
            
            var fallbackFailedList = fallbackWithoutContent.length > 0
              ? '\nNOTE: The following competitors could not be fetched server-side (blocked/error):\n' +
                fallbackWithoutContent.map(function(c) { 
                  return '   - ' + c.url + ' (fetch status: ' + (c.word_count_source || 'unknown') + ')'; 
                }).join('\n') + '\n'
              : '';
            
            // Rebuild Phase 2 message with pre-fetched content
            phases[1].message = '════════════════════════════════════════════════════════════\n' +
              '📌 PHASE 2 — COMPETITOR RESEARCH (FALLBACK — competitors discovered via web_search)\n' +
              '════════════════════════════════════════════════════════════\n\n' +
              'Analyze the top competitors for "' + strategy.primary_keyword + '".\n\n' +
              'NOTE: Ahrefs SERP API was unavailable. These competitors were discovered via web_search in Phase 1\n' +
              'and their content was fetched server-side. Domain ratings may show as 0 (unavailable without Ahrefs).\n\n' +
              fallbackWithContent.length + ' COMPETITOR PAGES (pre-fetched):\n\n' +
              fallbackContentBlocks + '\n' +
              fallbackFailedList + '\n' +
              'INSTRUCTIONS:\n' +
              '1. Analyze ALL ' + fallbackWithContent.length + ' competitor pages provided above\n' +
              '2. WORD COUNTS — Pre-calculated by the server (shown above as "~X words"):\n' +
              '   - Use the server-provided word counts in your research notes. Do NOT re-count words yourself.\n' +
              '3. From the provided content, COUNT:\n' +
              '   - Actual H2/H3 section count per page (look for heading patterns in the text)\n' +
              '4. Calculate section count average + apply intent modifier\n' +
              '5. Check for content format patterns (tables, lists, media references)\n' +
              '6. For EACH competitor, note whether the page has a FAQ section (yes/no). Report the total count: "X of Y competitors have FAQ sections"\n' +
              '7. Identify competitive gaps\n\n' +
              'AFTER ANALYZING ALL COMPETITOR PAGES:\n' +
              'Write comprehensive "=== COMPETITOR RESEARCH NOTES ===" summarizing EVERYTHING you found.\n' +
              'These notes are your ONLY record — the competitor content will be cleared before the next phase.\n' +
              'Include: each competitor URL + domain, word counts, section counts, calculations, patterns, gaps.\n\n' +
              'DO NOT write the brief yet. ONLY research competitors.\n' +
              'End with your COMPETITOR RESEARCH NOTES text block.';
            
            debugLog('AHREFS_FALLBACK_PHASE2_REBUILT', {
              competitors_injected: fallbackWithContent.length,
              message_chars: phases[1].message.length
            });
          } else {
            debugLog('AHREFS_FALLBACK_INSUFFICIENT_CONTENT', {
              fetched: fallbackWithContent.length,
              needed: 2,
              reason: 'Phase 2 will use placeholder message — Claude will work from Phase 1 notes only'
            });
          }
        } else {
          debugLog('AHREFS_FALLBACK_NO_URLS', {
            parsed: discoveredUrls.length,
            reason: 'Phase 1 did not discover enough competitor URLs — Phase 2 will use placeholder'
          });
        }
      }
      // ─── END AHREFS FALLBACK ──────────────────────────────────────────

      // Pace between phases
      if (phaseIndex < phases.length - 1) {
        debugLog('PHASE_TRANSITION', 'Waiting 2s before phase ' + (phaseIndex + 2) + '...');
        Utilities.sleep(2000);
      }
    }
    // ─── END PHASE LOOP ───────────────────────────────────────────────

    debugLog('ALL_PHASES_COMPLETE', {
      totalApiCalls: totalApiCalls,
      briefTextLength: briefText.length,
      conversationMessages: conversationMessages.length
    });

    if (!briefText) {
      var lastResponse = conversationMessages[conversationMessages.length - 1];
      var contentTypes = lastResponse.content ? lastResponse.content.map(function(b) { return b.type; }) : [];
      debugLog('NO_BRIEF_AFTER_PHASES', {
        totalApiCalls: totalApiCalls,
        lastContentTypes: contentTypes,
        conversationLength: conversationMessages.length
      });
      throw new Error(
        'No JSON brief produced after ' + totalApiCalls + ' API calls across ' + phases.length + ' phases. ' +
        'Last content types: ' + contentTypes.join(', ') + '. ' +
        'Check PHASE_*_COMPLETE logs for details.'
      );
    }
    debugLog('BRIEF TEXT LENGTH', briefText.length);
    const brief = parseClaudeResponse(briefText);

    // Verify internal links against pre-fetched sitemap
    if (brief.internal_links && brief.internal_links.length > 0) {
      brief.internal_links = verifyInternalLinks(brief.internal_links, strategy.sitemap_data);
      debugLog('LINK_VERIFICATION', `Verified ${brief.internal_links.length} internal links`);
    }

    // Recalculate word count range server-side from competitor data
    // Claude estimates word counts but can't do reliable P25-P75 math — let the code handle it
    recalculateWordCountRange(brief, strategy);
    
    // Reconcile FAQ: ensure faq_analysis.include_faq matches what's actually in the outline
    reconcileFaqAnalysis(brief);
    
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
      
      debugLog('VALIDATION_RETRY', 'Asking Claude to fix validation errors...');
      
      // Build a CLEAN minimal request - no research history needed
      // Claude already generated the brief; retry just needs the JSON + fix instructions
      const retryRequestBody = {
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        system: requestBody.system,
        messages: [
          {
            role: 'user',
            content: `Here is the JSON content brief you previously generated:\n\n${briefText}\n\n${retryMessage}`
          }
        ]
      };
      
      debugLog('VALIDATION_RETRY_PAYLOAD_SIZE', JSON.stringify(retryRequestBody).length);
      
      const retryResponse = robustFetch('https://api.anthropic.com/v1/messages', {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01'
        },
        payload: JSON.stringify(retryRequestBody)
      });
      
      const retryStatusCode = retryResponse.getResponseCode();
      const retryResponseText = retryResponse.getContentText();
      
      if (retryStatusCode !== 200) {
        debugLog('VALIDATION_RETRY_API_ERROR', `Status ${retryStatusCode}: ${retryResponseText.substring(0, 500)}`);
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
            
            // Recalculate word count range server-side
            recalculateWordCountRange(retryBrief, strategy);
            
            // Reconcile FAQ analysis
            reconcileFaqAnalysis(retryBrief);
            
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
      debugLog('RATE_LIMIT_FULL_RESTART', {
        reason: 'Rate limit error caught outside phase loop — full restart required',
        attempt: retryCount + 1 + '/' + MAX_RETRIES,
        waitSeconds: waitTime,
        note: 'Previous phase work will be lost'
      });
      Logger.log(`Rate limit error (fallback). Waiting ${waitTime} seconds before full restart...`);
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
 * Checks if a URL is a homepage (root domain with no meaningful path).
 * Examples: https://lawrank.com/, https://www.example.com, http://site.org/
 */
function isHomepageUrl(url) {
  if (!url) return false;
  // Strip protocol and www, then check if path is empty or just "/"
  const pathMatch = url.match(/^https?:\/\/[^\/]+(\/.*)?$/i);
  if (!pathMatch) return false;
  const path = (pathMatch[1] || '').replace(/\/+$/, '');  // strip trailing slashes
  return path === '' || path === '/';
}

/**
 * Recalculates word_count_range server-side from competitor data
 * Uses P25-P75 interpolation on word count values
 * 
 * APPROACH: Claude picks competitors (editorial judgment), server measures them (accuracy).
 * For each URL in competitors_analyzed, look up the server word count for that URL.
 * Falls back to Claude's estimate only if no server count exists for that URL.
 * 
 * HOMEPAGE FILTERING: Unless the brief's page_type is "homepage", exclude homepage URLs
 * from word count calculation. Homepages rank on domain authority, not content depth —
 * benchmarking a service/blog page against a homepage produces an artificially low floor.
 * If filtering leaves < 2 data points, supplement from remaining Ahrefs URLs (non-homepage).
 * 
 * No intent modifier — competitors ARE the benchmark.
 */
function recalculateWordCountRange(brief, strategy) {
  const competitors = brief.serp_analysis?.competitors_analyzed || [];
  const briefPageType = (strategy.page_type || '').toLowerCase().trim();
  const excludeHomepages = briefPageType !== 'homepage';
  
  // Build URL → word_count lookup from ALL server measurements (all 8 Ahrefs URLs)
  const serverLookup = {};
  if (strategy.server_word_counts) {
    strategy.server_word_counts.forEach(c => {
      const key = c.url.replace(/\/+$/, '').toLowerCase();
      serverLookup[key] = { word_count: c.word_count, url: c.url };
    });
  }
  
  // For each competitor Claude analyzed, prefer server word count over Claude's estimate
  const matched = [];
  const excluded = [];
  
  competitors.forEach(c => {
    const key = (c.url || '').replace(/\/+$/, '').toLowerCase();
    const isHomepage = isHomepageUrl(c.url);
    const serverEntry = serverLookup[key];
    const wc = (serverEntry && serverEntry.word_count > 0) 
      ? serverEntry.word_count 
      : (typeof c.word_count === 'number' && c.word_count > 0 ? c.word_count : 0);
    const source = (serverEntry && serverEntry.word_count > 0) ? 'server' : 'claude';
    
    if (wc <= 0) return;
    
    if (excludeHomepages && isHomepage) {
      excluded.push({ url: c.url, source: source, word_count: wc, reason: 'homepage' });
    } else {
      matched.push({ url: c.url, source: source, word_count: wc });
    }
  });
  
  // If homepage filtering left us with < 2 data points, supplement from remaining Ahrefs URLs
  if (matched.length < 2 && strategy.server_word_counts) {
    const matchedUrls = new Set(matched.map(m => m.url.replace(/\/+$/, '').toLowerCase()));
    const excludedUrls = new Set(excluded.map(e => e.url.replace(/\/+$/, '').toLowerCase()));
    
    // Check Ahrefs URLs that Claude didn't analyze (and weren't already excluded)
    strategy.server_word_counts.forEach(c => {
      if (matched.length >= 4) return;  // Cap at 4 data points
      const key = c.url.replace(/\/+$/, '').toLowerCase();
      if (matchedUrls.has(key) || excludedUrls.has(key)) return;
      if (excludeHomepages && isHomepageUrl(c.url)) return;
      if (c.word_count <= 0) return;
      
      matched.push({ url: c.url, source: 'server_supplement', word_count: c.word_count });
      matchedUrls.add(key);
    });
    
    if (matched.length > excluded.length) {
      debugLog('WORD_COUNT_HOMEPAGE_SUPPLEMENT', {
        after_filtering: matched.length - (matched.filter(m => m.source === 'server_supplement').length),
        supplemented_from_ahrefs: matched.filter(m => m.source === 'server_supplement').length,
        total_after_supplement: matched.length,
        excluded_homepages: excluded
      });
    }
  }
  
  if (excluded.length > 0) {
    debugLog('WORD_COUNT_HOMEPAGE_EXCLUDED', {
      page_type: briefPageType,
      excluded: excluded
    });
  }
  
  const wordCounts = matched
    .map(m => m.word_count)
    .sort((a, b) => a - b);
  
  if (wordCounts.length < 2) {
    debugLog('WORD_COUNT_RECALC_SKIP', {
      reason: 'Insufficient word count data after homepage filtering (' + wordCounts.length + ' valid counts)',
      matched: matched,
      excluded: excluded
    });
    return;
  }
  
  // Calculate P25 and P75 using linear interpolation
  const n = wordCounts.length;
  const p25Idx = 0.25 * (n - 1);
  const p75Idx = 0.75 * (n - 1);
  
  const p25Floor = Math.floor(p25Idx);
  const p25Frac = p25Idx - p25Floor;
  const p25 = wordCounts[p25Floor] + p25Frac * (wordCounts[Math.min(p25Floor + 1, n - 1)] - wordCounts[p25Floor]);
  
  const p75Floor = Math.floor(p75Idx);
  const p75Frac = p75Idx - p75Floor;
  const p75 = wordCounts[p75Floor] + p75Frac * (wordCounts[Math.min(p75Floor + 1, n - 1)] - wordCounts[p75Floor]);
  
  // Round to nearest 50
  let adjustedMin = Math.round(p25 / 50) * 50;
  let adjustedMax = Math.round(p75 / 50) * 50;
  
  // Defensive swap if min > max
  if (adjustedMin > adjustedMax) {
    const temp = adjustedMin;
    adjustedMin = adjustedMax;
    adjustedMax = temp;
  }
  
  // If range is 0 (all competitors identical after rounding), add ±100 buffer
  if (adjustedMin === adjustedMax) {
    adjustedMin = adjustedMin - 100;
    adjustedMax = adjustedMax + 100;
  }
  
  const originalRange = brief.word_count_range;
  brief.word_count_range = adjustedMin + '-' + adjustedMax + ' words';
  
  debugLog('WORD_COUNT_RECALC', {
    matched: matched,
    competitor_word_counts: wordCounts,
    sample_size: n,
    homepages_excluded: excluded.length,
    server_matched: matched.filter(m => m.source === 'server').length,
    server_supplement: matched.filter(m => m.source === 'server_supplement').length,
    claude_fallback: matched.filter(m => m.source === 'claude').length,
    p25_raw: Math.round(p25),
    p75_raw: Math.round(p75),
    p25_rounded: adjustedMin,
    p75_rounded: adjustedMax,
    spread: adjustedMax - adjustedMin,
    claude_original: originalRange,
    server_calculated: brief.word_count_range
  });
}

/**
 * Reconciles faq_analysis.include_faq with what's actually in the outline.
 * The outline is the source of truth — if Claude wrote an FAQ section, include_faq should be true.
 * If Claude said include_faq: true but didn't write one, force it to false.
 * This prevents the doc, score, and field from disagreeing.
 */
function reconcileFaqAnalysis(brief) {
  const faqSection = brief.outline?.find(s => s.is_faq_section);
  const hasFaqSection = !!faqSection;
  const claimedInclude = brief.faq_analysis?.include_faq;
  
  if (claimedInclude && !hasFaqSection) {
    // Claude said include but didn't write one — force false
    brief.faq_analysis.include_faq = false;
    if (!brief.faq_analysis.rationale || brief.faq_analysis.rationale.length < 10) {
      brief.faq_analysis.rationale = 'FAQ was marked for inclusion but no FAQ section was added to the outline.';
    }
    debugLog('FAQ_RECONCILE', {
      action: 'forced_false',
      reason: 'include_faq was true but no outline section has is_faq_section: true'
    });
  } else if (!claimedInclude && hasFaqSection) {
    // Claude wrote an FAQ section but said don't include — trust the outline
    brief.faq_analysis.include_faq = true;
    debugLog('FAQ_RECONCILE', {
      action: 'forced_true',
      reason: 'include_faq was false but outline contains an FAQ section',
      questions: faqSection.faq_questions?.length || 0
    });
  } else {
    debugLog('FAQ_RECONCILE', {
      action: 'no_change',
      include_faq: claimedInclude,
      has_faq_section: hasFaqSection
    });
  }
}

/**
 * Fetches competitor pages server-side and counts words from HTML content.
 * Runs BEFORE Phase 2 so word counts are deterministic ground truth,
 * not Claude's variable estimates. Matches what Ahrefs measures in their UI.
 * 
 * @param {Array} competitors - Array of {position, url, title, domain_rating} from Ahrefs
 * @returns {Array} Same array with word_count added to each entry (0 if fetch failed)
 */
function fetchCompetitorWordCounts(competitors) {
  if (!competitors || competitors.length === 0) return competitors;
  
  const results = [];
  
  // Build parallel request array
  const requests = competitors.map(comp => ({
    url: comp.url,
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  }));
  
  // Fire all requests simultaneously
  let responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch (e) {
    // fetchAll crashed (e.g. one bad DNS poisons the batch) — fall back to individual fetches
    debugLog('SERVER_WORD_COUNTS_FETCHALL_ERROR', e.message.substring(0, 200));
    debugLog('SERVER_WORD_COUNTS_FALLBACK', 'Retrying ' + competitors.length + ' URLs individually');
    responses = [];
    for (var i = 0; i < requests.length; i++) {
      try {
        responses.push(UrlFetchApp.fetch(requests[i].url, {
          muteHttpExceptions: true,
          followRedirects: true,
          validateHttpsCertificates: false,
          headers: requests[i].headers
        }));
      } catch (fetchErr) {
        // This individual URL failed (DNS, timeout, etc.) — push null placeholder
        debugLog('SERVER_WORD_COUNTS_INDIVIDUAL_ERROR', { 
          url: competitors[i].url, 
          error: fetchErr.message.substring(0, 100) 
        });
        responses.push(null);
      }
    }
  }
  
  // Process responses (same order as requests)
  responses.forEach((response, idx) => {
    const comp = competitors[idx];
    try {
      // null = individual fetch failed (DNS, timeout, etc.)
      if (!response) {
        comp.word_count = 0;
        comp.word_count_source = 'error';
        comp.extracted_content = '';
        results.push({ pos: comp.position, url: comp.url, words: 0, status: 'fetch_failed' });
        return;
      }
      const statusCode = response.getResponseCode();
      
      if (statusCode >= 200 && statusCode < 400) {
        const html = response.getContentText();
        
        // Strip HTML tags, scripts, styles, and count words
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')   // Remove script blocks
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')     // Remove style blocks
          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ') // Remove noscript blocks
          .replace(/<!--[\s\S]*?-->/g, ' ')                      // Remove HTML comments
          .replace(/<[^>]+>/g, ' ')                               // Remove remaining HTML tags
          .replace(/&[a-zA-Z]+;/g, ' ')                           // Remove HTML entities (&amp; etc.)
          .replace(/&#\d+;/g, ' ')                                // Remove numeric HTML entities
          .replace(/\s+/g, ' ')                                   // Collapse whitespace
          .trim();
        
        // Count words (split on whitespace, filter empty strings)
        const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
        
        comp.word_count = wordCount;
        comp.word_count_source = 'server';
        
        // Save extracted text content for Phase 2 injection (cap at 5000 words
        // to keep context manageable — ~6700 tokens per page × 5 pages = ~33K tokens)
        var maxContentWords = 5000;
        var contentWords = textContent.split(/\s+/).filter(function(w) { return w.length > 0; });
        if (contentWords.length > maxContentWords) {
          comp.extracted_content = contentWords.slice(0, maxContentWords).join(' ') + ' [TRUNCATED]';
        } else {
          comp.extracted_content = textContent;
        }
        
        results.push({ pos: comp.position, url: comp.url, words: wordCount, status: 'ok' });
      } else {
        comp.word_count = 0;
        comp.word_count_source = 'failed';
        comp.extracted_content = '';
        results.push({ pos: comp.position, url: comp.url, words: 0, status: 'http_' + statusCode });
      }
    } catch (e) {
      comp.word_count = 0;
      comp.word_count_source = 'error';
      comp.extracted_content = '';
      results.push({ pos: comp.position, url: comp.url, words: 0, status: 'error', error: e.message.substring(0, 80) });
    }
  });
  
  debugLog('SERVER_WORD_COUNTS', {
    total: competitors.length,
    successful: results.filter(r => r.words > 0).length,
    counts: results
  });
  
  // Log pre-fetched content stats for Phase 2 injection
  var contentStats = competitors.map(function(c) {
    return { url: c.url.substring(0, 60), content_chars: (c.extracted_content || '').length, words: c.word_count };
  });
  debugLog('PREFETCHED_CONTENT', {
    total_pages: competitors.length,
    pages_with_content: competitors.filter(function(c) { return c.extracted_content && c.extracted_content.length > 0; }).length,
    total_content_chars: competitors.reduce(function(sum, c) { return sum + (c.extracted_content || '').length; }, 0),
    stats: contentStats
  });
  
  return competitors;
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
    message += `${error.message}\n`;
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
  const competitorsAnalyzed = serp.competitors_analyzed?.length || 0;
  
  // Hard fail only if truly insufficient (0-1 pages)
  // 2-4 pages = warning but acceptable for niche keywords
  // 4 pages = ideal
  if (competitorsAnalyzed < 2) {
    throw new Error(
      `Insufficient SERP research: Only ${competitorsAnalyzed} competitor pages analyzed. ` +
      'Minimum 2 competitor pages required. Ideally analyze 4+ for comprehensive coverage.'
    );
  }
  if (competitorsAnalyzed < 4) {
    debugLog('COMPETITOR_COUNT_WARNING', {
      analyzed: competitorsAnalyzed,
      recommended: 4,
      note: 'May be acceptable for niche keywords but 4 is recommended'
    });
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
  // Word count range is now calculated server-side by recalculateWordCountRange()
  // Hard fail only for impossible values (negative = bug in recalc)
  if (variance < 0) {
    throw new Error(
      `Word count range inverted (${variance} words). ` +
      'Min is greater than max — this indicates a calculation error.'
    );
  }
  if (variance < 150) {
    Logger.log(
      `WARNING: Narrow word count range (${variance} words). ` +
      'Competitors may have very similar content lengths for this keyword.'
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
        'Expected counts from at least 4 competitor pages.'
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
    competitors_analyzed: competitorsAnalyzed,
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
  // Keyword Strategy: 20, Content Outline: 15, SERP Analysis: 15, EEAT: 20, 
  // Intent Alignment: 5, Link Quality: 10, Content Format: 10, FAQ: 5
  let breakdown = {
    keyword_strategy: { score: 0, max: 20, details: [] },
    content_outline: { score: 0, max: 15, details: [] },
    serp_analysis: { score: 0, max: 15, details: [] },
    eeat_signals: { score: 0, max: 20, details: [] },
    intent_alignment: { score: 0, max: 5, details: [] },
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
  const competitorsAnalyzed = brief.serp_analysis?.competitors_analyzed?.length || 0;
  const patterns = brief.serp_analysis.top_ranking_patterns || [];
  const gaps = brief.serp_analysis.competitive_gaps || [];
  
  // Pages analyzed (5 points)
  // 4+ = full points, 3 = acceptable for niche keywords, 0-2 = insufficient
  if (competitorsAnalyzed >= 4) {
    breakdown.serp_analysis.score += 5;
    breakdown.serp_analysis.details.push(`✓ Analyzed ${competitorsAnalyzed} competitor pages (5pts)`);
  } else if (competitorsAnalyzed >= 3) {
    breakdown.serp_analysis.score += 3;
    breakdown.serp_analysis.details.push(`○ Analyzed ${competitorsAnalyzed} competitor pages - acceptable for niche keywords (3pts)`);
  } else {
    breakdown.serp_analysis.score += 1;
    breakdown.serp_analysis.details.push(`✗ Only ${competitorsAnalyzed} competitor pages analyzed (1pt)`);
  }

  // Word count variance (5 points) — range is now server-calculated from competitor data
  const wordCountPattern = /(\d+)-(\d+)/;
  const match = brief.word_count_range.match(wordCountPattern);
  const variance = match ? (parseInt(match[2]) - parseInt(match[1])) : 0;
  
  if (variance >= 200) {
    breakdown.serp_analysis.score += 5;
    breakdown.serp_analysis.details.push(`✓ Good word count variance: ${variance} words (5pts)`);
  } else if (variance >= 100) {
    breakdown.serp_analysis.score += 3;
    breakdown.serp_analysis.details.push(`○ Narrow word count variance: ${variance} words — competitors may be very similar (3pts)`);
  } else {
    breakdown.serp_analysis.score += 1;
    breakdown.serp_analysis.details.push(`✗ Very narrow word count variance: ${variance} words (1pt)`);
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
  // EEAT SIGNALS (20 points)
  // ============================================================
  const clientResearch = brief.client_research || {};
  const outlineText = JSON.stringify(brief.outline).toLowerCase();
  const keyFacts = clientResearch.key_facts || [];
  const certifications = clientResearch.key_entities?.certifications || [];
  const competitiveAdvantages = clientResearch.competitive_advantages || [];
  const externalLinks = brief.external_links || [];
  
  // Expertise signals (7 points) - technical specs, specific data, industry knowledge
  let expertiseScore = 0;
  const hasSpecificFacts = keyFacts.length >= 5;
  const hasTechnicalTerms = outlineText.includes('specification') || outlineText.includes('technical') || 
    outlineText.includes('engineering') || outlineText.includes('warranty') || outlineText.includes('certification');
  const hasDataPoints = keyFacts.some(f => /\d+/.test(f)); // Facts contain numbers
  const hasIndustryDepth = keyFacts.length >= 8; // Deep research yields more facts
  
  if (hasSpecificFacts) expertiseScore += 2;
  if (hasTechnicalTerms) expertiseScore += 2;
  if (hasDataPoints) expertiseScore += 1;
  if (hasIndustryDepth) expertiseScore += 2;
  
  breakdown.eeat_signals.score += expertiseScore;
  breakdown.eeat_signals.details.push(`${expertiseScore >= 5 ? '✓' : '○'} Expertise: ${keyFacts.length} facts, technical depth=${hasTechnicalTerms ? '✓' : '✗'}, deep research=${hasIndustryDepth ? '✓' : '✗'} (${expertiseScore}/7pts)`);

  // Experience signals (5 points) - real-world applications, testimonials, case studies
  let experienceScore = 0;
  const hasApplications = outlineText.includes('application') || outlineText.includes('use case') || 
    outlineText.includes('example') || outlineText.includes('testimonial') || outlineText.includes('customer');
  const hasCompetitiveAdvantages = competitiveAdvantages.length >= 3;
  const hasCaseStudies = outlineText.includes('case stud') || outlineText.includes('result') || outlineText.includes('success');
  
  if (hasApplications) experienceScore += 2;
  if (hasCompetitiveAdvantages) experienceScore += 2;
  if (hasCaseStudies) experienceScore += 1;
  
  breakdown.eeat_signals.score += experienceScore;
  breakdown.eeat_signals.details.push(`${experienceScore >= 4 ? '✓' : '○'} Experience: real-world examples=${hasApplications ? '✓' : '✗'}, advantages documented=${hasCompetitiveAdvantages ? '✓' : '✗'}, case studies=${hasCaseStudies ? '✓' : '✗'} (${experienceScore}/5pts)`);

  // Authoritativeness signals (4 points) - certifications, high-authority external links
  let authorityScore = 0;
  const hasCertifications = certifications.length >= 1;
  const highAuthCount = externalLinks.filter(l => l.domain_authority === 'high').length;
  const hasHighAuthLinks = highAuthCount >= 1;
  const hasMultipleHighAuth = highAuthCount >= 3;
  const hasGovEduLinks = externalLinks.some(l => /\.(gov|edu|org)/.test(l.url || ''));
  
  if (hasCertifications) authorityScore += 1;
  if (hasHighAuthLinks) authorityScore += 1;
  if (hasMultipleHighAuth) authorityScore += 1;
  if (hasGovEduLinks) authorityScore += 1;
  
  breakdown.eeat_signals.score += authorityScore;
  breakdown.eeat_signals.details.push(`${authorityScore >= 3 ? '✓' : '○'} Authority: certs=${hasCertifications ? '✓' : '✗'}, high-auth links=${hasHighAuthLinks ? '✓' : '✗'}(${highAuthCount}), .gov/.edu=${hasGovEduLinks ? '✓' : '✗'} (${authorityScore}/4pts)`);

  // Trustworthiness signals (4 points) - warranty, pricing transparency, verifiable claims, social proof
  let trustScore = 0;
  const hasWarranty = outlineText.includes('warranty') || keyFacts.some(f => f.toLowerCase().includes('warranty'));
  const hasPricing = outlineText.includes('pricing') || outlineText.includes('cost') || outlineText.includes('price');
  const hasVerifiableClaims = keyFacts.some(f => /\d+/.test(f) && f.length > 20); // Specific factual claims
  const hasSocialProof = outlineText.includes('review') || outlineText.includes('rating') || outlineText.includes('testimonial') ||
    keyFacts.some(f => f.toLowerCase().includes('star') || f.toLowerCase().includes('rating') || f.toLowerCase().includes('review'));
  
  if (hasWarranty) trustScore += 1;
  if (hasPricing) trustScore += 1;
  if (hasVerifiableClaims) trustScore += 1;
  if (hasSocialProof) trustScore += 1;
  
  breakdown.eeat_signals.score += trustScore;
  breakdown.eeat_signals.details.push(`${trustScore >= 3 ? '✓' : '○'} Trust: warranty=${hasWarranty ? '✓' : '✗'}, pricing=${hasPricing ? '✓' : '✗'}, verifiable claims=${hasVerifiableClaims ? '✓' : '✗'}, social proof=${hasSocialProof ? '✓' : '✗'} (${trustScore}/4pts)`);

  // ============================================================
  // INTENT ALIGNMENT (5 points) — section count within intent range only
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

  // ============================================================
  // LINK QUALITY (10 points)
  // ============================================================
  const internalLinks = brief.internal_links || [];
  const internalVerified = internalLinks.filter(l => l.url_status === '200' || l.url_status === 'verified').length;
  const internalTotal = internalLinks.length;
  
  // Internal links (5 points) - Updated for new target of 10
  if (internalTotal >= 8 && internalVerified === internalTotal) {
    breakdown.link_quality.score += 5;
    breakdown.link_quality.details.push(`✓ ${internalTotal} internal links, all verified (5pts)`);
  } else if (internalTotal >= 5 && internalVerified >= internalTotal * 0.8) {
    breakdown.link_quality.score += 3;
    breakdown.link_quality.details.push(`○ ${internalVerified}/${internalTotal} internal links verified (3pts)`);
  } else {
    breakdown.link_quality.score += 1;
    breakdown.link_quality.details.push(`✗ ${internalVerified}/${internalTotal} internal links verified (1pt)`);
  }

  // External links (5 points) - scored on count, authority, and search_suggestion presence
  const externalWithSearchSuggestion = externalLinks.filter(l => l.search_suggestion && l.search_suggestion.length > 5).length;
  const externalHighAuth = externalLinks.filter(l => l.domain_authority === 'high').length;
  const externalTotal = externalLinks.length;
  
  if (externalTotal >= 2 && externalWithSearchSuggestion >= externalTotal * 0.8 && externalHighAuth >= 1) {
    breakdown.link_quality.score += 5;
    breakdown.link_quality.details.push(`✓ ${externalTotal} external links, ${externalWithSearchSuggestion} with search suggestions, ${externalHighAuth} high authority (5pts)`);
  } else if (externalTotal >= 1 && externalWithSearchSuggestion >= externalTotal * 0.5) {
    breakdown.link_quality.score += 3;
    breakdown.link_quality.details.push(`○ ${externalTotal} external links, ${externalWithSearchSuggestion} with search suggestions (3pts)`);
  } else {
    breakdown.link_quality.score += 1;
    breakdown.link_quality.details.push(`✗ ${externalTotal} external links, ${externalWithSearchSuggestion} with search suggestions (1pt)`);
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
    competitors_analyzed: brief.serp_analysis.competitors_analyzed?.length || 0,
    outline_sections: brief.outline.length,
    internal_links: internalCount,
    external_links: brief.external_links.length,
    external_with_search_suggestions: brief.external_links.filter(l => l.search_suggestion && l.search_suggestion.length > 5).length,
    faq_included: brief.faq_analysis.include_faq,
    faq_competitor_count: brief.faq_analysis.competitor_faq_count || 0,
    faq_threshold: strategy.faq_threshold,
    faq_questions: faqSection?.faq_questions?.length || 0,
    quality_score: qualityScore.total_score,
    intent: strategy.intent
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
  
  // Set sharing permissions: Anyone with the link can edit
  try {
    const file = DriveApp.getFileById(doc.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    debugLog('SHARING_SET', 'Document set to "Anyone with link can edit"');
  } catch (e) {
    debugLog('SHARING_FAILED', e.message);
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
    'Use 5-7 times naturally throughout the content',
    'Use once in conclusion paragraph'
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
    
    body.appendParagraph('Longtail/Semantic Keywords Requirements:').setBold(true).setFontSize(10);
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
    body.appendParagraph(`Note: FAQ section included — ${brief.faq_analysis.competitor_faq_count || 0} of 4 competitors have FAQ sections (threshold: ${strategy.faq_threshold}).`)
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
      body.appendParagraph('').setForegroundColor('#000000').setFontFamily('Arial').setFontSize(11);
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
    if (brief.serp_analysis.competitors_analyzed?.length > 0) {
      body.appendParagraph('Competitors Analyzed:').setBold(true).setFontSize(11);
      brief.serp_analysis.competitors_analyzed.forEach(comp => {
        body.appendParagraph(comp.url)
          .setFontFamily('Courier New')
          .setFontSize(9)
          .setBold(false)
          .setForegroundColor('#0066cc')
          .setIndentStart(18);
      });
      body.appendParagraph('').setForegroundColor('#000000').setFontFamily('Arial').setFontSize(11);
    }
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
      `Competitors with FAQ: ${brief.faq_analysis.competitor_faq_count || 0} of 4 analyzed`,
      `Page type: ${strategy.page_type}`,
      `Threshold: ${strategy.faq_threshold || 'N/A'} competitors needed`
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
    body.appendParagraph(`   URL: ${link.url}`)
      .setFontFamily('Courier New')
      .setFontSize(9)
      .setBold(false)
      .setForegroundColor('#0066cc');
    if (link.search_suggestion) {
      body.appendParagraph(`   Google Search: ${link.search_suggestion}`)
        .setFontSize(10)
        .setBold(true)
        .setForegroundColor('#1a73e8');
    }
    body.appendParagraph(`   Placement: ${link.placement}`)
      .setFontSize(10)
      .setBold(false)
      .setForegroundColor('#000000');
    body.appendParagraph(`   Domain Authority: ${link.domain_authority || 'Not specified'}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph(`   Rationale: ${link.rationale}`)
      .setFontSize(10)
      .setBold(false);
    body.appendParagraph('')
      .setForegroundColor('#000000')
      .setItalic(false)
      .setFontSize(11);
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
  const userId = userProps.getProperty('PENDING_USER_ID');
  deleteGenerationTrigger();
  runBriefGeneration(folderId, workbookUrl, clientId, userId);
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
        url: rowObj.url || rowObj.target_url || rowObj['target-url'] || rowObj.website_url || null, // Robust URL capture
        primary_keyword: rowObj.primary_keyword,
        secondary_keyword: rowObj.secondary_keyword || null,
        longtail_keywords: rowObj.longtail_keywords_semantics || rowObj.longtail || rowObj.longtail_keywords || null,
        status: rowObj.status || 'DONE',
        brief_url: briefUrl || rowObj.brief_url || '',
        brief_data: briefData,
        run_id: rowObj.run_id,
        notes: rowObj.notes,
        secret: secret
      };
      
      if (rowObj.user_id) {
        payload.user_id = rowObj.user_id;
      }
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
    url: rowObj.url || rowObj.target_url || rowObj['target-url'] || rowObj.website_url || null, // Robust URL capture
    primary_keyword: rowObj.primary_keyword,
    secondary_keyword: rowObj.secondary_keyword || null,
    longtail_keywords: rowObj.longtail_keywords_semantics || rowObj.longtail || rowObj.longtail_keywords || null,
    status: rowObj.status || 'DONE',
    brief_url: briefUrl || rowObj.brief_url || '',
    brief_data: briefData,
    run_id: rowObj.run_id,
    notes: (rowObj.notes || '').toString().substring(0, 1000),
    updated_at: new Date().toISOString()
  };

  if (rowObj.user_id) {
    payload.user_id = rowObj.user_id;
  }
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

function resetRowStatus(rowId, runId, keyword, workbookUrl) {
  const ss = openWorkbook(workbookUrl);
  let sheet = null;
  
  if (workbookUrl) {
    sheet = getSheetFromUrl(ss, workbookUrl);
  }
  
  if (!sheet) {
    try {
      sheet = discoverDataSheet(ss);
    } catch (e) {
      throw new Error("Could not find data sheet for reset.");
    }
  }
  
  const headers = getHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  const idCol = headers['id']?.index;
  const runIdCol = headers['run_id']?.index;
  const keywordCol = headers['primary_keyword']?.index;
  const statusCol = headers['status']?.index;
  const urlCol = headers['document_url']?.index || headers['brief_url']?.index;
  const errorNotesCol = headers['error_notes']?.index || headers['notes']?.index;
  
  if (statusCol === undefined) throw new Error("Status column missing");
  
  let targetRowIndex = -1;
  
  // Stage 1: ID
  if (idCol !== undefined && rowId) {
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idCol]) === String(rowId)) {
        targetRowIndex = r; break;
      }
    }
  }
  
  // Stage 2: run_id
  if (targetRowIndex === -1 && runIdCol !== undefined && runId) {
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][runIdCol]) === String(runId)) {
        targetRowIndex = r; break;
      }
    }
  }
  
  // Stage 3: primary_keyword
  if (targetRowIndex === -1 && keywordCol !== undefined && keyword) {
    const cleanKw = String(keyword).trim().toLowerCase();
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][keywordCol]).trim().toLowerCase() === cleanKw) {
        targetRowIndex = r; break;
      }
    }
  }
  
  if (targetRowIndex === -1) {
    throw new Error("Row not found for restart. Tried matching by ID, run_id, and primary_keyword.");
  }
  
  // Update the sheet
  sheet.getRange(targetRowIndex + 1, statusCol + 1).setValue('NEW');
  if (urlCol !== undefined) sheet.getRange(targetRowIndex + 1, urlCol + 1).clearContent();
  if (errorNotesCol !== undefined) sheet.getRange(targetRowIndex + 1, errorNotesCol + 1).clearContent();
  
  return { status: 'success', message: 'Row reset successfully.' };
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
    } else if (command === 'resetRowStatus') {
      const resetResult = resetRowStatus(params.rowId, params.runId, params.keyword, workbookUrl);
      
      const userProps = PropertiesService.getUserProperties();
      userProps.setProperty('PENDING_FOLDER_ID', params.folderId || '');
      userProps.setProperty('PENDING_WORKBOOK_URL', workbookUrl || '');
      userProps.setProperty('PENDING_CLIENT_ID', params.clientId || '');
      userProps.setProperty('PENDING_USER_ID', params.userId || params.user_id || '');
      
      ScriptApp.newTrigger('asyncRunBriefGeneration')
        .timeBased()
        .after(1000)
        .create();
        
      result = resetResult;
    } else {
      const userProps = PropertiesService.getUserProperties();
      userProps.setProperty('PENDING_FOLDER_ID', params.folderId || '');
      userProps.setProperty('PENDING_WORKBOOK_URL', workbookUrl || '');
      userProps.setProperty('PENDING_CLIENT_ID', params.clientId || '');
      userProps.setProperty('PENDING_USER_ID', params.userId || params.user_id || '');

      // NEW: Pre-scan for data presence to avoid "fake" success messages
      let count = 0;
      try {
        const ss = openWorkbook(workbookUrl);
        let targetSheet = getSheetFromUrl(ss, workbookUrl);
        
        if (!targetSheet) {
          try {
            targetSheet = discoverDataSheet(ss);
            debugLog('PRE_SCAN_DISCOVERY', `Found sheet: "${targetSheet.getName()}"`);
          } catch (e) {
            // Fallback to first sheet if discovery fails
            targetSheet = ss.getSheets()[0];
          }
        }

        const rows = targetSheet.getDataRange().getValues();
        const headerMap = getHeaderMap(targetSheet);
        const statusCol = headerMap['status']?.index;
        
        if (statusCol !== undefined) {
          for (let i = 1; i < rows.length; i++) {
            const rowStatus = String(rows[i][statusCol] || '').toUpperCase().trim();
            if (rowStatus === '' || rowStatus === 'NEW') {
              count++;
            }
          }
        }
      } catch (e) {
        debugLog('PRE_SCAN_ERROR', e.toString());
        // If we can't open at all, let the trigger try anyway (fallback)
        count = 1; 
      }

      if (count === 0) {
        result = { 
          status: "error", 
          code: "NO_NEW_ROWS",
          message: "No rows with status 'NEW' or empty status were found in the workbook." 
        };
      } else {
        ScriptApp.newTrigger('asyncRunBriefGeneration')
          .timeBased()
          .after(1000)
          .create();
        result = { 
          status: "triggered", 
          count: count,
          message: `Automation started for ${count} keyword(s).` 
        };
      }
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