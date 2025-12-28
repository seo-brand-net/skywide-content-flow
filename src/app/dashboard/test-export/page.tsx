"use client";

import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, PlayCircle, FileSearch } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const EXPORT_PATHS = [
    { id: 'path_primary_snippet', name: 'Primary Optimized (Snippet)' },
    { id: 'path_claude_snippet', name: 'Claude Optimized (Snippet)' },
    { id: 'path_faq_a', name: 'FAQ Branch A' },
    { id: 'path_faq_b', name: 'FAQ Branch B' },
    { id: 'path_faq_c', name: 'FAQ Branch C' },
    { id: 'path_faq_d', name: 'FAQ Branch D' },
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
}

export default function TestExportPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedPath, setSelectedPath] = useState<string>('all');
    const [isTesting, setIsTesting] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);

    const getMockData = () => {
        const scenarios = [
            {
                title: "The Ethical Dilemma of AI Diagnostics",
                brief: "Analyze the intersection of medicine and machine learning. Focus on patient privacy, the risk of algorithmic bias in marginalized communities, and why a human-in-the-loop system is non-negotiable for critical health decisions.",
                primary: "AI medical ethics",
                secondary: "healthcare algorithms bias",
                theme: "Technology & Health",
                intent: "Informational"
            },
            {
                title: "Sustainable Urban Farming: 2024 Blueprint",
                brief: "Showcase innovative ways cities are tackling food deserts. Cover vertical hydroponics, rooftop community gardens, and the role of municipal policy in incentivizing green space conversion.",
                primary: "urban farming solutions",
                secondary: "vertical gardening benefits",
                theme: "Environment & Urbanism",
                intent: "Commercial"
            }
        ];
        const random = scenarios[Math.floor(Math.random() * scenarios.length)];
        return {
            ...random,
            client_name: "TechTest",
            audience: "Professionals",
            article_type: "Blogs",
            word_count: "1000",
            tone: "Professional"
        };
    };

    const runSingleTest = async (pathId: string, pathName: string): Promise<TestResult> => {
        const mockData = getMockData();
        const requestId = crypto.randomUUID();

        try {
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
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold seobrand-title seobrand-title-accent mb-2">
                        Export Infrastructure Testing (Async)
                    </h1>
                    <p className="text-muted-foreground">
                        Triggering tests via <code>/api/proxy-n8n-test</code> with asynchronous callback polling.
                    </p>
                </div>

                <Card className="border-border hover-glow">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="path-select">Target Export Path</Label>
                                <Select value={selectedPath} onValueChange={setSelectedPath}>
                                    <SelectTrigger id="path-select">
                                        <SelectValue placeholder="Select path" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Paths (Simultaneous)</SelectItem>
                                        {EXPORT_PATHS.map(path => (
                                            <SelectItem key={path.id} value={path.id}>
                                                {path.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleRunTest}
                                disabled={isTesting}
                                className="w-full md:w-48 bg-brand-blue-crayola hover:bg-brand-blue-crayola/90"
                            >
                                {isTesting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Diagnostic In Progress...</>
                                ) : (
                                    <><PlayCircle className="mr-2 h-4 w-4" /> Start Evaluation</>
                                )}
                            </Button>
                        </div>

                        {isTesting && (
                            <div className="mt-8 space-y-2">
                                <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                                    <span>Cumulative Progress</span>
                                    <span>{Math.round(overallProgress)}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-1 bg-muted/20" />
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                                            "{result.alignment}"
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
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 hover:bg-brand-blue-crayola/10 text-brand-blue-crayola">
                                                Full Report
                                            </Button>
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
            </div>
        </div>
    );
}
