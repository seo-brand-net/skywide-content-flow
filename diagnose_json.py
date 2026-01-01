import json

file_path = r"c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (17).json"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        # We can't use json.load if it's broken.
        # Let's try to read it line by line and find keys.
        content = f.read()
        
    print(f"File length: {len(content)}")
    
    # Try to load it anyway to see where it fails
    try:
        data = json.loads(content)
        print("JSON is VALID")
        print("Top level keys:", list(data.keys()))
        if 'nodes' in data:
            print(f"Nodes type: {type(data['nodes'])} length: {len(data['nodes'])}")
        if 'connections' in data:
            print(f"Connections type: {type(data['connections'])} length: {len(data['connections'])}")
    except json.JSONDecodeError as e:
        print(f"JSON is INVALID: {e}")
        # Print lines around the error
        lines = content.splitlines()
        start = max(0, e.lineno - 5)
        end = min(len(lines), e.lineno + 5)
        for i in range(start, end):
            print(f"{i+1}: {lines[i]}")

except Exception as e:
    print(f"Error: {e}")
