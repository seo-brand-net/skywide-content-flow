const https = require('https');
const url = require('url');

const WEBHOOK_URL = 'https://seobrand.app.n8n.cloud/webhook/content-engine-test-unique';

const payload = {
    id: "test-wi-pdh-001",
    user_id: "67024671-e8eb-45a1-83c2-f4b7037aa7a6",
    article_title: "What Counts as PDH Credit in Wisconsin? CEU to PDH Conversion for WI Engineers",
    title_audience: "Licensed Wisconsin PEs",
    seo_keywords: "wisconsin pe pdh",
    article_type: "Blogs",
    client_name: "PDH Pro",
    creative_brief: `Blog Title: What Counts as PDH Credit in Wisconsin? CEU to PDH Conversion for WI Engineers Reading Time: ~6 minutes Target Word Count: ~1,000 words
Audience: Licensed Wisconsin PEs who are actively accumulating continuing education hours and have questions about what qualifies as PDH credit, how CEUs translate to PDHs, and what documentation to keep. Likely mid-cycle and looking to confirm they're on track.
Tone: Practical, specific, and confidence-building. These are engineers who think in systems — they want clear rules and formulas. Avoid vagueness. Reward precision.
Brand Positioning: PDH Pro as the straightforward solution for Wisconsin PE continuing education — courses designed to deliver verified, documentable PDH credit with zero guesswork.
SEO Guidelines Primary Keyword: wisconsin pe pdh — Must appear in: H1 (title), first paragraph, at least two additional times naturally throughout Secondary Keyword: wisconsin pe continuing education requirements — Must appear in: at least one H2 heading, at least two additional times naturally in the body Semantic Themes (use each once organically): ceu to pdh conversion; pdh credits for engineers Internal Links (verify URLs before publishing):
* Wisconsin PE Continuing Education — https://pdh-pro.com/pe-continuing-education/wisconsin/
* Ethics Courses — https://pdh-pro.com/courses/ethics/
* Full Course Catalog — https://pdh-pro.com/courses/
* How PDH Pro Works — https://pdh-pro.com/how-it-works/
Table of Contents
1. Introduction
2. What Is a PDH?
3. Wisconsin PE Continuing Education Requirements at a Glance
4. What Activities Count Toward Wisconsin PE PDH Credit?
5. CEU to PDH Conversion: How the Math Works
6. What Does NOT Count as PDH Credit in Wisconsin?
7. How Many PDH Hours Can Come From Different Activity Types?
8. Documentation: What to Keep and for How Long
9. How to Find Quality PDH Courses for Wisconsin Engineers
10. FAQs
11. Conclusion
12. Key Takeaways
13. Cited Sources
Content Outline & Writing Instructions
1. Introduction — Purpose: Validate the confusion and promise clarity. Open by noting that wisconsin pe pdh requirements are relatively flexible — but that flexibility sometimes creates uncertainty about what actually counts. Acknowledge the common questions: Does a webinar count? How do CEUs convert? Can I use teaching hours? Use the primary keyword naturally in the first paragraph. Promise a clear, rules-based breakdown.
2. What Is a PDH? — Purpose: Establish foundational terminology. PDH stands for Professional Development Hour — one contact hour (50–60 minutes) of qualifying continuing education or professional development activity. PDHs are the unit of measurement for PE continuing education across most U.S. states. Wisconsin uses PDHs as the standard unit under Administrative Code Ch. A-E 240.
3. Wisconsin PE Continuing Education Requirements at a Glance (H2 — use secondary keyword) — Purpose: Give readers the baseline before diving into detail. 30 PDH hours required per biennial renewal cycle. 2 of those hours must be in professional or business ethics. No approved provider list — engineers self-certify compliance; DSPS may audit. The wisconsin pe continuing education requirements do not restrict hours by subject category (beyond the ethics mandate) — engineers choose relevant technical and professional content. Re-use secondary keyword: the flexibility within the wisconsin pe continuing education requirements means engineers can tailor their learning to their practice area.
4. What Activities Count Toward Wisconsin PE PDH Credit? — Purpose: Comprehensive, organized list of qualifying activities. Structured courses from PDH providers (online or in-person). College/university courses: 1 semester credit hour = 15 PDH; 1 quarter credit hour = 10 PDH. Attendance at professional society meetings with a technical program component (at stated PDH value). Presenting technical papers or seminar sessions. Teaching an engineering course for the first time (not repeat teaching of the same course). Authoring published technical articles (PDH value varies). Participation in structured study groups with documented learning outcomes. Webinars and virtual training from recognized organizations. Re-use primary keyword: for most engineers, the bulk of wisconsin pe pdh hours come from structured online courses — the most straightforward path to documented compliance.

5. CEU to PDH Conversion: How the Math Works (use semantic theme) — Purpose: Answer a very common specific question. CEU (Continuing Education Unit) is a different measurement: 1 CEU = 10 PDH. So 0.5 CEU = 5 PDH; 3 CEU = 30 PDH. The ceu to pdh conversion formula applies universally: multiply CEUs by 10 to get PDH hours. Many professional societies and course providers issue CEUs — engineers should confirm the equivalency before claiming hours. PDH Pro courses are listed in PDH hours directly, eliminating conversion confusion.
6. What Does NOT Count as PDH Credit in Wisconsin? — Purpose: Prevent common compliance errors. Routine daily work activities and on-the-job experience (even highly technical work). Attending meetings without a structured educational component. Reading technical journals without a structured quiz or learning assessment component. Repeat delivery of the same course as an instructor. Activities completed before the current renewal cycle opened.
7. How Many PDH Hours Can Come From Different Activity Types? — Purpose: Clarify if there are caps by category. Wisconsin Administrative Code Ch. A-E 240 does not impose caps on hours from self-study, online courses, or other specific formats — unlike some states. All 30 PDH hours may be completed via online self-study courses. The only hard requirement is that 2 of the 30 hours cover ethics. Engineers with teaching, publishing, or leadership activities should document those separately with supporting materials (syllabi, publication records, meeting agendas).
8. Documentation: What to Keep and for How Long — Purpose: Practical compliance guidance. DSPS does not require CE submission at renewal but may audit licensees at any time. Retain records for a minimum of four years from the renewal date. For each activity, document: provider/sponsor name, topic/course title, date(s), PDH hours, and certificate of completion if applicable. pdh credits for engineers are only as defensible as the documentation behind them — incomplete records are the most common audit problem.
9. How to Find Quality PDH Courses for Wisconsin Engineers — Purpose: Bridge to PDH Pro solution. PDH Pro offers Wisconsin-compliant courses across engineering disciplines — civil, structural, environmental, electrical, mechanical, and more. Courses are self-paced, available 24/7, and include a certificate of completion with all audit-required information. Ethics courses are clearly labeled and count toward the 2-hour mandate. Link to Wisconsin CE page and course catalog.
10. FAQs — Q1: How many PDH hours does Wisconsin require for PE renewal? A: 30 PDH hours per two-year renewal cycle, including 2 hours of professional or business ethics. Q2: What is the CEU to PDH conversion in Wisconsin? A: 1 CEU equals 10 PDH hours. Multiply any CEU value by 10 to determine the PDH equivalent. Q3: Can all Wisconsin PE PDH hours come from online courses? A: Yes. Wisconsin does not cap online or self-study hours — all 30 PDHs may be completed online, provided courses meet content standards. Q4: Do I need DSPS-approved courses for Wisconsin PE PDH credit? A: No. Wisconsin does not maintain a pre-approved provider list. Engineers self-certify compliance and must retain documentation for audit purposes.
11. Conclusion — Restate: wisconsin pe pdh requirements are among the more flexible in the country — but flexibility requires engineers to be deliberate about what they document and how. Emphasize that knowing the rules — especially the CEU conversion and the ethics mandate — makes compliance simple. Close with a direct link to PDH Pro as the most efficient way to complete Wisconsin PE PDH hours.
12. Key Takeaways:
* Wisconsin requires 30 PDH hours per biennial renewal cycle, with 2 hours dedicated to ethics.
* 1 CEU = 10 PDH — multiply CEUs by 10 for the equivalent PDH value.
* All 30 hours may come from online courses; Wisconsin imposes no format-based caps.
* Routine work experience does not count — only structured, documented learning activities qualify.
* DSPS may audit at any time; retain documentation for four years.
13. Cited Sources:
* Wisconsin Administrative Code Ch. A-E 240 — https://docs.legis.wisconsin.gov/code/admin_code/a-e/240
* Wisconsin DSPS — PE Continuing Education — https://dsps.wi.gov/Pages/Professions/ProfessionalEngineer/Default.aspx
* NCEES — Model Law for Professional Engineers — https://ncees.org/engineering/model-law/
* NSPE — Continuing Education Resources — https://www.nspe.org/resources/continuing-education`,
    primary_keywords: "wisconsin pe pdh",
    secondary_keywords: "wisconsin pe continuing education requirements",
    semantic_themes: "ceu to pdh conversion, pdh credits for engineers",
    tone: "Practical, specific, and confidence-building. Avoid vagueness. Reward precision.",
    word_count: 1000,
    page_intent: "Informational",
    is_ab_test: true,
    request_status: 'test',
    runId: "test-run-wi-pdh-" + Date.now(),
    timestamp: new Date().toISOString(),
};

const body = JSON.stringify(payload);
const parsedUrl = url.parse(WEBHOOK_URL);

const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

console.log(`Sending test request to: ${WEBHOOK_URL}`);
console.log(`Payload: "${payload.article_title}"`);
console.log(`Word count target: ${payload.word_count}`);
console.log(`Client: ${payload.client_name}`);
console.log('---');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
            const parsed = JSON.parse(data);
            console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch {
            console.log('Response:', data);
        }
        console.log('\nWorkflow triggered. Check n8n for execution status.');
    });
});

req.on('error', (err) => {
    console.error('Request failed:', err.message);
});

req.write(body);
req.end();
