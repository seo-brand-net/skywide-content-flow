const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env', 'utf8');

const apiKey = env.match(/N8N_API_KEY=([^\r\n]+)/)[1].trim().replace(/^["']|["']$/g, '');
const base = env.match(/N8N_BASE_URL=([^\r\n]+)/)[1].trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.end();
    });
}

async function run() {
    console.log("Fetching latest executions...");
    const executionsRes = await n8nGet('/api/v1/executions?limit=20');
    if (!executionsRes.data || executionsRes.data.length === 0) {
        console.log("No recent executions found.");
        return;
    }
    
    let targetId = null;
    let targetData = null;
    
    for (const ex of executionsRes.data) {
        const exData = await n8nGet(`/api/v1/executions/${ex.id}?includeData=true`);
        const runData = exData.data.resultData?.runData;
        
        if (runData && runData['Webhook1']) {
            targetId = ex.id;
            targetData = runData;
            console.log(`Found Content Workflow Execution ID: ${ex.id} (Status: ${ex.status})`);
            break;
        }
    }
    
    if (!targetData) {
        console.log("Could not find any recent executions of the content workflow.");
        return;
    }
    
    const runData = targetData;
    let webhookData, finalArticle, auditorData;
    
    if (runData['Webhook1']) {
        webhookData = runData['Webhook1'][0].data.main[0][0].json.body;
        console.log("\n--- BRIEF REQUIREMENTS ---");
        console.log("Word Count Target:", webhookData.word_count);
        console.log("Primary Keywords:", webhookData.primary_keywords);
        console.log("Secondary Keywords:", webhookData.secondary_keywords);
        console.log("Client Name:", webhookData.client_name);
    }
    
    if (runData['Document Export Sanitization5']) {
        const out = runData['Document Export Sanitization5'][0].data.main[0][0].json;
        finalArticle = out.text || out.data || out.message?.content || out;
    } else if (runData['Claude Humanised Readability Rewrite']) {
        const out = runData['Claude Humanised Readability Rewrite'][0].data.main[0][0].json;
        finalArticle = out.text || out.data || out.message?.content || out;
    } else if (runData['Surgical Rewriter']) {
        const out = runData['Surgical Rewriter'][0].data.main[0][0].json;
        finalArticle = out.text || out.data || out.message?.content || out;
    } else if (runData['Claude Draft (Claude Opus 3)1']) {
        const out = runData['Claude Draft (Claude Opus 3)1'][0].data.main[0][0].json;
        finalArticle = out.text || out.data || out.message?.content || out;
    }
    
    if (runData['Structure Auditor (Pass 1)']) {
        auditorData = runData['Structure Auditor (Pass 1)'][0].data.main[0][0].json;
        console.log("\n--- AUDITOR PASS 1 RESULTS ---");
        console.log(JSON.stringify(auditorData.message?.content || auditorData, null, 2));
    }
    
    if (runData['Structure Auditor (Pass 2)']) {
        const pass2 = runData['Structure Auditor (Pass 2)'][0].data.main[0][0].json;
        console.log("\n--- AUDITOR PASS 2 RESULTS ---");
        console.log(JSON.stringify(pass2.message?.content || pass2, null, 2));
    } else {
        console.log("\n--- AUDITOR PASS 2 RESULTS ---");
        console.log("Not executed (likely bypassed because Pass 1 was perfect, or workflow failed before)");
    }
    
    console.log("\n--- FINAL ARTICLE PREVIEW ---");
    if (typeof finalArticle === 'string') {
        const wordCount = finalArticle.split(/\s+/).length;
        console.log(`Actual Word Count: ${wordCount}`);
        
        const textToLog = finalArticle.length > 2000 ? 
            finalArticle.substring(0, 1000) + '\n\n[...]\n\n' + finalArticle.substring(finalArticle.length - 1000) : 
            finalArticle;
            
        console.log(textToLog);
        fs.writeFileSync('scratch/last_article.txt', finalArticle);
    } else {
        console.log("Could not find final article text.");
    }
}
run();
