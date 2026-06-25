const https = require('https');
const fs = require('fs');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

function getText(json) {
  if (!json) return '';
  if (typeof json === 'string') return json;
  return json.text || json.content || json.output ||
    json.message?.content || json.choices?.[0]?.message?.content ||
    JSON.stringify(json);
}

function flag(text, terms) {
  return terms.map(t => {
    const found = text.toLowerCase().includes(t.toLowerCase());
    return (found ? '⚠️  FOUND' : '✅ CLEAR') + ' | ' + t;
  });
}

async function main() {
  console.log('Fetching execution 3033...');
  const full = await apiGet('/api/v1/executions/3033?includeData=true');
  fs.writeFileSync('scratch/exec3033_full.json', JSON.stringify(full, null, 2));

  const nodes = full.data?.resultData?.runData || {};
  const allNodes = Object.keys(nodes);
  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('\n=== EXEC 3033 — STUMP ARTICLE (POST CREDENTIAL PATCH) ===');
  log('Status:   ' + full.status);
  log('Duration: ' + (full.stoppedAt && full.startedAt
    ? Math.round((new Date(full.stoppedAt) - new Date(full.startedAt)) / 1000) + 's' : 'N/A'));
  log('Nodes run: ' + allNodes.length);

  // ── 1. Claims Extractor ───────────────────────────────────────────────────
  log('\n── 1. CLAIMS EXTRACTOR ──');
  const claimsRaw = nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
  const claimsText = getText(claimsRaw);
  log('Output length: ' + claimsText.length);

  // Try to parse the JSON out of the claims output
  let claimsParsed = null;
  try {
    const jsonMatch = claimsText.match(/```json\s*([\s\S]*?)```/) || claimsText.match(/(\{[\s\S]*\})/);
    claimsParsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(claimsText);
  } catch(e) { /* raw text */ }

  if (claimsParsed?.credential_warnings?.length > 0) {
    log('✅ credential_warnings POPULATED (' + claimsParsed.credential_warnings.length + ' warning(s)):');
    claimsParsed.credential_warnings.forEach(w => {
      log('  FLAGGED: "' + w.claim + '"');
      log('  Reason:  ' + w.reason);
      log('  Replace: "' + (w.replacement || '[remove]') + '"');
    });
  } else if (claimsParsed?.credential_warnings?.length === 0) {
    log('✅ credential_warnings present but empty (no unverified credentials found)');
  } else {
    log('⚠️  credential_warnings field: ' + (claimsText.includes('credential_warnings') ? 'key present, value unclear' : 'NOT FOUND'));
    log('Raw claims output (first 1200):');
    log(claimsText.substring(0, 1200));
  }

  // ── 2. AI Agent ───────────────────────────────────────────────────────────
  log('\n── 2. AI AGENT VALIDATION ──');
  const agentRaw = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  if (agentRaw) {
    const passed  = agentRaw.output?.passed || agentRaw.passed || 'N/A';
    const issues  = agentRaw.output?.validation_issues || agentRaw.validation_issues || '';
    log('Passed: ' + passed);
    const isaInIssues  = issues.toLowerCase().includes('isa');
    const tciaInIssues = issues.toLowerCase().includes('tcia');
    log('ISA still flagged as missing: ' + (isaInIssues ? '⚠️  YES' : '✅ NO — skipped correctly'));
    log('TCIA still flagged as missing: ' + (tciaInIssues ? '⚠️  YES' : '✅ NO'));
    if (issues) log('Issues (first 600):\n' + issues.substring(0, 600));
  } else {
    log('AI Agent node not found in run data');
  }

  // ── 3. Surgical Rewriter ─────────────────────────────────────────────────
  log('\n── 3. SURGICAL REWRITER ──');
  const surgRaw = nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json;
  const surgText = getText(surgRaw);
  log('Output length: ' + surgText.length);
  if (surgText.length > 10) {
    flag(surgText, ['ISA-certified', 'ISA/TCIA', 'TCIA credentials', 'TCIA membership', 'Chris Merkel', 'founded in 2021'])
      .forEach(f => log('  ' + f));
    const isaCtx = surgText.match(/.{0,100}(ISA|TCIA).{0,100}/gi);
    if (isaCtx) { log('\n  ISA/TCIA context in Surgical output:'); isaCtx.forEach(m => log('    >> ' + m.trim())); }
  }

  // ── 4. Final Article ─────────────────────────────────────────────────────
  log('\n── 4. FINAL ARTICLE ──');
  const sanitRaw = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
  const finalText = getText(sanitRaw);
  log('Final text length: ' + finalText.length);
  if (finalText.length > 10) {
    flag(finalText, ['ISA-certified', 'ISA/TCIA', 'TCIA credentials', 'TCIA membership', 'Chris Merkel', 'founded in 2021', 'Fully Licensed And Insured', 'Fully Licensed'])
      .forEach(f => log('  ' + f));
    const credCtx = finalText.match(/.{0,100}(ISA|TCIA|Licensed|licensed|insured|Insured).{0,100}/gi);
    if (credCtx) { log('\n  Credential context in final article:'); credCtx.slice(0, 6).forEach(m => log('    >> ' + m.trim())); }
  } else {
    log('Final article not reached — last node: ' + allNodes[allNodes.length - 1]);
    const errNode = nodes[allNodes[allNodes.length - 1]]?.[0];
    if (errNode?.error) log('Error: ' + JSON.stringify(errNode.error, null, 2).substring(0, 400));
  }

  log('\n── 5. PASS/FAIL SUMMARY ──');
  const finalHasISA      = finalText.includes('ISA-certified');
  const finalHasLicensed = finalText.toLowerCase().includes('licensed and insured');
  const claimsHasWarning = claimsText.includes('credential_warnings');
  log('credential_warnings in Claims output: ' + (claimsHasWarning ? '✅' : '❌'));
  log('ISA-certified in final article:        ' + (finalHasISA ? '❌ STILL PRESENT' : '✅ REMOVED'));
  log('Licensed & Insured in final article:   ' + (finalHasLicensed ? '✅ PRESENT' : '⚠️  NOT FOUND'));
  log('Exec status:                           ' + (full.status === 'success' ? '✅ SUCCESS' : '❌ ' + full.status));

  fs.writeFileSync('scratch/exec3033_analysis.txt', lines.join('\n'), 'utf8');
  log('\nSaved: scratch/exec3033_analysis.txt');
}

main().catch(console.error);
