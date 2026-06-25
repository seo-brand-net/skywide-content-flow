/**
 * Thorough 3-article audit:
 * For each of execs 3061, 3062, 3063 check:
 *  1. Final article word count & structure
 *  2. Every required claim from the manifest — present or missing
 *  3. Pre-Draft Fact Checker verdicts summary (VERIFIED vs REWRITE)
 *  4. AI Agent validation failures before Surgical Rewriter
 *  5. Surgical Rewriter output — did it fix them?
 *  6. Credential warnings — resolved or still present?
 *  7. FAQ section — matches brief exactly?
 */
const https = require('https');
const fs    = require('fs');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';

function apiGet(path) {
  return new Promise((res, rej) => {
    const o = { hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: { 'X-N8N-API-KEY': KEY, 'Accept': 'application/json' }
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
  return j.text || j.output || j.content || j.message?.content || JSON.stringify(j).substring(0, 200);
}

function getJSON(j) {
  if (!j) return null;
  if (typeof j === 'object' && !Array.isArray(j)) return j;
  if (typeof j === 'string') {
    try { return JSON.parse(j); } catch(e) { return null; }
  }
  return null;
}

function parseManifest(raw) {
  if (!raw) return null;
  const j = getJSON(raw);
  if (j?.claims) return j;
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const m = str.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch(e) {} }
  return null;
}

async function auditExecution(execId) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`AUDITING EXECUTION ${execId}`);
  console.log('='.repeat(70));

  const full = await apiGet(`/api/v1/executions/${execId}?includeData=true`);
  const nodes = full.data?.resultData?.runData || {};
  const status = full.data?.status || full.status;

  // Article title / client
  const webhookBody = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
  console.log(`\nStatus:  ${status}`);
  console.log(`Client:  ${webhookBody?.client_name || 'unknown'}`);
  console.log(`Title:   ${webhookBody?.title || 'unknown'}`);

  // ── 1. Claims Manifest ───────────────────────────────────────────────────
  const manifestRaw = nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
  const manifest = parseManifest(manifestRaw);
  const claims = manifest?.claims || [];
  const credWarnings = manifest?.credential_warnings || [];
  console.log(`\n── CLAIMS MANIFEST ──`);
  console.log(`  Total claims: ${claims.length}  |  Credential warnings: ${credWarnings.length}`);

  // ── 2. Pre-Draft Fact Checker verdicts ───────────────────────────────────
  const preFactRaw = getText(nodes['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json);
  const verdicts     = preFactRaw.match(/\*\*Verdict:\*\*[^\n]{0,300}/g) || [];
  const verified     = verdicts.filter(v => v.includes('✅ VERIFIED'));
  const rewrites     = verdicts.filter(v => v.includes('⚠️ REWRITE') || v.includes('REWRITE'));
  const verifyOffline = verdicts.filter(v => v.includes('VERIFY OFFLINE'));
  console.log(`\n── PRE-DRAFT FACT CHECKER ──`);
  console.log(`  ✅ VERIFIED: ${verified.length}  |  ⚠️ REWRITE: ${rewrites.length}  |  🔍 VERIFY OFFLINE: ${verifyOffline.length}`);
  rewrites.forEach(r => console.log(`    REWRITE: ${r.replace(/\*\*/g,'').substring(0,120)}`));

  // ── 3. AI Agent validation issues ───────────────────────────────────────
  const agentRaw = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  const issues   = agentRaw?.output?.validation_issues || agentRaw?.validation_issues || getText(agentRaw);
  console.log(`\n── AI AGENT VALIDATION ISSUES ──`);
  const issueLines = issues.split('\n').filter(l => l.includes('missing') || l.includes('Missing') || l.includes('fail') || l.includes('FAIL'));
  if (issueLines.length === 0) {
    console.log('  ✅ No claim failures detected');
  } else {
    issueLines.forEach(l => console.log(`  ❌ ${l.trim().substring(0, 120)}`));
  }

  // ── 4. Final article — claims check ─────────────────────────────────────
  const finalRaw  = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
  const finalText = getText(finalRaw);
  const surgRaw   = nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json;
  const surgText  = getText(surgRaw);

  console.log(`\n── FINAL ARTICLE STATS ──`);
  console.log(`  Surgical Rewriter output length: ${surgText.length} chars`);
  console.log(`  Final sanitized output length:   ${finalText.length} chars`);
  console.log(`  Approx word count: ~${Math.round(finalText.split(/\s+/).length)}`);

  // Check each manifest claim
  console.log(`\n── CLAIMS PRESENCE IN FINAL ARTICLE ──`);
  let present = 0, missing = 0;
  claims.forEach(c => {
    // Check first ~40 chars of claim
    const probe = c.claim.substring(0, 35).toLowerCase();
    const inFinal = finalText.toLowerCase().includes(probe.toLowerCase()) ||
                    surgText.toLowerCase().includes(probe.toLowerCase());
    const tick = inFinal ? '✅' : '❌';
    if (inFinal) present++; else missing++;
    console.log(`  ${tick} [${c.source}] ${c.claim.substring(0, 80)}`);
  });
  console.log(`\n  Present: ${present}/${claims.length} | Missing: ${missing}/${claims.length}`);

  // ── 5. Credential warnings resolved? ─────────────────────────────────────
  console.log(`\n── CREDENTIAL WARNINGS RESOLVED? ──`);
  if (credWarnings.length === 0) {
    console.log('  ✅ No credential warnings flagged');
  } else {
    credWarnings.forEach(w => {
      const claim  = w.claim || w.credential || '';
      const repl   = w.replacement || 'Fully Licensed And Insured';
      const stillPresent = finalText.toLowerCase().includes(claim.toLowerCase().substring(0, 20));
      const replaced     = finalText.toLowerCase().includes(repl.toLowerCase().substring(0, 20));
      console.log(`  Original: "${claim.substring(0, 50)}"`);
      console.log(`  Replacement: "${repl.substring(0, 50)}"`);
      console.log(`  Original still in article: ${stillPresent ? '⚠️ YES' : '✅ NO'}`);
      console.log(`  Replacement present:        ${replaced ? '✅ YES' : '❌ NO'}`);
    });
  }

  // ── 6. FAQ check ─────────────────────────────────────────────────────────
  const briefRaw = nodes['Parse Creative Brief (LLM)']?.[0]?.data?.main?.[0]?.[0]?.json;
  const briefText = getText(briefRaw);
  const briefM = briefText.match(/\{[\s\S]*\}/);
  let briefFAQs = [];
  if (briefM) {
    try {
      const parsed = JSON.parse(briefM[0]);
      briefFAQs = parsed.faqs || [];
    } catch(e) {}
  }
  console.log(`\n── FAQ SECTION ──`);
  console.log(`  Brief has ${briefFAQs.length} required FAQ questions`);
  
  // Check FAQ section in final article
  const faqMatch = finalText.match(/frequently asked questions?[\s\S]{0,3000}/i) || 
                   finalText.match(/## FAQ[\s\S]{0,3000}/i) ||
                   finalText.match(/## Common Questions[\s\S]{0,3000}/i);
  const faqSection = faqMatch ? faqMatch[0].substring(0, 2000) : '';
  
  if (faqSection) {
    console.log(`  FAQ section found (${faqSection.length} chars)`);
    briefFAQs.forEach((q, i) => {
      const qProbe = q.substring(0, 25).toLowerCase();
      const inFAQ = faqSection.toLowerCase().includes(qProbe);
      console.log(`  ${inFAQ ? '✅' : '❌'} Brief Q${i+1}: ${q.substring(0, 70)}`);
    });
  } else {
    console.log('  ⚠️  FAQ section not found in final article');
  }

  // ── 7. Spurious dollar amounts check ─────────────────────────────────────
  const dollarMatches = finalText.match(/\$\d[\d,\.]+/g) || [];
  console.log(`\n── PRICE GUARD ──`);
  console.log(`  Dollar amounts in final article: ${dollarMatches.length}`);
  if (dollarMatches.length > 0) console.log(`  Values: ${dollarMatches.join(', ')}`);

  return { execId, status, client: webhookBody?.client_name, present, missing, totalClaims: claims.length };
}

async function main() {
  const execIds = [3061, 3062, 3063];
  const summaries = [];

  for (const id of execIds) {
    try {
      const s = await auditExecution(id);
      summaries.push(s);
    } catch(e) {
      console.log(`\nERROR auditing ${id}: ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY TABLE');
  console.log('='.repeat(70));
  console.log('Exec  | Client                    | Status  | Claims Present');
  console.log('------|---------------------------|---------|---------------');
  summaries.forEach(s => {
    const client = (s.client || '').padEnd(25).substring(0, 25);
    const status = (s.status || '').padEnd(7);
    console.log(`${s.execId}  | ${client} | ${status} | ${s.present}/${s.totalClaims}`);
  });

  fs.writeFileSync('scratch/three_article_audit.json', JSON.stringify(summaries, null, 2));
  console.log('\nFull summary saved to scratch/three_article_audit.json');
}

main().catch(console.error);
