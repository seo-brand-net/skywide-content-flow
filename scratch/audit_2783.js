require('dotenv').config();
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const fs = require('fs');

function extractText(json) {
    if (!json) return '';
    const t = json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
    return typeof t === 'string' ? t : JSON.stringify(t);
}

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2783?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const rd = res.data?.resultData?.runData || {};

    // 1. Pull brief from webhook
    let brief = {};
    for (let i = 0; i <= 3; i++) {
        const wh = rd['Webhook1']?.[i]?.data?.main?.[0]?.[0]?.json;
        if (wh) { brief = wh.body || wh; break; }
    }

    // 2. Pull each stage
    const stages = [
        { node: 'Pre-Draft Fact Checker',                label: 'Pre-Draft Fact Checker' },
        { node: 'Claude Draft (Claude Opus 3)1',         label: 'Claude Draft' },
        { node: 'Post-Draft Fact Checker1',              label: 'Post-Draft Fact Checker' },
        { node: 'Data Check & Research Gaps1',            label: 'Data Check' },
        { node: 'Claude Apply Recommendations1',          label: 'Apply Recommendations' },
        { node: 'Claude EEAT Injection1',                 label: 'EEAT Injection' },
        { node: 'Claude NLP & PR Optimization',           label: 'NLP & PR' },
        { node: 'Claude Humanised Readability Rewrite',   label: 'Humanised Rewrite' },
        { node: 'Claude Final SEO Snippet Optimization',  label: 'Final SEO Snippet' },
    ];

    const stageOutputs = {};
    for (const stage of stages) {
        for (let i = 0; i <= 5; i++) {
            const d = rd[stage.node]?.[i]?.data?.main?.[0]?.[0]?.json;
            const text = extractText(d);
            if (text && text.length > 100) {
                stageOutputs[stage.label] = { text, runIdx: i };
                break;
            }
        }
    }

    // 3. Save brief and final article to files
    fs.writeFileSync('scratch/agribilt_brief.txt',
        'BRIEF:\n' +
        'Client: ' + brief.client_name + '\n' +
        'Title: ' + brief.article_title + '\n' +
        'Website: ' + brief.client_website_url + '\n' +
        'Target Word Count: ' + brief.word_count + '\n' +
        'Primary Keyword: ' + brief.primary_keyword + '\n\n' +
        'Full Brief:\n' + (brief.brief || brief.content_brief || brief.brief_text || JSON.stringify(brief, null, 2))
    );

    const finalStages = ['Final SEO Snippet', 'Humanised Rewrite', 'NLP & PR', 'EEAT Injection'];
    let finalText = '';
    let finalLabel = '';
    for (const label of finalStages) {
        if (stageOutputs[label]) { finalText = stageOutputs[label].text; finalLabel = label; break; }
    }

    fs.writeFileSync('scratch/agribilt_final_article.txt', finalText);
    console.log('Saved brief to scratch/agribilt_brief.txt');
    console.log('Saved final article to scratch/agribilt_final_article.txt (' + finalLabel + ')');

    // 4. Summary
    console.log('\n=== BRIEF SUMMARY ===');
    console.log('Client:', brief.client_name);
    console.log('Title:', brief.article_title);
    console.log('Website:', brief.client_website_url);
    console.log('Target words:', brief.word_count);
    console.log('Primary keyword:', brief.primary_keyword);

    // 5. Stage-by-stage word counts
    console.log('\n=== STAGE WORD COUNTS ===');
    for (const stage of stages) {
        const s = stageOutputs[stage.label];
        if (s) {
            const wc = s.text.replace(/[#*_\-]/g, '').split(/\s+/).filter(w => w.length > 0).length;
            console.log('  ' + stage.label + ': ' + wc + ' words');
        } else {
            console.log('  ' + stage.label + ': (not found)');
        }
    }

    // 6. Hallucination scan on final article
    const suspects = ['%', 'spanning', 'thousands of', 'documented across',
        'longitudinal', 'university', 'years of research', 'studies show',
        'research show', 'clinical experience', 'treatment centers'];
    console.log('\n=== HALLUCINATION SCAN on final article ===');
    let flagCount = 0;
    finalText.split('\n').forEach(line => {
        for (const s of suspects) {
            if (line.toLowerCase().includes(s.toLowerCase()) && line.trim().length > 10) {
                console.log('  ⚠️  ' + line.trim().substring(0, 120));
                flagCount++;
                break;
            }
        }
    });
    console.log('\nTotal flags:', flagCount, '(0 = clean ✅)');
}
run().catch(console.error);
