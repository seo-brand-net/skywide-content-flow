const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const BASE_URL = 'seobrand.app.n8n.cloud';

function fetchExecution(id) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            path: '/api/v1/executions/' + id + '?includeData=true',
            method: 'GET',
            headers: { 'X-N8N-API-KEY': API_KEY, 'Accept': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
                else reject('Status: ' + res.statusCode + ' ' + data);
            });
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}

function extractText(nodeData) {
    if (!nodeData) return null;
    const item = nodeData[0]?.data?.main?.[0]?.[0]?.json;
    if (!item) return null;
    return item.text || item.output || item.message?.content 
        || item.choices?.[0]?.message?.content 
        || JSON.stringify(item);
}

async function analyze() {
    for (const id of ['2847', '2845']) {
        console.log('\n\n========== EXECUTION ' + id + ' ==========');
        try {
            const data = await fetchExecution(id);
            const runData = data?.data?.resultData?.runData;
            if (!runData) { console.log('No runData found'); continue; }

            console.log('\n--- NODES EXECUTED ---');
            console.log(Object.keys(runData).join(', '));

            // Webhook / Brief
            const webhookItem = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
            if (webhookItem) {
                fs.writeFileSync('scratch/exec_' + id + '_brief.txt', webhookItem.creative_brief || '');
                console.log('\n--- BRIEF ---');
                console.log('Word Count Target:', webhookItem.word_count);
                console.log('Client Name:', webhookItem.client_name);
                console.log('Brief Length (chars):', (webhookItem.creative_brief || '').length);
            }

            // Client Site Researcher
            const clientResearch = extractText(runData['Client Site Researcher']);
            if (clientResearch) {
                fs.writeFileSync('scratch/exec_' + id + '_client_research.txt', clientResearch);
                console.log('\n--- CLIENT SITE RESEARCHER ---');
                console.log('Output Length (chars):', clientResearch.length);
                console.log('Snippet:', clientResearch.substring(0, 200));
            } else {
                console.log('\n--- CLIENT SITE RESEARCHER: DID NOT RUN ---');
            }

            // Client Profile Extractor
            const profileRaw = runData['Client Profile Extractor']?.[0]?.data?.main?.[0]?.[0]?.json;
            if (profileRaw) {
                fs.writeFileSync('scratch/exec_' + id + '_profile.txt', JSON.stringify(profileRaw, null, 2));
                console.log('\n--- CLIENT PROFILE EXTRACTOR ---');
                console.log('Services:', JSON.stringify(profileRaw.services || profileRaw.output?.services));
                console.log('Unique Claims:', JSON.stringify(profileRaw.unique_claims || profileRaw.output?.unique_claims));
                console.log('Published Stats:', JSON.stringify(profileRaw.published_stats || profileRaw.output?.published_stats));
            } else {
                console.log('\n--- CLIENT PROFILE EXTRACTOR: DID NOT RUN ---');
            }

            // Claims Extractor
            const claimsRaw = runData['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
            if (claimsRaw) {
                fs.writeFileSync('scratch/exec_' + id + '_claims.txt', JSON.stringify(claimsRaw, null, 2));
                console.log('\n--- CLAIMS EXTRACTOR ---');
                console.log(JSON.stringify(claimsRaw, null, 2));
            } else {
                console.log('\n--- CLAIMS EXTRACTOR: DID NOT RUN ---');
            }

            // Pre-Draft Fact Checker
            const preFact = extractText(runData['Pre-Draft Fact Checker']);
            if (preFact) {
                fs.writeFileSync('scratch/exec_' + id + '_prefact.txt', preFact);
                console.log('\n--- PRE-DRAFT FACT CHECKER ---');
                console.log('Output Length:', preFact.length);
                console.log('Snippet:', preFact.substring(0, 300));
            } else {
                console.log('\n--- PRE-DRAFT FACT CHECKER: DID NOT RUN ---');
            }

            // Verified Claims Parser
            const verifiedRaw = runData['Verified Claims Parser']?.[0]?.data?.main?.[0]?.[0]?.json;
            if (verifiedRaw) {
                fs.writeFileSync('scratch/exec_' + id + '_verified.txt', JSON.stringify(verifiedRaw, null, 2));
                console.log('\n--- VERIFIED CLAIMS PARSER ---');
                console.log(JSON.stringify(verifiedRaw, null, 2));
            } else {
                console.log('\n--- VERIFIED CLAIMS PARSER: DID NOT RUN ---');
            }

            // Claude Draft
            const draft = extractText(runData['Claude Draft (Claude Opus 3)1']);
            if (draft) {
                fs.writeFileSync('scratch/exec_' + id + '_draft.txt', draft);
                const wordCount = draft.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0).length;
                console.log('\n--- CLAUDE DRAFT ---');
                console.log('Word Count:', wordCount);
                console.log('Snippet:', draft.substring(0, 300));
            } else {
                console.log('\n--- CLAUDE DRAFT: DID NOT RUN ---');
            }

            // QSI Bouncer
            const bouncer = extractText(runData['QSI Claims Verification Bouncer']);
            if (bouncer) {
                fs.writeFileSync('scratch/exec_' + id + '_bouncer.txt', bouncer);
                const wordCount = bouncer.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0).length;
                console.log('\n--- QSI BOUNCER ---');
                console.log('Word Count:', wordCount);
                console.log('Snippet:', bouncer.substring(0, 300));
            } else {
                console.log('\n--- QSI BOUNCER: DID NOT RUN ---');
            }

            // Errors
            console.log('\n--- ERRORS ---');
            for (const [nodeName, nodeRuns] of Object.entries(runData)) {
                if (nodeRuns[0]?.error) {
                    console.log(nodeName + ': ERROR:', JSON.stringify(nodeRuns[0].error));
                }
            }

        } catch(e) {
            console.error('Error fetching ' + id + ':', e);
        }
    }
}

analyze();
