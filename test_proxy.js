const http = require('http');

const payload = {
  path: 'content-engine-test-unique',
  request_id: '1234',
  runId: '1234',
  title: 'Test',
  audience: 'Test',
  client_name: 'Test',
  creative_brief: 'Test',
  article_type: 'Blogs',
  word_count: '1000',
  primary_keywords: 'test',
  secondary_keywords: 'test',
  semantic_theme: 'test',
  tone: 'test',
  page_intent: 'test',
  user_id: '123',
  is_ab_test: true,
  request_status: 'test',
  timestamp: new Date().toISOString()
};

const body = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/proxy-n8n',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => console.error(e));
req.write(body);
req.end();
