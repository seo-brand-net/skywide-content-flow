import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_PASSWORD_RESET_API_KEY);

export async function POST(request: Request) {
    console.log('API ROUTE: Invitation request received');
    try {
        const body = await request.json();
        const { email, fullName, role } = body;

        if (!email || !fullName || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Generate the invitation link securely via Supabase Admin
        // This creates an 'identity' in auth.users but the user is not yet verified/active
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                }
            }
        });

        if (linkError) {
            console.error('Failed to generate invitation link:', linkError);
            return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        // Determine the site URL for the callback
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Update the Profile Role immediately (since the trigger doesn't handle role from metadata yet)
        const userId = (linkData as any).user?.id;
        if (userId) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ role: role })
                .eq('id', userId);

            if (profileError) {
                console.warn('Warning: Could not update profile role immediately:', profileError.message);
            }
        }

        // CRITICAL: Construct our own link using the token_hash
        // This goes to our server-side callback, which verifies the token and redirects to /register
        const tokenHash = (linkData.properties as any).token_hash;
        const inviteLink = `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=invite&next=/register`;

        console.log('Generated invitation token_hash link:', inviteLink);

        // 2. Send email via Resend
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        console.log(`API ROUTE: Attempting to send invitation from ${fromEmail} to ${email}`);

        const { data: resendData, error: emailError } = await resend.emails.send({
            from: `SKYWIDE <${fromEmail}>`,
            to: [email],
            subject: 'You have been invited to SKYWIDE',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invitation to SKYWIDE</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #ffffff; background-color: #1a1a1a; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
                        <div style="background-color: #2a2a2a; border: 1px solid #333; border-radius: 12px; padding: 40px; text-align: center;">
                            <div style="margin-bottom: 32px;">
                                <h1 style="color: #06b6d4; font-size: 32px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 2px;">SKYWIDE</h1>
                                <p style="color: #888; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">POWERED BY SEOBRAND AI</p>
                            </div>
                            <div style="margin-bottom: 32px;">
                                <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome to SKYWIDE</h2>
                                <p style="color: #cccccc; font-size: 16px; margin: 0 0 24px 0;">Hello ${fullName},</p>
                                <p style="color: #cccccc; font-size: 16px; margin: 0 0 24px 0;">
                                    You have been invited to join the SKYWIDE Content Dashboard as a <strong>${role}</strong>. 
                                    Click the button below to accept your invitation and set up your account.
                                </p>
                            </div>
                            <div style="margin: 32px 0;">
                                <a href="${inviteLink}"
                                    style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">
                                    Accept Invitation
                                </a>
                            </div>
                            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;">
                                <p style="color: #888; font-size: 14px; margin: 0;">
                                    This invitation link will expire in 7 days for security reasons.
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
        console.error('Invitation API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
