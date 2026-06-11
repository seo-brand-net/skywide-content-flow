const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const node = wf.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
if (node) {
    node.parameters.messages.values[0].content = `You are a strict structural extraction agent. Your job is to parse a free-form Creative Brief into a highly detailed JSON structure so downstream AI agents can write the article section-by-section and strictly follow all instructions.

Return ONLY valid JSON using this exact structure (NO markdown wrapping):
{
  "global_rules": ["List of overall writing instructions, tone rules, and constraints that apply to the whole article"],
  "target_audience": "Description of the audience (if available)",
  "sections": [
    {
      "heading": "The exact H2 or H3 heading text",
      "instructions": "Extracted instructional text of what is to be done in that specific paragraph/H2. Detail exactly what the writer should cover.",
      "required_claims": ["List of any specific claims, links, statistics, or mandatory facts to include in this section"]
    }
  ]
}

EXTRACTION RULES:
1. "global_rules": Extract tone, style, formatting restrictions, and any directive language (must, never, avoid, ensure).
2. "sections": For every section defined in the brief (usually marked by H2s or outline sections), create an object.
3. "heading": Extract the exact text for the heading. Do not invent headings.
4. "instructions": Combine all bullet points and text underneath that heading in the brief into a clear, unified instruction for the writer.
5. "required_claims": If the brief specifically mentions a statistic, fact, URL link requirement, or strict claim for that section, list them here.`;

    if (!node.parameters.options) node.parameters.options = {};
    node.parameters.options.responseFormat = "json_object";
    
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully updated Parse Creative Brief (LLM)');
} else {
    console.log('Node not found');
}
