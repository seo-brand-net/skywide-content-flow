import json
import uuid

# Load the workflow
input_file = "DEV Skywide  Content (20).json"
output_file = "DEV Skywide  Content (21).json"

with open(input_file, 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# Load the JS Code
with open("src/n8n_scripts/keyword_strategist.js", 'r', encoding='utf-8') as f:
    js_code = f.read()

# Create the new Node
new_node_id = str(uuid.uuid4())
new_node = {
    "parameters": {
        "jsCode": js_code
    },
    "id": new_node_id,
    "name": "Keyword Strategist",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
        480, 
        1600 
    ]
}

# Add the node to the list
workflow['nodes'].append(new_node)

# --- REWIRE CONNECTIONS ---
# We want: Clean1 -> Keyword Strategist -> Create folder1

# 1. Find the connection from Clean1 to Create folder1
# Connection structure: sourceNodeName: { main: [ [ { node: targetNodeName, ... } ] ] }
# actually connections are keyed by Source Node Name.

clean1_connections = workflow['connections'].get('Clean1', {})
main_output = clean1_connections.get('main', [])

# We need to find "Create folder1" in Clean1's outputs and redirect it to "Keyword Strategist"
# And then connect "Keyword Strategist" to "Create folder1"

target_node_name = "Create folder1"
source_node_name = "Clean1"
new_node_name = "Keyword Strategist"

# 1. Update Clean1 -> Keyword Strategist
if 'main' in clean1_connections:
    for output_index, targets in enumerate(clean1_connections['main']):
        for target in targets:
            if target['node'] == target_node_name:
                target['node'] = new_node_name

# 2. Create Keyword Strategist -> Create folder1 connection
if new_node_name not in workflow['connections']:
    workflow['connections'][new_node_name] = {
        "main": [
            [
                {
                    "node": target_node_name,
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    }

# Update workflow name
workflow['name'] = "DEV Skywide  Content (21)"

# Rename the file logic in the system update (Code Nodes using system_prompt_builder)
# For now, we are just injecting the Strategist. 
# The Implementation plan said: "Update system prompts in Content Generator nodes"
# We can do that here too if we want to be fancy, but let's stick to the node injection first.

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2)

print(f"Successfully created {output_file} with Keyword Strategist node.")
