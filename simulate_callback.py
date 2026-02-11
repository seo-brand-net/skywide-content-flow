import urllib.request
import urllib.error
import json

# Local test URL
url = "http://localhost:3000/api/test-callback"
request_id = "c4864b4a-91fb-41bd-b32f-ae4ec0a6e31c"

payload = {
    "request_id": request_id,
    "status": "completed",
    "audit_data": {
        "overallScore": 85.7,
        "seoOptimization": 80.2,
        "humanAuthenticity": 90.5,
        "readabilityStructure": 85,
        "engagementClarity": 88,
        "trustAuthority": 82,
        "conversionValue": 84,
        "issues": "Test issue",
        "fixes": "Test fix",
        "impact": "Test impact"
    },
    "content_markdown": "# Test Content\nThis is a simulation."
}

def simulate_callback():
    print(f"Simulating callback to {url}...")
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode()
            print(f"✅ SUCCESS ({response.status}): {res_body}")
    except urllib.error.HTTPError as e:
        res_body = e.read().decode()
        print(f"❌ FAILED ({e.code}): {res_body}")
    except Exception as e:
        print(f"❌ Connection Error: {str(e)}")
        print("Maybe the server is not running on localhost:3000?")

if __name__ == "__main__":
    simulate_callback()
