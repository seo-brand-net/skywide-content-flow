const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

const payload = JSON.parse(fs.readFileSync('scratch/exec3004_webhook_payload.json', 'utf8'));
// Keep original request_id so it matches the DB foreign key
payload.request_id = '8df8deda-afa2-41b4-9e9b-9c36d8a4bd80';
// Generate a new UUID for the run to avoid conflicts
payload.run_id = crypto.randomUUID();
payload.title = "Stump Grinding vs. Stump Removal (TEST RUN 2)";

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

console.log('Triggering webhook with proper UUIDs...');

const req = https.request(options, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', d);
    console.log('New Run ID:', payload.run_id);
  });
});
req.on('error', console.error);
req.write(bodyStr);
req.end();
