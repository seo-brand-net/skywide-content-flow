// Keyword Strategist Node Logic
// This code is designed to run inside an n8n Code Node.

const inputData = items[0].json.body || items[0].json;

// Extract raw keyword string (assuming comma-separated)
const rawKeywords = inputData.primary_keywords || "";
const keywordsList = rawKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

// RULES:
// 1. Primary Keyword: The first one provided (or explicitly marked).
// 2. Secondary Keywords: All subsequent keywords.
// 3. Billy's Rule: Primary must be in first 50 words.
// 4. Billy's Rule: Primary must be in at least one H2.
// 5. Billy's Rule: Secondary keywords naturally distributed.

let primaryKeyword = keywordsList.length > 0 ? keywordsList[0] : "";
let secondaryKeywords = keywordsList.slice(1);

// Generate Placement Map
const placementMap = {
    primary: {
        term: primaryKeyword,
        required_placements: [
            "H1 Title",
            "First 50 Words (Introduction)",
            "At least one H2 Subheading",
            "Final Paragraph (Conclusion)"
        ],
        density_target: "1.5%",
        voice_anchor: "Use with 'In our experience' or 'From the field'"
    },
    secondary: secondaryKeywords.map(k => ({
        term: k,
        required_placements: ["Body Paragraph", "H3 (Optional)"],
        voice_anchor: "Contextual mention"
    })),
    constraints: {
        banned_phrases: [
            "Additionally",
            "Let's dive in",
            "In conclusion",
            "The bottom line",
            "Moreover",
            "Furthermore"
        ],
        paragraph_rule: "Max 3 sentences. No two consecutive paragraphs starting with the same word.",
        voice_rule: "Write as 'We' (the contractor). Use 'You' for the reader."
    }
};

// Construct System Prompt Injection
// This string will be injected into the LLM's system prompt to enforce rules.
const systemPromptInjection = `
### KEYWORD ORCHESTRATION INSTRUCTIONS
You must strictly follow this placement map for SEO optimization while maintaining Contractor Voice.

1. **PRIMARY KEYWORD:** "${primaryKeyword}"
   - **MANDATORY:** Must appear in the **first 50 words** of the intro.
   - **MANDATORY:** Must appear in at least one **H2 subheading**.
   - **MANDATORY:** Must appear in the **final paragraph**.
   - **Constraint:** Do not just insert it. Anchor it with authority: *"In our experience with ${primaryKeyword}..."* or *"When we handle ${primaryKeyword}..."*

2. **SECONDARY KEYWORDS:**
   ${secondaryKeywords.map(k => `- "${k}" (Distribute naturally in body)`).join('\n   ')}

3. **EDITORIAL VOICE Rules (Billy's List):**
   - **FORBIDDEN:** Do not use "Additionally", "Let's dive in", "In conclusion", or "The bottom line".
   - **VOICE:** Use "We" (contractor perspective).
   - **LENGTH:** Max 3 sentences per paragraph.
`;

return {
    json: {
        ...inputData,
        keyword_strategy: {
            primary: primaryKeyword,
            secondary: secondaryKeywords,
            map: placementMap,
            system_prompt_injection: systemPromptInjection
        }
    }
};
