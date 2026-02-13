"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Beaker, FlaskConical, Sparkles, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ABTestModal() {
    const router = useRouter();
    const { toast } = useToast();
    // @ts-ignore
    const { user, supabase } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [runMode, setRunMode] = useState<'compare' | 'test_only'>('test_only');

    // Full dashboard fields state
    const [formData, setFormData] = useState({
        articleTitle: "Modern Stucco Maintenance: A Contractor's Guide",
        titleAudience: "Homeowners & DIYers",
        clientName: "Skywide Pro",
        creativeBrief: "Explain the importance of regular stucco maintenance. Cover types of damage like hairline cracks and moisture penetration. Provide advice from a contractor perspective. Avoid promotional fluff.",
        articleType: "Blogs",
        wordCount: "1200",
        primaryKeyword: "stucco maintenance tips",
        secondaryKeyword: "repairing stucco cracks, stucco sealing, external render care",
        semanticTheme: "Home Improvement & Protection",
        tone: "Authoritative & Helpful",
        pageIntent: "Informational"
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const triggerWebhook = async (path: string, requestId: string) => {
        // Insert initial 'pending' row into Supabase -> test_results
        // This ensures the detail page doesn't 404 while waiting for n8n
        const { error: dbError } = await supabase
            .from('test_results')
            .insert([{
                request_id: requestId,
                user_id: user?.id,
                article_title: formData.articleTitle,
                status: 'pending',
                path_id: path,
                created_at: new Date().toISOString()
            }]);

        if (dbError) {
            console.error('Failed to create initial test record:', dbError);
            throw new Error('Failed to initialize test record');
        }

        const response = await fetch('/api/proxy-n8n', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: path,
                request_id: requestId, // Pass generated ID to n8n
                title: formData.articleTitle,
                audience: formData.titleAudience,
                client_name: formData.clientName,
                creative_brief: formData.creativeBrief,
                article_type: formData.articleType,
                word_count: formData.wordCount,
                primary_keywords: formData.primaryKeyword,
                secondary_keywords: formData.secondaryKeyword,
                semantic_theme: formData.semanticTheme,
                tone: formData.tone,
                page_intent: formData.pageIntent,
                user_id: user?.id,
                is_ab_test: true,
                request_status: 'test',
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to trigger ${path}`);
        }
        return response.json();
    };

    const runTest = async () => {
        setLoading(true);
        try {
            if (runMode === 'compare') {
                const testId = crypto.randomUUID();
                const originalId = crypto.randomUUID();

                // Fire both concurrently but handle them individually to see who fails
                const results = await Promise.allSettled([
                    triggerWebhook('content-test', testId),
                    triggerWebhook('content-test-original', originalId)
                ]);

                const testResult = results[0];
                const originalResult = results[1];

                if (testResult.status === 'rejected' || originalResult.status === 'rejected') {
                    const testErr = testResult.status === 'rejected' ? (testResult.reason.message || 'New logic failed') : null;
                    const origErr = originalResult.status === 'rejected' ? (originalResult.reason.message || 'Original logic failed') : null;

                    toast({
                        title: "Partial Failure",
                        description: `New Logic: ${testErr || 'OK'}, Original: ${origErr || 'OK'}`,
                        variant: "destructive"
                    });
                } else {
                    toast({
                        title: "Comparison Started",
                        description: "Both workflows running. Redirecting to New Logic result.",
                    });
                    // Redirect to the new logic test result
                    setOpen(false);
                    router.push(`/dashboard/test-export/${testId}`);
                }
            } else {
                const testId = crypto.randomUUID();
                await triggerWebhook('content-test', testId);
                toast({
                    title: "Test Started",
                    description: "New Logic triggered (v23). Redirecting...",
                });
                setOpen(false);
                router.push(`/dashboard/test-export/${testId}`);
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to trigger test run.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-brand-purple-mimosa text-brand-purple-mimosa hover:bg-brand-purple-mimosa/10">
                    <FlaskConical className="h-4 w-4" />
                    Run A/B Test
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Beaker className="h-6 w-6 text-brand-purple-mimosa" />
                        Run A/B Comparison Test
                    </DialogTitle>
                    <DialogDescription>
                        Test new editorial logic against the original baseline or run both at once.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={runMode} onValueChange={(v: any) => setRunMode(v)} className="w-full px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="test_only" className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            New Logic Only
                        </TabsTrigger>
                        <TabsTrigger value="compare" className="gap-2">
                            <History className="h-4 w-4" />
                            Compare with Old
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
                    <div className="space-y-6 pb-6">
                        {/* Section: Metadata */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-purple-mimosa uppercase tracking-wider">Metadata & Structure</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Article Title</Label>
                                    <Input
                                        value={formData.articleTitle}
                                        onChange={(e) => handleInputChange('articleTitle', e.target.value)}
                                        placeholder="Enter title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Target Audience</Label>
                                    <Input
                                        value={formData.titleAudience}
                                        onChange={(e) => handleInputChange('titleAudience', e.target.value)}
                                        placeholder="e.g. Homeowners"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Name</Label>
                                    <Input
                                        value={formData.clientName}
                                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Article Type</Label>
                                    <Select value={formData.articleType} onValueChange={(v) => handleInputChange('articleType', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Website">Website</SelectItem>
                                            <SelectItem value="Blogs">Blogs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Word Count</Label>
                                    <Input
                                        value={formData.wordCount}
                                        onChange={(e) => handleInputChange('wordCount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tone</Label>
                                    <Input
                                        value={formData.tone}
                                        onChange={(e) => handleInputChange('tone', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: SEO */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-purple-mimosa uppercase tracking-wider">SEO Factors</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Primary Keyword</Label>
                                        <Input
                                            value={formData.primaryKeyword}
                                            onChange={(e) => handleInputChange('primaryKeyword', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Page Intent</Label>
                                        <Input
                                            value={formData.pageIntent}
                                            onChange={(e) => handleInputChange('pageIntent', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Secondary Keywords (Comma separated)</Label>
                                    <Input
                                        value={formData.secondaryKeyword}
                                        onChange={(e) => handleInputChange('secondaryKeyword', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Semantic Theme</Label>
                                    <Input
                                        value={formData.semanticTheme}
                                        onChange={(e) => handleInputChange('semanticTheme', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Brief */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-purple-mimosa uppercase tracking-wider">The Brief</h3>
                            <div className="space-y-2">
                                <Label>Creative Brief</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    value={formData.creativeBrief}
                                    onChange={(e) => handleInputChange('creativeBrief', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground mr-4">
                        {runMode === 'compare'
                            ? "This will trigger 2 parallel workflows."
                            : "This will trigger 1 workflow (v23)."}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={runTest} disabled={loading} className="text-dark bg-brand-purple-mimosa  hover:bg-brand-purple-mimosa/90 min-w-[140px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {runMode === 'compare' ? 'Start Comparison' : 'Run Test'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
