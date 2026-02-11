# Simplified n8n Integration with Pusher Real-time Tracking

## Overview

Instead of adding 19 tracking nodes to your n8n workflow, you only need to add **ONE small modification** at the start. The backend will automatically poll n8n's API and push updates via Pusher WebSockets for real-time visualization.

---

## Step 1: Get Pusher Credentials (Free)

1. Go to [pusher.com](https://pusher.com) and sign up for free account
2. Create a new Channels app
3. Copy these credentials to your `.env` file:
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER` (e.g., "us2")
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`

---

## Step 2: Minimal n8n Workflow Modification

You only need to add **ONE HTTP Request node** at the very beginning of your workflow:

### Node Configuration:

**Node Name:** `Initialize Run Tracking`
**Type:** HTTP Request
**Position:** Right after `Webhook1`

**Configuration:**

```json
{
  "method": "POST",
  "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/run-tracking/create",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "{\n  \"content_request_id\": \"{{ $('Webhook1').first().json.body.request_id }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
}
```

**That's it!** No other nodes needed.

---

## Step 3: How It Works

### Automatic Process:

1. **n8n workflow starts** → Sends execution ID to your backend
2. **Backend starts polling** → Checks n8n API every 5 seconds: `GET /api/v1/executions/{execution_id}`
3. **n8n API returns** → Complete execution data including ALL node outputs
4. **Backend processes** → Extracts stage progress, outputs, timestamps
5. **Pusher broadcasts** → Real-time WebSocket updates to frontend
6. **Frontend updates instantly** → No page refresh needed

### What Gets Tracked Automatically:

- ✅ All 19 stages based on node names
- ✅ Node execution start/end times
- ✅ Node outputs (all data)
- ✅ Execution status (running/completed/failed)
- ✅ Duration per node
- ✅ Current stage
- ✅ Overall progress

---

## Step 4: Testing

1. **Start the application:**

   ```bash
   npm run dev
   ```
2. **Submit a content request** from `/dashboard`
3. **Navigate to** `/my-requests` and click the in-progress request
4. **Watch real-time updates** as the workflow executes:

   - Stages change from pending → running → completed
   - Progress bar advances
   - Outputs appear instantly
   - No page refresh needed

---

## Node Name Mapping

The system automatically maps these n8n node names to stages:

| Node Name                                 | Stage Order | Display Name                |
| ----------------------------------------- | ----------- | --------------------------- |
| `Webhook1`                              | 1           | Webhook Received            |
| `Create folder1`                        | 2           | Google Drive Folder Created |
| `OpenAI Draft (GPT-4O)1`                | 3           | OpenAI Draft Generated      |
| `Claude Draft (Claude Opus 3)1`         | 4           | Claude Draft Generated      |
| `Data Check & Research Gaps1`           | 5           | Data Check & Research Gaps  |
| `OpenAI Keyword Check + Semantic Gap1`  | 6           | OpenAI Keyword Analysis     |
| `Claude Keyword Check + Semantic Gap1`  | 7           | Claude Keyword Analysis     |
| `Claude Apply Recommendations1`         | 8           | Recommendations Applied     |
| `OpenAI EEAT Injection1`                | 9           | OpenAI EEAT Enhancement     |
| `Claude EEAT Injection1`                | 10          | Claude EEAT Enhancement     |
| `Merge6`                                | 11          | EEAT Versions Merged        |
| `OpenAI SEO Optimization1`              | 12          | SEO Optimization            |
| `OpenAI NLP & PR Optimization`          | 13          | OpenAI NLP Optimization     |
| `Claude NLP & PR Optimization`          | 14          | Claude NLP Optimization     |
| `Claude Final SEO Snippet Optimization` | 15          | Final SEO Snippet           |
| `OpenAI Humanised Readability Rewrite`  | 16          | Humanized Readability       |
| `Document Export Sanitization`          | 17          | Document Sanitization       |
| `1st Scoring Agent2`                    | 18          | Quality Scoring             |
| `Google Drive Notification1`            | 19          | Final Document Created      |

**Note:** If your node names are different, update the `STAGE_MAP` in `src/services/n8n-poller.ts`

---

## Troubleshooting

### Issue: No updates appearing

**Check:**

1. Pusher credentials are correct in `.env`
2. n8n API key has permissions for `/executions` endpoint
3. Execution ID is being passed correctly from workflow
4. Browser console for Pusher connection errors

### Issue: Stages not showing correctly

**Fix:** Update `STAGE_MAP` in `src/services/n8n-poller.ts` to match your exact node names

### Issue: Polling stops early

**Check:** n8n API rate limits (increase polling interval if needed in `n8n-poller.ts`)

---

## Benefits Over Manual Tracking

| Manual (19 nodes)     | Automatic (1 node)   |
| --------------------- | -------------------- |
| 19 HTTP request nodes | 1 HTTP request node  |
| Cluttered workflow    | Clean workflow       |
| Hard to maintain      | Easy to maintain     |
| Manual output capture | Automatic capture    |
| Polling from browser  | Real-time WebSockets |
| Higher latency        | Instant updates      |

---

## Advanced: Customizing Polling

Edit `src/services/n8n-poller.ts`:

```typescript
// Change polling interval (default: 5000ms = 5 seconds)
const pollInterval = setInterval(async () => {
  // ...
}, 5000); // Change this value

// Change max polling duration (default: 30 minutes)
const maxAttempts = 360; // 360 * 5s = 30min
```

---

## Security Notes

- ✅ n8n API key is server-side only (not exposed to browser)
- ✅ Pusher channels are scoped per run ID
- ✅ Authorization checks ensure users only see their own runs
- ✅ Service role key used for database updates
