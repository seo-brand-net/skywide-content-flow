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

function getField(runData, nodeName, field) {
    const run = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.json;
    if (!run) return null;
    const val = run[field];
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return null;
}

function getNestedText(runData, nodeName, field, subfield) {
    const run = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.json;
    if (!run) return null;
    const obj = run[field];
    if (!obj) return null;
    if (subfield && obj[subfield]) return typeof obj[subfield] === 'string' ? obj[subfield] : JSON.stringify(obj[subfield]);
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

async function main() {
    const EXEC_IDS = process.argv.slice(2);
    const titles = {
        2911: 'Signs of Reactive Attachment Disorder in Young Adults',
        2910: 'Reactive Attachment Disorder in Older Teens and Young Adults'
    };

    for (const execId of EXEC_IDS) {
        const detail = await n8nGet(`/api/v1/executions/${execId}?includeData=true`);
        const ex = JSON.parse(detail.body);
        const runData = ex.data?.resultData?.runData || {};

        const wh = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body || {};

        let report = '';
        const w = (s) => { report += s + '\n'; };

        w(`${'='.repeat(70)}`);
        w(`EXECUTION ${execId}: ${titles[execId]}`);
        w(`${'='.repeat(70)}`);
        w(`Client: ${wh.client_name}`);
        w(`Word Count Target: ${wh.word_count}`);
        w(`Primary Keyword: ${(wh.primary_keyword || wh.primary_keywords)}`);
        w(`Secondary Keywords: ${wh.secondary_keywords}`);
        w('');

        // Claims
        const claimsRaw = runData['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json?.output;
        if (claimsRaw?.placement_manifest) {
            w(`── CLAIMS MANIFEST (${claimsRaw.placement_manifest.length} claims) ──`);
            claimsRaw.placement_manifest.forEach((c, i) => {
                w(`  [${i+1}] [${c.claim_type || 'unknown'}] ${c.claim_text || JSON.stringify(c).substring(0,100)}`);
            });
            w('');
        }

        // Verified claims summary
        const vcpOut = runData['Verified Claims Parser']?.[0]?.data?.main?.[0]?.[0]?.json?.output;
        if (vcpOut?.summary) {
            w(`── VERIFIED CLAIMS SUMMARY ──`);
            w(`  Input: ${vcpOut.summary.total_input} | Verified: ${vcpOut.summary.total_verified} | Corrected: ${vcpOut.summary.total_corrected} | Dropped: ${vcpOut.summary.total_dropped}`);
            w('');
        }

        // Pre-draft fact check
        const preFC = runData['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json?.choices?.[0]?.message?.content || '';
        if (preFC) {
            w(`── PRE-DRAFT FACT CHECK ──`);
            w(preFC);
            w('');
        }

        // The Draft
        const draft = runData['Claude Draft (Claude Opus 3)1']?.[0]?.data?.main?.[0]?.[0]?.json?.text || '';
        if (draft) {
            w(`── CLAUDE DRAFT ──`);
            w(draft);
            w('');
        }

        // Post-draft fact check
        const postFC = runData['Post-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json?.choices?.[0]?.message?.content || '';
        if (postFC) {
            w(`── POST-DRAFT FACT CHECK ──`);
            w(postFC);
            w('');
        }

        // Final article — try .data field (LangChain chain nodes output to .data as string)
        const finalSEO = runData['Claude Final SEO Snippet Optimization']?.[0]?.data?.main?.[0]?.[0]?.json?.data;
        const humanised = runData['Claude Humanised Readability Rewrite']?.[0]?.data?.main?.[0]?.[0]?.json?.data;
        const surgical = runData['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json?.data;
        const docExport = runData['Document Export Sanitization5']?.[0]?.data?.main?.[0]?.[0]?.json?.message?.content
                        || runData['Document Export Sanitization5']?.[0]?.data?.main?.[0]?.[0]?.json?.message?.text || '';

        const finalArticle = (typeof finalSEO === 'string' && finalSEO.length > 500 ? finalSEO : null)
            || (typeof surgical === 'string' && surgical.length > 500 ? surgical : null)
            || (typeof humanised === 'string' && humanised.length > 500 ? humanised : null)
            || docExport || '';

        if (finalArticle) {
            w(`── FINAL ARTICLE ──`);
            w(finalArticle);
        } else {
            // If data is an object, stringify it
            const candidates = ['Claude Final SEO Snippet Optimization', 'Surgical Rewriter', 'Claude Humanised Readability Rewrite'];
            for (const cn of candidates) {
                const nd = runData[cn]?.[0]?.data?.main?.[0]?.[0]?.json;
                if (nd) {
                    w(`── FINAL ARTICLE (from "${cn}") ──`);
                    w(JSON.stringify(nd.data || nd, null, 2).substring(0, 30000));
                    break;
                }
            }
        }

        // Structure Audit
        const audit1 = runData['Structure Auditor (Pass 1)']?.[0]?.data?.main?.[0]?.[0]?.json?.message?.content || '';
        const audit2 = runData['Structure Auditor (Pass 2)']?.[0]?.data?.main?.[0]?.[0]?.json?.message?.content || '';
        const gate1Pass = (runData['Structure Audit Gate']?.[0]?.data?.main?.[0]?.length || 0) > 0;
        const gate2Pass = (runData['Structure Audit Gate 2']?.[0]?.data?.main?.[0]?.length || 0) > 0;
        const flagged = (runData['Flag For Human Review']?.[0]?.data?.main?.[0]?.length || 0) > 0;

        w(`── STRUCTURE AUDIT ──`);
        w(`  Pass 1: ${gate1Pass ? '✅ Passed Gate' : '❌ Sent to Surgical Rewriter'}`);
        w(`  Pass 2: ${gate2Pass ? '✅ Passed Gate 2' : '❌ Flagged for Human Review'}`);
        w(`  Flagged for Human Review: ${flagged ? '⚠️  YES' : 'No'}`);
        w('');
        if (audit1) { w('Structure Audit Pass 1 Result:'); w(audit1); }
        if (audit2) { w('\nStructure Audit Pass 2 Result:'); w(audit2); }

        const filename = `scratch/exec_${execId}_full_qa.txt`;
        fs.writeFileSync(filename, report);
        console.log(`✅ Full QA for exec ${execId} saved → ${filename} (${report.length} chars)`);
    }
}

main().catch(e => console.error('Fatal:', e.message));
