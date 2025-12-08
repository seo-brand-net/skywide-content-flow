"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useInvitations } from '@/hooks/useInvitations';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users } from 'lucide-react';
import { InvitationFormData, Invitation } from '@/types/invitation';
import { sendInvitationEmail } from '@/services/invitationEmailService';
import { InvitationStats } from '@/components/invitation/InvitationStats';
import { InvitationForm } from '@/components/invitation/InvitationForm';
import { InvitationTable } from '@/components/invitation/InvitationTable';


export default function InviteUsers() {
    const { user } = useAuth();
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
            // Check for existing user or pending invitation
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', formData.email)
                .maybeSingle();

            if (userError && userError.code !== 'PGRST116') {
                console.error('Profile query error:', userError);
            }

            if (existingUser) {
                toast({
                    title: "User Already Exists",
                    description: "A user with this email address already exists.",
                    variant: "destructive",
                });
                return;
            }

            const { data: pendingInvitation, error: invitationError } = await supabase
                .from('user_invitations')
                .select('id, email, status')
                .eq('email', formData.email)
                .eq('status', 'pending')
                .maybeSingle();

            if (invitationError && invitationError.code !== 'PGRST116') {
                console.error('Invitation query error:', invitationError);
            }

            if (pendingInvitation) {
                toast({
                    title: "Invitation Already Sent",
                    description: "A pending invitation already exists for this email address.",
                    variant: "destructive",
                });
                return;
            }

            // Generate secure token and expiration date
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

            // Save invitation to database
            const { error } = await supabase
                .from('user_invitations')
                .insert([{
                    invited_by: user!.id,
                    email: formData.email,
                    full_name: formData.fullName,
                    role: formData.role,
                    token: token,
                    expires_at: expiresAt.toISOString(),
                    status: 'pending'
                }]);

            if (error) throw error;

            // Send invitation email
            try {
                await sendInvitationEmail(formData.email, formData.fullName, formData.role, token);

                toast({
                    title: "Invitation Sent!",
                    description: `Invitation sent successfully to ${formData.email}. They will receive an email with registration instructions.`,
                });
            } catch (emailError: any) {
                console.error('Email sending failed:', emailError);
                toast({
                    title: "Invitation Saved",
                    description: `Invitation saved but email failed to send to ${formData.email}. You can resend it from the table below.`,
                    variant: "destructive",
                });
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
            await sendInvitationEmail(invitation.email, invitation.full_name, invitation.role, invitation.token);

            toast({
                title: "Invitation Resent!",
                description: `Invitation email resent successfully to ${invitation.email}`,
            });
        } catch (error: any) {
            console.error('Error resending invitation:', error);
            toast({
                title: "Error",
                description: "Failed to resend invitation email.",
                variant: "destructive",
            });
        }
    };

    // Show loading while role is being checked
    if (roleLoading) {
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
