import { Shield, Users, CheckCircle, Clock, XCircle } from 'lucide-react';

export function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-900/20 text-amber-400">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case 'accepted':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-900/20 text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-900/20 text-red-400">
          <XCircle className="h-3 w-3" />
          Expired
        </span>
      );
    default:
      return <span className="text-gray-400">{status}</span>;
  }
}

export function getRoleBadge(role: string) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
      role === 'admin' 
        ? 'bg-blue-900/20 text-blue-400'
        : 'bg-gray-900/20 text-gray-400'
    }`}>
      {role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}