const fs = require('fs');
const file = 'PROD Skywide Content v23.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = data.nodes.find(n => n.name === 'Keyword Strategist');
if (node && node.parameters) {
  if (!node.parameters.jsCode.includes('Intentional error')) {
    node.parameters.jsCode = 'throw new Error("Intentional error to test the UX");\n' + node.parameters.jsCode;
    // ensure webhook URL uses the production vercel domain
    const webhookNode = data.nodes.find(n => n.name === 'Send Error to Dashboard');
    if (webhookNode) {
       webhookNode.parameters.url = "https://skywide-project.vercel.app/api/webhooks/n8n-error";
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("Error injected successfully.");
  } else {
    console.log("Error already injected.");
  }
} else {
  console.log("Node not found.");
}
