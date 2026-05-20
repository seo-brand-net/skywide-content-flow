const fs = require('fs');

const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// 1. Create the DALL-E 3 node
const generateImageNode = {
  "parameters": {
    "resource": "image",
    "prompt": "={{ $json.message.content }}",
    "model": "dall-e-3",
    "size": "1024x1024",
    "quality": "standard"
  },
  "id": "e8a9f0b1-1234-5678-9abc-def012345678",
  "name": "Generate Image with DALL-E",
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "typeVersion": 1,
  "position": [
    950,
    -848
  ],
  "credentials": {
    "openAiApi": {
      "id": "open-ai-credentials-id-here", // User will need to configure this in n8n
      "name": "OpenAI account"
    }
  }
};

// Insert node
data.nodes.push(generateImageNode);

// 2. Fix the connections:
// Generate Image Prompt -> Generate Image with DALL-E -> Wait 1s
data.connections["Generate Image Prompt"] = {
  "main": [
    [
      {
        "node": "Generate Image with DALL-E",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

data.connections["Generate Image with DALL-E"] = {
  "main": [
    [
      {
        "node": "Wait 1s",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

// 3. Update the Write Post to Skywide node to include image_url
const writePostNode = data.nodes.find(n => n.name === "Write Post to Skywide");
if (writePostNode) {
  // Add image_url to bodyParameters
  writePostNode.parameters.bodyParameters.parameters.push({
    "name": "image_url",
    "value": "={{ $('Generate Image with DALL-E').item.json.data[0].url }}"
  });
}

// 4. Update Wait 1s and subsequent nodes positions to make room
const waitNode = data.nodes.find(n => n.name === "Wait 1s");
if (waitNode) waitNode.position[0] += 250;
const appendNode = data.nodes.find(n => n.name === "Append to Location Tab");
if (appendNode) appendNode.position[0] += 250;
const writeNode2 = data.nodes.find(n => n.name === "Write Post to Skywide");
if (writeNode2) writeNode2.position[0] += 250;


fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated workflow JSON.');
