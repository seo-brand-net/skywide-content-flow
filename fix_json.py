import json
import re

file_path = r"c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (17).json"

def fix_workflow():
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 1. Identify where my bad edit started and ended.
        # We know Failure Notification1 and Error Trigger are in there wrongly.
        
        # Part A: Everything from the beginning until just before my bad edit.
        # Looking at view_file 1184, line 4070 was where it went wrong.
        # Line 4060: "If3": [
        # Line 4061: {
        # ...
        # Line 4070 starts my bad edit.
        
        # Let's find the true pinData end.
        # Looking at find_keys.py, Line 4127 was ALREADY connections.
        # So I replaced line 4070 (original ]) and 4071 (original },).
        
        # THE FIX:
        # Reconstruct the nodes and connections properly.
        # We will parse as much as possible, or use regex to split the file into 3 parts:
        # - Before nodes end
        # - nodes end to connections start (pinData)
        # - connections start to end
        
        # Actually, let's just use Python to find the nodes list and connections list.
        # I'll use a very simple parser.
        
        content = "".join(lines)
        
        # Find where nodes ends (the last node)
        # We'll just look for the first occurrence of "pinData": {
        pin_data_start = content.find('"pinData": {')
        if pin_data_start == -1:
             print("Could not find pinData")
             return

        # Part 1: Start to just before "pinData"
        # We want to add our nodes TO THE NODES ARRAY.
        # The nodes array ends just before pinData.
        nodes_array_end = content.rfind(']', 0, pin_data_start)
        
        # Part 2: "pinData" to "connections"
        connections_start = content.find('"connections": {')
        if connections_start == -1:
             print("Could not find connections")
             return
             
        # Part 3: Connections to end
        
        # Let's rebuild the JSON by parsing the fragments.
        # Actually, let's just find the SUCCESS node and update it, 
        # then add the NEW nodes to the nodes array,
        # and add the connection.
        
        # WE NEED THE SUCCESS NODE UPDATE FIRST.
        # (It's already updated if my 1127 worked, but let's check)
        
        try:
            # Try to fix the structure in memory
            # The broken part is between 4070 and 4127.
            # It should have been:
            # 4070:    ]
            # 4071:  },
            # 4127:  "connections": {
            
            # Let's just remove the bad lines.
            bad_start = 4070 - 1
            bad_end = 4127 - 1
            
            # Extract the nodes I added so I can put them in the right place
            # Failure Notification1 and Error Trigger
            
            # Build parts
            content_v1 = lines[:bad_start]
            content_v2 = lines[bad_end:]
            
            # Add the missing closing of pinData
            fixed_content = "".join(content_v1) + "    ]\n  },\n  " + "".join(content_v2)
            
            # Now try to parse it!
            data = json.loads(fixed_content)
            print("JSON repaired successfully!")
            
            # Now update it properly
            # 1. Update success node (in case it was overwritten or needs check)
            for node in data.get('nodes', []):
                if node.get('name') == "Google Drive Notification1":
                    node['parameters']['jsonBody'] = "={\n  \"webhook_response\": \"https://drive.google.com/drive/u/0/folders/{{ $json.id }}\",\n  \"webhook_sent\": \"TRUE\",\n  \"status\": \"complete\"\n}"
            
            # 2. Add Error Trigger and Failure Notification nodes to the TRUE nodes array
            # Ensure they aren't duplicates
            node_names = [n.get('name') for n in data.get('nodes', [])]
            if "Error Trigger" not in node_names:
                data['nodes'].append({
                    "parameters": {},
                    "type": "n8n-nodes-base.errorTrigger",
                    "typeVersion": 1,
                    "position": [-480, 1856],
                    "id": "b6e7f8a9-c0d1-4e2f-8a5c-7d9e0f1a2b3c",
                    "name": "Error Trigger"
                })
            
            if "Failure Notification1" not in node_names:
                data['nodes'].append({
                    "parameters": {
                        "method": "PATCH",
                        "url": "=https://obswcosfipqjvklqlnrj.supabase.co/rest/v1/content_requests",
                        "sendQuery": True,
                        "queryParameters": {
                            "parameters": [
                                { "name": "id", "value": "=eq.{{ $('Webhook1').first().json.body.request_id }}" }
                            ]
                        },
                        "sendHeaders": True,
                        "headerParameters": {
                            "parameters": [
                                { "name": "Content-Type", "value": "application/json" },
                                { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjYyNTksImV4cCI6MjA4MDQ0MjI1OX0.G8YV-Rmo3fZlXvwygIU8sAHu4o0c5kYFoqoJpE-CYE8" },
                                { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ" }
                            ]
                        },
                        "sendBody": True,
                        "specifyBody": "json",
                        "jsonBody": "={\n  \"status\": \"failed\",\n  \"webhook_sent\": \"TRUE\"\n}",
                        "options": {}
                    },
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [-160, 1856],
                    "id": "e4f5g6h7-i8j9-4k0l-m1n2-o3p4q5r6s7t8",
                    "name": "Failure Notification1"
                })

            # 3. Add Connection
            if "Error Trigger" not in data['connections']:
                data['connections']["Error Trigger"] = {
                    "main": [[{ "node": "Failure Notification1", "type": "main", "index": 0 }]]
                }

            # Save back
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print("Fixed and saved correctly!")

        except Exception as e:
            print(f"Error repairing JSON: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    fix_workflow()
