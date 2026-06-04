/**
 * inspect_execution.js
 * 
 * Pulls the latest execution from the DEV content workflow and shows
 * what each key node actually produced — so we can see exactly where
 * client data gets dropped and hallucinations start.
 * 
 * Usage:
 *   node inspect_execution.js                      → latest execution
 *   node inspect_execution.js <execution_id>       → specific execution
 *   node inspect_execution.js --list               → list last 10 executions
 *   node inspect_execution.js --node "Node Name"   → dump a specific node's full output
 */

const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const WORKFLOW_ID  = 't3LNiuZIghvobde3'; // DEV Skywide Content (Word Count Fix) + QA Pipeline

// Nodes we care about for the hallucination audit
const KEY_NODES = [
  'Client Site Researcher',
  'Client Profile Extractor',
  'Pre-Draft Fact Checker',
  'Post-Draft Fact Checker',
  'Keyword Strategist',
  'OpenAI Draft (GPT-4O)1',
  'Claude Draft (Claude Opus 3)1',
  'Data Check & Research Gaps1',
  'OpenAI Keyword Check + Semantic Gap1',
  'Claude Keyword Check + Semantic Gap1',
  'Surgical Rewriter',
  'Flag For Human Review',
  '1st Scoring Agent3',
  'AI Agent1',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function n8nFetch(path) {
  return fetch(N8N_BASE_URL + path, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  }).then(r => r.json());
}

function extractNodeOutput(nodeRun) {
  if (!nodeRun || !nodeRun[0]) return null;
  const run = nodeRun[0];

  // Standard main output
  const mainOutput = run?.data?.main?.[0]?.[0]?.json;
  if (mainOutput) return mainOutput;

  // AI node output (text field directly)
  if (run?.data?.main?.[0]?.[0]) return run.data.main[0][0];

  return null;
}

function extractText(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  // OpenAI chat format
  if (output.message?.content) return output.message.content;
  if (output.choices?.[0]?.message?.content) return output.choices[0].message.content;
  // Anthropic format
  if (output.text) return output.text;
  // Generic
  return JSON.stringify(output);
}

function truncate(str, len = 800) {
  if (!str) return '(empty)';
  str = String(str);
  if (str.length <= len) return str;
  return str.substring(0, len) + `\n... [truncated — ${str.length} chars total]`;
}

function divider(title) {
  const line = '═'.repeat(70);
  console.log('\n' + line);
  console.log(`  ${title}`);
  console.log(line);
}

function sectionHeader(title, status) {
  const statusIcon = status === 'ran' ? '✅' : status === 'skipped' ? '⏭️ ' : '❌';
  console.log(`\n${statusIcon}  [${title}]`);
  console.log('─'.repeat(50));
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function listExecutions() {
  const data = await n8nFetch(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=10`);
  divider('Last 10 Executions — DEV Skywide Content');
  if (!data.data?.length) { console.log('No executions found.'); return; }

  data.data.forEach((ex, i) => {
    const duration = ex.stoppedAt
      ? Math.round((new Date(ex.stoppedAt) - new Date(ex.startedAt)) / 1000) + 's'
      : 'still running';
    console.log(`\n  ${i + 1}. ID: ${ex.id}`);
    console.log(`     Status   : ${ex.status}`);
    console.log(`     Started  : ${ex.startedAt}`);
    console.log(`     Duration : ${duration}`);
  });
}

async function inspectExecution(execId) {
  // Fetch execution with full data
  const data = await n8nFetch(`/api/v1/executions/${execId}?includeData=true`);
  if (!data || data.message) {
    console.error('Error fetching execution:', data?.message || 'unknown error');
    return;
  }

  const runData = data.data?.resultData?.runData || {};
  const allNodeNames = Object.keys(runData);

  // ── Summary ──────────────────────────────────────────────────────────────
  divider(`Execution ${data.id} — ${data.status}`);
  console.log(`  Workflow : DEV Skywide Content (Word Count Fix) + QA Pipeline`);
  console.log(`  Status   : ${data.status}`);
  console.log(`  Started  : ${data.startedAt}`);
  console.log(`  Finished : ${data.stoppedAt || 'still running'}`);
  console.log(`  Nodes ran: ${allNodeNames.length} total`);

  // ── Key node outputs ───────────────────────────────────────────────────
  divider('KEY NODE AUDIT — Hallucination Pipeline');

  for (const nodeName of KEY_NODES) {
    const nodeRun = runData[nodeName];
    if (!nodeRun) {
      sectionHeader(nodeName, 'skipped');
      console.log('  → Did not run in this execution');
      continue;
    }

    sectionHeader(nodeName, 'ran');
    const output = extractNodeOutput(nodeRun);
    const text = extractText(output);
    console.log(truncate(text, 1000));
  }

  // ── Data flow check ────────────────────────────────────────────────────
  divider('DATA FLOW ANALYSIS — Did client data reach the writers?');

  const clientProfile = extractText(extractNodeOutput(runData['Client Profile Extractor']));
  const preFact       = extractText(extractNodeOutput(runData['Pre-Draft Fact Checker']));
  const openaiDraft   = extractText(extractNodeOutput(runData['OpenAI Draft (GPT-4O)1']));
  const claudeDraft   = extractText(extractNodeOutput(runData['Claude Draft (Claude Opus 3)1']));
  const finalArticle  = extractText(extractNodeOutput(runData['Surgical Rewriter'])) ||
                        extractText(extractNodeOutput(runData['Document Export Sanitization5']));

  // Check if client profile's published_stats made it into the draft
  let clientStats = [];
  try {
    const profileJson = JSON.parse(clientProfile);
    clientStats = profileJson.published_stats || [];
  } catch (_) {
    clientStats = [];
  }

  console.log('\n  Client Profile Published Stats (ground truth from website):');
  if (clientStats.length === 0) {
    console.log('  ⚠️  No published_stats extracted from client site');
  } else {
    clientStats.forEach(s => console.log('    •', s));
  }

  console.log('\n  Did published stats appear in OpenAI Draft?');
  if (!clientStats.length) {
    console.log('  ⚠️  Cannot check — no client stats were extracted');
  } else {
    clientStats.forEach(stat => {
      const keyword = stat.split(' ').slice(0, 4).join(' ');
      const found = openaiDraft && openaiDraft.includes(keyword);
      console.log(`  ${found ? '✅' : '❌'}  "${keyword}..." → ${found ? 'FOUND in draft' : 'MISSING from draft'}`);
    });
  }

  console.log('\n  Did published stats appear in Claude Draft?');
  if (!clientStats.length) {
    console.log('  ⚠️  Cannot check — no client stats were extracted');
  } else {
    clientStats.forEach(stat => {
      const keyword = stat.split(' ').slice(0, 4).join(' ');
      const found = claudeDraft && claudeDraft.includes(keyword);
      console.log(`  ${found ? '✅' : '❌'}  "${keyword}..." → ${found ? 'FOUND in draft' : 'MISSING from draft'}`);
    });
  }

  // ── Hallucination sniff ────────────────────────────────────────────────
  divider('HALLUCINATION SNIFF — Suspicious precision stats in final article');

  const suspiciousPatterns = [
    /\d+%/g,                          // any percentage
    /\d+ times (more|better|faster)/g, // multipliers
    /\d+x /g,                          // 4x, 3x etc
    /studies? show/gi,
    /research (shows?|reveals?|demonstrates?)/gi,
    /according to/gi,
    /data (shows?|reveals?)/gi,
  ];

  if (!finalArticle) {
    console.log('  ⚠️  Final article not found in this execution');
  } else {
    const lines = finalArticle.split('\n');
    const flagged = [];

    lines.forEach((line, i) => {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          flagged.push(`  Line ${i + 1}: ${line.trim().substring(0, 120)}`);
        }
        pattern.lastIndex = 0; // reset regex
      });
    });

    if (flagged.length === 0) {
      console.log('  ✅  No suspicious precision stats detected');
    } else {
      console.log(`  ⚠️  Found ${flagged.length} lines with potentially unverified claims:\n`);
      // Deduplicate and show max 20
      [...new Set(flagged)].slice(0, 20).forEach(l => console.log(l));
      if (flagged.length > 20) console.log(`  ... and ${flagged.length - 20} more`);
    }
  }

  // ── Full node list ─────────────────────────────────────────────────────
  divider('ALL NODES THAT RAN (full list)');
  allNodeNames.forEach((name, i) => {
    const output = extractNodeOutput(runData[name]);
    const text = extractText(output);
    const preview = text ? String(text).replace(/\n/g, ' ').substring(0, 80) : '(no output)';
    console.log(`  ${i + 1}. [${name}]: ${preview}`);
  });
}

async function dumpNode(execId, nodeName) {
  const data = await n8nFetch(`/api/v1/executions/${execId}?includeData=true`);
  const runData = data.data?.resultData?.runData || {};
  const nodeRun = runData[nodeName];

  if (!nodeRun) {
    console.log(`Node "${nodeName}" did not run in execution ${execId}`);
    console.log('Available nodes:', Object.keys(runData).join(', '));
    return;
  }

  divider(`Full output — [${nodeName}]`);
  const output = extractNodeOutput(nodeRun);
  const text = extractText(output);
  console.log(text || JSON.stringify(output, null, 2));
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    await listExecutions();
    return;
  }

  const nodeFlag = args.indexOf('--node');
  if (nodeFlag !== -1) {
    const execId = args[0] !== '--node' ? args[0] : null;
    const nodeName = args[nodeFlag + 1];
    if (!execId || !nodeName) {
      console.error('Usage: node inspect_execution.js <execution_id> --node "Node Name"');
      process.exit(1);
    }
    await dumpNode(execId, nodeName);
    return;
  }

  // Default: inspect latest or specific execution
  let execId = args[0];

  if (!execId) {
    // Grab latest
    const list = await n8nFetch(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=1`);
    if (!list.data?.length) { console.log('No executions found.'); return; }
    execId = list.data[0].id;
    console.log(`No execution ID specified — using latest: ${execId}`);
  }

  await inspectExecution(execId);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
