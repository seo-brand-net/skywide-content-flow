import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, token, fullName, role } = body;

        console.log('Registration attempt:', { email, token, role });

        if (!token || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Verify the invitation token validity
        const { data: invitation, error: invitationError } = await supabaseAdmin
            .from('user_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (invitationError || !invitation) {
            console.error('Invitation check failed:', invitationError);
            return NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
        }

        if (invitation.email.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json(
                { error: 'Email does not match invitation' },
                { status: 400 }
            );
        }

        // 2. Create the user with email_confirm: true (Auto-Confirm)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // This is the key fix!
            user_metadata: {
                full_name: fullName,
                display_name: fullName,
            }
        });

        if (authError) {
            console.error('Auth creation failed:', authError);
            if (authError.message.includes('already registered')) {
                return NextResponse.json(
                    { error: 'Account already exists. Please sign in.' },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: authError.message },
                { status: 500 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            );
        }

        const userId = authData.user.id;

        // 3. Update the Profile (Trigger already created it, we update role/name)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: fullName,
                display_name: fullName,
                role: role || 'user',
            })
            .eq('id', userId);

        if (profileError) {
            console.error('Profile update warning:', profileError);
            // Non-blocking warning
        }

        // 4. Mark invitation as accepted
        const { error: inviteUpdateError } = await supabaseAdmin
            .from('user_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('token', token);

        if (inviteUpdateError) {
            console.error('Invitation status update warning:', inviteUpdateError);
        }

        // 5. Auto-Restore Data (The "Trigger" Logic)
        try {
            const fs = require('fs');
            const path = require('path');
            const backupPath = path.join(process.cwd(), 'backup_real.json');

            if (fs.existsSync(backupPath)) {
                console.log('Checking for backup data to restore...');
                const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                const userEmail = email.toLowerCase();

                // Find old profile to get old ID (though we used email for mapping in the script)
                // Actually, just filtering by email in the backup content is safer if we trust the email.
                // But the backup is structured by Table. 
                // We need to find the OLD User ID associated with this email in the backup 'profiles'.
                const oldProfile = (backup['profiles'] || []).find((p: any) => p.email?.toLowerCase() === userEmail);

                if (oldProfile) {
                    const oldUserId = oldProfile.id;
                    console.log(`Found backup data for ${userEmail} (Old ID: ${oldUserId}). Restoring...`);

                    // Restore Content Requests
                    const userRequests = (backup['content_requests'] || []).filter((r: any) => r.user_id === oldUserId);
                    if (userRequests.length > 0) {
                        const requestsToInsert = userRequests.map((r: any) => ({
                            ...r,
                            user_id: userId, // Map to NEW User ID
                            updated_at: new Date().toISOString()
                        }));

                        const { error: reqError } = await supabaseAdmin
                            .from('content_requests')
                            .upsert(requestsToInsert);

                        if (reqError) console.error('Restoration Error (Requests):', reqError);
                        else console.log(`Restored ${userRequests.length} requests.`);
                    }

                    // Restore AI Conversations
                    const userConversations = (backup['ai_conversations'] || []).filter((c: any) => c.user_id === oldUserId);
                    if (userConversations.length > 0) {
                        const convosToInsert = userConversations.map((c: any) => ({
                            ...c,
                            user_id: userId, // Map to NEW User ID
                        }));

                        const { error: convError } = await supabaseAdmin
                            .from('ai_conversations')
                            .upsert(convosToInsert);

                        if (convError) console.error('Restoration Error (Conversations):', convError);
                        else console.log(`Restored ${userConversations.length} conversations.`);
                    }

                    // Restore AI Messages (Linked to Conversations we just restored)
                    // Since we preserved Conversation IDs, we just look for messages matching those IDs.
                    const userConvoIds = new Set(userConversations.map((c: any) => c.id));
                    const userMessages = (backup['ai_messages'] || []).filter((m: any) => userConvoIds.has(m.conversation_id));

                    if (userMessages.length > 0) {
                        const { error: msgError } = await supabaseAdmin
                            .from('ai_messages')
                            .upsert(userMessages); // IDs are preserved, strictly linking to conversations

                        if (msgError) console.error('Restoration Error (Messages):', msgError);
                        else console.log(`Restored ${userMessages.length} messages.`);
                    }

                } else {
                    console.log('No historical data found for this user in backup.');
                }
            }
        } catch (restoreError) {
            // Non-blocking error - ensure registration success is returned regardless
            console.error('Auto-Restoration Failed:', restoreError);
        }

        return NextResponse.json({
            success: true,
            userId: userId,
            message: 'Account created and verified successfully'
        });

    } catch (error: any) {
        console.error('Registration server error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
