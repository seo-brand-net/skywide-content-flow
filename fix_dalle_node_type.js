const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const index = data.nodes.findIndex(n => n.name === 'Generate Image with DALL-E');
if (index !== -1) {
  data.nodes[index] = {
    "parameters": {
      "method": "POST",
      "url": "https://api.openai.com/v1/images/generations",
      "authentication": "predefinedCredentialType",
      "nodeCredentialType": "openAiApi",
      "sendBody": true,
      "specifyBody": "json",
      "jsonBody": "={\n  \"model\": \"dall-e-3\",\n  \"prompt\": {{ JSON.stringify($json.choices[0].message.content) }},\n  \"size\": \"1024x1024\",\n  \"quality\": \"standard\",\n  \"n\": 1\n}",
      "options": {}
    },
    "id": data.nodes[index].id,
    "name": "Generate Image with DALL-E",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": data.nodes[index].position,
    "credentials": {
      "openAiApi": data.nodes[index].credentials.openAiApi
    }
  };
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully replaced DALL-E node with direct HTTP Request to avoid Langchain node errors.');
