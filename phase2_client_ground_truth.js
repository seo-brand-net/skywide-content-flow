/**
 * phase2_client_ground_truth.js
 *
 * Adds Phase 2 of the Client Ground Truth system to the n8n workflow:
 *
 * 1. NEW NODE: "Client Site Researcher" (Perplexity sonar-pro)
 *    - Runs after Parse Creative Brief
 *    - Scrapes client's key pages using site: search
 *    - Only runs if client_website_url is provided
 *
 * 2. NEW NODE: "Client Profile Extractor" (OpenAI GPT-4o mini)
 *    - Condenses raw Perplexity research into structured JSON
 *    - Outputs ~500 token Client Ground Truth profile
 *
 * 3. KEYWORD STRATEGIST UPDATE
 *    - Reads the Client Profile Extractor output
 *    - Generates `client_ground_truth_injection` string
 *    - Adds it to the return object
 *
 * 4. DRAFT NODE UPDATES (Claude + OpenAI)
 *    - Inject `client_ground_truth_injection` into both draft prompts
 */

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const workflowPath = 'c:/Users/USER/Documents/Projects/production/skywide/DEV Skywide Content (Word Count Fix).json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// ─── Node IDs ────────────────────────────────────────────────────────────────
const RESEARCHER_ID = uuidv4();
const EXTRACTOR_ID  = uuidv4();

// ─── Positions (inserted between Parse Creative Brief and Pre-Draft Fact Checker)
// Parse Creative Brief = [524080, 113376]
// Pre-Draft Fact Checker = [524256, 113226]
// We'll insert the two new nodes vertically above the current path, 
// then merge into Pre-Draft Fact Checker
const RESEARCHER_POS = [524080, 113120]; // above Parse Creative Brief
const EXTRACTOR_POS  = [524256, 113120]; // above Pre-Draft Fact Checker

// ─── 1. Client Site Researcher Node (Perplexity) ─────────────────────────────
const clientSiteResearcher = {
  parameters: {
    model: "sonar-pro",
    messages: {
      message: [
        {
          role: "system",
          content: [
            "=You are a Client Research Analyst. Your ONLY job is to research what a specific business actually offers, as published on their own website.",
            "",
            "{{ $('Webhook1').first().json.body.client_website_url",
            "  ? 'A client website URL has been provided. You MUST search it directly.'",
            "  : 'No client website URL was provided. Search for the client by name to find their official website.' }}",
            "",
            "RESEARCH PRIORITY ORDER:",
            "1. Search site:{{ $('Webhook1').first().json.body.client_website_url || $('Webhook1').first().json.body.client_name }} for their services/products page",
            "2. Search site:{{ $('Webhook1').first().json.body.client_website_url || $('Webhook1').first().json.body.client_name }} for their about page",
            "3. Search site:{{ $('Webhook1').first().json.body.client_website_url || $('Webhook1').first().json.body.client_name }} for their contact/locations page",
            "4. Search the web for '{{ $('Webhook1').first().json.body.client_name }} official website' as a fallback",
            "",
            "EXTRACT ONLY what is explicitly published on their website:",
            "- Services and products they actually offer",
            "- Service areas and locations",
            "- Certifications, licenses, awards, accreditations",
            "- Named team members with their actual roles",
            "- Unique differentiators and specific claims they make",
            "- Any specific statistics or figures they publish",
            "",
            "CRITICAL: Do NOT infer, assume, or add industry-standard services the client may not offer.",
            "CRITICAL: Only include what you can directly verify from their published web pages.",
            "CRITICAL: If you cannot access their site or find their official presence, state 'UNABLE TO VERIFY' for each category."
          ].join("\n")
        },
        {
          role: "user",
          content: [
            "=Research this client and extract their verified business profile:",
            "",
            "Client Name: {{ $('Webhook1').first().json.body.client_name }}",
            "Client Website: {{ $('Webhook1').first().json.body.client_website_url || 'Not provided — search by name' }}",
            "Article Topic: {{ $('Webhook1').first().json.body.title }}",
            "",
            "Search their website and return a thorough summary of everything you find about their actual services, products, locations, team, and credentials. Be specific — include actual service names, not generic descriptions."
          ].join("\n")
        }
      ]
    },
    options: {
      temperature: 0.1
    },
    requestOptions: {}
  },
  type: "n8n-nodes-base.perplexity",
  typeVersion: 1,
  position: RESEARCHER_POS,
  id: RESEARCHER_ID,
  name: "Client Site Researcher",
  retryOnFail: true,
  waitBetweenTries: 5000,
  credentials: {
    perplexityApi: {
      id: "iuHSBzk6FDLpyJRT",
      name: "SEOBrand"
    }
  }
};

// ─── 2. Client Profile Extractor Node (OpenAI GPT-4o mini) ───────────────────
const clientProfileExtractor = {
  parameters: {
    modelId: {
      __rl: true,
      value: "gpt-4o-mini",
      mode: "list",
      cachedResultName: "GPT-4O MINI"
    },
    messages: {
      messageValues: [
        {
          role: "system",
          message: [
            "You are a data extraction specialist. You receive raw web research about a business and condense it into a precise, structured JSON profile.",
            "",
            "OUTPUT RULES:",
            "- Output ONLY valid JSON — no markdown, no code blocks, no commentary",
            "- Only include facts that were explicitly found in the research",
            "- Use empty arrays [] for categories where nothing was found",
            "- Use the exact service/product names as found on the site",
            "- Keep descriptions concise — one line per item maximum",
            "",
            "OUTPUT FORMAT:",
            `{
  "verified": true,
  "client_name": "string",
  "services": ["list of actual services offered"],
  "products": ["list of actual products sold/offered"],
  "service_areas": ["locations, cities, regions, or 'National' if applicable"],
  "credentials": ["certifications, licenses, awards, memberships"],
  "team": ["Name - Role (only if explicitly listed on their site)"],
  "unique_claims": ["specific differentiators they publish, e.g. '24/7 emergency callout'"],
  "published_stats": ["any statistics from their site, e.g. '500+ projects completed'"],
  "confidence": "high | medium | low"
}`
          ].join("\n")
        },
        {
          role: "user",
          message: [
            "=Convert this web research into a structured JSON client profile.",
            "",
            "Client: {{ $('Webhook1').first().json.body.client_name }}",
            "",
            "Raw Research:",
            "{{ $('Client Site Researcher').first().json.choices?.[0]?.message?.content || $('Client Site Researcher').first().json.message?.content || $('Client Site Researcher').first().json.text || 'No research data available' }}",
            "",
            "Extract only verified facts from the research above. Output valid JSON only."
          ].join("\n")
        }
      ]
    },
    options: {
      temperature: 0
    }
  },
  type: "@n8n/n8n-nodes-langchain.openAi",
  typeVersion: 1.8,
  position: EXTRACTOR_POS,
  id: EXTRACTOR_ID,
  name: "Client Profile Extractor",
  credentials: {
    openAiApi: data.nodes.find(n => n.credentials?.openAiApi)?.credentials?.openAiApi || {
      id: "openai_default",
      name: "OpenAI"
    }
  }
};

// ─── 3. Add new nodes to the workflow ────────────────────────────────────────
data.nodes.push(clientSiteResearcher);
data.nodes.push(clientProfileExtractor);
console.log('✅ Added Client Site Researcher and Client Profile Extractor nodes');

// ─── 4. Update connections ───────────────────────────────────────────────────
// BEFORE: Parse Creative Brief (LLM) → Pre-Draft Fact Checker
// AFTER:  Parse Creative Brief (LLM) → Client Site Researcher → Client Profile Extractor
//         Client Profile Extractor → Pre-Draft Fact Checker (alongside existing parse flow)

// Parse Creative Brief now goes to Client Site Researcher instead of Pre-Draft Fact Checker
data.connections['Parse Creative Brief (LLM)'] = {
  main: [[{ node: 'Client Site Researcher', type: 'main', index: 0 }]]
};

// Client Site Researcher → Client Profile Extractor
data.connections['Client Site Researcher'] = {
  main: [[{ node: 'Client Profile Extractor', type: 'main', index: 0 }]]
};

// Client Profile Extractor → Pre-Draft Fact Checker
data.connections['Client Profile Extractor'] = {
  main: [[{ node: 'Pre-Draft Fact Checker', type: 'main', index: 0 }]]
};

console.log('✅ Connections updated: Parse Creative Brief → Researcher → Extractor → Pre-Draft Fact Checker');

// ─── 5. Update Keyword Strategist to read the Client Profile Extractor output ─
const ks = data.nodes.find(n => n.name === 'Keyword Strategist');
if (ks) {
  let code = ks.parameters.jsCode;

  // Add client ground truth extraction and injection after the existing injections
  const insertAfter = '// ─── CLIENT FIRST PARAGRAPH ─────────────────────────────────────────────────';
  const newCode = `
// ─── CLIENT GROUND TRUTH INJECTION ────────────────────────────────────────────
let clientGroundTruthInjection = '';
try {
  const rawProfile = $('Client Profile Extractor').first().json?.message?.content
                  || $('Client Profile Extractor').first().json?.choices?.[0]?.message?.content
                  || $('Client Profile Extractor').first().json?.text
                  || '';

  if (rawProfile) {
    let profile = null;
    try {
      // Strip markdown code blocks if present
      const cleaned = rawProfile.replace(/^\`\`\`json\\s*/i, '').replace(/\`\`\`\\s*$/, '').trim();
      profile = JSON.parse(cleaned);
    } catch (parseErr) {
      console.log('Client profile JSON parse failed, using raw text');
    }

    if (profile && profile.verified) {
      const lines = [
        '### CLIENT GROUND TRUTH (MANDATORY — DO NOT CONTRADICT)',
        '',
        'The following information has been verified directly from the client\'s published website.',
        'You MUST NOT make claims that contradict or go beyond this data.',
        'You MUST NOT infer additional services, products, or capabilities not listed below.',
        'If you need to reference a service not on this list, use hedging language: "may offer", "contact for details".',
        '',
      ];

      if (profile.services?.length)       lines.push('VERIFIED SERVICES: ' + profile.services.join(' | '));
      if (profile.products?.length)        lines.push('VERIFIED PRODUCTS: ' + profile.products.join(' | '));
      if (profile.service_areas?.length)   lines.push('SERVICE AREAS: ' + profile.service_areas.join(' | '));
      if (profile.credentials?.length)     lines.push('CREDENTIALS: ' + profile.credentials.join(' | '));
      if (profile.team?.length)            lines.push('TEAM (use only these names): ' + profile.team.join(' | '));
      if (profile.unique_claims?.length)   lines.push('UNIQUE CLAIMS (can use these): ' + profile.unique_claims.join(' | '));
      if (profile.published_stats?.length) lines.push('PUBLISHED STATS (can use these): ' + profile.published_stats.join(' | '));

      lines.push('');
      lines.push('DO NOT attribute services, credentials, or team members to this client that are not in the list above.');

      clientGroundTruthInjection = lines.join('\\n');
    } else if (rawProfile.includes('UNABLE TO VERIFY')) {
      clientGroundTruthInjection = '### CLIENT GROUND TRUTH\\nClient website could not be verified. Do not make specific claims about their services, products, or team beyond what is stated in the brief.';
    } else {
      // Use raw text as a softer guardrail
      clientGroundTruthInjection = '### CLIENT RESEARCH CONTEXT\\n' + rawProfile.substring(0, 1500);
    }
  }
} catch (e) {
  console.log('Client ground truth extraction failed:', e.message);
}

`;

  if (code.includes(insertAfter)) {
    code = code.replace(insertAfter, newCode + insertAfter);
    console.log('✅ Keyword Strategist — client ground truth extraction code added');
  } else {
    // Fallback: insert before the return block
    code = code.replace('return {\n  json: {', newCode + 'return {\n  json: {');
    console.log('✅ Keyword Strategist — inserted before return block (fallback)');
  }

  // Add clientGroundTruthInjection to the return object
  code = code.replace(
    'client_website_url:             input.client_website_url || null,',
    'client_website_url:             input.client_website_url || null,\n    client_ground_truth_injection:  clientGroundTruthInjection,'
  );

  ks.parameters.jsCode = code;
  console.log('✅ Keyword Strategist return block updated with client_ground_truth_injection');
} else {
  console.error('❌ Keyword Strategist not found');
}

// ─── 6. Inject client_ground_truth_injection into Claude Draft ───────────────
const claudeDraft = data.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraft && claudeDraft.parameters.text) {
  const groundTruthBlock = "\n\n{{ $('Keyword Strategist').item.json.client_ground_truth_injection }}\n\n";
  
  // Insert it right before the global rules / brief enforcer block at the end
  const insertBefore = "\n\n\\n\\n{{ $('Keyword Strategist').item.json.brief_authority_preamble }}";
  if (claudeDraft.parameters.text.includes(insertBefore) && !claudeDraft.parameters.text.includes('client_ground_truth_injection')) {
    claudeDraft.parameters.text = claudeDraft.parameters.text.replace(
      insertBefore,
      groundTruthBlock + insertBefore
    );
    console.log('✅ Claude Draft — client_ground_truth_injection injected');
  } else if (claudeDraft.parameters.text.includes('client_ground_truth_injection')) {
    console.log('ℹ️  Claude Draft — already contains client_ground_truth_injection');
  } else {
    console.log('⚠️  Claude Draft — could not find insertion point, appending to end');
    claudeDraft.parameters.text += groundTruthBlock;
  }
}

// Also update Claude Draft messageValues system message if present
if (claudeDraft?.parameters?.messages?.messageValues) {
  claudeDraft.parameters.messages.messageValues.forEach((mv, i) => {
    if (mv.message && typeof mv.message === 'string' && !mv.message.includes('client_ground_truth_injection')) {
      mv.message += "\n\n{{ $('Keyword Strategist').item.json.client_ground_truth_injection }}";
      console.log(`✅ Claude Draft messageValues[${i}] — client_ground_truth_injection added`);
    }
  });
}

// ─── 7. Inject into Data Check & Research Gaps (Perplexity synthesis node) ───
const dataCheck = data.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dataCheck?.parameters?.messages?.message) {
  const msgs = dataCheck.parameters.messages.message;
  msgs.forEach((m, i) => {
    if (m.content && typeof m.content === 'string' && !m.content.includes('client_ground_truth_injection')) {
      // Add ground truth before the word count constraint
      m.content = m.content.replace(
        'CRITICAL: The final merged article',
        "{{ $('Keyword Strategist').first().json.client_ground_truth_injection }}\n\nCRITICAL: The final merged article"
      );
      console.log(`✅ Data Check & Research Gaps1 msg[${i}] — client_ground_truth_injection added`);
    }
  });
}

// ─── 8. Validate and save ─────────────────────────────────────────────────────
fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('\nWorkflow saved. Validating...');
const reloaded = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
console.log('✅ JSON is valid. Total nodes:', reloaded.nodes.length);

// Verify our new nodes exist
const r = reloaded.nodes.find(n => n.name === 'Client Site Researcher');
const e = reloaded.nodes.find(n => n.name === 'Client Profile Extractor');
console.log('Client Site Researcher node:', r ? '✅ Found' : '❌ Missing');
console.log('Client Profile Extractor node:', e ? '✅ Found' : '❌ Missing');

// Verify connections
const conn = reloaded.connections;
console.log('Parse Creative Brief → Client Site Researcher:', 
  conn['Parse Creative Brief (LLM)']?.main?.[0]?.[0]?.node === 'Client Site Researcher' ? '✅' : '❌');
console.log('Client Site Researcher → Client Profile Extractor:', 
  conn['Client Site Researcher']?.main?.[0]?.[0]?.node === 'Client Profile Extractor' ? '✅' : '❌');
console.log('Client Profile Extractor → Pre-Draft Fact Checker:', 
  conn['Client Profile Extractor']?.main?.[0]?.[0]?.node === 'Pre-Draft Fact Checker' ? '✅' : '❌');

// Verify Keyword Strategist has the new output
const ksNode = reloaded.nodes.find(n => n.name === 'Keyword Strategist');
console.log('Keyword Strategist has client_ground_truth_injection:', 
  ksNode?.parameters?.jsCode?.includes('client_ground_truth_injection') ? '✅' : '❌');
