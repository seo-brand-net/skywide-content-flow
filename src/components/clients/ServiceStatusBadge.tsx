"use client";

export interface ClientActivityStatus {
    client_id: string;
    pending_content_count: number;
    last_content_request_at: string | null;
    last_gbp_post_at: string | null;
    gbp_draft_count: number;
    last_indexing_status: 'pending' | 'success' | 'error' | null;
    last_indexing_run_at: string | null;
}

type HealthLevel = 'green' | 'yellow' | 'red' | 'gray';

const DOT_CLASS: Record<HealthLevel, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-destructive',
    gray: 'bg-muted-foreground/40',
};

const TEXT_CLASS: Record<HealthLevel, string> = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-destructive',
    gray: 'text-muted-foreground',
};

function relativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;
    return `${Math.floor(months / 12)} yr ago`;
}

function Dot({ level, label }: { level: HealthLevel; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[level]}`} />
            <span className={`text-[10px] ${TEXT_CLASS[level]}`}>{label}</span>
        </div>
    );
}

function indexingHealth(status: ClientActivityStatus | undefined): { level: HealthLevel; label: string } {
    if (!status?.last_indexing_run_at) return { level: 'gray', label: 'Never run' };
    if (status.last_indexing_status === 'error') return { level: 'red', label: `Failed ${relativeTime(status.last_indexing_run_at)}` };
    const days = Math.floor((Date.now() - new Date(status.last_indexing_run_at).getTime()) / 86_400_000);
    if (status.last_indexing_status === 'success') {
        return { level: days <= 14 ? 'green' : 'yellow', label: relativeTime(status.last_indexing_run_at) };
    }
    return { level: 'gray', label: 'Pending' };
}

function gbpHealth(status: ClientActivityStatus | undefined): { level: HealthLevel; label: string } {
    if (!status?.last_gbp_post_at) return { level: 'gray', label: 'No posts yet' };
    const days = Math.floor((Date.now() - new Date(status.last_gbp_post_at).getTime()) / 86_400_000);
    const level: HealthLevel = days <= 14 ? 'green' : days <= 45 ? 'yellow' : 'red';
    return { level, label: relativeTime(status.last_gbp_post_at) };
}

interface ServiceStatusBadgeProps {
    service: 'content' | 'gbp' | 'indexing';
    status: ClientActivityStatus | undefined;
}

export function ServiceStatusBadge({ service, status }: ServiceStatusBadgeProps) {
    if (service === 'indexing') {
        const { level, label } = indexingHealth(status);
        return <Dot level={level} label={label} />;
    }

    if (service === 'gbp') {
        const { level, label } = gbpHealth(status);
        return (
            <div className="space-y-0.5">
                <Dot level={level} label={label} />
                {!!status?.gbp_draft_count && (
                    <p className="text-[9px] text-brand-blue-crayola font-semibold">
                        {status.gbp_draft_count} draft{status.gbp_draft_count === 1 ? '' : 's'} to review
                    </p>
                )}
            </div>
        );
    }

    // content
    const pending = status?.pending_content_count ?? 0;
    if (pending > 0) {
        return <span className="text-[10px] font-semibold text-yellow-600">{pending} pending</span>;
    }
    if (status?.last_content_request_at) {
        return <span className="text-[10px] text-muted-foreground">Up to date</span>;
    }
    return <span className="text-[10px] text-muted-foreground/60">No requests yet</span>;
}
