const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf8');
function getEnv(key) {
    const match = env.match(new RegExp(key + '=([^\r\n]+)'));
    if (!match) return '';
    return match[1].trim().replace(/^["']|["']$/g, '');
}
const apiKey = getEnv('N8N_API_KEY');
const base = getEnv('N8N_BASE_URL').replace(/\/$/, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        };
        const req = https.request(opts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

function extractText(json) {
    if (!json) return '';
    return json.content || json.text || json.output || json.sanitizedContent
        || json.choices?.[0]?.message?.content || '';
}

async function pullExecution(id) {
    const detail = await n8nGet(`/api/v1/executions/${id}?includeData=true`);
    if (detail.status !== 200) { console.log('Error fetching', id, detail.status); return null; }
    const ex = JSON.parse(detail.body);
    return ex.data?.resultData?.runData || {};
}

async function main() {
    const EXEC_IDS = [2911, 2910];

    for (const execId of EXEC_IDS) {
        console.log(`\n${'█'.repeat(70)}`);
        console.log(`EXECUTION ${execId}`);
        console.log(`${'█'.repeat(70)}\n`);

        const runData = await pullExecution(execId);
        if (!runData) continue;

        // ── WEBHOOK INPUT ─────────────────────────────────────────────────
        const wh = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body || {};
        console.log('BRIEF INPUTS:');
        console.log('  Title:', wh.title);
        console.log('  Client:', wh.client_name);
        console.log('  Word count target:', wh.word_count);
        console.log('  Article type:', wh.article_type);
        console.log('  Primary keyword:', wh.primary_keyword);
        console.log('  Secondary keywords:', wh.secondary_keywords);

        // ── CLAIMS EXTRACTOR ─────────────────────────────────────────────
        const claimsNode = runData['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
        if (claimsNode?.output?.placement_manifest) {
            const claims = claimsNode.output.placement_manifest;
            console.log(`\nCLAIMS MANIFEST: ${claims.length} claims extracted`);
            claims.slice(0, 5).forEach((c, i) => {
                console.log(`  [${i+1}] [${c.claim_type}] ${c.claim_text?.substring(0, 100)}`);
            });
            if (claims.length > 5) console.log(`  ... and ${claims.length - 5} more`);
        }

        // ── VERIFIED CLAIMS ───────────────────────────────────────────────
        const vcpNode = runData['Verified Claims Parser']?.[0]?.data?.main?.[0]?.[0]?.json;
        if (vcpNode?.output?.placement_manifest) {
            const m = vcpNode.output;
            console.log(`\nVERIFIED CLAIMS SUMMARY:`);
            console.log(`  Total input: ${m.summary?.total_input}`);
            console.log(`  Verified: ${m.summary?.total_verified}`);
            console.log(`  Corrected: ${m.summary?.total_corrected}`);
            console.log(`  Dropped: ${m.summary?.total_dropped}`);
        }

        // ── PRE-DRAFT FACT CHECK ──────────────────────────────────────────
        const preFC = runData['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json;
        const preFCText = extractText(preFC);
        if (preFCText) {
            console.log('\nPRE-DRAFT FACT CHECK (first 800 chars):');
            console.log(preFCText.substring(0, 800));
        }

        // ── FINAL ARTICLE ─────────────────────────────────────────────────
        const outputNodes = [
            'Document Export Sanitization5',
            'Claude Final SEO Snippet Optimization',
            'Claude Humanised Readability Rewrite',
        ];
        let finalArticle = '';
        let sourceNode = '';
        for (const on of outputNodes) {
            const nd = runData[on]?.[0]?.data?.main?.[0]?.[0]?.json;
            const txt = extractText(nd);
            if (txt && txt.length > 500) {
                finalArticle = txt;
                sourceNode = on;
                break;
            }
        }

        if (finalArticle) {
            console.log(`\nFINAL ARTICLE (from "${sourceNode}") — full length: ${finalArticle.length} chars`);
            console.log('─'.repeat(60));
            console.log(finalArticle);
            fs.writeFileSync(`scratch/exec_${execId}_full_article.txt`, finalArticle);
            console.log(`\n✅ Full article saved → scratch/exec_${execId}_full_article.txt`);
        } else {
            console.log('\n⚠️  Could not find final article content in any output node.');
            // Dump available node names and content sizes for debugging
            Object.entries(runData).forEach(([name, runs]) => {
                const json = runs?.[0]?.data?.main?.[0]?.[0]?.json || {};
                const txt = extractText(json);
                if (txt.length > 100) console.log(`  "${name}" has ${txt.length} chars of text`);
            });
        }

        // ── STRUCTURE AUDIT RESULT ────────────────────────────────────────
        const auditNode = runData['Structure Auditor (Pass 1)']?.[0]?.data?.main?.[0]?.[0]?.json;
        if (auditNode) {
            console.log('\nSTRUCTURE AUDIT PASS 1:');
            console.log(JSON.stringify(auditNode).substring(0, 600));
        }
        const auditGate = runData['Structure Audit Gate']?.[0]?.data?.main;
        if (auditGate) {
            const passedDirect = auditGate[0]?.length > 0;
            const wentToSurgical = auditGate[1]?.length > 0;
            console.log('\nAudit Gate: Passed clean?', passedDirect, '| Sent to Surgical Rewriter?', wentToSurgical);
        }
    }
}

main().catch(e => console.error('Fatal:', e.message));
