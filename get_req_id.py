import urllib.request
import urllib.error
import json

# Hardcoded for quick debug
url = "https://obswcosfipqjvklqlnrj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ"

def get_recent_request():
    print(f"Fetching recent test result from {url}...")
    endpoint = f"{url}/rest/v1/test_results?select=request_id&order=created_at.desc&limit=1"
    
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data:
                print(f"Found request_id: {data[0]['request_id']}")
            else:
                print("No requests found.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    get_recent_request()
