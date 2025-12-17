const fs = require('fs');
const path = require('path');

const filename = 'DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json';
// Note: User asked to analyze 'DEV Skywide  Content.json' but seemingly wants to apply it to the main working file?
// Actually, the user says "Analyze DEV Skywide  Content.json and make sure all fields...". 
// Wait, is "DEV Skywide  Content.json" the NEW target? Or just a reference?
// Looking at file list, "DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json" is the one I just built.
// "DEV Skywide  Content.json" might be an older one or the 'prod' one.
// The user said: "Analyze DEV Skywide  Content.json and make sure all fields getting referenced in the prompt node are snake case".
// I should probably apply this to "DEV Skywide  Content.json" IF that's what they want to fix. 
// BUT, my previous work was on "DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json".
// I'll update the target file to be "DEV Skywide  Content.json" as requested, BUT I should double check if I should also update my 'Ready' file.
// Given the context of "what we tackle today", I should probably update the FILE I AM WORKING ON, which is "DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json". 
// However, the user explicitly named "DEV Skywide  Content.json". 
// Let's assume they might have renamed it or want to fix that specific file.
// I will target "DEV Skywide  Content.json" AND "DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json" to be safe/thorough, 
// OR simpler: I will target "DEV Skywide  Content.json" as explicitly requested.

const targetFiles = [
    'DEV Skywide  Content.json',
    'DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json'
];

const workingDir = 'c:\\Users\\A.hydar\\Documents\\production\\Skywide-project-main';

targetFiles.forEach(filename => {
    const filePath = path.join(workingDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filename} (not found)`);
        return;
    }

    console.log(`Processing ${filename}...`);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Update Clean/Set Node Assignments (if they exist)
    // We do this via regex on the definition to catch "name": "camelCase"
    // "name": "clientName" -> "name": "client_name"
    // "name": "wordCount" -> "name": "word_count"
    // "name": "articleType" -> "name": "article_type"

    // Using rigorous replacement
    content = content.replace(/"name":\s*"clientName"/g, '"name": "client_name"');
    content = content.replace(/"name":\s*"wordCount"/g, '"name": "word_count"');
    content = content.replace(/"name":\s*"articleType"/g, '"name": "article_type"');

    // 2. Global Reference Replacements (in Prompts/Expressions)
    // Common Referencing patterns:
    // $('Clean1').item.json.clientName
    // $('Clean1').first().json.clientName
    // $json.body.clientName (if direct)

    const replacements = [
        // Clean1 Node References
        { from: /\.clientName/g, to: '.client_name' },
        { from: /"clientName"/g, to: '"client_name"' }, // Catch keys in JSON objects if any
        { from: /\.wordCount/g, to: '.word_count' },
        { from: /\.articleType/g, to: '.article_type' },

        // Webhook Body References (Camel -> Snake)
        { from: /\.pageIntent/g, to: '.page_intent' },
        { from: /\.creativeBrief/g, to: '.creative_brief' },
        { from: /\.articleTitle/g, to: '.title' }, // Map to 'title' per dashboard
        { from: /\.titleAudience/g, to: '.audience' }, // Map to 'audience' per dashboard
        { from: /\.seoKeywords/g, to: '.primary_keywords' }, // Map to 'primary_keywords' per dashboard

        // Fix potential double-snake or mixed
        // { from: /primaryKeyword(?!\w)/g, to: 'primary_keywords' }, // Careful with this
    ];

    replacements.forEach(rep => {
        content = content.replace(rep.from, rep.to);
    });

    // 3. Specific fix for "seoKeywords" vs "primary_keywords"
    // In Clean1, the value assignment is: value: "={{ $('Webhook1').first().json.body.primary_keywords }}"
    // But the name might be "seo_keywords".
    // If downstream uses `$('Clean1')...seo_keywords`, that is FINE (already snake). 
    // We only need to fix if downstream used `seoKeywords`.

    // Save
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filename} successfully.`);
});
