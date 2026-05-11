const fs = require('fs');

const newPrePrompt = `You are an elite Fact-Checker and Brief Auditor. Read the provided content brief. Extract all factual claims, specifically focusing on:
1. Legal and administrative code citations.
2. Specific quantitative limits or mandates.
3. Conversions and values.
4. Procedural rules.
Search the web to aggressively verify these claims against authoritative, up-to-date official sources (prioritize .gov, .edu, or official entity domains like NAPEO.org).
CRITICAL RULE: NEVER invent or synthesize new statistics, numbers, or claims. DO NOT add any new claims. If a claim in the brief is incorrect, correct it ONLY if you find the exact primary source. If you cannot find primary source confirmation, explicitly state to REMOVE the claim entirely rather than guessing.
Output a 'Fact-Check Report' fixing errors based ONLY on official sources.`;

const newPostPrompt = `You are a ruthless Fact-Checker. Read the provided synthesized article draft. Extract every factual claim, date, statistic, rule, legal citation, and entity.
Verify them using web search against official primary sources (prioritize .gov, .edu, or official primary organizations).
CRITICAL RULE: You MUST NOT add new statistics, facts, or claims under any circumstances. If you find any hallucinations, inaccuracies, or unverified statistics in the draft, you MUST DELETE that specific claim or rewrite the sentence to remove the hallucinated number. You may only replace a number if the official primary source gives you the exact correct number for that specific context. If an official source cannot be found, remove the claim entirely. Maintain the exact tone and word count. Output ONLY the finalized, factually correct article without any meta-commentary.`;

const targetFiles = [
  'TEST Skywide Content (Prompt Review).json',
  'TEST Skywide Content.json',
  'TEST Skywide  Content old.json',
  'PROD Skywide Content v23.json',
  'PROD Skywide Content v23_version2.json',
  'DEV Skywide  Content.json',
  'DEV_Skywide_Content_Fixed.json',
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`Skipping ${file}: parse error - ${e.message}`);
    continue;
  }

  let modified = false;

  data.nodes.forEach(node => {
    if (!node.parameters?.messages?.values) return;

    const isPreDraft = node.name === 'Pre-Draft Fact Checker';
    const isPostDraft = node.name === 'Post-Draft Fact Checker';

    if (!isPreDraft && !isPostDraft) return;

    node.parameters.messages.values.forEach(msg => {
      if (msg.role === 'system') {
        if (isPreDraft) {
          msg.content = newPrePrompt;
          modified = true;
        } else if (isPostDraft) {
          msg.content = newPostPrompt;
          modified = true;
        }
      }
    });
  });

  if (modified) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    // Nodes not in the file yet - patch via string replacement as fallback
    let raw = fs.readFileSync(file, 'utf8');
    const oldPostShort = 'You are a ruthless Fact-Checker. Read the provided synthesized article draft. Extract every factual claim, date, statistic, and entity. Verify them using web search. If you find any hallucinations, inaccuracies, or outdated information, rewrite those specific sentences to be factually accurate while maintaining the exact tone and word count. Output ONLY the finalized, factually correct article without any meta-commentary.';
    
    if (raw.includes(oldPostShort)) {
      raw = raw.replace(oldPostShort, newPostPrompt.replace(/\n/g, '\\n'));
      fs.writeFileSync(file, raw, 'utf8');
      console.log(`✅ Patched (string replace): ${file}`);
    } else {
      console.log(`⏭️  No matching nodes found in: ${file}`);
    }
  }
}
