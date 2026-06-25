const https = require('https');
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('scratch/exec3004_webhook_payload.json', 'utf8'));
payload.request_id = 'test-stump-isa-1';
payload.run_id = 'test-stump-isa-1';
payload.title = "Stump Grinding vs. Stump Removal (TEST RUN)";

const bodyStr = JSON.stringify(payload);

const options = {
  hostname: 'seobrand.app.n8n.cloud',
  path: '/webhook/content-engine-dev',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr)
  }
};

console.log('Triggering webhook with test payload...');

const req = https.request(options, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', d);
  });
});
req.on('error', console.error);
req.write(bodyStr);
req.end();
