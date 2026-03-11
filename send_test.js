// Test script — sends Natalie's content request to the production webhook
// Usage: node send_test.js

const https = require('https');
const url = require('url');

const WEBHOOK_URL = 'https://seobrand.app.n8n.cloud/webhook/content-engine-dev';

const payload = {
    id: "bbece3cc-fa94-4423-8fe5-2c94a487a032",
    user_id: "67024671-e8eb-45a1-83c2-f4b7037aa7a6",
    article_title: "Stress, Chronic Illness & Anxiety: Why Physical Health Matters in Mental Wellness for Teens",
    title_audience: "Parents and Caregivers",
    seo_keywords: "",
    article_type: "Blogs",
    client_name: "Paradigm Treatment",
    creative_brief: `Blog Brief: Stress, Chronic Illness & Anxiety: Why Physical Health Matters in Mental Wellness for Teens
Reading Time: ~6 minutes
Target Word Count: 800 words
Audience
Parents and caregivers of teens and adolescents experiencing stress, anxiety, or chronic health conditions — especially those seeking to understand how physical health impacts emotional well-being.
Tone
Compassionate, educational, reassuring, clinical yet accessible — validating parental concern without fear-based messaging.
Brand Positioning
Trauma-informed, evidence-based, developmental, family-engaged — emphasizing whole-person care and the mind–body connection without blame.

SEO Guidelines
Primary Keyword
Teen Stress and Anxiety
Must appear in:
H1 (title)
First paragraph
At least two additional times naturally throughout the article
Secondary Keyword
Exercise and Adolescent Mental Health
Must appear in:
At least one H2 heading
At least two additional times naturally in the body
Semantic Themes
Use each once organically:
How to Help a Teenager With Stress and Anxiety
Exercise and Mental Health in Adolescents

Internal Links:
https://paradigmtreatment.com/mental-health-treatment-for-teens/
https://paradigmtreatment.com/mental-health-treatment-for-teens/anxiety-treatment-for-teens/
https://paradigmtreatment.com/treatment-approach/residential-treatment-centers-for-youth/
https://paradigmtreatment.com/treatment-approach/young-adult-residential-treatment/
https://paradigmtreatment.com/contact-paradigm-treatment/

Table of Contents
Introduction
Understanding Teen Stress and Anxiety
The Link Between Physical Health and Mental Wellness
Exercise and Adolescent Mental Health
Chronic Illness, Pain, and Anxiety in Teens
How to Help a Teenager With Stress and Anxiety
When Physical and Mental Health Need Integrated Care
FAQs
Conclusion
Key Takeaways
Cited Sources

Content Outline & Writing Instructions
1. Introduction
Purpose: Frame the mind–body connection and normalize parental concern.
Acknowledge how stress and anxiety often coexist with physical health challenges in teens.
Introduce Teen Stress and Anxiety as common but meaningful concerns that deserve a holistic approach.
Emphasize that physical health — including exercise, sleep, and chronic illness management — plays a critical role in emotional regulation and resilience.
Use the focus keyword naturally in the first paragraph.

2. Understanding Teen Stress and Anxiety
Purpose: Define stress and anxiety in adolescence.
Explain how teen stress differs from adult stress due to developmental and neurologic factors.
Describe common stressors (school pressure, social expectations, health issues).
Reinforce that persistent stress can contribute to anxiety symptoms when left unaddressed.

3. The Link Between Physical Health and Mental Wellness
Purpose: Establish the biological connection between body and mind.
Explain how stress hormones, inflammation, sleep disruption, and physical discomfort impact emotional health.
Highlight that physical health challenges can intensify Teen Stress and Anxiety.
Emphasize that mental wellness is not separate from physical well-being.

4. Exercise and Adolescent Mental Health
Purpose: Highlight movement as a protective and supportive factor.
Use Exercise and Adolescent Mental Health in the H2 and body copy.
Explain how regular physical activity supports mood regulation, stress reduction, and nervous system balance.
Introduce Exercise and Mental Health in Adolescents once organically.
Emphasize that exercise does not need to be intense or performance-based to be beneficial.
Reinforce that movement can be adapted for teens with anxiety or physical limitations.

5. Chronic Illness, Pain, and Anxiety in Teens
Purpose: Address the emotional impact of ongoing physical conditions.
Discuss how chronic illness, pain, or medical conditions can heighten anxiety and stress.
Acknowledge feelings of loss of control, isolation, or frustration common in teens managing health conditions.
Emphasize the importance of coordinated medical and mental health support.

6. How to Help a Teenager With Stress and Anxiety
Purpose: Provide practical, compassionate parental guidance.
Introduce How to Help a Teenager With Stress and Anxiety naturally.
Encourage open conversations about physical symptoms, stress, and emotions.
Suggest supporting healthy routines (movement, sleep, nutrition) without pressure.
Reinforce observing patterns rather than isolated behaviors.

7. When Physical and Mental Health Need Integrated Care
Purpose: Normalize professional support and integrated treatment.
Explain when stress and anxiety begin to interfere with daily functioning or physical health management.
Highlight the benefits of integrated care that addresses both physical and mental health needs.
Emphasize early intervention and whole-person treatment.

8. FAQs
Q1: Can physical health issues cause anxiety in teens?
A: Yes — chronic illness, pain, and fatigue can increase stress and anxiety symptoms.
Q2: Does exercise really help teen anxiety?
A: Regular movement supports mood regulation and stress reduction.
Q3: What if my teen can't exercise due to illness?
A: Gentle, adaptive movement and other body-based supports can still help.
Q4: Should mental and physical health be treated together?
A: Yes — integrated care leads to better outcomes for teens.

9. Conclusion
Reinforce that understanding Teen Stress and Anxiety requires looking at the whole person.
Emphasize the role of physical health, movement, and chronic illness management in emotional wellness.
Encourage parents to seek integrated, compassionate support rather than addressing symptoms in isolation.

10. Key Takeaways
Teen stress and anxiety are closely linked to physical health.
Exercise supports adolescent mental health in accessible ways.
Chronic illness can intensify emotional stress in teens.
Knowing how to help a teenager with stress and anxiety starts with whole-person care.
Integrated treatment supports long-term resilience.`,
    primary_keywords: ["Teen Stress and Anxiety"],
    secondary_keywords: ["Exercise and Adolescent Mental Health"],
    semantic_themes: ["How to Help a Teenager With Stress and Anxiety, Exercise and Mental Health in Adolescents"],
    tone: "Compassionate, educational, reassuring, clinical yet accessible. Validates parental concern without fear-based messaging.",
    word_count: 800,
    page_intent: "Informational",
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
