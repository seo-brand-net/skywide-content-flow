const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const qaRewriter = wf.nodes.find(n => n.name === 'QA Rewriter Agent1');
if (qaRewriter) {
    // Rename node
    qaRewriter.name = 'Surgical Rewriter';

    // Update references in connections
    for (const source in wf.connections) {
        for (const port in wf.connections[source]) {
            wf.connections[source][port] = wf.connections[source][port].map(arr => 
                arr.map(c => {
                    if (c.node === 'QA Rewriter Agent1') {
                        c.node = 'Surgical Rewriter';
                    }
                    return c;
                })
            );
        }
    }

    if (wf.connections['QA Rewriter Agent1']) {
        wf.connections['Surgical Rewriter'] = wf.connections['QA Rewriter Agent1'];
        delete wf.connections['QA Rewriter Agent1'];
    }

    // Update Prompt
    qaRewriter.parameters.messages.values[0].content = `You are a surgical content editor. You have a generated article and a precise list of structural and QA violations. 
Fix ONLY the listed violations and return the COMPLETE corrected article.

CRITICAL RULES — READ CAREFULLY:
1. Fix ONLY the violations listed in CORRECTIONS NEEDED below. Touch nothing else.
2. Preserve ALL existing content, headings, keywords, and formatting that are not listed as violations.
3. Return the COMPLETE article with corrections applied — not just the changed sections.
4. Do NOT add any commentary, apology, or explanation. Return only the article text.
5. Do NOT add new sections, change the word count significantly, or restructure the article unless explicitly requested in the corrections.

CORRECTIONS NEEDED:
{{ $('AI Agent1').first().json.output.validation_issues }}

STRUCTURED BRIEF (For reference on how to fix structure/claims):
{{ JSON.stringify($('Parse Creative Brief (LLM)').first().json.choices[0].message.content, null, 2) }}

ORIGINAL ARTICLE:
{{ $('AI Agent1').first().json.output.content }}`;

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully reverted to Surgical Rewriter and updated prompt.');
} else {
    console.log('QA Rewriter Agent1 not found');
}
