import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Eye, Clock, User, ExternalLink, Search } from 'lucide-react';

interface ContentRequest {
  id: string;
  article_title: string;
  title_audience: string;
  seo_keywords: string;
  article_type: string;
  client_name: string;
  creative_brief: string;
  status: string;
  created_at: string;
  updated_at: string;
  webhook_sent: boolean | null;
  webhook_response: string | null;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
    role: string;
  };
}

interface Profile {
  role: string;
  email: string;
}

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ContentRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole) {
      fetchRequests();
    }
  }, [user, userRole]);

  const fetchRequests = async () => {
    try {
      if (userRole === 'admin') {
        // For admin users, fetch content requests with user profiles in a single query
        const { data, error } = await supabase
          .from('content_requests')
          .select(`
            id,
            article_title,
            title_audience,
            seo_keywords,
            client_name,
            article_type,
            creative_brief,
            status,
            webhook_sent,
            webhook_response,
            created_at,
            updated_at,
            user_id
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // If we have requests, fetch user profiles for them
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(req => req.user_id))];
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            setRequests(data as ContentRequest[]);
          } else if (profilesData) {
            // Create a map for efficient lookup
            const profilesMap = new Map(
              profilesData.map(profile => [profile.id, profile])
            );

            // Merge profile data with requests
            const requestsWithProfiles: ContentRequest[] = data.map(request => ({
              ...request,
              profiles: profilesMap.get(request.user_id) ? {
                full_name: profilesMap.get(request.user_id)!.full_name || '',
                email: profilesMap.get(request.user_id)!.email || '',
                role: profilesMap.get(request.user_id)!.role || 'user'
              } : undefined
            }));

            setRequests(requestsWithProfiles);
          } else {
            setRequests(data as ContentRequest[]);
          }
        } else {
          setRequests([]);
        }
      } else {
        // For regular users, only fetch their own requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('content_requests')
          .select(`
            id,
            article_title,
            title_audience,
            seo_keywords,
            client_name,
            article_type,
            creative_brief,
            status,
            webhook_sent,
            webhook_response,
            created_at,
            updated_at,
            user_id
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;
        setRequests(requestsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user?.id)
        .single();
        
      if (data) {
        setUserRole(data.role || 'user');
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'cancelled':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const openDetailView = (request: ContentRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const closeDetailView = () => {
    setSelectedRequest(null);
    setIsDetailModalOpen(false);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getGoogleDriveLink = (webhookResponse: string | null): string | null => {
    if (!webhookResponse) return null;
    
    try {
      const parsed = JSON.parse(webhookResponse);
      return parsed.gDriveLink || null;
    } catch {
      // If it's not JSON, check if it's a direct URL
      if (webhookResponse.includes('drive.google.com')) {
        return webhookResponse;
      }
      return null;
    }
  };

  // Filter requests based on search term
  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests;
    
    const search = searchTerm.toLowerCase();
    return requests.filter(request => 
      request.article_title.toLowerCase().includes(search) ||
      request.client_name.toLowerCase().includes(search) ||
      request.article_type.toLowerCase().includes(search) ||
      request.status.toLowerCase().includes(search) ||
      request.creative_brief.toLowerCase().includes(search) ||
      (userRole === 'admin' && request.profiles?.full_name?.toLowerCase().includes(search)) ||
      (userRole === 'admin' && request.profiles?.email?.toLowerCase().includes(search))
    );
  }, [requests, searchTerm, userRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
            <p className="text-muted-foreground">Loading your submitted content requests...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
            <p className="text-muted-foreground text-red-500">Error loading requests: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Requests
              {userRole === 'admin' && (
                <Badge variant="default" className="ml-3">Admin</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'admin' 
                ? `Viewing ${filteredRequests.length} of ${requests.length} content requests`
                : `You have ${filteredRequests.length} of ${requests.length} submitted content requests`}
            </p>
          </div>
        </div>

        {/* Search functionality */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          )}
        </div>
        
        {filteredRequests.length === 0 && requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No requests submitted yet.
              </p>
              <Button asChild>
                <Link to="/dashboard">Submit your first request</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No requests found matching "{searchTerm}".
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Content Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead className="font-semibold text-foreground py-4 px-6">Article Title</TableHead>
                        {userRole === 'admin' && <TableHead className="font-semibold text-foreground py-4 px-4">User</TableHead>}
                        <TableHead className="font-semibold text-foreground py-4 px-4">Client</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 px-4">Type</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 px-4">Status</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 px-4">Submitted</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 px-4">View Docs</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => {
                        const googleDriveLink = getGoogleDriveLink(request.webhook_response);
                        
                        return (
                          <TableRow key={request.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <TableCell className="py-4 px-6">
                              <div className="max-w-xs">
                                <p className="font-medium text-foreground truncate mb-1" title={request.article_title}>
                                  {request.article_title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {truncateText(request.creative_brief, 50)}
                                </p>
                              </div>
                            </TableCell>
                            
                            {userRole === 'admin' && (
                              <TableCell className="py-4 px-4">
                                {request.profiles ? (
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{request.profiles.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{request.profiles.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                            )}
                            
                            <TableCell className="py-4 px-4">
                              <span className="text-sm text-foreground font-medium">{request.client_name}</span>
                            </TableCell>
                            
                            <TableCell className="py-4 px-4">
                              <Badge variant="outline" className="text-xs font-medium">
                                {request.article_type}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="py-4 px-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ')}
                              </span>
                            </TableCell>
                            
                            <TableCell className="py-4 px-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(request.created_at)}
                              </div>
                            </TableCell>
                            
                            <TableCell className="py-4 px-4">
                              {googleDriveLink ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(googleDriveLink, '_blank');
                                  }}
                                  className="text-xs bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Docs
                                </Button>
                              ) : (
                                <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded">
                                  {request.webhook_sent ? 'Pending' : 'Processing'}
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell className="py-4 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailView(request)}
                                className="text-xs hover:bg-muted"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request Details</DialogTitle>
                </DialogHeader>
                
                {selectedRequest && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Article Title</label>
                        <p className="text-foreground mt-1">{selectedRequest.article_title}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Target Audience</label>
                        <p className="text-foreground mt-1">{selectedRequest.title_audience}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">SEO Keywords</label>
                        <p className="text-foreground mt-1">{selectedRequest.seo_keywords}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                          <p className="text-foreground mt-1">{selectedRequest.client_name}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Article Type</label>
                          <p className="text-foreground mt-1">{selectedRequest.article_type}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Creative Brief</label>
                        <p className="text-foreground mt-1 whitespace-pre-wrap">{selectedRequest.creative_brief}</p>
                      </div>
                      
                      {/* Google Drive Documents Section */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Documents</label>
                        <div className="mt-1">
                          {getGoogleDriveLink(selectedRequest.webhook_response) ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const link = getGoogleDriveLink(selectedRequest.webhook_response);
                                if (link) window.open(link, '_blank');
                              }}
                              className="w-full sm:w-auto"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Google Drive Documents
                            </Button>
                          ) : (
                            <p className="text-muted-foreground">
                              {selectedRequest.webhook_sent ? 'Documents pending - please check back later' : 'Request is being processed'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {userRole === 'admin' && selectedRequest.profiles && (
                        <div className="border-t border-border pt-4">
                          <label className="text-sm font-medium text-muted-foreground">Submitted By</label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-foreground">{selectedRequest.profiles.full_name}</span>
                            <span className="text-muted-foreground">({selectedRequest.profiles.email})</span>
                            <Badge 
                              variant={selectedRequest.profiles.role === 'admin' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {selectedRequest.profiles.role}
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                              {selectedRequest.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Webhook Status</label>
                          <p className="text-foreground mt-1">
                            {selectedRequest.webhook_sent ? '✓ Successfully sent' : '⏳ Pending'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                          <p className="text-foreground mt-1">{formatDate(selectedRequest.created_at)}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                          <p className="text-foreground mt-1">{formatDate(selectedRequest.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}