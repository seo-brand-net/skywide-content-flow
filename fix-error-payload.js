const fs = require('fs');
const file = 'PROD Skywide Content v23.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const webhookNode = data.nodes.find(n => n.name === 'Send Error to Dashboard');

if (webhookNode) {
    // Fix the JSON body - Error Trigger only sees: $json (with error info) and $execution.id
    // It does NOT have access to Webhook1 data since that's a different execution branch
    webhookNode.parameters.jsonBody = JSON.stringify({
        executionId: "={{$execution.id}}",
        errorMessage: "={{$json.error.message}}",
        nodeName: "={{$json.execution.lastNodeExecuted}}",
        workflowId: "={{$workflow.id}}",
        workflowName: "={{$workflow.name}}"
    }, null, 2);

    // Also ensure it's a POST with the correct header
    webhookNode.parameters.method = "POST";
    webhookNode.parameters.specifyBody = "json";
    if (!webhookNode.parameters.sendHeaders) {
        webhookNode.parameters.sendHeaders = true;
        webhookNode.parameters.headerParameters = {
            parameters: [
                { name: "Content-Type", value: "application/json" }
            ]
        };
    }
    webhookNode.parameters.url = "https://skywide-project.vercel.app/api/webhooks/n8n-error";

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("Fixed! Send Error to Dashboard payload no longer references Webhook1.");
    console.log("New jsonBody:", webhookNode.parameters.jsonBody);
} else {
    console.log("Send Error to Dashboard node not found.");
}
