const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env', 'utf8');

const n8nApiKey = env.match(/N8N_API_KEY=([^\r\n]+)/)[1].trim().replace(/^["']|["']$/g, '');
const base = env.match(/N8N_BASE_URL=([^\r\n]+)/)[1].trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');

const openaiKey = env.match(/OPENAI_API_KEY=([^\r\n]+)/)?.[1]?.trim().replace(/^["']|["']$/g, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
            headers: { 'X-N8N-API-KEY': n8nApiKey, 'Accept': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.end();
    });
}

function callOpenAI(messages) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Authorization': 'Bearer ' + openaiKey, 'Content-Type': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.write(JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            temperature: 0,
            response_format: { type: "json_object" }
        }));
        req.end();
    });
}

async function run() {
    // 1. Get the last execution of the webhook
    const res = await n8nGet('/api/v1/executions?limit=5');
    let targetEx = null;
    for (const ex of res.data) {
        if (ex.status === 'error') {
            const fullEx = await n8nGet('/api/v1/executions/' + ex.id + '?includeData=true');
            if (fullEx.data.resultData.runData['Claims Extractor & Manifest Generator']) {
                targetEx = fullEx;
                break;
            }
        }
    }
    
    if (!targetEx) {
        console.log("Could not find a failed execution for Claims Extractor.");
        return;
    }

    // We need to resolve the prompt exactly as n8n evaluated it.
    // In n8n, the evaluated prompt is sometimes logged, or we can reconstruct it.
    // Since we can't easily evaluate n8n expressions, let's grab the inputs to the node:
    const claimsNodeInput = targetEx.data.resultData.runData['Client Profile Extractor']?.[0]?.data?.main?.[0]?.[0]?.json;
    if (!claimsNodeInput) {
        console.log("Could not find input data to Claims Extractor.");
        return;
    }
    
    // The Webhook1 body is available in the execution trigger data, or we can just fetch it from the first node.
    const webhookData = targetEx.data.resultData.runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;

    const systemPrompt = `=# Claims & Placement Manifest Generator

You produce a PLACEMENT-AWARE CLAIMS MANIFEST. This manifest is read directly by the AI writer. Every item must tell the writer exactly what to say and exactly where to say it — no ambiguity.

━━━ WHO READS THIS DOWNSTREAM ━━━
1. The AI Writer (Claude Draft) — places each claim in its exact section
2. The QSI Bouncer — audits the article against this manifest after drafting
3. The Verified Claims Parser — cross-references this against the fact-check report

━━━ YOUR INPUTS ━━━
**Creative Brief:**
${webhookData?.creative_brief || 'No Brief Provided'}

**Verified Client Website Data:**
${JSON.stringify(claimsNodeInput)}

━━━ WHAT QUALIFIES AS A CLAIM (strict definition) ━━━

A claim MUST be one of these types:
  ✅ STATISTIC      — A specific number, percentage, rate, or count with a verifiable source
                      e.g. "30 PDH required per biennium" / "500+ clients served"
  ✅ CITATION       — A named study, paper, regulatory code, or legal reference
                      e.g. "§ A-E 13.03(1)(b)" / "Lovaas 1987 study in JABA"
  ✅ REGULATION     — A hard legal/regulatory requirement or limit
                      e.g. "Minimum 13 PDH via live instruction" / "2 PDH ethics mandatory"
  ✅ ORG ATTRIBUTION — A guideline or recommendation explicitly published by a named organization
                      e.g. "BACB requires..." / "APA guidelines state..." (only if verifiable)
  ✅ CREDENTIAL     — A specific certification, accreditation, award the client holds
                      e.g. "Joint Commission accredited" / "CARF certified"
  ✅ INTERNAL LINK  — A specific page on the client's website the brief instructs to link to
                      e.g. "Link to /admissions in the 'How to Start' section"
  ✅ NAMED EXPERT   — A named person with a specific verifiable role or byline
                      e.g. "Dr. Jane Smith, BCBA-D at [client]"
  ✅ CLIENT STAT    — A number the client explicitly publishes on their website
                      e.g. "60% improvement in communication (as published at [URL])"

A claim MUST NOT be:
  ❌ A topic sentence or section intro ("This section covers...")
  ❌ A style or tone instruction ("Write in a warm, empathetic tone")
  ❌ A general industry truth ("ABA therapy is evidence-based")
  ❌ A keyword or SEO instruction ("Use the term 'residential treatment'")
  ❌ An unattributed opinion or best practice ("Parents should be involved in treatment")
  ❌ A vague authority reference ("Research shows..." without a named source)
  ❌ A generic statistic without a traceable source and the source's exact URL

IF IN DOUBT — ask: "Can this be fact-checked against a real source?"
If yes → include it as a claim.
If no (because it's general knowledge, a style note, or an opinion) → do NOT include it.

━━━ PLACEMENT PRECISION RULE ━━━
Every claim MUST include a placement_instruction that specifies WHERE in its target section it goes.
Use this format:
- "Place in the opening sentence of this section"
- "Use as the supporting evidence after the second paragraph"  
- "Cite at the end of this section before the section close"
- "Weave into the third bullet point"

Never use "anywhere in this section" — the writer needs a specific position.

━━━ SOURCES SECTION PARSING ━━━
If the brief has a "Sources", "References", or "Cited Sources" section at the bottom:
→ Parse it as a separate authoritative list
→ Add each source as a claim_type: "citation" assigned to the section the brief explicitly links it to
→ If no section is specified for a source, assign it to claim_type: "general_citation" with target_section: "Cited Sources"
→ These form the canonical citation list — any citation in the article must appear here

━━━ INSTRUCTIONS ━━━

STEP 1 — Parse the brief's section-by-section outline (H2 headings and what belongs in each).
Parse the "Sources" / "Cited Sources" section separately as the canonical citation registry.
If the brief has no section outline, use the article title and topic to infer logical H2 sections.

STEP 2 — Apply the CLAIM QUALIFICATION FILTER above to every item you consider extracting.
If it doesn't meet the definition of a claim → skip it. Do NOT include it in the manifest.

STEP 3 — For each qualifying claim, record ALL of these fields:
- claim_text: Verbatim from brief or website — do not paraphrase, do not summarize
- target_section: The EXACT H2 heading this belongs under (copied from brief)
- placement_instruction: One specific sentence (e.g. "Place in the opening sentence of this section")
  NEVER use "anywhere in this section" — be precise about position
- source: "Brief" | "Website" | "Both" | "Brief-Cited-Source"
- claim_type: "statistic" | "citation" | "regulation" | "credential" | "internal_link" | "org_attribution" | "named_expert" | "client_stat" | "general_citation"
- requires_verification: true (if it's a statistic, regulation, or org attribution) | false (if it's a credential or internal link)

STEP 4 — Generate forbidden_patterns: 6-10 fabricated-authority phrases SPECIFIC to this article's topic.
These should be tailored to the industry. For regulatory articles: "According to current regulations..." (without citing the specific code section)
For clinical articles: "Clinical experience across [field] consistently shows..."
For home services: "Industry professionals consistently report..."

STEP 5 — Count your manifest items. If you have more than 30 items, you are likely extracting
non-claims (topic sentences, style notes, generic truths). Review and remove non-qualifying items.

━━━ FAILURE MODES ━━━
• Brief section has no qualifying claims → leave that section out of the manifest
• Claim cannot be assigned to a specific section → use target_section: "General"
• Client website has no statistics → set published_stats_available: false
• Brief contains a contradiction (e.g. two different numbers for the same fact) → extract BOTH,
  mark each with a note: "CONTRADICTION — verify against primary source before use"

━━━ OUTPUT CONTRACT ━━━
Return ONLY valid JSON matching the schema exactly. No markdown. No code blocks. No commentary.
Schema is provided by the output parser.`;

    const schemaInstruction = `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
{"type":"object","properties":{"placement_manifest":{"type":"array","items":{"type":"object","properties":{"target_section":{"type":"string"},"claim_text":{"type":"string"},"source":{"type":"string"},"placement_instruction":{"type":"string"},"claim_type":{"type":"string"},"requires_verification":{"type":"string"}},"required":["target_section","claim_text","source","placement_instruction","claim_type","requires_verification"],"additionalProperties":false}},"forbidden_patterns":{"type":"array","items":{"type":"string"}}},"required":["placement_manifest","forbidden_patterns"],"additionalProperties":false}
\`\`\`
`;

    if (!openaiKey) {
        console.log("No OpenAI key found in .env, cannot simulate.");
        return;
    }

    console.log("Calling OpenAI to simulate the exact node execution...");
    const oaiRes = await callOpenAI([
        { role: "system", content: schemaInstruction },
        { role: "user", content: systemPrompt }
    ]);
    
    if (oaiRes.choices) {
        console.log("--- OPENAI RESPONSE ---");
        console.log(oaiRes.choices[0].message.content);
        console.log("-----------------------");
    } else {
        console.log("OpenAI Error:", oaiRes);
    }
}
run();
