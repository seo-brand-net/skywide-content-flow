import json
import uuid
import copy

# Load the workflow (Version 22)
input_file = "DEV Skywide  Content (22).json"
output_file = "DEV Skywide  Content (23).json"

with open(input_file, 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# Load the JS Code
with open("src/n8n_scripts/keyword_validator.js", 'r', encoding='utf-8') as f:
    js_code = f.read()

# Create the Validator Node
new_node_id = str(uuid.uuid4())
new_node = {
    "parameters": {
        "jsCode": js_code
    },
    "id": new_node_id,
    "name": "Keyword Validator",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
        2200, 
        1600 
    ]
}

workflow['nodes'].append(new_node)

# --- REWIRE CONNECTIONS ---
# We identified "Execution Data1" as the source node connecting to "Is Test Mode?"
source_node = "Execution Data1"
connections = workflow['connections']

if source_node in connections:
    # Get the node it connects to
    # typically: Source -> [Target]
    # We want: Source -> Validator -> [Target]
    
    if 'main' in connections[source_node]:
        outputs = connections[source_node]['main']
    else:
        outputs = []
        
    # outputs is a list of lists of objects
    
    # We will redirect Source -> Validator
    # And Validator -> [Original Targets]
    
    validator_connections = []
    
    for output_index, targets in enumerate(outputs):
        # Create a deep copy of the existing targets to preserve their original destination
        # These will be the targets for our new Validator node
        # Using deepcopy is critical to avoid modifying the reference in 'targets' which we are about to change
        original_targets = copy.deepcopy(targets)
        validator_connections.append(original_targets)
        
        # Now modify the source node's targets to point to the Validator
        for target in targets:
            target['node'] = "Keyword Validator"
            # Explicitly set type and index if needed, but usually just node name change is enough if type is 'main'
            # But let's be safe and ensure it points to the main input of Validator
            target['type'] = "main"
            target['index'] = 0
            
    # Now set Validator -> Original Targets
    if validator_connections:
        # Connect Validator to the original targets
        if "Keyword Validator" not in workflow['connections']:
             workflow['connections']["Keyword Validator"] = {}
        
        workflow['connections']["Keyword Validator"]["main"] = validator_connections

workflow['name'] = "DEV Skywide  Content (23)"

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2)

print(f"Successfully created {output_file} with Keyword Validator node.")
