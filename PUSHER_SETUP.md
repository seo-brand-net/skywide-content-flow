## Pusher Real-time Tracking - Setup Guide

### Quick Start

1. **Get Pusher Credentials** (takes 2 minutes):
   - Go to [pusher.com](https://pusher.com) → Sign up for free
   - Create new Channels app
   - Copy credentials to `.env`:

```bash
NEXT_PUBLIC_PUSHER_KEY="your-app-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
PUSHER_APP_ID="your-app-id"
PUSHER_SECRET="your-secret"
```

2. **Install dependencies**:
```bash
npm install
```

3. **Add ONE node to n8n workflow**:
   - Node name: "Initialize Run Tracking"
   - Type: HTTP Request
   - Position: Right after `Webhook1`
   - URL: `{{ $env.NEXT_PUBLIC_APP_URL }}/api/run-tracking/create`
   - Body: `{"content_request_id": "{{ $('Webhook1').first().json.body.request_id }}", "n8n_execution_id": "{{ $execution.id }}"}`

4. **Test it**:
   - Submit a content request
   - Watch real-time updates at `/runs/[run_id]`
   - No page refresh needed!

### How It Works

```
n8n Workflow Start
     ↓
Sends execution_id to backend
     ↓
Backend polls n8n API every 5s
     ↓
Extracts all node outputs automatically
     ↓
Pusher broadcasts to browser (WebSocket)
     ↓
Frontend updates instantly ✨
```

**No tracking nodes needed in workflow!**

See `N8N_INTEGRATION_GUIDE.md` for full details.
