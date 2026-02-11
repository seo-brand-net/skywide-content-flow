import urllib.request
import urllib.error
import json

# Hardcoded for quick debug
url = "https://obswcosfipqjvklqlnrj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ"

def check_schema():
    print(f"Inspecting schema for 'test_results' at {url}...")
    
    # RPC to get table info (or just query columns from information_schema if enabled, 
    # but standard PostgREST doesn't show schema directly easily without custom RPC)
    # However, we can use the OpenAPI spec (Swagger) that PostgREST provides!
    
    endpoint = f"{url}/rest/v1/"
    
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    
    try:
        with urllib.request.urlopen(req) as response:
            spec = json.loads(response.read().decode())
            table = spec.get('definitions', {}).get('test_results')
            if table:
                print("\nColumn Definitions:")
                properties = table.get('properties', {})
                for col, details in properties.items():
                    print(f"- {col}: {details.get('type')} ({details.get('format', 'no format')})")
            else:
                print("❌ Could not find 'test_results' in OpenAPI spec.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_schema()
