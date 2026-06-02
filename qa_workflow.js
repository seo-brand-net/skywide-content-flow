const fs = require('fs');
const data = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const issues = [];
const ok = [];

// ── 1. JSON validity ──────────────────────────────────────────────────────────
ok.push('JSON is valid. Total nodes: ' + data.nodes.length);

// ── 2. Verify new nodes exist ─────────────────────────────────────────────────
const researcher = data.nodes.find(n => n.name === 'Client Site Researcher');
const extractor  = data.nodes.find(n => n.name === 'Client Profile Extractor');

if (!researcher) { issues.push('MISSING NODE: Client Site Researcher'); }
else {
  ok.push('Client Site Researcher: exists, type=' + researcher.type);
  if (researcher.type !== 'n8n-nodes-base.perplexity') issues.push('Client Site Researcher: wrong type: ' + researcher.type);
  if (!researcher.credentials || !researcher.credentials.perplexityApi) issues.push('Client Site Researcher: missing perplexityApi credential');
  else ok.push('Client Site Researcher: Perplexity credential OK (' + researcher.credentials.perplexityApi.name + ')');
  const msgs = (researcher.parameters && researcher.parameters.messages && researcher.parameters.messages.message) || [];
  if (msgs.length !== 2) issues.push('Client Site Researcher: expected 2 messages, got ' + msgs.length);
  else ok.push('Client Site Researcher: 2 messages configured');
  if (!researcher.retryOnFail) issues.push('Client Site Researcher: retryOnFail not set');
  else ok.push('Client Site Researcher: retryOnFail=true');
}

if (!extractor) { issues.push('MISSING NODE: Client Profile Extractor'); }
else {
  ok.push('Client Profile Extractor: exists, type=' + extractor.type);
  const msgs = (extractor.parameters && extractor.parameters.messages && extractor.parameters.messages.messageValues) || [];
  if (msgs.length !== 2) issues.push('Client Profile Extractor: expected 2 messageValues, got ' + msgs.length);
  else ok.push('Client Profile Extractor: 2 messageValues configured');
  const model = extractor.parameters && extractor.parameters.modelId && extractor.parameters.modelId.value;
  if (!model) issues.push('Client Profile Extractor: no model set');
  else ok.push('Client Profile Extractor: model=' + model);
  const temp = extractor.parameters && extractor.parameters.options && extractor.parameters.options.temperature;
  if (temp !== 0) issues.push('Client Profile Extractor: temperature should be 0, got ' + temp);
  else ok.push('Client Profile Extractor: temperature=0 (correct)');
}

// ── 3. Verify connections ─────────────────────────────────────────────────────
const conn = data.connections;

const parseToCsr = conn['Parse Creative Brief (LLM)'] && conn['Parse Creative Brief (LLM)'].main && conn['Parse Creative Brief (LLM)'].main[0] && conn['Parse Creative Brief (LLM)'].main[0][0] && conn['Parse Creative Brief (LLM)'].main[0][0].node;
if (parseToCsr !== 'Client Site Researcher') issues.push('CONNECTION: Parse Creative Brief should go to Client Site Researcher, got: ' + parseToCsr);
else ok.push('CONNECTION: Parse Creative Brief -> Client Site Researcher OK');

const csrToCpe = conn['Client Site Researcher'] && conn['Client Site Researcher'].main && conn['Client Site Researcher'].main[0] && conn['Client Site Researcher'].main[0][0] && conn['Client Site Researcher'].main[0][0].node;
if (csrToCpe !== 'Client Profile Extractor') issues.push('CONNECTION: Client Site Researcher should go to Client Profile Extractor, got: ' + csrToCpe);
else ok.push('CONNECTION: Client Site Researcher -> Client Profile Extractor OK');

const cpeToPdfc = conn['Client Profile Extractor'] && conn['Client Profile Extractor'].main && conn['Client Profile Extractor'].main[0] && conn['Client Profile Extractor'].main[0][0] && conn['Client Profile Extractor'].main[0][0].node;
if (cpeToPdfc !== 'Pre-Draft Fact Checker') issues.push('CONNECTION: Client Profile Extractor should go to Pre-Draft Fact Checker, got: ' + cpeToPdfc);
else ok.push('CONNECTION: Client Profile Extractor -> Pre-Draft Fact Checker OK');

// Verify Startup Update still connects to Parse Creative Brief
const startupConn = conn['Startup Update'] && conn['Startup Update'].main && conn['Startup Update'].main[0] && conn['Startup Update'].main[0][0] && conn['Startup Update'].main[0][0].node;
if (startupConn !== 'Parse Creative Brief (LLM)') issues.push('CONNECTION: Startup Update should go to Parse Creative Brief, got: ' + startupConn);
else ok.push('CONNECTION: Startup Update -> Parse Creative Brief still intact OK');

// ── 4. Keyword Strategist checks ──────────────────────────────────────────────
const ks = data.nodes.find(n => n.name === 'Keyword Strategist');
const ksCode = (ks && ks.parameters && ks.parameters.jsCode) || '';

const ksChecks = [
  ['global_rules_injection', 'global_rules_injection in output'],
  ['brief_enforcer_injection', 'brief_enforcer_injection in output'],
  ['faq_injection', 'faq_injection in output'],
  ['client_website_url', 'client_website_url in output'],
  ['client_ground_truth_injection', 'client_ground_truth_injection in output'],
  ['Client Profile Extractor', 'References Client Profile Extractor node'],
  ['NO REDUNDANCY', 'NO REDUNDANCY rule present'],
  ['NEVER repeat the same H2', 'NEVER repeat H2 rule present'],
  ['client_ground_truth_injection:  clientGroundTruthInjection', 'Ground truth returned in JSON output'],
];
ksChecks.forEach(function(pair) {
  var check = pair[0], label = pair[1];
  if (ksCode.indexOf(check) === -1) issues.push('KEYWORD STRATEGIST: Missing - ' + label);
  else ok.push('KEYWORD STRATEGIST: OK - ' + label);
});

// Check KS handles missing Client Profile Extractor gracefully (try/catch around it)
if (ksCode.indexOf('try {') === -1 || ksCode.indexOf('Client Profile Extractor') === -1) {
  issues.push('KEYWORD STRATEGIST: Client Profile Extractor call may not be wrapped in try/catch (brittle)');
} else {
  ok.push('KEYWORD STRATEGIST: Client Profile Extractor call wrapped in try/catch OK');
}

// ── 5. Draft nodes ground truth injection ─────────────────────────────────────
const claudeDraft = data.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
const claudeText = (claudeDraft && claudeDraft.parameters && claudeDraft.parameters.text) || '';
if (claudeText.indexOf('client_ground_truth_injection') === -1) {
  issues.push('CLAUDE DRAFT: Missing client_ground_truth_injection in text prompt');
} else ok.push('CLAUDE DRAFT: client_ground_truth_injection present OK');

const dataCheck = data.nodes.find(n => n.name === 'Data Check & Research Gaps1');
const dcStr = JSON.stringify((dataCheck && dataCheck.parameters) || '');
if (dcStr.indexOf('client_ground_truth_injection') === -1) {
  issues.push('DATA CHECK & RESEARCH GAPS: Missing client_ground_truth_injection');
} else ok.push('DATA CHECK & RESEARCH GAPS: client_ground_truth_injection present OK');

// ── 6. Fact-checker client_website_url references ─────────────────────────────
const preDraft = data.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
const pdStr = JSON.stringify((preDraft && preDraft.parameters) || '');
if (pdStr.indexOf('client_website_url') === -1) issues.push('PRE-DRAFT FACT CHECKER: Missing client_website_url reference');
else ok.push('PRE-DRAFT FACT CHECKER: client_website_url reference OK');

const postDraft = data.nodes.find(n => n.name === 'Post-Draft Fact Checker');
const postStr = JSON.stringify((postDraft && postDraft.parameters) || '');
if (postStr.indexOf('client_website_url') === -1) issues.push('POST-DRAFT FACT CHECKER: Missing client_website_url reference');
else ok.push('POST-DRAFT FACT CHECKER: client_website_url reference OK');

// ── 7. Deprecated variable check ─────────────────────────────────────────────
const fullStr = JSON.stringify(data);
var oldVarCount = (fullStr.match(/system_prompt_injection/g) || []).length;
if (oldVarCount > 0) issues.push('DEPRECATED: system_prompt_injection still referenced ' + oldVarCount + ' time(s) - should be removed');
else ok.push('DEPRECATED: No system_prompt_injection references OK');

// ── 8. Node enabled/disabled status ──────────────────────────────────────────
var shouldBeEnabled = ['Pre-Draft Fact Checker', 'Post-Draft Fact Checker', 'Keyword Strategist', 'Client Site Researcher', 'Client Profile Extractor', 'Parse Creative Brief (LLM)', 'Claude Draft (Claude Opus 3)1', 'Startup Update', 'Keyword Validator'];
shouldBeEnabled.forEach(function(name) {
  var n = data.nodes.find(function(nn) { return nn.name === name; });
  if (!n) issues.push('MISSING: ' + name);
  else if (n.disabled) issues.push('DISABLED: ' + name + ' should be active');
  else ok.push('ACTIVE: ' + name + ' is enabled OK');
});

// ── 9. Check fact_check_report reference ─────────────────────────────────────
if (postStr.indexOf('fact_check_report') !== -1) {
  if (ksCode.indexOf('fact_check_report') !== -1) {
    ok.push('FACT CHECK REPORT: Referenced in Post-Draft and produced in Keyword Strategist OK');
  } else {
    issues.push('FACT CHECK REPORT: Post-Draft Fact Checker references Keyword Strategist fact_check_report but Keyword Strategist does not produce it - will be empty');
  }
} else {
  ok.push('FACT CHECK REPORT: Not referenced (bypassed)');
}

// ── 10. Check Client Profile Extractor references Researcher correctly ─────────
if (extractor) {
  var extractorMsg = (extractor.parameters && extractor.parameters.messages && extractor.parameters.messages.messageValues && extractor.parameters.messages.messageValues[1] && extractor.parameters.messages.messageValues[1].message) || '';
  if (extractorMsg.indexOf('Client Site Researcher') === -1) {
    issues.push('CLIENT PROFILE EXTRACTOR: user message does not reference Client Site Researcher node');
  } else ok.push('CLIENT PROFILE EXTRACTOR: correctly references Client Site Researcher OK');
}

// ── 11. Check Post-Draft Fact Checker references Client Ground Truth ──────────
if (postStr.indexOf('client_ground_truth') === -1 && postStr.indexOf('PRIORITY INSTRUCTION') === -1) {
  issues.push('POST-DRAFT FACT CHECKER: does not reference client ground truth or priority instruction');
} else ok.push('POST-DRAFT FACT CHECKER: has client site priority instruction OK');

// ── RESULTS ──────────────────────────────────────────────────────────────────
console.log('\n========== WORKFLOW QA RESULTS ==========\n');
console.log('PASSED (' + ok.length + '):');
ok.forEach(function(o) { console.log('  OK: ' + o); });
console.log('\n' + (issues.length === 0 ? 'NO ISSUES FOUND' : 'ISSUES (' + issues.length + '):'));
issues.forEach(function(i) { console.log('  ISSUE: ' + i); });
