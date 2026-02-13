import json

input_file = "DEV Skywide  Content (21).json"
output_file = "DEV Skywide  Content (22).json"

with open(input_file, 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# The expression to inject is:
injection_expression = "\n\n{{ $('Keyword Strategist').first().json.keyword_strategy.system_prompt_injection }}"

# Nodes to update (Content Generators):
targets = [
    "OpenAI Draft (GPT-4O)1",
    "Claude Draft (Claude Opus 3)1",
    "Data Check & Research Gaps1"
]

count = 0
for node in workflow['nodes']:
    if node['name'] in targets:
        print(f"Checking node: {node['name']} ({node['type']})")
        
        # Perplexity: parameters.messages.message[0] (role=system)
        if node['type'] == 'n8n-nodes-base.perplexity':
            msgs = node.get('parameters', {}).get('messages', {}).get('message', [])
            for msg in msgs:
                if msg.get('role') == 'system':
                    if injection_expression not in msg['content']:
                         msg['content'] += injection_expression
                         count += 1
                         print(f"  Updated Perplexity node: {node['name']}")
        
        # OpenAI / LangChain
        elif 'openAi' in node['type'] or 'langchain' in node['type']:
             # Check if it has messages.values
             msgs = node.get('parameters', {}).get('messages', {}).get('values', [])
             if msgs:
                 for msg in msgs:
                     # Check if role exists
                     role = msg.get('role')
                     if role == 'system':
                         if injection_expression not in msg.get('content', ''):
                             msg['content'] += injection_expression
                             count += 1
                             print(f"  Updated OpenAI/LangChain node: {node['name']}")
                     elif role is None:
                         # Fallback or ignore
                         print(f"  Skipping message without role in {node['name']}: {msg.keys()}")
             else:
                 # Check for "text" parameter
                 if node.get('parameters', {}).get('promptType') == 'define':
                     text = node.get('parameters', {}).get('text', '')
                     if injection_expression not in text:
                         node['parameters']['text'] += injection_expression
                         count += 1
                         print(f"  Updated text-based node: {node['name']}")

workflow['name'] = "DEV Skywide  Content (22)"

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2)

print(f"Success! Updated {count} nodes with system prompt injection.")
