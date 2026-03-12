const fs = require('fs');

// Create a standalone Error Handler workflow
const errorHandlerWorkflow = {
    "name": "Skywide Error Handler",
    "nodes": [
        {
            "parameters": {},
            "type": "n8n-nodes-base.errorTrigger",
            "typeVersion": 1,
            "position": [480, 300],
            "id": "error-trigger-node-001",
            "name": "Error Trigger"
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://skywide-project.vercel.app/api/webhooks/n8n-error",
                "sendHeaders": true,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        }
                    ]
                },
                "sendBody": true,
                "specifyBody": "json",
                "jsonBody": "={\n  \"executionId\": \"{{$execution.id}}\",\n  \"errorMessage\": \"{{$json.error.message}}\",\n  \"nodeName\": \"{{$json.execution.lastNodeExecuted}}\",\n  \"workflowId\": \"{{$workflow.id}}\",\n  \"workflowName\": \"{{$workflow.name}}\"\n}",
                "options": {}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.1,
            "position": [720, 300],
            "id": "send-error-webhook-001",
            "name": "Send Error to Dashboard"
        }
    ],
    "connections": {
        "Error Trigger": {
            "main": [
                [
                    {
                        "node": "Send Error to Dashboard",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "active": true,
    "settings": {},
    "tags": []
};

fs.writeFileSync('Skywide Error Handler.json', JSON.stringify(errorHandlerWorkflow, null, 2));
console.log("Created: Skywide Error Handler.json");
console.log("\nNEXT STEPS:");
console.log("1. Import 'Skywide Error Handler.json' into n8n as a NEW workflow");
console.log("2. Activate that workflow");
console.log("3. Copy its workflow ID from the n8n URL");
console.log("4. Open the PROD workflow → Settings → Error Workflow → select 'Skywide Error Handler'");
console.log("\nAlso removing the Error Trigger/webhook nodes that were incorrectly added to the PROD workflow...");

// Now clean up the PROD workflow - remove the incorrectly placed error nodes
const prodFile = 'PROD Skywide Content v23.json';
const prod = JSON.parse(fs.readFileSync(prodFile, 'utf8'));

const before = prod.nodes.length;
prod.nodes = prod.nodes.filter(n => 
    n.type !== 'n8n-nodes-base.errorTrigger' && 
    n.name !== 'Send Error to Dashboard'
);
const after = prod.nodes.length;

// Also remove those connections
if (prod.connections["Error Trigger"]) {
    delete prod.connections["Error Trigger"];
}

fs.writeFileSync(prodFile, JSON.stringify(prod, null, 2));
console.log(`\nRemoved ${before - after} misplaced node(s) from PROD workflow (Error Trigger + webhook)`);
console.log("PROD workflow cleaned up. Re-import it into n8n after setting up the Error Handler workflow.");
