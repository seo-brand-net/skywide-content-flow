const fs = require('fs');
const path = 'c:/Users/USER/Documents/Projects/production/skywide/DEV Skywide Content (Word Count Fix).json';
let str = fs.readFileSync(path, 'utf8');

const regexItem = /\{\{ \$\('Keyword Strategist'\)\.item\.json\.system_prompt_injection \}\}[\s\S]*?\{\{ \$\('Keyword Strategist'\)\.item\.json\.secondary_keyword_checklist \}\}/g;
const replacementItem = `{{ $('Keyword Strategist').item.json.global_rules_injection }}\\n\\n{{ $('Keyword Strategist').item.json.custom_rules_injection }}\\n\\n{{ $('Keyword Strategist').item.json.first_paragraph_client_injection }}\\n\\n{{ $('Keyword Strategist').item.json.brief_authority_preamble }}\\n\\n{{ $('Keyword Strategist').item.json.brief_enforcer_injection }}\\n\\n{{ $('Keyword Strategist').item.json.faq_injection }}\\n\\n{{ $('Keyword Strategist').item.json.secondary_keyword_checklist }}`;

const regexFirst = /\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.system_prompt_injection \}\}[\s\S]*?\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.secondary_keyword_checklist \}\}/g;
const replacementFirst = `{{ $('Keyword Strategist').first().json.global_rules_injection }}\\n\\n{{ $('Keyword Strategist').first().json.custom_rules_injection }}\\n\\n{{ $('Keyword Strategist').first().json.first_paragraph_client_injection }}\\n\\n{{ $('Keyword Strategist').first().json.brief_authority_preamble }}\\n\\n{{ $('Keyword Strategist').first().json.brief_enforcer_injection }}\\n\\n{{ $('Keyword Strategist').first().json.faq_injection }}\\n\\n{{ $('Keyword Strategist').first().json.secondary_keyword_checklist }}`;

let count1 = (str.match(regexItem) || []).length;
let count2 = (str.match(regexFirst) || []).length;

str = str.replace(regexItem, replacementItem);
str = str.replace(regexFirst, replacementFirst);

fs.writeFileSync(path, str);
console.log('Replaced item matches:', count1);
console.log('Replaced first matches:', count2);
