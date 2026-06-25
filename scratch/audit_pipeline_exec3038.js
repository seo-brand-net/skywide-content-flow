const https = require('https');
const fs = require('fs');

function apiGet(p) {
  return new Promise((res, rej) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path: p, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res(d); } });
    });
    req.on('error', rej); req.end();
  });
}

function getText(j) {
  if (!j) return '';
  if (typeof j === 'string') return j;
  return j.text || j.content || j.output || j.message?.content ||
    (Array.isArray(j) ? j.map(getText).join('\n') : JSON.stringify(j));
}

function section(title) {
  const bar = '═'.repeat(60);
  return `\n${bar}\n  ${title}\n${bar}`;
}

async function main() {
  console.log('Fetching exec 3038...');
  const full = await apiGet('/api/v1/executions/3038?includeData=true');
  const nodes = full.data?.resultData?.runData || {};

  const lines = [];
  const log = s => { console.log(s); lines.push(String(s)); };

  log(`EXEC 3038 — Claims & Fact-Check Pipeline Audit`);
  log(`Status: ${full.status} | Duration: ${Math.round((new Date(full.stoppedAt)-new Date(full.startedAt))/1000)}s`);

  // ── Webhook / Brief ─────────────────────────────────────────────────────────
  const webhookBody = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body || {};
  const brief = webhookBody.creative_brief || '';
  log(section('NODE 1 — WEBHOOK INPUT (Creative Brief snippet)'));
  log('Title: ' + webhookBody.title);
  log('Client: ' + webhookBody.client_name);
  log('Website: ' + webhookBody.client_website_url);
  log('Brief (first 1000):\n' + brief.substring(0, 1000));

  // ── Parse Creative Brief ────────────────────────────────────────────────────
  const parsedRaw = getText(nodes['Parse Creative Brief (LLM)']?.[0]?.data?.main?.[0]?.[0]?.json);
  let parsed = null;
  try { const m = parsedRaw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch(e) {}
  log(section('NODE 2 — PARSE CREATIVE BRIEF OUTPUT'));
  if (parsed) {
    log('Sections extracted: ' + (parsed.sections?.length || 0));
    log('Global rules: ' + (parsed.global_rules?.length || 0));
    log('FAQs: ' + (parsed.faqs?.length || 0));
    parsed.sections?.forEach((s, i) => {
      log(`\n  [${i+1}] "${s.heading}"`);
      log(`       required_claims: ${JSON.stringify(s.required_claims || [])}`);
    });
    log('\nFAQs:');
    (parsed.faqs || []).forEach((q, i) => log(`  ${i+1}. ${q}`));
  } else {
    log('Could not parse — raw output (first 600):');
    log(parsedRaw.substring(0, 600));
  }

  // ── Client Site Researcher ──────────────────────────────────────────────────
  const researchRaw = getText(nodes['Client Site Researcher']?.[0]?.data?.main?.[0]?.[0]?.json);
  log(section('NODE 3 — CLIENT SITE RESEARCHER OUTPUT'));
  log('Output length: ' + researchRaw.length);
  // Key credential signals
  const researchCredentials = ['ISA', 'TCIA', 'BBB', 'licensed', 'insured', 'certified', 'arborist'];
  log('Credential signals found:');
  researchCredentials.forEach(c => {
    const idx = researchRaw.toLowerCase().indexOf(c.toLowerCase());
    if (idx > -1) {
      log(`  ✅ "${c}" — context: ...${researchRaw.substring(Math.max(0,idx-30), idx+80).replace(/\n/g,' ')}...`);
    } else {
      log(`  — "${c}" not mentioned`);
    }
  });
  log('\nServices found:');
  ['stump grinding','stump removal','tree removal','tree trimming'].forEach(s => {
    log('  ' + (researchRaw.toLowerCase().includes(s) ? '✅' : '—') + ' ' + s);
  });

  // ── Client Profile Extractor ────────────────────────────────────────────────
  const profileRaw = getText(nodes['Client Profile Extractor']?.[0]?.data?.main?.[0]?.[0]?.json);
  let profile = null;
  try { const m = profileRaw.match(/\{[\s\S]*\}/); if (m) profile = JSON.parse(m[0]); } catch(e) {}
  log(section('NODE 4 — CLIENT PROFILE EXTRACTOR OUTPUT'));
  if (profile) {
    log('Name: ' + profile.name);
    log('Location: ' + (profile.location || profile.service_area));
    log('Credentials: ' + JSON.stringify(profile.credentials));
    log('Services: ' + JSON.stringify(profile.services));
    log('USPs: ' + JSON.stringify(profile.usps || profile.unique_selling_points));
    log('Founded/Origin: ' + JSON.stringify(profile.founded || profile.origin || 'not present'));
  } else {
    log('Could not parse — raw (first 800):');
    log(profileRaw.substring(0, 800));
  }

  // ── Claims Extractor & Manifest Generator ───────────────────────────────────
  const claimsRaw = getText(nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json);
  let manifest = null;
  try { const m = claimsRaw.match(/\{[\s\S]*\}/); if (m) manifest = JSON.parse(m[0]); } catch(e) {}
  log(section('NODE 5 — CLAIMS EXTRACTOR & MANIFEST GENERATOR'));
  if (manifest) {
    log(`Claims (${manifest.claims?.length || 0} total):`);
    (manifest.claims || []).forEach((c, i) => log(`  [${i+1}] [${c.source}] "${c.claim}"`));
    log(`\nStatistics (${manifest.statistics?.length || 0}):`);
    (manifest.statistics || []).forEach((s, i) => log(`  [${i+1}] "${s.stat || JSON.stringify(s)}"`));
    log(`\ncredential_warnings (${manifest.credential_warnings?.length || 0}):`);
    (manifest.credential_warnings || []).forEach(w => {
      log(`  ⚠️  claim: "${w.claim || w.credential}"`);
      log(`      reason: ${w.reason}`);
      log(`      replacement: "${w.replacement}"`);
    });
    log(`\nforbidden_patterns: ${JSON.stringify(manifest.forbidden_patterns)}`);
  } else {
    log('Could not parse — raw (first 1000):');
    log(claimsRaw.substring(0, 1000));
  }

  // ── Pre-Draft Fact Checker ──────────────────────────────────────────────────
  const preFactRaw = getText(nodes['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json);
  log(section('NODE 6 — PRE-DRAFT FACT CHECKER OUTPUT'));
  log('Output length: ' + preFactRaw.length);
  log(preFactRaw.substring(0, 2000));

  // ── AI Agent Validation ─────────────────────────────────────────────────────
  const agentRaw = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  const agentIssues = agentRaw?.output?.validation_issues || agentRaw?.validation_issues || '';
  const agentPassed = agentRaw?.output?.passed ?? agentRaw?.passed;
  log(section('NODE 7 — AI AGENT VALIDATION'));
  log('Passed: ' + agentPassed);
  log('Issues:\n' + (agentIssues || 'none'));

  // ── Surgical Rewriter ───────────────────────────────────────────────────────
  const surgRaw = getText(nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json);
  log(section('NODE 8 — SURGICAL REWRITER OUTPUT'));
  log('Output length: ' + surgRaw.length);
  // Spot-check credential handling
  const credCtx = surgRaw.match(/.{0,80}(ISA|TCIA|Licensed|Insured|licensed|insured).{0,80}/gi) || [];
  log('Credential context:');
  credCtx.slice(0, 5).forEach(c => log('  >> ' + c.trim()));

  // ── CLAIM CROSS-REFERENCE AUDIT ─────────────────────────────────────────────
  const finalRaw = getText(nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json);
  log(section('CLAIM CROSS-REFERENCE AUDIT — Brief vs Final Article'));

  if (manifest?.claims) {
    log('Checking each manifest claim against final article:');
    manifest.claims.forEach((c, i) => {
      // Check if any key phrase from the claim exists in the article
      const words = c.claim.replace(/[^a-zA-Z0-9$%\-\.]/g, ' ').split(/\s+/).filter(w => w.length > 4);
      const keyWords = words.slice(0, 4).join('|');
      const regex = new RegExp(keyWords.replace(/\$/g, '\\$'), 'i');
      const inArticle = regex.test(finalText => finalText) || finalRaw.includes(c.claim.substring(0, 20));

      // More straightforward check — look for unique numeric or phrase fragments
      const numMatch = c.claim.match(/\$[\d,\-–]+|[\d]+[\-–][\d]+\s*%|\d+\s*(?:hours?|minutes?)/i);
      const textMatch = numMatch ? finalRaw.includes(numMatch[0]) : finalRaw.toLowerCase().includes(c.claim.toLowerCase().substring(0, 25));

      log(`  [${i+1}] [${c.source}] ${textMatch ? '✅' : '⚠️ NOT FOUND'} "${c.claim.substring(0, 80)}"`);
    });
  }

  fs.writeFileSync('scratch/exec3038_pipeline_audit.txt', lines.join('\n'), 'utf8');
  log('\nFull audit saved: scratch/exec3038_pipeline_audit.txt');
}

main().catch(console.error);
