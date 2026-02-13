"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, PlayCircle, History, Eye, X, Download, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generatePDFFromMarkdown, downloadPDFBlob } from '@/services/pdfGeneratorService';
import { ABTestModal } from '@/components/ab-test-modal';

// Lazy load the PDF viewer
const PDFViewer = lazy(() => import('@/components/pdf/PDFViewer'));

const EXPORT_PATHS = [
    { id: 'openai_qa_loop', name: 'OpenAI QA Loop' },
    { id: 'openai_score_loop', name: 'OpenAI Score Loop' },
    { id: 'openai_direct_export', name: 'OpenAI Direct Export' },
    { id: 'claude_qa_loop', name: 'Claude QA Loop' },
    { id: 'claude_score_loop', name: 'Claude Score Loop' },
    { id: 'claude_direct_export', name: 'Claude Direct Export' },
];

interface TestResult {
    pathId: string;
    pathName: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'timeout';
    score?: number;
    alignment?: string;
    improvements?: string[];
    error?: string;
    data?: any;
    timestamp?: string;
    content_markdown?: string;
    pdf_url?: string;
}

export default function TestExportPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [selectedPath, setSelectedPath] = useState<string>('all');
    const [isTesting, setIsTesting] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const [viewingPDF, setViewingPDF] = useState<{ title: string; url: string } | null>(null);
    const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('test_results')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            setHistory(data);
        }
    };

    const getMockData = () => {
        const scenarios = [
            {
                title: "The Ethical Dilemma of AI Diagnostics",
                creative_brief: "Analyze the intersection of medicine and machine learning. Focus on patient privacy, the risk of algorithmic bias in marginalized communities, and why a human-in-the-loop system is non-negotiable for critical health decisions.",
                primary_keywords: "AI medical ethics",
                secondary_keywords: "healthcare algorithms bias",
                semantic_theme: "Technology & Health",
                page_intent: "Informational"
            },
            {
                title: "Sustainable Urban Farming: 2024 Blueprint",
                creative_brief: "Showcase innovative ways cities are tackling food deserts. Cover vertical hydroponics, rooftop community gardens, and the role of municipal policy in incentivizing green space conversion.",
                primary_keywords: "urban farming solutions",
                secondary_keywords: "vertical gardening benefits",
                semantic_theme: "Environment & Urbanism",
                page_intent: "Commercial"
            }
        ];
        const random = scenarios[Math.floor(Math.random() * scenarios.length)];
        return {
            ...random,
            client_name: "TechTest",
            audience: "Professionals",
            article_type: "Blogs",
            word_count: "1200",
            tone: "Professional"
        };
    };

    const runSingleTest = async (pathId: string, pathName: string): Promise<TestResult> => {
        const mockData = getMockData();
        const requestId = crypto.randomUUID();

        try {
            // 0. Pre-insert record for persistence
            await supabase.from('test_results').insert({
                request_id: requestId,
                path_id: pathId,
                article_title: mockData.title,
                status: 'pending',
                user_id: user?.id
            });

            // 1. Trigger the workflow via the TEST proxy
            const triggerResponse = await fetch('/api/proxy-n8n-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...mockData,
                    target_path: pathId,
                    request_status: 'test',
                    request_id: requestId,
                    user_id: user?.id,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!triggerResponse.ok) throw new Error(`Trigger failed: ${triggerResponse.status}`);

            // 2. Poll for results (Async Callback architecture)
            return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 50; // 250 seconds
                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const pollRes = await fetch(`/api/test-callback?request_id=${requestId}`);
                        const pollData = await pollRes.json();

                        if (pollRes.ok && pollData.status === 'completed') {
                            clearInterval(pollInterval);
                            resolve({
                                pathId,
                                pathName,
                                status: 'success',
                                score: pollData.data?.overall_alignment_score || pollData.data?.alignment_score || 0,
                                alignment: pollData.data?.alignment_summary || 'Analysis complete',
                                improvements: pollData.data?.suggestions || [],
                                data: pollData.data,
                                content_markdown: pollData.content_markdown,
                                pdf_url: pollData.pdf_url,
                                timestamp: new Date().toLocaleTimeString()
                            });
                        } else if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            resolve({
                                pathId,
                                pathName,
                                status: 'timeout',
                                error: 'Results took too long to arrive.'
                            });
                        }
                    } catch (err) {
                        console.error("Polling error:", err);
                    }
                }, 5000);
            });

        } catch (error: any) {
            return {
                pathId,
                pathName,
                status: 'failed',
                error: error.message,
            };
        }
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        setOverallProgress(0);
        const pathsToTest = selectedPath === 'all'
            ? EXPORT_PATHS
            : EXPORT_PATHS.filter(p => p.id === selectedPath);

        setResults(pathsToTest.map(p => ({
            pathId: p.id,
            pathName: p.name,
            status: 'pending',
        })));

        const resultsPromises = pathsToTest.map(async (path) => {
            setResults(prev => prev.map(r => r.pathId === path.id ? { ...r, status: 'running' } : r));
            const result = await runSingleTest(path.id, path.name);
            setResults(prev => prev.map(r => r.pathId === path.id ? result : r));
            setOverallProgress(p => p + (100 / pathsToTest.length));
            return result;
        });

        await Promise.all(resultsPromises);
        setIsTesting(false);
        setOverallProgress(100);

        toast({
            title: "Testing Sequence Complete",
            description: "Diagnostic reports are ready for review.",
        });
        fetchHistory();
    };

    const handleGeneratePDF = async (result: TestResult) => {
        if (!result.content_markdown || !user?.id || !result.data?.request_id) {
            toast({ title: "Error", description: "Missing data for PDF generation.", variant: "destructive" });
            return;
        }

        setGeneratingPDF(result.pathId);

        try {
            const pdfResult = await generatePDFFromMarkdown(
                result.content_markdown,
                result.pathName,
                result.data.request_id,
                user.id
            );

            if (pdfResult.error) {
                toast({ title: "PDF Error", description: pdfResult.error, variant: "destructive" });
                return;
            }

            if (pdfResult.url) {
                // Update the result with the PDF URL
                setResults(prev => prev.map(r =>
                    r.pathId === result.pathId ? { ...r, pdf_url: pdfResult.url! } : r
                ));

                // Open the PDF viewer
                setViewingPDF({ title: result.pathName, url: pdfResult.url });

                toast({ title: "PDF Generated", description: "Your PDF is ready to view and share." });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingPDF(null);
        }
    };

    const handleViewHistoryPDF = async (requestId: string, title: string) => {
        try {
            const { data, error } = await supabase
                .from('test_results')
                .select('pdf_url, content_markdown')
                .eq('request_id', requestId)
                .single();

            if (error) {
                toast({ title: "Error", description: "Failed to load PDF data.", variant: "destructive" });
                return;
            }

            // If PDF exists, show it
            if (data?.pdf_url) {
                setViewingPDF({ title: title || 'Test Result', url: data.pdf_url });
                return;
            }

            // If no PDF but has markdown, generate it
            if (data?.content_markdown && user?.id) {
                setGeneratingPDF(requestId);
                const pdfResult = await generatePDFFromMarkdown(
                    data.content_markdown,
                    title || 'Test Result',
                    requestId,
                    user.id
                );

                if (pdfResult.url) {
                    setViewingPDF({ title: title || 'Test Result', url: pdfResult.url });
                    fetchHistory(); // Refresh to show PDF URL
                    toast({ title: "PDF Generated", description: "Your PDF has been created." });
                } else {
                    toast({ title: "Error", description: pdfResult.error || "Failed to generate PDF.", variant: "destructive" });
                }
                setGeneratingPDF(null);
                return;
            }

            toast({ title: "No Content", description: "No content available for PDF generation.", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Failed to load content.", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold seobrand-title seobrand-title-accent mb-2">
                        Content Testing Framework
                    </h1>
                    <p className="text-muted-foreground">
                        Test content generation and export results as PDF documents. Results are stored in Skywide for easy sharing.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-border hover-glow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PlayCircle className="h-5 w-5 text-brand-purple-mimosa" />
                                Start New Test
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Launch a new content generation test using the A/B testing framework. Compare different prompts or models.
                            </p>
                            <ABTestModal />
                        </CardContent>
                    </Card>

                    <Card className="border-border hover-glow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                Quick Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Access the most recent test result directly for debugging or review.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                onClick={() => router.push('/dashboard/test-export/latest')}
                            >
                                <Eye className="h-4 w-4" />
                                View Latest Test Result
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Result Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((result) => (
                        <Card key={result.pathId} className={`bg-card/30 border-border ${result.status === 'running' ? 'border-brand-blue-crayola/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm font-bold tracking-tight">{result.pathName}</CardTitle>
                                    {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                    {result.status === 'failed' && <XCircle className="h-4 w-4 text-rose-500" />}
                                    {result.status === 'timeout' && <Loader2 className="h-4 w-4 text-amber-500" />}
                                    {result.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-brand-blue-crayola" />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {result.status === 'success' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Alignment</span>
                                            <span className="text-2xl font-black text-brand-blue-crayola">{result.score}%</span>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/20 italic">
                                            &ldquo;{result.alignment}&rdquo;
                                        </p>
                                        {result.improvements && result.improvements.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Strategic Suggestions</p>
                                                <ul className="text-[11px] space-y-1">
                                                    {result.improvements.slice(0, 3).map((imp, i) => (
                                                        <li key={i} className="flex gap-2 items-start">
                                                            <div className="w-1 h-1 rounded-full bg-brand-blue-crayola mt-1.5 shrink-0" />
                                                            <span>{imp}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-border/10">
                                            <span className="text-[10px] font-mono text-muted-foreground">{result.timestamp}</span>
                                            <div className="flex gap-1">
                                                {/* PDF Button - Generate or View */}
                                                {result.pdf_url ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 hover:bg-emerald-500/10 text-emerald-500"
                                                        onClick={() => setViewingPDF({
                                                            title: result.pathName,
                                                            url: result.pdf_url!
                                                        })}
                                                    >
                                                        <FileText className="mr-1 h-3 w-3" /> View PDF
                                                    </Button>
                                                ) : result.content_markdown && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 hover:bg-emerald-500/10 text-emerald-500"
                                                        onClick={() => handleGeneratePDF(result)}
                                                        disabled={generatingPDF === result.pathId}
                                                    >
                                                        {generatingPDF === result.pathId ? (
                                                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Generating...</>
                                                        ) : (
                                                            <><FileText className="mr-1 h-3 w-3" /> Generate PDF</>
                                                        )}
                                                    </Button>
                                                )}
                                                {result.data?.request_id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 hover:bg-brand-blue-crayola/10 text-brand-blue-crayola"
                                                        onClick={() => router.push(`/dashboard/test-export/${result.data.request_id}`)}
                                                    >
                                                        Full Report
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {result.status === 'failed' && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                        <p className="text-xs text-rose-500 font-medium">{result.error}</p>
                                    </div>
                                )}
                                {result.status === 'timeout' && (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-xs text-amber-500 font-medium">Wait timeout - n8n still processing</p>
                                    </div>
                                )}
                                {result.status === 'pending' && (
                                    <p className="text-[11px] text-muted-foreground italic">Awaiting sequence...</p>
                                )}
                                {result.status === 'running' && (
                                    <div className="space-y-2">
                                        <p className="text-[11px] text-brand-blue-crayola font-medium flex items-center gap-2">
                                            <Loader2 size={12} className="animate-spin" />
                                            Analyzing generation...
                                        </p>
                                        <Progress value={45} className="h-1 bg-brand-blue-crayola/10" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* History Section */}
                <div className="pt-8 border-t border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <History size={20} className="text-brand-blue-crayola" />
                        <h2 className="text-xl font-bold text-foreground">Diagnostic History</h2>
                    </div>

                    <Card className="bg-card/20 border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/40 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Path</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Score</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Date</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                                No previous diagnostics found.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((run) => (
                                            <tr
                                                key={run.id}
                                                className="hover:bg-muted/20 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/dashboard/test-export/${run.request_id}`)}
                                            >
                                                <td className="px-6 py-4 font-medium">
                                                    {EXPORT_PATHS.find(p => p.id === run.path_id)?.name || run.path_id}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        run.status === 'pending' ? 'bg-brand-blue-crayola/10 text-brand-blue-crayola' :
                                                            'bg-rose-500/10 text-rose-500'
                                                        }`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold">{run.score || 0}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground text-xs">
                                                    {new Date(run.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {run.pdf_url ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[10px] px-2 hover:bg-emerald-500/10 text-emerald-500"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewingPDF({ title: run.article_title || 'Test Result', url: run.pdf_url });
                                                                }}
                                                            >
                                                                <FileText className="mr-1 h-3 w-3" /> View PDF
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[10px] px-2 hover:bg-brand-blue-crayola/10 text-brand-blue-crayola"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewHistoryPDF(run.request_id, run.article_title);
                                                                }}
                                                                disabled={generatingPDF === run.request_id}
                                                            >
                                                                {generatingPDF === run.request_id ? (
                                                                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Generating...</>
                                                                ) : (
                                                                    <><FileText className="mr-1 h-3 w-3" /> Generate PDF</>
                                                                )}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-[10px] px-2 hover:bg-brand-blue-crayola/10 text-brand-blue-crayola"
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/test-export/${run.request_id}`); }}
                                                        >
                                                            <Eye className="mr-1 h-3 w-3" /> Full Report
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* PDF Viewer Modal */}
            {viewingPDF && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">{viewingPDF.title}</h3>
                                <p className="text-xs text-zinc-400">PDF Document</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                                    onClick={() => window.open(viewingPDF.url, '_blank')}
                                >
                                    <Download className="mr-1 h-3 w-3" /> Download PDF
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                                    onClick={() => setViewingPDF(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Modal Body — PDF Viewer */}
                        <div className="flex-1 overflow-hidden">
                            <Suspense fallback={
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center space-y-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-brand-blue-crayola mx-auto" />
                                        <p className="text-sm text-zinc-400">Loading PDF viewer...</p>
                                    </div>
                                </div>
                            }>
                                <PDFViewer url={viewingPDF.url} className="h-full" />
                            </Suspense>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
