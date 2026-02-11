import urllib.request
import urllib.error
import json

# Hardcoded for quick debug
url = "https://obswcosfipqjvklqlnrj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ"

def check_column():
    print(f"Checking Supabase at {url}...")
    
    # PostgREST API endpoint
    endpoint = f"{url}/rest/v1/test_results?select=content_markdown&limit=1"
    
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("✅ SUCCESS: 'content_markdown' column exists!")
            else:
                print(f"❓ UNKNOWN: Received status code {response.status}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        if e.code == 400:
            print("❌ FAILED: 'content_markdown' column likely MISSING.")
            print(f"Error details: {error_body}")
        else:
            print(f"❌ HTTP Error {e.code}: {e.reason}")
            print(f"Body: {error_body}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_column()
