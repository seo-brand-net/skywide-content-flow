const fs = require('fs');
const path = require('path');

const filename = 'DEV Skywide  Content.json';
const workingDir = 'c:\\Users\\A.hydar\\Documents\\production\\Skywide-project-main';
const filePath = path.join(workingDir, filename);

const fieldsToFix = [
    'word_count',
    'client_name',
    'page_intent',
    'primary_keywords',
    'secondary_keywords',
    'semantic_theme',
    'tone',
    'audience',
    'title',
    'creative_brief',
    'article_type'
];

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filename}`);
        process.exit(1);
    }

    let content = fs.readFileSync(filePath, 'utf8');

    fieldsToFix.forEach(field => {
        // Regex to catch {{ $json.field }} or {{$json.field}}
        // We replace it with {{ $('Webhook1').first().json.body.field }}
        // We use .first() as it is the robust way to access global webhook data in n8n v1+

        const regex = new RegExp(`\\{\\{\\s*\\$json\\.${field}\\s*\\}\\}`, 'g');
        const replacement = `{{ $('Webhook1').first().json.body.${field} }}`;

        // Also check for 'Clean1' references if the user wants strictly Webhook1?
        // User only mentioned "$json.word_count". I will stick to that for now to avoid breaking calculated fields in Clean1 if any.
        // But previously I saw references to Clean1. 
        // I will focus on $json first as requested.

        if (regex.test(content)) {
            console.log(`Replacing implicit references to ${field}...`);
            content = content.replace(regex, replacement);
        }
    });

    // Also checking for the specific example user gave: {{ $json.word_count }}
    // The loop above covers it.

    fs.writeFileSync(filePath, content);
    console.log(`Successfully Enforced Webhook References in ${filename}`);

} catch (err) {
    console.error(err);
}
