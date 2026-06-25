const https = require('https');
const fs = require('fs');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

function extractText(json) {
  if (!json) return '';
  if (typeof json === 'string') return json;
  return json.text || json.content || json.message?.content ||
    json.choices?.[0]?.message?.content || JSON.stringify(json);
}

async function main() {
  const exec = await apiGet('/api/v1/executions/3004?includeData=true');
  const nodes = exec.data?.resultData?.runData || {};
  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('=== EXEC 3004 FULL AUDIT ===');
  log('Status: ' + exec.status);
  log('Started: ' + exec.startedAt + ' | Stopped: ' + exec.stoppedAt);
  log('Duration: ' + Math.round((new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000) + 's');
  log('All nodes: ' + Object.keys(nodes).join(', '));

  // Confirm it's the right article
  const wh = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
  log('\nArticle: ' + (wh?.title || wh?.article_title));
  log('Client: ' + wh?.client_name);

  // Pull text from every content-producing node
  const contentNodes = [
    'Parse Creative Brief (LLM)',
    'Pre-Draft Fact Checker',
    'Client Site Researcher',
    'Client Profile Extractor',
    'Claims Extractor & Manifest Generator',
    'Claude Draft (Claude Opus 3)1',
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    'Document Export Sanitization5',
    'Surgical Rewriter',
    'Document Export Sanitization4',
    'AI Agent1',
  ];

  // Broad hallucination flag list
  const flags = [
    'testimonial', 'founder', 'origin story', 'brand story',
    'started in', 'family business', 'established in', 'anecdote',
    'customer said', 'our story', 'we started', 'john merkel',
    'years of experience', 'since 19', 'since 20', 'proud to serve',
    'been serving', 'our team has been', 'satisfied customer',
    'one customer', 'a homeowner told', 'client told',
    '"', '\u201c',  // smart quote - often signals quoted testimonials
    'generations', 'legacy', 'family-owned since', 'founded by',
    'as our customer', 'review', 'said about', 'heard from'
  ];

  let totalFlagsFound = 0;
  const nodeTexts = {};

  for (const nodeName of contentNodes) {
    const nodeData = nodes[nodeName];
    if (!nodeData || !nodeData[0]) {
      log('\n[' + nodeName + '] — no data');
      continue;
    }

    const run = nodeData[0];
    const json = run.data?.main?.[0]?.[0]?.json;
    const text = extractText(json);
    nodeTexts[nodeName] = text;

    log('\n' + '─'.repeat(60));
    log('[' + nodeName + '] length: ' + (text?.length || 0) + ' chars | status: ' + run.executionStatus);

    if (!text) { log('  (empty output)'); continue; }

    // Check each flag
    let nodeFlags = 0;
    flags.forEach(f => {
      // Escape special regex chars
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = text.match(new RegExp('.{0,80}' + escaped + '.{0,80}', 'gi'));
      if (matches) {
        matches.forEach(m => {
          nodeFlags++;
          totalFlagsFound++;
          log('  !! FLAG [' + f + ']: ' + m.trim().substring(0, 200));
        });
      }
    });

    if (nodeFlags === 0) log('  ✓ Clean — no hallucination flags');
  }

  log('\n' + '='.repeat(60));
  log('TOTAL FLAGS FOUND ACROSS ALL NODES: ' + totalFlagsFound);

  // Save each stage to its own file for manual review
  for (const [name, text] of Object.entries(nodeTexts)) {
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    if (text && text.length > 100) {
      fs.writeFileSync('scratch/3004_' + safeName + '.txt', text, 'utf8');
    }
  }

  // Save full audit log
  fs.writeFileSync('scratch/exec3004_full_audit.txt', lines.join('\n'), 'utf8');
  log('\nAll stage files saved to scratch/3004_*.txt');
  log('Full audit: scratch/exec3004_full_audit.txt');
}

main().catch(console.error);
