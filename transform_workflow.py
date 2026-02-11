"""
Complete transformation of DEV Skywide Content (20).json
Adds ALL test mode logic in one pass.
"""
import json
import uuid
import sys

def gen_id():
    return str(uuid.uuid4())

def main():
    filepath = r"DEV Skywide  Content (20).json"
    with open(filepath, "r", encoding="utf-8") as f:
        wf = json.load(f)

    nodes = wf["nodes"]
    connections = wf["connections"]

    # Safety: Check if already transformed
    existing_names = {n.get("name") for n in nodes}
    if "Is Test Mode?" in existing_names:
        print("WARNING: Workflow already has test mode nodes. Skipping to avoid duplicates.")
        sys.exit(0)

    print(f"Starting transformation... ({len(nodes)} nodes)")

    # ========== 1. Is Test Mode? IF node ==========
    nodes.append({
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
                "conditions": [{
                    "id": "test_mode_check",
                    "leftValue": "={{ $('Webhook1').item.json.body.request_status }}",
                    "rightValue": "test",
                    "operator": {"type": "string", "operation": "equals"}
                }],
                "combinator": "and"
            },
            "options": {}
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [-200, 1800],
        "id": gen_id(),
        "name": "Is Test Mode?",
        "notesInFlow": True,
        "notes": "Routes test requests to skip Google Drive/Docs"
    })
    print("  + Is Test Mode?")

    # Rewire Execution Data1 → Is Test Mode?
    connections["Execution Data1"] = {"main": [[{"node": "Is Test Mode?", "type": "main", "index": 0}]]}
    connections["Is Test Mode?"] = {"main": [
        [{"node": "Clean1", "type": "main", "index": 0}],       # true = test → skip drive
        [{"node": "Create folder1", "type": "main", "index": 0}] # false = prod → normal
    ]}

    # ========== 2. Check Max Iterations bypass ==========
    for node in nodes:
        if node.get("name") in ("Check Max Iterations2", "Check Max Iterations3"):
            conds = node["parameters"]["conditions"]
            conds["conditions"].append({
                "id": "test_bypass",
                "leftValue": "={{ $('Webhook1').item.json.body.request_status }}",
                "rightValue": "test",
                "operator": {"type": "string", "operation": "equals"}
            })
            conds["combinator"] = "or"
            print(f"  ~ Modified {node['name']} (added test bypass)")

    # ========== 3. Capture Test Content (Set v3.4) ==========
    nodes.append({
        "parameters": {
            "assignments": {
                "assignments": [{
                    "id": "capture_article_md",
                    "name": "article_content",
                    "value": "={{ $json.message ? $json.message.content : ($json.text || $json.content || JSON.stringify($json)) }}",
                    "type": "string"
                }]
            },
            "includeOtherFields": True,
            "options": {}
        },
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [10600, 1200],
        "id": gen_id(),
        "name": "Capture Test Content",
        "notesInFlow": True,
        "notes": "Saves article markdown before audit consumes it"
    })
    print("  + Capture Test Content")

    # ========== 4. Test Quality Audit (OpenAI) ==========
    nodes.append({
        "parameters": {
            "modelId": {"__rl": True, "value": "chatgpt-4o-latest", "mode": "list", "cachedResultName": "CHATGPT-4O-LATEST"},
            "messages": {"values": [
                {
                    "content": "You are a Content Consistency Validator.\n\nYour sole responsibility is to determine whether the generated content matches the user's ORIGINAL CONTENT BRIEF.\n\n### Validation Rules:\n1. Evaluate ONLY whether the content adheres to the intent, scope, and requirements stated in the original creative brief.\n2. Do NOT assess SEO quality, keyword optimization, tone, voice, audience fit, or brand safety.\n3. Do NOT introduce new criteria or subjective judgments.\n4. Treat this as a regression/consistency check, not a quality review.\n\n### Output Instructions:\nReturn ONLY a valid JSON object in the following format:\n\n{\n  \"alignment_score\": number (0-100),\n  \"alignment_summary\": \"Concise summary of how well the content matches the brief\",\n  \"suggestions\": [\"list\", \"of\", \"specific\", \"deviations\", \"or\", \"missing\", \"elements\"],\n  \"passed\": true | false\n}\n\nRules:\n- Set \"passed\" to true ONLY if the alignment_score is 90 or above.\n- The alignment_summary should focus on core intent alignment.\n",
                    "role": "system"
                },
                {
                    "content": "=## ORIGINAL BRIEF:\nTitle: {{ $('Webhook1').first().json.body.title }}\nAudience: {{ $('Webhook1').first().json.body.audience }}\nTarget Word Count: {{ $('Webhook1').first().json.body.word_count }}\nPrimary Keywords: {{ $('Webhook1').first().json.body.primary_keywords }}\nSecondary Keywords: {{ $('Webhook1').first().json.body.secondary_keywords }}\nCreative Brief: {{ $('Webhook1').first().json.body.creative_brief }}\n\n## CONTENT TO TEST:\n{{ $json.article_content }}\n\n## VALIDATION INSTRUCTIONS:\n1. Determine whether the content above matches the ORIGINAL BRIEF.\n2. Do NOT evaluate tone, creativity, SEO quality, or brand usage.\n3. Only check for consistency with the brief\u2019s intent, scope, and requirements.\n4. Return ONLY a valid JSON object."
                }
            ]},
            "jsonOutput": True,
            "options": {"temperature": 0}
        },
        "type": "@n8n/n8n-nodes-langchain.openAi",
        "typeVersion": 1.8,
        "position": [11000, 1200],
        "id": gen_id(),
        "name": "Test Quality Audit",
        "credentials": {"openAiApi": {"id": "y3tVeuSKwYnV4Cyx", "name": "SEOBrand"}}
    })
    print("  + Test Quality Audit")

    # ========== 5. Send Test Callback (HTTP) ==========
    nodes.append({
        "parameters": {
            "method": "POST",
            "url": "=https://skywide-content-flow.vercel.app/api/test-callback",
            "sendBody": True,
            "bodyParameters": {
                "parameters": [
                    {"name": "request_id", "value": "={{ $('Webhook1').item.json.body.request_id }}"},
                    {"name": "status", "value": "completed"},
                    {"name": "audit_data", "value": "={{ $('Test Quality Audit').item.json.message.content }}"},
                    {"name": "content_markdown", "value": "={{ $('Capture Test Content').item.json.article_content }}"}
                ]
            },
            "options": {"timeout": 10000}
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [11400, 1200],
        "id": gen_id(),
        "name": "Send Test Callback"
    })
    print("  + Send Test Callback")

    # ========== 6. Is Test Exit? IF nodes (one per document) ==========
    doc_positions = {
        "4": [9500, 1000], "5": [9500, 1300], "6": [9500, 1600],
        "7": [9500, 1900], "15": [9500, 2200], "16": [9500, 2500]
    }
    for doc_num, pos in doc_positions.items():
        nodes.append({
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
                    "conditions": [{
                        "id": f"test_exit_{doc_num}",
                        "leftValue": "={{ $('Webhook1').item.json.body.request_status }}",
                        "rightValue": "test",
                        "operator": {"type": "string", "operation": "equals"}
                    }],
                    "combinator": "and"
                },
                "options": {}
            },
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": pos,
            "id": gen_id(),
            "name": f"Is Test Exit {doc_num}?",
            "notesInFlow": True,
            "notes": f"Test→Audit, Prod→Create document{doc_num}"
        })
        # true → Capture Test Content, false → Create a document
        connections[f"Is Test Exit {doc_num}?"] = {"main": [
            [{"node": "Capture Test Content", "type": "main", "index": 0}],
            [{"node": f"Create a document{doc_num}", "type": "main", "index": 0}]
        ]}
        print(f"  + Is Test Exit {doc_num}?")

    # ========== 7. Rewire source → Is Test Exit nodes ==========
    rewires = {
        "80 +?4": ("0", "4"),           # true output → was Create a document4
        "Check Max Iterations2": ("0", "5"),  # true output → was Create a document5
        "80 +?6": ("0", "6"),           # true output → was Create a document6
        "Check Max Iterations3": ("0", "7"),  # true output → was Create a document7
        "Document Export Sanitization3": ("0", "15"),
        "Document Export Sanitization4": ("0", "16"),
        "Document Export Sanitization6": ("0", "7"),   # shares target with CM3
        "Document Export Sanitization7": ("0", "5"),   # shares target with CM2
    }
    for source, (output_idx, doc_num) in rewires.items():
        idx = int(output_idx)
        if source in connections:
            connections[source]["main"][idx] = [
                {"node": f"Is Test Exit {doc_num}?", "type": "main", "index": 0}
            ]
            print(f"  ~ Rewired {source}[{idx}] → Is Test Exit {doc_num}?")

    # ========== 8. Chain: Capture → Audit → Callback ==========
    connections["Capture Test Content"] = {"main": [[{"node": "Test Quality Audit", "type": "main", "index": 0}]]}
    connections["Test Quality Audit"] = {"main": [[{"node": "Send Test Callback", "type": "main", "index": 0}]]}

    # ========== 9. Error handling chain ==========
    nodes.append({"parameters": {}, "id": gen_id(), "name": "On Flow Error",
                   "type": "n8n-nodes-base.errorTrigger", "typeVersion": 1, "position": [12000, 2800]})
    nodes.append({
        "parameters": {
            "assignments": {"assignments": [
                {"id": "fail_status", "name": "status", "value": "failed", "type": "string"},
                {"id": "fail_reason", "name": "reason", "value": "Workflow error", "type": "string"}
            ]},
            "options": {}
        },
        "type": "n8n-nodes-base.set", "typeVersion": 3.4,
        "position": [12200, 2800], "id": gen_id(), "name": "Format Failure Result"
    })
    nodes.append({
        "parameters": {
            "method": "POST",
            "url": "https://skywide-content-flow.vercel.app/api/test-callback",
            "sendBody": True,
            "bodyParameters": {"parameters": [
                {"name": "request_id", "value": "={{ $('Webhook1').item.json.body.request_id }}"},
                {"name": "status", "value": "failed"},
                {"name": "audit_data", "value": "{\"alignment_score\":0,\"alignment_summary\":\"Workflow Error\",\"passed\":false}"}
            ]},
            "options": {"timeout": 10000}
        },
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
        "position": [12400, 2800], "id": gen_id(), "name": "Send Failure Callback"
    })
    connections["On Flow Error"] = {"main": [[{"node": "Format Failure Result", "type": "main", "index": 0}]]}
    connections["Format Failure Result"] = {"main": [[{"node": "Send Failure Callback", "type": "main", "index": 0}]]}
    print("  + Error handling chain (3 nodes)")

    # ========== Write ==========
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Complete! {len(nodes)} total nodes. Re-import into n8n.")

if __name__ == "__main__":
    main()
