// test-webhook.js
import fetch from 'node-fetch';

async function run() {
    try {
        console.log("Creating test error webhook request...");
        
        // Use an existing ID we know might exist, or just simulate the execution failure
        const payload = {
            executionId: "test-err-123",
            runId: null, // Depending on if we have this mapped
            errorMessage: "OpenAI API connection timed out after 30000ms",
            nodeName: "OpenAI Draft (GPT-4O)",
            workflowId: "wf-123",
        };

        const res = await fetch("http://localhost:3000/api/webhooks/n8n-error", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
