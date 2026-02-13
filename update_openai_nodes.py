import json

file_path = r'c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (TEST v23).json'

target_node_names = [
    "OpenAI Chat Model",
    "OpenAI Chat Model1",
    "OpenAI Chat Model2",
    "OpenAI Chat Model3"
]

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_count = 0
    for node in data['nodes']:
        if node['name'] in target_node_names:
            print(f"Updating node: {node['name']}")
            
            # Update model value
            if 'parameters' in node and 'model' in node['parameters']:
                node['parameters']['model']['value'] = 'gpt-5'
                node['parameters']['model']['cachedResultName'] = 'GPT-5'
            
            # Update maxTokens to maxCompletionTokens in options
            if 'parameters' in node:
                if 'options' not in node['parameters']:
                    node['parameters']['options'] = {}
                
                options = node['parameters']['options']
                
                # If maxTokens exists, remove it and use its value (or default 4096) for maxCompletionTokens
                # logic: if maxTokens is there, use it. If maxCompletionTokens is already there (unlikely after revert), keep it.
                # simpler: set maxCompletionTokens to 4096 (standard for this workflow) or preserve existing value if possible.
                
                token_val = 4096
                if 'maxTokens' in options:
                    token_val = options.pop('maxTokens')
                
                # Ensure maxCompletionTokens is set
                options['maxCompletionTokens'] = token_val
                
                updated_count += 1

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"Successfully updated {updated_count} nodes.")

except Exception as e:
    print(f"Error: {e}")
