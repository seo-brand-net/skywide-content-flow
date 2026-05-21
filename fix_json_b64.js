const fs = require('fs');
const file = './GBP Post Automation v2.json';
const d = JSON.parse(fs.readFileSync(file, 'utf8'));

const imgNode = d.nodes.find(n => n.name === 'Generate Image with DALL-E');
if (imgNode) {
  imgNode.parameters.jsonBody = imgNode.parameters.jsonBody
    .replace(',"response_format": "url"', '')
    .replace('  ,"response_format": "url"\\n', '\\n');
}

const writeNode = d.nodes.find(n => n.name === 'Write Post to Skywide');
if (writeNode) {
  const params = writeNode.parameters.bodyParameters.parameters;
  const imgUrlParam = params.find(p => p.name === 'image_url');
  if (imgUrlParam) {
    imgUrlParam.value = "={{ $('Generate Image with DALL-E').item.json.data[0].b64_json }}";
  }
}

fs.writeFileSync(file, JSON.stringify(d, null, 2));
console.log('Fixed JSON workflow to use b64_json');
