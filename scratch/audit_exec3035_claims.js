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
  return j.text || j.content || j.output || j.message?.content || JSON.stringify(j);
}

async function main() {
  const full = await apiGet('/api/v1/executions/3035?includeData=true');
  const nodes = full.data?.resultData?.runData || {};

  // ── Extract all data sources ──────────────────────────────────────────────
  const claimsRaw   = getText(nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json);
  const researchRaw = getText(nodes['Client Site Researcher']?.[0]?.data?.main?.[0]?.[0]?.json);
  const profileRaw  = getText(nodes['Client Profile Extractor']?.[0]?.data?.main?.[0]?.[0]?.json);
  const briefRaw    = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body?.creative_brief || '';
  const finalRaw    = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
  const finalText   = getText(finalRaw);
  const preFactRaw  = getText(nodes['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json);

  // Parse claims manifest
  let manifest = null;
  try {
    const m = claimsRaw.match(/\{[\s\S]*\}/);
    if (m) manifest = JSON.parse(m[0]);
  } catch(e) {}

  // Save full article for review
  fs.writeFileSync('scratch/exec3035_final_article.txt', finalText, 'utf8');
  fs.writeFileSync('scratch/exec3035_brief.txt', briefRaw, 'utf8');

  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('=== EXEC 3035 — FULL CLAIMS AUDIT ===\n');

  // ── 1. Specific quantitative claims ──────────────────────────────────────
  log('── 1. QUANTITATIVE CLAIMS IN FINAL ARTICLE ──');
  const quantClaims = [
    { claim: '$75-400 / $75 to $400', desc: 'Grinding cost range', inBrief: true },
    { claim: '2-3 times', desc: 'Removal costs vs grinding', inBrief: true },
    { claim: '30 minutes', desc: 'Grinding time low end', inBrief: true },
    { claim: '2 hours', desc: 'Grinding time high end', inBrief: true },
    { claim: '3-8 hours', desc: 'Removal timeframe', inBrief: true },
    { claim: '6-12 inches', desc: 'Depth of grinding below ground', inBrief: true },
    { claim: '80-90%', desc: 'Root system remaining after grinding', inBrief: true },
    { claim: '$100-250', desc: 'DIY rental cost at Home Depot', inBrief: true },
    { claim: '12 inches', desc: 'Replanting depth', inBrief: false },
  ];

  for (const q of quantClaims) {
    const inArticle = finalText.includes(q.claim) || 
      (q.claim.includes('/') && q.claim.split('/').some(v => finalText.includes(v.trim())));
    const inBriefText = briefRaw.includes(q.claim.split('/')[0].trim());
    const inResearch  = researchRaw.includes(q.claim.split('/')[0].trim());
    const inPreFact   = preFactRaw.includes(q.claim.split('/')[0].trim());

    const status = !inArticle ? '—   NOT IN ARTICLE' :
      inBriefText ? '✅  In article + brief' :
      inResearch  ? '🌐  In article + web research' :
      inPreFact   ? '🔍  In article + pre-fact check' :
      '⚠️  In article — source unverified';

    log(`  [${q.desc}] "${q.claim}"`);
    log(`    ${status}`);
  }

  // ── 2. Client-specific claims ─────────────────────────────────────────────
  log('\n── 2. CLIENT-SPECIFIC CLAIMS ──');
  const clientClaims = [
    { text: "Merkel's Tree Service", desc: 'Client name used' },
    { text: 'Berks County', desc: 'Service area' },
    { text: 'Fully Licensed And Insured', desc: 'Verified credential (replacement)' },
    { text: 'ISA-certified', desc: 'Unverified credential (should be absent)' },
    { text: 'ISA/TCIA', desc: 'Combined cred claim (should be absent)' },
    { text: 'Chris Merkel', desc: 'Founder name (should be absent)' },
    { text: 'founded in 2021', desc: 'Origin story (should be absent)' },
    { text: 'stump grinding', desc: 'Verified service' },
    { text: 'Tree Removal', desc: 'Verified service' },
  ];

  for (const c of clientClaims) {
    const present = finalText.toLowerCase().includes(c.text.toLowerCase());
    const shouldBeAbsent = ['ISA-certified','ISA/TCIA','Chris Merkel','founded in 2021'].includes(c.text);
    const icon = shouldBeAbsent
      ? (present ? '❌ PRESENT (should be gone)' : '✅ ABSENT (correctly removed)')
      : (present ? '✅ PRESENT' : '⚠️  ABSENT');
    log(`  [${c.desc}] ${icon}`);
  }

  // ── 3. Pre-Draft Fact Checker flags ──────────────────────────────────────
  log('\n── 3. PRE-DRAFT FACT CHECKER — what did it flag? ──');
  const removeMatches = preFactRaw.match(/REMOVE FROM ARTICLE[\s\S]{0,300}/gi) || [];
  const warningMatches = preFactRaw.match(/⚠️[\s\S]{0,200}/g) || [];
  if (removeMatches.length > 0) {
    log('  Claims flagged for REMOVAL by pre-fact checker:');
    removeMatches.slice(0, 5).forEach(m => log('    >> ' + m.replace(/\n/g, ' ').substring(0, 150)));
  } else {
    log('  No explicit REMOVE flags found');
  }

  // ── 4. Check for any new unverified specifics in the article ─────────────
  log('\n── 4. UNVERIFIED SPECIFICS SCAN ──');
  // Look for percentages, dollar amounts, time ranges not in the brief
  const articleNumbers = finalText.match(/\d+[\-–]\d+\s*%|\$\d+[\-–]\d+|\d+\s*(?:hours?|minutes?|days?)/gi) || [];
  log('  Numeric claims found in article:');
  articleNumbers.forEach(n => {
    const inBrief    = briefRaw.includes(n) || briefRaw.toLowerCase().includes(n.toLowerCase());
    const inResearch = researchRaw.toLowerCase().includes(n.toLowerCase());
    log('    "' + n + '" → brief: ' + (inBrief ? '✅' : '—') + ' | research: ' + (inResearch ? '✅' : '—'));
  });

  // ── 5. FAQ compliance ─────────────────────────────────────────────────────
  log('\n── 5. FAQ COMPLIANCE ──');
  const requiredFAQs = [
    'Which is better',
    'Does stump grinding completely remove',
    'Is stump grinding cheaper',
    'How long does it take',
    'Do I need permits',
  ];
  const faqSection = finalText.match(/Frequently Asked Questions[\s\S]*/i)?.[0] || '';
  requiredFAQs.forEach(q => {
    log('  "' + q + '": ' + (faqSection.toLowerCase().includes(q.toLowerCase()) ? '✅' : '❌ MISSING'));
  });

  fs.writeFileSync('scratch/exec3035_claims_audit.txt', lines.join('\n'), 'utf8');
  log('\nFull article saved: scratch/exec3035_final_article.txt');
  log('Audit saved: scratch/exec3035_claims_audit.txt');
}

main().catch(console.error);
