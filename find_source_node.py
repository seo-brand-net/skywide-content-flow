import json
try:
    with open('DEV Skywide  Content (22).json', 'r', encoding='utf-8') as f:
        w = json.load(f)
        found = False
        print("Searching for connections to 'Is Test Mode?'...")
        for node, connections in w.get('connections', {}).items():
            if 'main' in connections:
                 for output_group in connections['main']:
                     for target in output_group:
                         if target['node'] == 'Is Test Mode?':
                             print(f"FOUND SOURCE NODE: {node}")
                             found = True
        if not found:
            print("No source node found connecting to 'Is Test Mode?'")
except Exception as e:
    print(f"Error: {e}")
