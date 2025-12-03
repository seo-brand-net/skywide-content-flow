import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Users, CheckCircle, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  totalRequests: number;
  activeUsers: number;
  completionRate: number;
  systemHealth: number;
  statusDistribution: { status: string; count: number; percentage: number }[];
  webhookSuccessRate: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle access control
  useEffect(() => {
    if (!roleLoading && user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [user, isAdmin, roleLoading, navigate, toast]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || !isAdmin || roleLoading) return;

      try {
        setLoading(true);

        // Get all content requests
        const { data: allRequests, error } = await supabase
          .from('content_requests')
          .select('*');

        if (error) throw error;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Calculate metrics
        const totalRequests = allRequests?.length || 0;
        
        // Active users in last 30 days
        const recentRequests = allRequests?.filter(req => 
          new Date(req.created_at) >= thirtyDaysAgo
        ) || [];
        const activeUsers = new Set(recentRequests.map(req => req.user_id)).size;

        // Completion rate
        const completedRequests = allRequests?.filter(req => req.status === 'completed').length || 0;
        const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

        // System health (webhook success rate)
        const webhookSentRequests = allRequests?.filter(req => req.webhook_sent === true).length || 0;
        const systemHealth = totalRequests > 0 ? (webhookSentRequests / totalRequests) * 100 : 0;

        // Status distribution
        const statusCounts = allRequests?.reduce((acc, req) => {
          const status = req.status || 'pending';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0
        }));

        setAnalyticsData({
          totalRequests,
          activeUsers,
          completionRate,
          systemHealth,
          statusDistribution,
          webhookSuccessRate: systemHealth
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, isAdmin, roleLoading]);

  // Show loading while checking role
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render anything for non-admins (they'll be redirected)
  if (!user || !isAdmin) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400';
      case 'in_progress': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '●';
      case 'in_progress': return '●';
      case 'failed': return '●';
      default: return '●';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <BarChart className="w-6 h-6 text-brand-cyan" />
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <span className="px-2 py-1 text-xs bg-brand-indigo/20 text-brand-indigo rounded-full">
          Admin
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : analyticsData ? (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Requests Card */}
            <Card className="bg-card border-border hover-glow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Requests
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-brand-cyan" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analyticsData.totalRequests}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time content requests
                </p>
              </CardContent>
            </Card>

            {/* Active Users Card */}
            <Card className="bg-card border-border hover-glow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Users
                </CardTitle>
                <Users className="h-4 w-4 text-brand-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analyticsData.activeUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users active in last 30 days
                </p>
              </CardContent>
            </Card>

            {/* Completion Rate Card */}
            <Card className="bg-card border-border hover-glow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completion Rate
                </CardTitle>
                <CheckCircle className={`h-4 w-4 ${
                  analyticsData.completionRate >= 80 ? 'text-emerald-400' : 
                  analyticsData.completionRate >= 60 ? 'text-amber-400' : 'text-red-400'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analyticsData.completionRate >= 80 ? 'text-emerald-400' : 
                  analyticsData.completionRate >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {analyticsData.completionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Requests completed successfully
                </p>
              </CardContent>
            </Card>

            {/* System Health Card */}
            <Card className="bg-card border-border hover-glow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Health
                </CardTitle>
                <Activity className={`h-4 w-4 ${
                  analyticsData.systemHealth >= 95 ? 'text-emerald-400' : 
                  analyticsData.systemHealth >= 80 ? 'text-amber-400' : 'text-red-400'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analyticsData.systemHealth >= 95 ? 'text-emerald-400' : 
                  analyticsData.systemHealth >= 80 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {analyticsData.systemHealth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Webhook delivery success rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Supporting Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.statusDistribution.length > 0 ? (
                  analyticsData.statusDistribution.map(({ status, count, percentage }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                        </span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{count}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* System Health Details */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">System Health Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Webhook Success Rate</span>
                  <span className={`text-sm font-medium ${
                    analyticsData.webhookSuccessRate >= 95 ? 'text-emerald-400' : 
                    analyticsData.webhookSuccessRate >= 80 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {analyticsData.webhookSuccessRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Requests</span>
                  <span className="text-sm font-medium text-foreground">
                    {analyticsData.totalRequests}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed Requests</span>
                  <span className="text-sm font-medium text-red-400">
                    {analyticsData.statusDistribution.find(s => s.status === 'failed')?.count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">System Status</span>
                  <span className={`text-sm font-medium flex items-center gap-1 ${
                    analyticsData.systemHealth >= 95 ? 'text-emerald-400' : 
                    analyticsData.systemHealth >= 80 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {analyticsData.systemHealth >= 95 ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Healthy
                      </>
                    ) : analyticsData.systemHealth >= 80 ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Warning
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Critical
                      </>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Failed to load analytics data. Please try again later.
          </p>
        </div>
      )}
    </div>
  );
}