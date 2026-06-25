const https = require('https');
const fs = require('fs');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM', 'Accept': 'application/json' }
    };
    const req = https.request(o, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

function extractText(json) {
  if (!json) return '';
  if (typeof json === 'string') return json;
  return json.text || json.content || json.message?.content || JSON.stringify(json);
}

async function checkExec(id) {
  const exec = await apiGet(`/api/v1/executions/${id}?includeData=true`);
  const nodes = exec.data?.resultData?.runData || {};
  const dur = exec.stoppedAt
    ? Math.round((new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000) + 's'
    : 'running';

  // Confirm article
  const wh = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
  const isStump = (wh?.title || wh?.article_title || '').toLowerCase().includes('stump')
               || (wh?.client_name || '').toLowerCase().includes('merkel');

  const hallucFlags = ['Chris Merkel', 'founded in 2021', 'testimonial', 'origin story',
                       'brand story', 'anecdote', 'customer said', 'one homeowner',
                       'years of', 'family-owned', 'proud to'];

  const nodeNames = Object.keys(nodes);
  const createdDoc  = nodeNames.includes('Create a document17');
  const updatedDoc  = nodeNames.includes('Update a document17');
  const surRewriter = nodeNames.includes('Surgical Rewriter');

  let findings = [];
  // Check every node's output for hallucination content
  nodeNames.forEach(name => {
    const runs = nodes[name] || [];
    runs.forEach(run => {
      const json = run.data?.main?.[0]?.[0]?.json;
      const text = extractText(json);
      hallucFlags.forEach(f => {
        if (text && text.includes(f)) {
          findings.push(`  [${name}] contains "${f}"`);
        }
      });
    });
  });

  return {
    id, status: exec.status, dur, isStump,
    article: wh?.title || wh?.article_title || '—',
    client: wh?.client_name || '—',
    nodeCount: nodeNames.length,
    createdDoc, updatedDoc, surRewriter,
    lastNodes: nodeNames.slice(-5).join(', '),
    findings
  };
}

async function main() {
  // Check all intermediate executions between 2996 (failed) and 3004 (final success)
  // plus 3004 itself for completeness
  const idsToCheck = [2999, 3000, 3001, 3002, 3003, 3004];
  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('=== INTERMEDIATE EXECUTION AUDIT (2996→3004) ===\n');

  for (const id of idsToCheck) {
    try {
      const r = await checkExec(id);
      log(`── EXEC ${r.id} | ${r.status} | ${r.dur} | article: "${r.article.substring(0, 50)}" | client: ${r.client}`);
      log(`   Nodes run: ${r.nodeCount} | Create Doc: ${r.createdDoc} | Update Doc: ${r.updatedDoc} | Surgical Rewriter: ${r.surRewriter}`);
      log(`   Last 5 nodes: ${r.lastNodes}`);
      if (r.findings.length > 0) {
        log(`   !! HALLUCINATION FLAGS (${r.findings.length}):`);
        r.findings.forEach(f => log(f));
      } else {
        log(`   ✓ No hallucination flags found`);
      }
      log('');
    } catch(e) {
      log(`EXEC ${id}: ERROR - ${e.message}\n`);
    }
  }

  // Now specifically dump the full Claude Draft + EEAT output from any run that
  // created a Google Drive document WITHOUT a Surgical Rewriter pass
  log('\n=== DEEP DIVE: Runs that wrote to Drive WITHOUT Surgical Rewriter ===');
  for (const id of idsToCheck) {
    try {
      const exec = await apiGet(`/api/v1/executions/${id}?includeData=true`);
      const nodes = exec.data?.resultData?.runData || {};
      const nodeNames = Object.keys(nodes);
      const createdDoc  = nodeNames.includes('Create a document17');
      const surRewriter = nodeNames.includes('Surgical Rewriter');

      if (createdDoc && !surRewriter) {
        log(`\nEXEC ${id} — Created Drive doc WITHOUT Surgical Rewriter pass!`);

        // What was the content written to Drive?
        const de4 = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
        const de5 = nodes['Document Export Sanitization5']?.[0]?.data?.main?.[0]?.[0]?.json;
        const eeat = nodes['Claude EEAT Injection1']?.[0]?.data?.main?.[0]?.[0]?.json;
        const humanise = nodes['Claude Humanised Readability Rewrite']?.[0]?.data?.main?.[0]?.[0]?.json;

        const candidates = { 'Doc Export 4': de4, 'Doc Export 5': de5, 'EEAT': eeat, 'Humanise': humanise };
        for (const [name, json] of Object.entries(candidates)) {
          if (!json) continue;
          const text = extractText(json);
          const hasHalluc = ['Chris Merkel','founded in 2021','testimonial','brand story','anecdote'].some(f => text?.includes(f));
          log(`  ${name} (${text?.length} chars) | has_hallucination: ${hasHalluc}`);
          if (hasHalluc) {
            const matches = text.match(/.{0,120}(Chris Merkel|founded in 2021|testimonial|brand story|anecdote).{0,120}/gi);
            matches?.forEach(m => log(`    >> ${m.trim().substring(0, 250)}`));
          }
        }

        // Save the doc that went to Drive
        const driveContent = de4 || de5;
        if (driveContent) {
          const text = extractText(driveContent);
          fs.writeFileSync(`scratch/exec${id}_drive_content.txt`, text || '', 'utf8');
          log(`  Drive content saved: scratch/exec${id}_drive_content.txt`);
        }
      }
    } catch(e) {
      log(`EXEC ${id} deep dive error: ${e.message}`);
    }
  }

  fs.writeFileSync('scratch/intermediate_exec_audit.txt', lines.join('\n'), 'utf8');
  log('\nFull audit saved: scratch/intermediate_exec_audit.txt');
}

main().catch(console.error);
