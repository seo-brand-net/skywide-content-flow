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
  // First get the latest exec ID
  const list = await apiGet('/api/v1/executions?workflowId=t3LNiuZIghvobde3&limit=3');
  const latest = (list.data || [])[0];
  console.log('Latest executions:');
  (list.data || []).forEach(e => console.log(' ', e.id, '|', e.status, '|', e.startedAt));

  const execId = latest?.id;
  if (!execId) { console.error('No executions found'); return; }
  console.log('\nChecking exec', execId, '...\n');

  const full = await apiGet(`/api/v1/executions/${execId}?includeData=true`);
  const nodes = full.data?.resultData?.runData || {};
  const dur = full.stoppedAt && full.startedAt
    ? Math.round((new Date(full.stoppedAt) - new Date(full.startedAt)) / 1000) + 's' : 'N/A';

  console.log('Status:    ', full.status);
  console.log('Duration:  ', dur);
  console.log('Nodes run: ', Object.keys(nodes).length);

  const brief = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body?.creative_brief || '';

  // ── 1. Parse Creative Brief — did it extract FAQs? ───────────────────────
  const parsedRaw = getText(nodes['Parse Creative Brief (LLM)']?.[0]?.data?.main?.[0]?.[0]?.json);
  let parsedBrief = null;
  try { const m = parsedRaw.match(/\{[\s\S]*\}/); if (m) parsedBrief = JSON.parse(m[0]); } catch(e) {}
  console.log('\n── 1. PARSE CREATIVE BRIEF ──');
  console.log('faqs extracted:', parsedBrief?.faqs?.length > 0
    ? '✅ ' + parsedBrief.faqs.length + ' question(s):\n  ' + parsedBrief.faqs.join('\n  ')
    : '❌ None extracted');

  // ── 2. Claims Extractor ──────────────────────────────────────────────────
  const claimsRaw = getText(nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json);
  let manifest = null;
  try { const m = claimsRaw.match(/\{[\s\S]*\}/); if (m) manifest = JSON.parse(m[0]); } catch(e) {}
  console.log('\n── 2. CLAIMS EXTRACTOR ──');
  console.log('Claims count:        ', manifest?.claims?.length ?? '?');
  console.log('credential_warnings: ', manifest?.credential_warnings?.length > 0
    ? '⚠️  ' + manifest.credential_warnings.map(w => (w.claim || w.credential)).join(', ')
    : '✅ none');

  // ── 3. Final article ─────────────────────────────────────────────────────
  const finalRaw = nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json;
  const finalText = getText(finalRaw);
  fs.writeFileSync('scratch/exec3038_final_article.txt', finalText, 'utf8');
  console.log('\n── 3. FINAL ARTICLE ──');
  console.log('Length:', finalText.length);

  // Credential flags
  const credFlags = [
    ['ISA-certified',       false],
    ['ISA/TCIA',            false],
    ['Chris Merkel',        false],
    ['founded in 2021',     false],
    ['Fully Licensed',      true ],
  ];
  credFlags.forEach(([term, shouldExist]) => {
    const found = finalText.toLowerCase().includes(term.toLowerCase());
    const ok = shouldExist ? found : !found;
    console.log(`  ${ok ? '✅' : '❌'} ${term}: ${found ? 'PRESENT' : 'ABSENT'}`);
  });

  // Price guard
  const uninstructedPrices = ['75-150','225-450','250-400','750-1200','$500','$600','$800'];
  const badPrices = uninstructedPrices.filter(p => finalText.includes(p));
  console.log('  ' + (badPrices.length === 0 ? '✅' : '❌') + ' Uninstructed prices: ' + (badPrices.length === 0 ? 'none' : badPrices.join(', ')));

  // Brief prices present
  const briefPrices = ['$75', '75-400', '100-250', '2-3 times', '3-8 hours'];
  briefPrices.forEach(p => {
    console.log('  ' + (finalText.includes(p) ? '✅' : '⚠️ ') + ' Brief price "' + p + '": ' + (finalText.includes(p) ? 'present' : 'MISSING'));
  });

  // ── 4. FAQ compliance ────────────────────────────────────────────────────
  console.log('\n── 4. FAQ SECTION ──');
  const faqIdx = finalText.search(/Frequently Asked Questions/i);
  if (faqIdx === -1) {
    console.log('❌ No FAQ section found');
  } else {
    const faqSection = finalText.substring(faqIdx, faqIdx + 2000);
    console.log('FAQ questions in article:');
    const qs = faqSection.match(/\*\*[^*]+\?[^*]*\*\*/g) || [];
    qs.forEach(q => console.log(' ', q));

    // Check against brief FAQs
    if (parsedBrief?.faqs?.length > 0) {
      console.log('\nBrief FAQ compliance:');
      parsedBrief.faqs.forEach(q => {
        const present = faqSection.toLowerCase().includes(q.toLowerCase().substring(0, 30));
        console.log('  ' + (present ? '✅' : '❌') + ' "' + q.substring(0, 60) + '"');
      });
    }
  }

  // ── 5. Heading compliance ────────────────────────────────────────────────
  console.log('\n── 5. HEADING COMPLIANCE ──');
  const requiredHeadings = [
    'Stump Grinding vs Stump Removal: Which One Do You Actually Need?',
    'What is Stump Grinding and How Does It Work?',
    'Understanding the Difference Between Stump Grinding and Stump Removal',
    'Complete Stump Removal: Process and Considerations',
    'Cost Comparison: Grinding vs Removal in Berks County',
    'Decision Guide: When to Choose Grinding vs Removal',
    'Frequently Asked Questions',
  ];
  requiredHeadings.forEach(h => {
    const found = finalText.includes(h);
    console.log('  ' + (found ? '✅' : '❌') + ' ' + h);
  });

  console.log('\nFull article saved: scratch/exec3038_final_article.txt');
}

main().catch(console.error);
