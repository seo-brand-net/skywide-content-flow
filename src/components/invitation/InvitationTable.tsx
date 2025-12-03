import { Button } from '@/components/ui/button';
import { Users, Shield, User } from 'lucide-react';
import { Invitation } from '@/types/invitation';
import { getStatusBadge, getRoleBadge } from './InvitationBadges';

interface InvitationTableProps {
  invitations: Invitation[];
  loading: boolean;
  onResendInvitation: (invitation: Invitation) => Promise<void>;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function InvitationTable({ invitations, loading, onResendInvitation }: InvitationTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-brand-amber/20 text-brand-amber';
      case 'accepted':
        return 'bg-brand-emerald/20 text-brand-emerald';
      case 'expired':
        return 'bg-destructive/20 text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Manage Invitations</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage sent invitations</p>
        </div>
        <div className="p-6 text-center">
          <div className="text-muted-foreground">Loading invitations...</div>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Manage Invitations</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage sent invitations</p>
        </div>
        <div className="text-center py-12 px-6">
          <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">No invitations sent yet</h3>
          <p className="text-sm text-muted-foreground">
            Send your first invitation using the form above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-card-foreground">Manage Invitations</h2>
        <p className="text-sm text-muted-foreground mt-1">View and manage sent invitations</p>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4 p-6">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="bg-muted/30 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-card-foreground">{invitation.full_name}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(invitation.status)}`}>
                {invitation.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{invitation.email}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                invitation.role === 'admin' 
                  ? 'bg-brand-violet/20 text-brand-violet' 
                  : 'bg-brand-blue/20 text-brand-blue'
              }`}>
                {invitation.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {invitation.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {formatDate(invitation.created_at)}
              </span>
              {(invitation.status === 'pending' || invitation.status === 'expired') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="px-3 py-1 text-xs"
                  onClick={() => onResendInvitation(invitation)}
                >
                  Resend
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Name</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Invited Date</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 text-sm text-card-foreground font-medium">{invitation.full_name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{invitation.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    invitation.role === 'admin' 
                      ? 'bg-brand-violet/20 text-brand-violet' 
                      : 'bg-brand-blue/20 text-brand-blue'
                  }`}>
                    {invitation.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {invitation.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(invitation.status)}`}>
                    {invitation.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(invitation.created_at)}
                </td>
                <td className="px-6 py-4">
                  {(invitation.status === 'pending' || invitation.status === 'expired') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                      onClick={() => onResendInvitation(invitation)}
                    >
                      Resend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}