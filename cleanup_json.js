const fs = require('fs');
const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

const nodeMap = new Map();
data.nodes.forEach(n => {
  if (!nodeMap.has(n.name)) {
    nodeMap.set(n.name, n);
  }
});
data.nodes = Array.from(nodeMap.values());

for (const [source, conns] of Object.entries(data.connections)) {
  if (conns.main) {
    conns.main = conns.main.map(targets => {
      const seenTarget = new Set();
      return targets.filter(t => {
        const key = t.node + '|' + t.type + '|' + t.index;
        if (seenTarget.has(key)) return false;
        seenTarget.add(key);
        return true;
      });
    });
  }
}

data.nodes.forEach(n => {
  if (n.parameters && n.parameters.messages && n.parameters.messages.values) {
    n.parameters.messages.values.forEach(val => {
      if (typeof val.content === 'string') {
        const idx = val.content.indexOf('\n\nCRITICAL FACT-CHECK REPORT');
        if (idx !== -1) {
          val.content = val.content.substring(0, idx) + "\n\nCRITICAL FACT-CHECK REPORT (OVERRIDE BRIEF FACTS):\n{{ $('Keyword Strategist').first().json.fact_check_report || '' }}";
        }
      }
    });
  }
});

fs.writeFileSync('TEST Skywide Content (Prompt Review).json', JSON.stringify(data, null, 2));
console.log('Cleanup complete');
