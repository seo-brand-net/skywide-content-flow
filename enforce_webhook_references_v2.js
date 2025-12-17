const fs = require('fs');
const path = require('path');

const filename = 'DEV Skywide  Content.json';
const workingDir = 'c:\\Users\\A.hydar\\Documents\\production\\Skywide-project-main';
const filePath = path.join(workingDir, filename);

// Mapping of Common Field Names (Camel/Snake/Variations) to the authoritative Webhook Snake Case Key
const mapping = {
    // Word Count
    'word_count': 'word_count',
    'wordCount': 'word_count',

    // Client Name
    'client_name': 'client_name',
    'clientName': 'client_name',

    // Page Intent
    'page_intent': 'page_intent',
    'pageIntent': 'page_intent',

    // Keywords
    'primary_keywords': 'primary_keywords',
    'primaryKeywords': 'primary_keywords',
    'seo_keywords': 'primary_keywords', // Clean1 used seo_keywords to map to webhook primary_keywords
    'seoKeywords': 'primary_keywords',

    // Audience
    'audience': 'audience',
    'target_audience': 'audience', // Clean1 used target_audience
    'titleAudience': 'audience',

    // Creative Brief
    'creative_brief': 'creative_brief',
    'creativeBrief': 'creative_brief',
    'brief_text': 'creative_brief',

    // Article Type
    'article_type': 'article_type',
    'articleType': 'article_type',

    // Tone
    'tone': 'tone',

    // Semantic Theme
    'semantic_theme': 'semantic_theme',
    'semanticTheme': 'semantic_theme'
};

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filename}`);
        process.exit(1);
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let replacementCount = 0;

    // Pattern 1: $json.<field>
    // Pattern 2: $('Clean1').first().json.<field>
    // Pattern 3: $('Clean1').item.json.<field>
    // Pattern 4: $('Clean1').json.<field> (rare but possible)

    Object.keys(mapping).forEach(sourceKey => {
        const targetKey = mapping[sourceKey];
        const targetExpression = `{{ $('Webhook1').first().json.body.${targetKey} }}`;

        const patterns = [
            `\\{\\{\\s*\\$json\\.${sourceKey}\\s*\\}\\}`, // {{ $json.wordCount }}
            `\\{\\{\\s*\\$\\('Clean1'\\)\\.first\\(\\)\\.json\\.${sourceKey}\\s*\\}\\}`, // {{ $('Clean1').first().json.wordCount }}
            `\\{\\{\\s*\\$\\('Clean1'\\)\\.item\\.json\\.${sourceKey}\\s*\\}\\}`, // {{ $('Clean1').item.json.wordCount }}
            // Should also Handle cases where naming matches exactly but source is Clean1
        ];

        patterns.forEach(pat => {
            const regex = new RegExp(pat, 'g');
            if (regex.test(content)) {
                const count = (content.match(regex) || []).length;
                console.log(`Replacing ${count} instances of ${sourceKey} pattern... -> ${targetKey}`);
                content = content.replace(regex, targetExpression);
                replacementCount += count;
            }
        });
    });

    if (replacementCount > 0) {
        fs.writeFileSync(filePath, content);
        console.log(`Successfully replaced ${replacementCount} references in ${filename}.`);
    } else {
        console.log("No matching references found to replace.");
    }

} catch (err) {
    console.error(err);
}
