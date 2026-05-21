const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'GBP Post Automation v2.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Check if node already exists
if (workflow.nodes.find(n => n.name === 'Update Topic Generated Date')) {
  console.log('Node already exists.');
  process.exit(0);
}

const updateNode = {
  "parameters": {
    "operation": "update",
    "documentId": {
      "__rl": true,
      "value": "={{ $('Get Client Config').item.json.sheet_id }}",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "={{ $('Webhook Trigger').item.json.body.tab_name || $('Get Client Config').item.json.topics_tab_name || 'Topics' }}",
      "mode": "name"
    },
    "columns": {
      "mappingMode": "defineBelow",
      "value": {
        "Generated Date": "={{ $now }}",
        "Post Topic": "={{ $('Loop Over Topics').item.json['Post Topic'] || $('Loop Over Topics').item.json['Topic'] || $('Loop Over Topics').item.json['Post'] }}"
      },
      "matchingColumns": [
        "Post Topic"
      ],
      "schema": [
        {
          "id": "Post Topic",
          "displayName": "Post Topic",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "type": "string",
          "canBeUsedToMatch": true
        },
        {
          "id": "Generated Date",
          "displayName": "Generated Date",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "type": "string",
          "canBeUsedToMatch": true
        }
      ],
      "attemptToConvertTypes": false,
      "convertFieldsToString": false
    },
    "options": {}
  },
  "id": "update-topic-dedup-001",
  "name": "Update Topic Generated Date",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4,
  "position": [
    2730,
    -544
  ],
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "MLJNnAPCCgmc4dul",
      "name": "Google Sheets account"
    }
  }
};

workflow.nodes.push(updateNode);

// Update connections
// Write Post to Skywide -> Update Topic Generated Date
// Update Topic Generated Date -> Loop Over Topics

if (workflow.connections['Write Post to Skywide']) {
    workflow.connections['Write Post to Skywide'].main = [
        [
            {
                "node": "Update Topic Generated Date",
                "type": "main",
                "index": 0
            }
        ]
    ];
}

workflow.connections['Update Topic Generated Date'] = {
    "main": [
        [
            {
                "node": "Loop Over Topics",
                "type": "main",
                "index": 0
            }
        ]
    ]
};

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully added duplicate prevention logic.');
