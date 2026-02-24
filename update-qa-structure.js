const fs = require('fs');
const path = require('path');

const FILE = 'DEV Skywide  Content (TEST v23).json';
const filePath = path.join(__dirname, FILE);

console.log('Reading workflow file...');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updated = false;

data.nodes.forEach((n, idx) => {
    // Update QA Validators (AI Agent, AI Agent1, etc)
    if (n.name.startsWith('AI Agent') && n.type === '@n8n/n8n-nodes-langchain.agent') {
        let p = n.parameters;

        if (p.text) {
            let content = p.text;

            // Add new validation rule if missing
            if (!content.includes('Brief Structure Check:')) {
                // Double quotes for safety
                const newRule = "10. Brief Structure Check: Did the article follow the exact structure and headings requested in the Creative Brief? (Compare against: {{ $('Webhook1').first().json.body.creative_brief }})";

                if (content.includes('# Output Instructions')) {
                    content = content.replace(
                        '# Output Instructions',
                        newRule + "\n\n# Output Instructions"
                    );
                } else {
                    content += "\n" + newRule;
                }

                p.text = content;
                updated = true;
                console.log("✅ Updated " + n.name + " with Brief Structure Check");
            }
        }
    }
});

if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✅ Done! QA Validators updated.');
} else {
    console.log('No QA Validators needed updating.');
}
