const https = require('https');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://obswcosfipqjvklqlnrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ'
);

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

async function main() {
  const lines = [];
  const log = (...args) => { const s = args.join(' '); console.log(s); lines.push(s); };

  // ── 1. Supabase row ──────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('content_requests')
    .select('*')
    .eq('id', '5ba270de-ca24-4d53-828e-d97be1029f17')
    .single();
  if (error) { log('Supabase error:', error.message); return; }

  log('=== SUPABASE ROW ===');
  log('status:', data.status);
  log('updated_at:', data.updated_at);
  log('webhook_response (Drive):', data.webhook_response);
  log('n8n_execution_id:', data.n8n_execution_id);
  log('verified_claims is null?', data.verified_claims === null);
  if (data.verified_claims) {
    log('verified_claims:', JSON.stringify(data.verified_claims, null, 2).substring(0, 2000));
  }
  log('raw_content length:', data.raw_content?.length || 0, 'chars');

  if (data.raw_content) {
    const c = data.raw_content;
    const metaTitle = c.match(/Meta Title[:\*]*\s*(.+)/i)?.[1]?.trim();
    const metaDesc  = c.match(/Meta Desc[ription]*[:\*]*\s*(.+)/i)?.[1]?.trim();
    const h1        = c.match(/^#\s+(.+)/m)?.[1]?.trim();
    const h2s       = (c.match(/^##\s+.+/gm) || []);
    const wordCount = c.split(/\s+/).length;
    log('\n--- ARTICLE SNAPSHOT ---');
    log('Meta Title:', metaTitle);
    log('Meta Desc:', metaDesc?.substring(0, 160));
    log('H1:', h1);
    log('H2 count:', h2s.length);
    h2s.forEach((h, i) => log('  H2[' + (i+1) + ']:', h.trim()));
    log('~Word count:', wordCount);
    log('\n--- FULL CONTENT ---');
    log(c);
  }

  // ── 2. n8n exec 3029 ────────────────────────────────────────────────────
  log('\n\n=== n8n EXECUTION 3029 ===');
  const exec = await apiGet('/api/v1/executions/3029?includeData=true');
  log('Status:', exec.status);
  const dur = exec.stoppedAt ? Math.round((new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000) + 's' : 'N/A';
  log('Duration:', dur);

  const nodes = exec.data?.resultData?.runData || {};
  log('Nodes executed:', Object.keys(nodes).join(', '));

  // Claims Extractor output
  log('\n--- CLAIMS EXTRACTOR & MANIFEST GENERATOR ---');
  const ce = nodes['Claims Extractor & Manifest Generator'];
  if (ce && ce[0]) {
    const out = ce[0].data?.main?.[0]?.[0]?.json;
    log(JSON.stringify(out, null, 2)?.substring(0, 3000));
  } else {
    log('No output found');
  }

  // Surgical Rewriter output
  log('\n--- SURGICAL REWRITER ---');
  const sr = nodes['Surgical Rewriter'];
  if (sr && sr[0]) {
    const out = sr[0].data?.main?.[0]?.[0]?.json;
    log(JSON.stringify(out, null, 2)?.substring(0, 1500));
  } else {
    log('Not executed or no output');
  }

  // AI Agent / Scoring
  log('\n--- AI AGENT (QUALITY CHECK) ---');
  const agent = nodes['AI Agent1'];
  if (agent && agent[0]) {
    const out = agent[0].data?.main?.[0]?.[0]?.json;
    log(JSON.stringify(out, null, 2)?.substring(0, 1000));
  } else {
    log('Not executed or no output');
  }

  // Save to file
  fs.writeFileSync('scratch/run3029_full.txt', lines.join('\n'), 'utf8');
  log('\nSaved to scratch/run3029_full.txt');
}
main().catch(console.error);
