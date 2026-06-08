const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const nodesToDelete = ['Merge5', 'Merge6', 'Merge7', 'Wait7', 'Wait10', 'Wait14', 'Wait17', 'Wait18'];

// 1. Remove the nodes
wf.nodes = wf.nodes.filter(n => !nodesToDelete.includes(n.name));

// 2. Perform the bypass wiring
// Claude Keyword Check + Semantic Gap1 -> Claude Apply Recommendations1
if (!wf.connections['Claude Keyword Check + Semantic Gap1']) wf.connections['Claude Keyword Check + Semantic Gap1'] = { main: [[]] };
wf.connections['Claude Keyword Check + Semantic Gap1'].main[0] = wf.connections['Claude Keyword Check + Semantic Gap1'].main[0].filter(t => !nodesToDelete.includes(t.node));
wf.connections['Claude Keyword Check + Semantic Gap1'].main[0].push({ node: 'Claude Apply Recommendations1', type: 'main', index: 0 });

// Claude EEAT Injection1 -> OpenAI SEO Optimization1
if (!wf.connections['Claude EEAT Injection1']) wf.connections['Claude EEAT Injection1'] = { main: [[]] };
wf.connections['Claude EEAT Injection1'].main[0] = wf.connections['Claude EEAT Injection1'].main[0].filter(t => !nodesToDelete.includes(t.node));
wf.connections['Claude EEAT Injection1'].main[0].push({ node: 'OpenAI SEO Optimization1', type: 'main', index: 0 });

// OpenAI SEO Optimization1 (remove Wait17)
if (wf.connections['OpenAI SEO Optimization1'] && wf.connections['OpenAI SEO Optimization1'].main) {
    wf.connections['OpenAI SEO Optimization1'].main[0] = wf.connections['OpenAI SEO Optimization1'].main[0].filter(t => t.node !== 'Wait17');
}

// Claude NLP & PR Optimization -> Claude Humanised Readability Rewrite
if (!wf.connections['Claude NLP & PR Optimization']) wf.connections['Claude NLP & PR Optimization'] = { main: [[]] };
wf.connections['Claude NLP & PR Optimization'].main[0] = wf.connections['Claude NLP & PR Optimization'].main[0].filter(t => !nodesToDelete.includes(t.node));
wf.connections['Claude NLP & PR Optimization'].main[0].push({ node: 'Claude Humanised Readability Rewrite', type: 'main', index: 0 });

// Claude Humanised Readability Rewrite -> Claude Final SEO Snippet Optimization
if (!wf.connections['Claude Humanised Readability Rewrite']) wf.connections['Claude Humanised Readability Rewrite'] = { main: [[]] };
wf.connections['Claude Humanised Readability Rewrite'].main[0] = wf.connections['Claude Humanised Readability Rewrite'].main[0].filter(t => !nodesToDelete.includes(t.node));
wf.connections['Claude Humanised Readability Rewrite'].main[0].push({ node: 'Claude Final SEO Snippet Optimization', type: 'main', index: 0 });

// 3. Delete any outgoing connection entries for the deleted nodes
for (const name of nodesToDelete) {
    if (wf.connections[name]) {
        delete wf.connections[name];
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Successfully removed all redundant Merge and Wait nodes and bypassed them.');
