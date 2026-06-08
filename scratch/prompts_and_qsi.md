# Phase 2 Implementation Guide: Prompts & QSI Loop

Here are the exact updates you need to make to your existing n8n nodes, along with the new QSI Bouncer node to copy/paste.

---

## 1. Update the Claude Drafting Prompt
*Go to your Claude Draft node (or `Keyword Strategist` if it feeds the draft), and add this exactly to the instructions:*

```text
## CLAIMS MANIFEST (STRICT ENFORCEMENT)
You have been provided with a strict Claims Manifest from the Bouncer node:
{{ $json.claims_manifest }}

You MUST obey these rules:
1. You may ONLY use statistics and factual claims if they are explicitly listed in the `approved_claims` or `approved_statistics` arrays.
2. DO NOT invent any new claims, statistics, or services. 
3. DO NOT use any phrasing found in the `forbidden_patterns` list (e.g., "practitioners consistently see", "studies show").
```

---

## 2. Restrict the EEAT Node Prompt
*Go to your `Claude EEAT Injection` node, and replace its instruction with this restricted version:*

```text
You are the EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) optimization agent. 
Your ONLY job is to improve the structural and tonal authority of the text.

STRICT NEGATIVE CONSTRAINTS:
1. DO NOT ADD ANY NEW FACTUAL CLAIMS, STATISTICS, OR PERCENTAGES.
2. DO NOT INVENT QUOTES, GUIDELINES, OR NAMED/UNNAMED PRACTITIONERS.
3. DO NOT use vague authority phrases like "clinical experience shows" or "experts agree".

How to improve EEAT without hallucinating:
- Enhance the professional tone and formatting.
- Add logical internal linking suggestions.
- Ensure the author's expertise is implied through sophisticated, accurate language rather than fabricated credentials.
```

---

## 3. The QSI Verification Loop (The Bouncer)
This is a new node that acts as the final gatekeeper before the article moves to the final stages. It reads the drafted text and the Claims Manifest, and deletes any hallucinations.

**Action:** Copy the JSON block below and paste it onto your n8n canvas. Connect it *after* the `Claude Draft` (or `Apply Recommendations`) and *before* `EEAT Injection`.

```json
{
  "nodes": [
    {
      "parameters": {
        "model": "gpt-4o-mini",
        "options": {
          "temperature": 0
        }
      },
      "id": "qsi-model-1234",
      "name": "QSI Bouncer Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "position": [ 1200, 300 ]
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "=# The QSI Bouncer\n\nYou are the final gatekeeper. Your job is to compare the Drafted Article against the strict Claims Manifest and DELETE any hallucinations.\n\n## Inputs\n**Drafted Article:**\n{{ $json.draft }}\n\n**Approved Claims Manifest:**\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_claims }}\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_statistics }}\n\n## Rules\n1. Scan the Drafted Article for any factual claims, statistics, percentages, or appeals to authority (e.g., 'The APA says...', 'Practitioners see...').\n2. If you find a claim/stat that is NOT explicitly approved in the Claims Manifest, you must DELETE IT from the article completely. Rewrite the surrounding sentences so the paragraph still flows perfectly.\n3. Return the fully cleaned, sanitized article.",
        "hasOutputParser": false
      },
      "id": "qsi-bouncer-5678",
      "name": "QSI Claims Verification Bouncer",
      "type": "@n8n/n8n-nodes-langchain.chainLlm",
      "typeVersion": 1.4,
      "position": [ 1200, 100 ]
    }
  ],
  "connections": {
    "QSI Bouncer Model": {
      "ai_languageModel": [ [ { "node": "QSI Claims Verification Bouncer", "type": "ai_languageModel", "index": 0 } ] ]
    }
  }
}
```
