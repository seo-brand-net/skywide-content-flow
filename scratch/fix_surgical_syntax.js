const https = require('https');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
function apiReq(method, path, body) {
  return new Promise((res, rej) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const o = { hostname:'seobrand.app.n8n.cloud', path, method, headers:{'X-N8N-API-KEY':KEY,'Accept':'application/json','Content-Type':'application/json', ...(bodyStr?{'Content-Length':Buffer.byteLength(bodyStr)}:{})} };
    const req = https.request(o, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{try{res(JSON.parse(d))}catch(e){res(d)}}); });
    req.on('error',rej); if(bodyStr) req.write(bodyStr); req.end();
  });
}
async function main() {
  const wf = await apiReq('GET', '/api/v1/workflows/t3LNiuZIghvobde3');
  const su = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  
  let content = su.parameters.messages?.values[0]?.content || su.parameters.text;
  
  // Replace the literal newline in join
  content = content.replace("missing.join('\\n')", "missing.join('\\\\n')");
  content = content.replace("missing.join('\\r\\n')", "missing.join('\\\\n')");
  content = content.replace("missing.join(\n)", "missing.join('\\\\n')");
  content = content.replace("missing.join('\\n\\n')", "missing.join('\\\\n\\\\n')");

  // A newline could be literally encoded like this:
  // missing.join('
  // ')
  // Let's replace by splitting and re-joining
  const badJoin = "missing.join('\\n')";
  content = content.replace(badJoin, "missing.join('\\\\n')");
  // Also fix the match
  content = content.replace("match(/{[sS]*}/)", "match(/\\\\{[\\\\s\\\\S]*\\\\}/)");

  // Let's just do a big regex that matches missing.join with any whitespace and quotes
  content = content.replace(/missing\.join\(['"`]\s*['"`]\)/g, "missing.join('\\\\n')");

  if (su.parameters.messages?.values[0]?.content) {
    su.parameters.messages.values[0].content = content;
  } else {
    su.parameters.text = content;
  }

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, staticData: wf.staticData || null
  };
  const res = await apiReq('PUT', '/api/v1/workflows/t3LNiuZIghvobde3', payload);
  console.log('Saved:', res.name);
}
main().catch(console.error);
