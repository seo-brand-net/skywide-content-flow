import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Invitation } from '@/types/invitation';

interface InvitationStatsProps {
  invitations: Invitation[];
}

export function InvitationStats({ invitations }: InvitationStatsProps) {
  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length;
  const expiredCount = invitations.filter(inv => inv.status === 'expired').length;

  return (
    <div className="flex items-center gap-6 mt-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-brand-amber" />
        <span className="text-muted-foreground">Pending:</span>
        <span className="text-foreground font-medium">{pendingCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-brand-emerald" />
        <span className="text-muted-foreground">Accepted:</span>
        <span className="text-foreground font-medium">{acceptedCount}</span>
      </div>
      {expiredCount > 0 && (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-muted-foreground">Expired:</span>
          <span className="text-foreground font-medium">{expiredCount}</span>
        </div>
      )}
    </div>
  );
}