const fs = require('fs');
const path = require('path');

const filename = 'DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json';
const workingDir = 'c:\\Users\\A.hydar\\Documents\\production\\Skywide-project-main';
const filePath = path.join(workingDir, filename);

const newPrompt = `You are an expert Content Editor and QA Specialist.
Your task is to fix specific validation errors in the provided article without compromising its quality, tone, or SEO value.

# Validation Issues to Fix:
{{ $json.validation_issues }}

# Critical Constraints:
1. **Fix ONLY the issues listed.** Do not rewrite the entire article unless necessary.
2. **Maintain Page Intent:** {{ $('Webhook').first().json.body.page_intent }}
   - Ensure the content still serves this intent (e.g., Informational, Transactional).
3. **Preserve Client Identity:**
   - Client Name: {{ $('Webhook').first().json.body.client_name }}
   - Must appear naturally in the first two sentences if that was the error.
4. **Tone Check:** Keep the "friend giving advice" conversational voice.
5. **Word Count:** Attempt to stay near the original length.

# Input Content:
{{ $json.content || $json.text }}

# Output:
Return ONLY the corrected article content.`;

try {
    const content = fs.readFileSync(filePath, 'utf8');
    let workflow = JSON.parse(content);
    if (Array.isArray(workflow)) workflow = workflow[0];

    const node = workflow.nodes.find(n => n.name === 'QA Rewriter Agent');
    if (node) {
        node.parameters.text = newPrompt;
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
        console.log('Successfully updated QA Rewriter prompt.');
    } else {
        console.error('Could not find QA Rewriter Agent node.');
    }

} catch (err) {
    console.error('Error:', err);
}
