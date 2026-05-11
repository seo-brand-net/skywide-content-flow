const fs = require('fs');
const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID();
}

const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

// --- 1. Pre-Draft Fact Checker ---
const pre_draft_id = generateId();
const pre_draft_name = 'Pre-Draft Fact Checker';

const pre_draft_node = {
  parameters: {
    model: "sonar-pro",
    messages: {
      values: [
        {
          role: "system",
          content: "You are an elite Fact-Checker and Brief Auditor. Read the provided content brief. Extract all factual claims, specifically focusing on:\n1. Legal and administrative code citations.\n2. Specific quantitative limits or mandates.\n3. Conversions and values.\n4. Procedural rules.\nSearch the web to aggressively verify these claims against authoritative, up-to-date official sources (prioritize .gov, .edu, or official entity domains like NAPEO.org).\nCRITICAL RULE: NEVER invent or synthesize new statistics, numbers, or claims. DO NOT add any new claims. If a claim in the brief is incorrect, correct it ONLY if you find the exact primary source. If you cannot find primary source confirmation, explicitly state to REMOVE the claim entirely rather than guessing.\nOutput a 'Fact-Check Report' fixing errors based ONLY on official sources."
        },
        {
          content: "Brief Data to Audit:\n{{ $('Parse Creative Brief (LLM)').item.json.text }}"
        }
      ]
    },
    options: {}
  },
  type: "n8n-nodes-base.perplexity",
  typeVersion: 1,
  position: [0, 0],
  id: pre_draft_id,
  name: pre_draft_name,
  credentials: {
    perplexityApi: {
      id: "iuHSBzk6FDLpyJRT",
      name: "SEOBrand"
    }
  }
};

const parseNode = data.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
if (parseNode) {
  pre_draft_node.position = [parseNode.position[0] + 150, parseNode.position[1] + 100];
}

// Rewire Parse Creative Brief (LLM) -> Pre-Draft Fact Checker -> Keyword Strategist
if (data.connections['Parse Creative Brief (LLM)']) {
  const conns = data.connections['Parse Creative Brief (LLM)'].main[0];
  const new_conns = conns.filter(c => c.node !== 'Keyword Strategist');
  new_conns.push({
    node: pre_draft_name,
    type: "main",
    index: 0
  });
  data.connections['Parse Creative Brief (LLM)'].main[0] = new_conns;
}

data.connections[pre_draft_name] = {
  main: [
    [
      {
        node: "Keyword Strategist",
        type: "main",
        index: 0
      }
    ]
  ]
};
data.nodes.push(pre_draft_node);

// Inject into Keyword Strategist code
const ksNode = data.nodes.find(n => n.name === 'Keyword Strategist');
if (ksNode) {
  let code = ksNode.parameters.jsCode;
  const injection = `
let factCheckReport = '';
try {
  let raw = $('Pre-Draft Fact Checker').first().json;
  factCheckReport = raw.message?.content || raw.choices?.[0]?.message?.content || raw.text || '';
} catch(e) { console.log('Fact check extract failed', e); }
`;
  code = code.replace("return {\n  json: {", injection + "\nreturn {\n  json: {\n    fact_check_report: factCheckReport,");
  ksNode.parameters.jsCode = code;
}

// Inject into Draft Prompts
function inject_draft(node_name) {
  const n = data.nodes.find(n => n.name === node_name);
  if (n && n.parameters.messages && n.parameters.messages.values) {
    n.parameters.messages.values.forEach(val => {
      if (val.role === 'system') {
        val.content += "\n\nCRITICAL FACT-CHECK REPORT (OVERRIDE BRIEF FACTS):\n{{ $('Keyword Strategist').first().json.fact_check_report || '' }}";
      }
    });
  }
}

inject_draft('OpenAI Draft (GPT-4O)1');
inject_draft('Claude Draft (Claude Opus 3)1');

// --- 2. Post-Draft Fact Checker ---
const post_draft_id = generateId();
const post_draft_name = 'Post-Draft Fact Checker';

const post_draft_node = {
  parameters: {
    model: "sonar-pro",
    messages: {
      values: [
        {
          role: "system",
          content: "You are a ruthless Fact-Checker. Read the provided synthesized article draft. Extract every factual claim, date, statistic, rule, legal citation, and entity.\nVerify them using web search against official primary sources (prioritize .gov, .edu, or official primary organizations).\nCRITICAL RULE: You MUST NOT add new statistics, facts, or claims under any circumstances. If you find any hallucinations, inaccuracies, or unverified statistics in the draft, you MUST DELETE that specific claim or rewrite the sentence to remove the hallucinated number. You may only replace a number if the official primary source gives you the exact correct number for that specific context. If an official source cannot be found, remove the claim entirely. Maintain the exact tone and word count. Output ONLY the finalized, factually correct article without any meta-commentary."
        },
        {
          content: "{{ $('Data Check & Research Gaps1').item.json.message?.content || $('Data Check & Research Gaps1').item.json.choices?.[0]?.message?.content || $('Data Check & Research Gaps1').item.json.text }}"
        }
      ]
    },
    options: {}
  },
  type: "n8n-nodes-base.perplexity",
  typeVersion: 1,
  position: [0, 0],
  id: post_draft_id,
  name: post_draft_name,
  credentials: {
    perplexityApi: {
      id: "iuHSBzk6FDLpyJRT",
      name: "SEOBrand"
    }
  }
};

const dcrgNode = data.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dcrgNode) {
  post_draft_node.position = [dcrgNode.position[0] + 150, dcrgNode.position[1] + 100];
}

// Rewire Data Check & Research Gaps1 -> Post-Draft Fact Checker -> Keyword Checks
const old_targets = data.connections['Data Check & Research Gaps1']?.main?.[0] || [];
data.connections['Data Check & Research Gaps1'] = {
  main: [
    [
      {
        node: post_draft_name,
        type: "main",
        index: 0
      }
    ]
  ]
};

data.connections[post_draft_name] = {
  main: [old_targets]
};
data.nodes.push(post_draft_node);

function fix_keyword_input(node_name) {
  const n = data.nodes.find(n => n.name === node_name);
  if (n && n.parameters.messages && n.parameters.messages.values) {
    n.parameters.messages.values.forEach(val => {
      if (val.role !== 'system') {
        val.content = val.content.replace("{{ $json.choices[0].message.content }}", "{{ $json.message?.content || $json.choices?.[0]?.message?.content || $json.text }}");
      }
    });
  }
}

fix_keyword_input('OpenAI Keyword Check + Semantic Gap1');
fix_keyword_input('Claude Keyword Check + Semantic Gap1');

fs.writeFileSync('TEST Skywide Content (Prompt Review).json', JSON.stringify(data, null, 2), 'utf8');

console.log("SUCCESS");
