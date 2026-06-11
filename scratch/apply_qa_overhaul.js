const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// 1. Delete redundant nodes
const nodesToDelete = new Set([
  'Structure Auditor (Pass 1)',
  'Structure Audit Gate',
  'Surgical Rewriter',
  'Structure Auditor (Pass 2)',
  'Structure Audit Gate 2',
  '1st Scoring Agent3',
  '80+ ?3',
  'Check Max Iterations3',
  'Improvement LLM3',
  'Max Iterations3',
  'Flag For Human Review' // We will wire directly to end
]);

wf.nodes = wf.nodes.filter(n => !nodesToDelete.has(n.name));

// Clean connections
for (const source in wf.connections) {
  if (nodesToDelete.has(source)) {
    delete wf.connections[source];
    continue;
  }
  for (const port in wf.connections[source]) {
    wf.connections[source][port] = wf.connections[source][port].map(arr => 
      arr.filter(c => !nodesToDelete.has(c.node))
    );
  }
}

// 2. Rewire Document Export Sanitization5 -> Edit Fields2
if (!wf.connections['Document Export Sanitization5']) wf.connections['Document Export Sanitization5'] = { main: [[]] };
wf.connections['Document Export Sanitization5'].main[0] = [{ node: 'Edit Fields2', type: 'main', index: 0 }];

// 3. Fix the runs tracking in the loop.
// Edit Fields2 should initialize runs if it doesn't exist
const editFields2 = wf.nodes.find(n => n.name === 'Edit Fields2');
if (editFields2) {
    if (!editFields2.parameters.assignments) editFields2.parameters.assignments = { assignments: [] };
    const hasRunsInit = editFields2.parameters.assignments.assignments.find(a => a.name === 'runs');
    if (!hasRunsInit) {
        editFields2.parameters.assignments.assignments.push({
            name: 'runs',
            value: '={{ $json.runs || 0 }}',
            type: 'number'
        });
    }
}

// Max Iterations1 should increment runs
const maxIter1 = wf.nodes.find(n => n.name === 'Max Iterations1');
if (maxIter1) {
    const runAssignment = maxIter1.parameters.assignments.assignments.find(a => a.name === 'runs');
    if (runAssignment) {
        runAssignment.value = '={{ ($json.runs || 0) + 1 }}';
    } else {
        maxIter1.parameters.assignments.assignments.push({
            name: 'runs',
            value: '={{ ($json.runs || 0) + 1 }}',
            type: 'number'
        });
    }
}

// Update If1 condition to check $json.runs >= 3
const if1 = wf.nodes.find(n => n.name === 'If1');
if (if1) {
    // Replace the $runIndex logic with $json.runs >= 3
    if1.parameters.conditions.conditions = [
        {
          "id": "16037e4c-cc6c-462a-88aa-53a42f095145",
          "leftValue": "={{$('AI Agent1').item.json.output.passed}}",
          "rightValue": "=true",
          "operator": { "type": "string", "operation": "equals" }
        },
        {
          "id": "loop_exit_limit",
          "leftValue": "={{ $json.runs }}",
          "rightValue": 3,
          "operator": { "type": "number", "operation": "largerEqual" }
        }
    ];
}

// 4. Update AI Agent1 Prompt
const aiAgent = wf.nodes.find(n => n.name === 'AI Agent1');
if (aiAgent) {
    aiAgent.parameters.text = `=You are a strict QA and Structure Validator.
Your task is to validate the generated article against the strict requirements set in the Structured Creative Brief.

# Input Data
Article Content: {{ $('Edit Fields3').first().json.documentContent }}
Structured Brief: {{ JSON.stringify($('Parse Creative Brief (LLM)').first().json.choices[0].message.content) }}
Target Word Count: {{ $('Webhook1').first().json.body.word_count }}

# Validation Criteria (fail on ANY)
1. **Structure Check:** Did the article include EVERY heading listed in the \`sections\` array of the Structured Brief?
2. **Instruction Check:** Did the article fulfill the specific \`instructions\` for each heading?
3. **Claims Check:** Are the \`required_claims\` for each section present in the text?
4. **Global Rules Check:** Did the article violate any \`global_rules\`?
5. **Word Count Check:** Is the article within ±10% of the target word count?

# Output Instructions
- If ALL criteria pass perfectly, set "passed" to the string "true".
- If ANY check fails, set "passed" to the string "false".
- List EVERY specific issue found in "validation_issues" with clear fix instructions. Mention the exact heading and the missing requirement.
- Always return the original article in the "content" field.

# REQUIRED RESPONSE FORMAT
Return EXACTLY one raw JSON object matching this schema and nothing else:
{
  "passed": "true" or "false",
  "validation_issues": "string",
  "content": "full original article content as a JSON string"
}

Formatting rules:
- Output raw JSON only. No markdown.
- "passed" MUST be "true" or "false".
- Escape all internal double quotes and line breaks so the JSON is valid.`;
}

// 5. Update Claude Draft Prompt
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraft) {
    const promptValue = claudeDraft.parameters.messages.messageValues[0].message;
    // We will append the instructions about the structured brief
    const structuredBriefInstruction = `\n\n# ═══ STRUCTURED CREATIVE BRIEF (MANDATORY OUTLINE) ═══\nYou MUST write the article section-by-section exactly following this structure. Do not invent your own H2s. Follow the specific instructions and include the required claims for each section.\n\n{{ JSON.stringify($('Parse Creative Brief (LLM)').first().json.choices[0].message.content, null, 2) }}\n\n# ═══════════════════════════════════════════════════════════════════════════\n\n`;
    
    // Inject it right before the Client Ground Truth block to ensure it's noticed
    claudeDraft.parameters.messages.messageValues[0].message = promptValue.replace('# ═══ CLIENT GROUND TRUTH', structuredBriefInstruction + '# ═══ CLIENT GROUND TRUTH');
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully completed massive graph restructuring!');
