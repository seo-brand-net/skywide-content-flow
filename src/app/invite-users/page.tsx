"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useInvitations } from '@/hooks/useInvitations';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users } from 'lucide-react';
import { InvitationFormData, Invitation } from '@/types/invitation';
import { sendInvitationEmail } from '@/services/invitationEmailService';
import { withTimeout } from '@/utils/timeout';
import { InvitationStats } from '@/components/invitation/InvitationStats';
import { InvitationForm } from '@/components/invitation/InvitationForm';
import { InvitationTable } from '@/components/invitation/InvitationTable';


export default function InviteUsers() {
    const { user, loading: authLoading, supabase } = useAuth();
    const { userRole, isAdmin, loading: roleLoading } = useUserRole(user?.id);
    const { invitations, loading, fetchInvitations } = useInvitations(user?.id);
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (formData: InvitationFormData) => {
        if (!formData.fullName || !formData.email || !formData.role) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            // Call our new invitation API
            const response = await fetch('/api/auth/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    fullName: formData.fullName,
                    role: formData.role
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send invitation');
            }

            toast({
                title: "Invitation Sent!",
                description: `Invitation sent successfully to ${formData.email}. They will receive an email with instructions.`,
            });

            // We still keep the user_invitations table for UI tracking
            // Use Supabase client to sync if needed, or just refresh the list
            // Assuming the server handled the profile creation, we might want to manually insert into user_invitations for UI tracking
            try {
                await withTimeout(
                    supabase.from('user_invitations').upsert([{
                        invited_by: user!.id,
                        email: formData.email,
                        full_name: formData.fullName,
                        role: formData.role,
                        status: 'pending',
                        token: 'native_invite'
                    }], { onConflict: 'email' }),
                    10000,
                    'Local invitation status sync timed out'
                );
            } catch (syncError) {
                console.warn('Sync to user_invitations failed:', syncError);
            }

            // Refresh invitations list
            await fetchInvitations();

        } catch (error: any) {
            console.error('Error sending invitation:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to send invitation.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendInvitation = async (invitation: Invitation) => {
        try {
            const response = await fetch('/api/auth/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: invitation.email,
                    fullName: invitation.full_name,
                    role: invitation.role
                })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to resend invitation');
            }

            toast({
                title: "Invitation Resent!",
                description: `Invitation email resent successfully to ${invitation.email}`,
            });
        } catch (error: any) {
            console.error('Error resending invitation:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to resend invitation email.",
                variant: "destructive",
            });
        }
    };

    // Show loading while auth or role is being checked
    if (authLoading || roleLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-muted-foreground">Loading...</span>
                </div>
            </div>
        );
    }

    // Only check access after loading is complete
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-brand-cyan" />
                    <h1 className="text-2xl font-bold text-foreground">Invite Users</h1>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-brand-violet/20 text-brand-violet">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                    </span>
                </div>
                <p className="text-muted-foreground mb-4">Send invitations to new team members</p>

                <InvitationStats invitations={invitations} />
            </div>

            <InvitationForm onSubmit={handleSubmit} isSubmitting={submitting} />

            <InvitationTable
                invitations={invitations}
                loading={loading}
                onResendInvitation={handleResendInvitation}
            />
        </div>
    );
}
