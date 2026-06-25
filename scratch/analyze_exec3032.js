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
  console.log('Fetching execution 3032...');
  const full = await apiGet('/api/v1/executions/3032?includeData=true');
  fs.writeFileSync('scratch/exec3032_full.json', JSON.stringify(full, null, 2));

  const nodes = full.data?.resultData?.runData || {};
  const allNodes = Object.keys(nodes);
  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('\n=== EXEC 3032 — STUMP ARTICLE TEST RUN ===');
  log('Status: ' + full.status);
  log('Duration: ' + (full.stoppedAt && full.startedAt
    ? Math.round((new Date(full.stoppedAt) - new Date(full.startedAt)) / 1000) + 's' : 'N/A'));
  log('Total nodes run: ' + allNodes.length);
  log('');

  // ── Claims Extractor ─────────────────────────────────────────────
  log('── 1. CLAIMS EXTRACTOR OUTPUT ──');
  const claimsRaw = nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
  const claimsText = getText(claimsRaw);
  log('Output length: ' + claimsText.length);
  if (claimsText.length > 10) {
    log(claimsText.substring(0, 1200));
    log('Has verified_claims: ' + claimsText.includes('verified_claims'));
    log('Has credential_warnings: ' + claimsText.includes('credential_warnings'));
    log('Has ISA: ' + claimsText.includes('ISA'));
    log('Has TCIA: ' + claimsText.includes('TCIA'));
    log('Has claims array: ' + claimsText.includes('"claims"'));
  } else {
    log('⚠️  Claims Extractor output is empty or very short');
  }

  // ── Claude Draft ─────────────────────────────────────────────────
  log('\n── 2. CLAUDE DRAFT — Hallucination Check ──');
  const draftRaw = nodes['Claude Draft (Claude Opus 3)1']?.[0]?.data?.main?.[0]?.[0]?.json;
  const draftText = getText(draftRaw);
  log('Draft length: ' + draftText.length);
  if (draftText.length > 10) {
    const draftFlags = flag(draftText, [
      'Chris Merkel', 'founded in 2021', 'ISA-certified', 'ISA/TCIA',
      'TCIA credentials', 'TCIA membership', 'testimonial', 'founded by'
    ]);
    draftFlags.forEach(f => log('  ' + f));
    // Show context around ISA mentions
    const isaMatches = draftText.match(/.{0,80}ISA.{0,80}/gi);
    if (isaMatches) {
      log('\n  ISA context in draft:');
      isaMatches.forEach(m => log('    >> ' + m.trim()));
    }
  } else {
    log('Draft node not reached or empty');
  }

  // ── Final Article ─────────────────────────────────────────────────
  log('\n── 3. FINAL ARTICLE — Hallucination Check ──');
  const sanitNode = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
  const surgNode  = nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json;
  const finalText = getText(sanitNode) || getText(surgNode);
  log('Final text length: ' + finalText.length);
  if (finalText.length > 10) {
    const finalFlags = flag(finalText, [
      'Chris Merkel', 'founded in 2021', 'ISA-certified', 'ISA/TCIA',
      'TCIA credentials', 'TCIA membership', 'founded by'
    ]);
    finalFlags.forEach(f => log('  ' + f));
    // Show TCIA context
    const tciaMatches = finalText.match(/.{0,100}(ISA|TCIA).{0,100}/gi);
    if (tciaMatches) {
      log('\n  ISA/TCIA context in final:');
      tciaMatches.forEach(m => log('    >> ' + m.trim()));
    }
  } else {
    log('Final article not reached — pipeline may have errored before completion');
    // Check which was the last node
    log('Last node reached: ' + allNodes[allNodes.length - 1]);
    const lastErr = nodes[allNodes[allNodes.length - 1]]?.[0]?.error;
    if (lastErr) log('Last node error: ' + JSON.stringify(lastErr, null, 2).substring(0, 400));
  }

  // ── AI Agent validation ───────────────────────────────────────────
  log('\n── 4. AI AGENT VALIDATION ISSUES ──');
  const agentRaw = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  if (agentRaw) {
    const agentText = getText(agentRaw);
    const passed = agentRaw.output?.passed || agentRaw.passed;
    const issues = agentRaw.output?.validation_issues || agentRaw.validation_issues || '';
    log('Passed: ' + passed);
    if (issues) {
      const isaInIssues = issues.toLowerCase().includes('isa');
      const tciaInIssues = issues.toLowerCase().includes('tcia');
      log('ISA in validation issues: ' + (isaInIssues ? '⚠️  YES' : '✅ NO'));
      log('TCIA in validation issues: ' + (tciaInIssues ? '⚠️  YES' : '✅ NO'));
      log('Issues (first 600): ' + issues.substring(0, 600));
    }
  } else {
    log('AI Agent not reached');
  }

  log('\n── 5. NODE FLOW SUMMARY ──');
  log('Nodes executed: ' + allNodes.join(' → ').substring(0, 300));

  fs.writeFileSync('scratch/exec3032_analysis.txt', lines.join('\n'), 'utf8');
  log('\nSaved to scratch/exec3032_analysis.txt');
}

main().catch(console.error);
