// Keyword Validator Node Logic
// checks the final article against the Keyword Strategy.

const inputData = items[0].json;
const content = inputData.final_article_html || inputData.article_content || "";
const strategy = inputData.keyword_strategy || {};
const { primary, secondary } = strategy;

// Helper: Count occurrences (case-insensitive)
function countOccurrences(text, term) {
    if (!term) return 0;
    const regex = new RegExp(term, 'gi');
    return (text.match(regex) || []).length;
}

// 1. Check Primary Keyword
const primaryCount = countOccurrences(content, primary);
const primaryDensity = (primaryCount / (content.split(' ').length || 1)) * 100;

// 2. Check First 50 Words (Approx)
// Strip HTML tags for text analysis
const plainText = content.replace(/<[^>]*>?/gm, ' ');
const first50Words = plainText.split(/\s+/).slice(0, 50).join(' ');
const inFirst50 = countOccurrences(first50Words, primary) > 0;

// 3. Check H1/H2 Headers
// We look for <h1>...term...</h1> or <h2>...term...</h2>
const h1Regex = new RegExp(`<h1>.*${primary}.*<\/h1>`, 'gi');
const h2Regex = new RegExp(`<h2>.*${primary}.*<\/h2>`, 'gi');
const inH1 = h1Regex.test(content);
const inH2 = h2Regex.test(content);

// 4. Check Secondary Keywords
const secondaryStats = (secondary || []).map(term => ({
    term: term,
    count: countOccurrences(content, term),
    present: countOccurrences(content, term) > 0
}));

// 5. Calculate "Billy Score" (Simple Heuristic)
let score = 0;
if (inFirst50) score += 30; // High priority
if (inH2) score += 20;
if (primaryDensity >= 1.0 && primaryDensity <= 2.5) score += 20; // Sweet spot
const secondaryCoverage = secondaryStats.filter(s => s.present).length / (secondaryStats.length || 1);
score += (secondaryCoverage * 30);

return {
    json: {
        ...inputData,
        keyword_validation: {
            score: Math.min(100, Math.round(score)),
            rules: {
                primary_in_first_50: inFirst50,
                primary_in_h2: inH2,
                primary_density: primaryDensity.toFixed(2) + "%",
                secondary_coverage: Math.round(secondaryCoverage * 100) + "%"
            },
            details: {
                primary_count: primaryCount,
                secondary_stats: secondaryStats
            }
        }
    }
};
