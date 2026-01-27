import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_PASSWORD_RESET_API_KEY);

export async function POST(request: Request) {
    console.log('API ROUTE: Reset password request received');
    try {
        const { email, resetUrl, userFullName } = await request.json();

        if (!email || !resetUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Generate the recovery link securely
        // First, check if the user exists to give a better error
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!user) {
            console.error(`API ROUTE: User ${email} not found in Supabase Auth for project ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
            return NextResponse.json({ error: 'User with this email not found' }, { status: 404 });
        }

        // Determine the site URL
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Generate a secure password reset link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
        });

        if (linkError) {
            console.error('Failed to generate recovery link:', linkError);
            return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        // CRITICAL: Extract the hash from action_link to avoid PKCE transformation
        // The action_link contains the full URL with hash tokens, but goes through Supabase's server
        // We need to extract just the hash portion and append it to our callback URL directly
        const actionLink = linkData.properties.action_link;
        console.log('Generated action_link:', actionLink);

        // Extract hash from the action link (everything after #)
        const hashMatch = actionLink.match(/#(.+)$/);
        const hashFragment = hashMatch ? hashMatch[1] : '';

        if (!hashFragment) {
            console.error('No hash fragment found in action_link:', actionLink);
            return NextResponse.json({ error: 'Failed to extract authentication token' }, { status: 500 });
        }

        // Construct direct link to our callback with the hash tokens
        const recoveryLink = `${siteUrl}/auth/callback#${hashFragment}`;
        console.log('Constructed recovery link:', recoveryLink);


        // 2. Send email via Resend
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        console.log(`API ROUTE: Attempting to send from ${fromEmail} to ${email}`);

        const { data: resendData, error: emailError } = await resend.emails.send({
            from: `SKYWIDE <${fromEmail}>`,
            to: [email],
            subject: 'Reset Your SKYWIDE Password',
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

        if (emailError) {
            console.error('API ROUTE: Resend Error Response:', JSON.stringify(emailError, null, 2));
            return NextResponse.json({ error: emailError.message }, { status: 500 });
        }

        console.log('API ROUTE: Resend Success! Message ID:', resendData?.id);
        return NextResponse.json({ success: true, messageId: resendData?.id });
    } catch (error: any) {
        console.error('Reset Password API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
