import json
import os

file_path = r"c:\Users\A.hydar\Documents\production\Skywide-project-main\DEV Skywide  Content (17).json"

def update_n8n_workflow():
    try:
        # Load the JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 1. Update "Google Drive Notification1" success path
        for node in data.get('nodes', []):
            if node.get('name') == "Google Drive Notification1":
                node['parameters']['jsonBody'] = "={\n  \"webhook_response\": \"https://drive.google.com/drive/u/0/folders/{{ $json.id }}\",\n  \"webhook_sent\": \"TRUE\",\n  \"status\": \"complete\"\n}"
                print("Updated Google Drive Notification1")

        # 2. Add Error Trigger and Failure Notification1 nodes if they don't exist
        node_names = [n.get('name') for n in data.get('nodes', [])]
        
        if "Error Trigger" not in node_names:
            error_trigger = {
                "parameters": {},
                "type": "n8n-nodes-base.errorTrigger",
                "typeVersion": 1,
                "position": [-480, 1856],
                "id": "b6e7f8a9-c0d1-4e2f-8a5c-7d9e0f1a2b3c",
                "name": "Error Trigger"
            }
            data['nodes'].append(error_trigger)
            print("Added Error Trigger node")

        if "Failure Notification1" not in node_names:
            failure_notification = {
                "parameters": {
                    "method": "PATCH",
                    "url": "=https://obswcosfipqjvklqlnrj.supabase.co/rest/v1/content_requests",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {
                                "name": "id",
                                "value": "=eq.{{ $('Webhook1').first().json.body.request_id }}"
                            }
                        ]
                    },
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {
                                "name": "Content-Type",
                                "value": "application/json"
                            },
                            {
                                "name": "apikey",
                                "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjYyNTksImV4cCI6MjA4MDQ0MjI1OX0.G8YV-Rmo3fZlXvwygIU8sAHu4o0c5kYFoqoJpE-CYE8"
                            },
                            {
                                "name": "Authorization",
                                "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ"
                            }
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
            }
            data['nodes'].append(failure_notification)
            print("Added Failure Notification1 node")

        # 3. Add Connection
        if "Error Trigger" not in data['connections']:
            data['connections']["Error Trigger"] = {
                "main": [
                    [
                        {
                            "node": "Failure Notification1",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
            print("Added connection from Error Trigger to Failure Notification1")

        # Save back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print("Workflow saved successfully!")

    except Exception as e:
        print(f"Error updating workflow: {e}")

if __name__ == "__main__":
    update_n8n_workflow()
