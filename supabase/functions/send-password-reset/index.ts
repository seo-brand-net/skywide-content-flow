import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
  userFullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl, userFullName }: PasswordResetRequest = await req.json();

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resetUrl,
      },
    });

    if (linkError) {
      throw linkError;
    }

    const recoveryLink = data.properties.action_link;

    const emailResponse = await resend.emails.send({
      from: "SKYWIDE <registrations@skywide.co>",
      to: [email],
      subject: "Reset Your SKYWIDE Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #ffffff; background-color: #1a1a1a; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
            <div style="background-color: #2a2a2a; border: 1px solid #333; border-radius: 12px; padding: 40px; text-align: center;">
              <div style="margin-bottom: 32px;">
                <h1 style="color: #06b6d4; font-size: 32px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 2px;">SKYWIDE</h1>
                <p style="color: #888; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">POWERED BY SEOBRAND AI</p>
              </div>
              <div style="margin-bottom: 32px;">
                <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Reset Your Password</h2>
                ${userFullName ? `<p style="color: #cccccc; font-size: 16px; margin: 0 0 24px 0;">Hello ${userFullName},</p>` : ''}
                <p style="color: #cccccc; font-size: 16px; margin: 0 0 24px 0;">
                  We received a request to reset your password for your SKYWIDE account. Click the button below to create a new password.
                </p>
              </div>
              <div style="margin: 32px 0;">
                <a href="${recoveryLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">
                  Reset Password
                </a>
              </div>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;">
                <p style="color: #888; font-size: 14px; margin: 0 0 8px 0;">
                  If you didn't request this password reset, you can safely ignore this email.
                </p>
                <p style="color: #888; font-size: 14px; margin: 0;">
                  This link will expire in 24 hours for security reasons.
                </p>
              </div>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  © 2024 SKYWIDE. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw new Error(`Email provider error: ${emailResponse.error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);