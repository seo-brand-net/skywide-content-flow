const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// Find nodes that have the bad text
wf.nodes.forEach(n => {
  let pStr = JSON.stringify(n.parameters);
  let changed = false;
  
  if (pStr.includes("{{ $('Data Check & Research Gaps1').first().json.choices[0].message.content }}")) {
    pStr = pStr.replace(
      /\{\{ \$\('Data Check & Research Gaps1'\)\.first\(\)\.json\.choices\[0\]\.message\.content \}\}/g,
      "{{ $('Surgical Rewriter').first() ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.data || $('Surgical Rewriter').first().json.message?.content) : ($('Claude Draft (Claude Opus 3)1').first().json.text || $('Claude Draft (Claude Opus 3)1').first().json.data || $('Claude Draft (Claude Opus 3)1').first().json.message?.content) }}"
    );
    changed = true;
  }
  
  // Find the upstream OpenAI and Claude nodes for this node
  const upstreamNodes = [];
  for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const port in nodeConns) {
      nodeConns[port].forEach(cArr => {
        cArr.forEach(c => {
          if (c.node === n.name) {
            upstreamNodes.push(nodeName);
          }
        });
      });
    }
  }
  
  const openaiNode = upstreamNodes.find(name => name.includes('OpenAI') || name.includes('Model — Apply'));
  const claudeNode = upstreamNodes.find(name => name.includes('Claude') && name !== 'Claude Draft (Claude Opus 3)1');
  
  if (pStr.includes("{{ $json.message.content }}") && openaiNode) {
    pStr = pStr.replace(/\{\{ \$json\.message\.content \}\}/g, `{{ $('${openaiNode}').first().json.message?.content || $('${openaiNode}').first().json.choices?.[0]?.message?.content }}`);
    changed = true;
  }
  
  if (pStr.includes("{{ $json.text }}") && claudeNode) {
    pStr = pStr.replace(/\{\{ \$json\.text \}\}/g, `{{ $('${claudeNode}').first().json.text || $('${claudeNode}').first().json.data }}`);
    changed = true;
  }
  
  if (changed) {
    console.log('Patched node:', n.name);
    n.parameters = JSON.parse(pStr);
  }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Saved patched workflow.');
