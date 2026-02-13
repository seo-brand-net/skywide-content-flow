import json
import re

file_path = r'c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (TEST v23).json'

target_qa_nodes = [
    "OpenAI Chat Model",
    "OpenAI Chat Model1",
    "OpenAI Chat Model2",
    "OpenAI Chat Model3"
]

def update_node(node):
    node_name = node.get('name', '')
    node_type = node.get('type', '')
    
    # Check if it's an OpenAI node (Chat or other)
    if 'openAi' in node_type or 'OpenAi' in node_type: 
        # Identify if this is a target QA node
        is_target = node_name in target_qa_nodes
        
        # Parameters location
        params = node.get('parameters', {})
        if not params: return False
        
        updated = False
        
        # Handle Model Parameter (could be 'model' or 'modelId' or 'modelName')
        model_container = None
        model_key = None
        
        if 'model' in params and isinstance(params['model'], dict):
            model_container = params['model']
            model_key = 'value'
        elif 'modelId' in params and isinstance(params['modelId'], dict):
            model_container = params['modelId']
            model_key = 'value'
            
        if model_container:
            curr_val = model_container.get(model_key, '')
            
            if is_target:
                # Force GPT-5
                if curr_val != 'gpt-5':
                    model_container[model_key] = 'gpt-5'
                    model_container['cachedResultName'] = 'GPT-5'
                    updated = True
            else:
                # Revert to chatgpt-4o-latest
                if curr_val == 'gpt-5':
                    model_container[model_key] = 'chatgpt-4o-latest'
                    model_container['cachedResultName'] = 'CHATGPT-4O-LATEST'
                    updated = True

        # Handle Tokens Parameter in 'options'
        if 'options' not in params:
            params['options'] = {}
        
        options = params['options']
        
        if is_target:
            # Ensure maxCompletionTokens
            if 'maxTokens' in options:
                val = options.pop('maxTokens')
                options['maxCompletionTokens'] = val
                updated = True
            if 'maxCompletionTokens' not in options:
                options['maxCompletionTokens'] = 4096 # Default
                updated = True
        else:
            # Revert to maxTokens
            if 'maxCompletionTokens' in options:
                val = options.pop('maxCompletionTokens')
                options['maxTokens'] = val
                updated = True
            # Optional: Ensure maxTokens exists if it was there before? 
            # We'll just leave it if neither exists, but if maxCompletionTokens was there, switch it back.
            
        return updated
    return False

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    for node in data['nodes']:
        if update_node(node):
            count += 1
            print(f"Updated node: {node['name']}")

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"Process complete. Total nodes updated: {count}")

except Exception as e:
    print(f"Error: {e}")
