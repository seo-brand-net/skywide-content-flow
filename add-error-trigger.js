const fs = require('fs');

const file = 'PROD Skywide Content v23.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Create Error Trigger node
const errorTriggerId = 'error-trigger-' + Date.now();
const errorTriggerNode = {
  "parameters": {},
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [
    0,
    -400
  ],
  "id": errorTriggerId,
  "name": "Error Trigger"
};

// 2. Create HTTP Request node to send webhook
const httpWebhookId = 'error-webhook-' + Date.now();
const httpWebhookNode = {
  "parameters": {
    "method": "POST",
    "url": "https://skywide-project.vercel.app/api/webhooks/n8n-error", // Production URL? Wait, usually we can use an ENV variable or just hardcode if known. Let's use the local dev for now or prompt Micou to change it. We'll use a placeholder or the actual domain if we can find it.
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"executionId\": \"{{$execution.id}}\",\n  \"runId\": \"{{ $('Webhook1').first().json.body.run_id || '' }}\",\n  \"errorMessage\": \"{{$json.error.message}}\",\n  \"nodeName\": \"{{$json.execution.lastNodeExecuted}}\",\n  \"workflowId\": \"{{$workflow.id}}\",\n  \"workflowName\": \"{{$workflow.name}}\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [
    200,
    -400
  ],
  "id": httpWebhookId,
  "name": "Send Error to Dashboard"
};

// 3. Add to nodes
// Only add if not already there
if (!data.nodes.some(n => n.type === 'n8n-nodes-base.errorTrigger')) {
  data.nodes.push(errorTriggerNode, httpWebhookNode);

  // 4. Add connection
  if (!data.connections["Error Trigger"]) {
    data.connections["Error Trigger"] = {
      "main": [
        [
          {
            "node": "Send Error to Dashboard",
            "type": "main",
            "index": 0
          }
        ]
      ]
    };
  }

  // Write back
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log("Successfully added Error Trigger and Webhook to " + file);
} else {
  console.log("Error Trigger already exists.");
}
