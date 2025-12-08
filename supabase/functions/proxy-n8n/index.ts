import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log('Proxying payload to n8n:', payload)

        const response = await fetch('https://seobrand.app.n8n.cloud/webhook/content-engine-dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await response.text()

        // Try to parse as JSON if possible, otherwise return text
        let responseData
        try {
            responseData = JSON.parse(data)
        } catch {
            responseData = { message: data }
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        })
    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
