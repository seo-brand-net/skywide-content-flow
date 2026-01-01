import re

file_path = r"c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (17).json"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        # Look for top level keys (2 spaces indentation usually)
        match = re.search(r'^  "([^"]+)": ([{\[])', line)
        if match:
            print(f"Line {i+1}: {match.group(1)} Type: {match.group(2)}")

except Exception as e:
    print(f"Error: {e}")
