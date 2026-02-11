"""Update Send Test Result to capture real scoring data from upstream agents."""
import json

filepath = r"DEV Skywide  Content (20).json"
with open(filepath, "r", encoding="utf-8") as f:
    wf = json.load(f)

for node in wf["nodes"]:
    if node.get("name") == "Send Test Result":
        node["parameters"]["jsCode"] = r"""
// === Capture Article Content ===
const inputData = $input.item.json;
let articleContent = inputData.message?.content
    || inputData.text
    || inputData.content
    || inputData.article_content
    || '';

if (typeof articleContent === 'object') {
    articleContent = JSON.stringify(articleContent);
}

// Fallback: try upstream nodes
if (!articleContent || articleContent.length < 100) {
    const tryNodes = [
        'Document Export Sanitization3', 'Document Export Sanitization4',
        'Document Export Sanitization6', 'Document Export Sanitization7',
        'Document Export Sanitization',
        '1st Improvement LLM2', '1st Improvement LLM3',
        'Improvement LLM2', 'Improvement LLM3',
        'Claude Humanised Readability Rewrite'
    ];
    for (const nodeName of tryNodes) {
        try {
            const data = $node[nodeName]?.json;
            if (data) {
                const text = data.message?.content || data.text || data.content || '';
                if (text && typeof text === 'string' && text.length > (articleContent?.length || 0)) {
                    articleContent = text;
                }
            }
        } catch(e) {}
    }
}

// === Capture Scoring Data from Scoring Agents ===
let scoringData = null;

// Try each scoring agent in order (most recent first)
const scoringNodes = [
    '2nd Scoring Agent2', '2nd Scoring Agent3',
    '1st Scoring Agent2', '1st Scoring Agent3',
    'Scoring7', 'Scoring1'
];

for (const scoringNode of scoringNodes) {
    try {
        const data = $node[scoringNode]?.json;
        const content = data?.message?.content;
        if (content) {
            // content could be JSON object or JSON string
            scoringData = typeof content === 'string' ? JSON.parse(content) : content;
            if (scoringData?.overallScore !== undefined) break;
        }
    } catch(e) {}
}

// Build structured audit_data
const requestId = $('Webhook1').item.json.body.request_id;
const title = $('Webhook1').item.json.body.title || 'Test Article';
const wordCount = articleContent ? articleContent.split(/\s+/).filter(Boolean).length : 0;

const auditData = scoringData ? {
    // 6 category scores
    seoOptimization: scoringData.seoOptimization || 0,
    humanAuthenticity: scoringData.humanAuthenticity || 0,
    readabilityStructure: scoringData.readabilityStructure || 0,
    engagementClarity: scoringData.engagementClarity || 0,
    trustAuthority: scoringData.trustAuthority || 0,
    conversionValue: scoringData.conversionValue || 0,
    // Overall
    overallScore: scoringData.overallScore || 0,
    alignment_score: scoringData.overallScore || 0,
    // Text fields
    issues: scoringData.issues || '',
    fixes: scoringData.fixes || '',
    impact: scoringData.impact || '',
    // Meta
    alignment_summary: `Content scored ${scoringData.overallScore}/100 across 6 quality dimensions`,
    passed: (scoringData.overallScore || 0) >= 80,
    word_count: wordCount,
    title: title
} : {
    alignment_score: 0,
    alignment_summary: `Test completed - ${wordCount} words generated for "${title}"`,
    passed: false,
    word_count: wordCount,
    title: title,
    seoOptimization: 0, humanAuthenticity: 0, readabilityStructure: 0,
    engagementClarity: 0, trustAuthority: 0, conversionValue: 0,
    overallScore: 0, issues: 'Scoring data not available', fixes: '', impact: ''
};

// === Send Callback ===
console.log('Sending callback for request:', requestId);
console.log('Overall Score:', auditData.overallScore);
console.log('Content Length:', articleContent.length);

try {
    const response = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://skywide-content-flow.vercel.app/api/test-callback',
        body: {
            request_id: requestId,
            status: 'completed',
            audit_data: auditData,
            content_markdown: articleContent
        },
        headers: { 'Content-Type': 'application/json' }
    });
    
    return [{ json: {
        success: true,
        content_length: articleContent.length,
        word_count: wordCount,
        overall_score: auditData.overallScore,
        scoring_source: scoringData ? 'real' : 'fallback',
        api_response: response
    }}];
} catch (error) {
    console.error('Callback failed:', error.message);
    if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data));
        console.error('Response status:', error.response.status);
    }
    throw error;
}
"""
        print("  Updated Send Test Result with real scoring capture")
        break

with open(filepath, "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("Done!")
