import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { webhookUrl, payload } = requestData;

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'webhookUrl is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate webhook URL (only allow specific domains for security)
    const allowedDomains = [
      'seobrand.app.n8n.cloud',
      'n8n-6v8fm-u36794.vm.elestio.app',
    ];

    const urlObj = new URL(webhookUrl);
    if (!allowedDomains.some(domain => urlObj.hostname.endsWith(domain))) {
      return new Response(
        JSON.stringify({ error: 'Webhook URL not allowed' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Forward request to webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await webhookResponse.text();
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return new Response(
      JSON.stringify({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        data: parsedData,
      }),
      {
        status: webhookResponse.ok ? 200 : webhookResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

