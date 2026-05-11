import json
import uuid

def generate_id():
    return str(uuid.uuid4())

with open('TEST Skywide Content (Prompt Review).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# --- 1. Pre-Draft Fact Checker ---
pre_draft_id = generate_id()
pre_draft_name = 'Pre-Draft Fact Checker'

pre_draft_node = {
  "parameters": {
    "model": "sonar-pro",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "You are an elite Fact-Checker and Brief Auditor. Read the provided content brief. Extract all factual claims, specifically focusing on:\n1. Legal and administrative code citations (e.g., verifying if the correct chapter or section is cited).\n2. Specific quantitative limits or mandates (e.g., maximum online hours allowed, specific hours required for ethics/live instruction).\n3. Conversions and values (e.g., college credit to PDH conversion, patent/teaching PDH values).\n4. Procedural rules (e.g., record retention periods, audit rates, new licensee exemptions, and non-compliance penalties).\nSearch the web to aggressively verify these claims against authoritative, up-to-date official sources (like state administrative codes, licensing boards, or official statutes). DO NOT assume any statistic, citation, or rule provided in the brief is correct without independent verification.\nOutput a 'Fact-Check Report'. If the brief contains errors, correct them explicitly with the accurate information and cite the specific official rule/section. If it is accurate, confirm it. Your output MUST be used by the writers to prioritize real facts over the brief's original text."
        },
        {
          "content": "Brief Data to Audit:\n{{ $('Parse Creative Brief (LLM)').item.json.text }}"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.perplexity",
  "typeVersion": 1,
  "position": [0, 0],
  "id": pre_draft_id,
  "name": pre_draft_name,
  "credentials": {
    "perplexityApi": {
      "id": "iuHSBzk6FDLpyJRT",
      "name": "SEOBrand"
    }
  }
}

for n in data['nodes']:
    if n['name'] == 'Parse Creative Brief (LLM)':
        pre_draft_node['position'] = [n['position'][0] + 150, n['position'][1] + 100]

# Rewire Parse Creative Brief (LLM) -> Pre-Draft Fact Checker -> Keyword Strategist
if 'Parse Creative Brief (LLM)' in data['connections']:
    conns = data['connections']['Parse Creative Brief (LLM)']['main'][0]
    new_conns = [c for c in conns if c['node'] != 'Keyword Strategist']
    new_conns.append({
        "node": pre_draft_name,
        "type": "main",
        "index": 0
    })
    data['connections']['Parse Creative Brief (LLM)']['main'][0] = new_conns

data['connections'][pre_draft_name] = {
    "main": [
        [
            {
                "node": "Keyword Strategist",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
data['nodes'].append(pre_draft_node)

# Inject into Keyword Strategist code
for n in data['nodes']:
    if n['name'] == 'Keyword Strategist':
        code = n['parameters']['jsCode']
        # add extraction
        injection = """
let factCheckReport = '';
try {
  let raw = $('Pre-Draft Fact Checker').first().json;
  factCheckReport = raw.message?.content || raw.choices?.[0]?.message?.content || raw.text || '';
} catch(e) { console.log('Fact check extract failed', e); }
"""
        # insert before return
        code = code.replace("return {\n  json: {", injection + "\nreturn {\n  json: {\n    fact_check_report: factCheckReport,")
        n['parameters']['jsCode'] = code

# Inject into Draft Prompts
def inject_draft(node_name):
    for n in data['nodes']:
        if n['name'] == node_name:
            if 'messages' in n.get('parameters', {}) and 'values' in n['parameters']['messages']:
                for val in n['parameters']['messages']['values']:
                    if val.get('role') == 'system':
                        val['content'] += "\n\nCRITICAL FACT-CHECK REPORT (OVERRIDE BRIEF FACTS):\n{{ $('Keyword Strategist').first().json.fact_check_report || '' }}"

inject_draft('OpenAI Draft (GPT-4O)1')
inject_draft('Claude Draft (Claude Opus 3)1')


# --- 2. Post-Draft Fact Checker ---
post_draft_id = generate_id()
post_draft_name = 'Post-Draft Fact Checker'

post_draft_node = {
  "parameters": {
    "model": "sonar-pro",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "You are a ruthless Fact-Checker. Read the provided synthesized article draft. Extract every factual claim, date, statistic, rule, legal citation, and entity. Pay special attention to verifying:\n1. Administrative or legal code citations.\n2. Hours, limits, and quotas (e.g., 'all 30 hours can be online' vs 'minimum live instruction required').\n3. Record retention periods (e.g., '4 years' vs '3 biennia').\n4. Unverified statistics or penalties (e.g., '10% audit rate', specific monetary fines).\nVerify them using web search against official primary sources. If you find any hallucinations, inaccuracies, contradictions, unverified statistics, or outdated information, rewrite those specific sentences to be factually accurate based on official rules. Remove any unverified claims entirely if an official source cannot be found. Maintain the exact tone and word count. Output ONLY the finalized, factually correct article without any meta-commentary."
        },
        {
          "content": "{{ $('Data Check & Research Gaps1').item.json.message?.content || $('Data Check & Research Gaps1').item.json.choices?.[0]?.message?.content || $('Data Check & Research Gaps1').item.json.text }}"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.perplexity",
  "typeVersion": 1,
  "position": [0, 0],
  "id": post_draft_id,
  "name": post_draft_name,
  "credentials": {
    "perplexityApi": {
      "id": "iuHSBzk6FDLpyJRT",
      "name": "SEOBrand"
    }
  }
}

for n in data['nodes']:
    if n['name'] == 'Data Check & Research Gaps1':
        post_draft_node['position'] = [n['position'][0] + 150, n['position'][1] + 100]

# Rewire Data Check & Research Gaps1 -> Post-Draft Fact Checker -> Keyword Checks
old_targets = data['connections'].get('Data Check & Research Gaps1', {}).get('main', [[]])[0]
data['connections']['Data Check & Research Gaps1'] = {
    "main": [
        [
            {
                "node": post_draft_name,
                "type": "main",
                "index": 0
            }
        ]
    ]
}

data['connections'][post_draft_name] = {
    "main": [
        old_targets
    ]
}
data['nodes'].append(post_draft_node)

# Important: Update Keyword Checks to read from Post-Draft Fact Checker instead of $json (because $json will automatically be the output of Post-Draft Fact Checker, but wait: does Keyword Check use $json.choices[0].message.content?)
# Since Post-Draft Fact Checker is a Perplexity node, its output format might be `message.content` or `choices[0].message.content`.
# Let's ensure the keyword check nodes handle it safely or leave as $json.choices[0] which Perplexity uses.
def fix_keyword_input(node_name):
    for n in data['nodes']:
        if n['name'] == node_name:
            if 'messages' in n.get('parameters', {}) and 'values' in n['parameters']['messages']:
                for val in n['parameters']['messages']['values']:
                    if val.get('role') != 'system':
                        val['content'] = val['content'].replace("{{ $json.choices[0].message.content }}", "{{ $json.message?.content || $json.choices?.[0]?.message?.content || $json.text }}")

fix_keyword_input('OpenAI Keyword Check + Semantic Gap1')
fix_keyword_input('Claude Keyword Check + Semantic Gap1')

with open('TEST Skywide Content (Prompt Review).json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("SUCCESS")
