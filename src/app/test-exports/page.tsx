"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, CheckCircle2, XCircle, Beaker, FileSearch } from "lucide-react";

const TEST_PATHS = [
    { id: "path_primary_snippet", name: "Path 1", description: "Primary Optimized (Snippet)" },
    { id: "path_claude_snippet", name: "Path 2", description: "Claude Optimized (Snippet)" },
    { id: "path_faq_a", name: "Path 3", description: "FAQ Branch A" },
    { id: "path_faq_b", name: "Path 4", description: "FAQ Branch B" },
    { id: "path_faq_c", name: "Path 5", description: "FAQ Branch C" },
    { id: "path_faq_d", name: "Path 6", description: "FAQ Branch D" }
];

export default function TestExportsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedPath, setSelectedPath] = useState<string>("blogs");
    const [running, setRunning] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, any>>({});
    const [loadingAll, setLoadingAll] = useState(false);

    const runTest = async (pathId: string) => {
        setRunning(pathId);
        const requestId = crypto.randomUUID();

        try {
            const payload = {
                title: "Test Article: The Benefits of AI in SEO",
                audience: "Digital Marketers",
                client_name: "SEOBrand",
                creative_brief: "A test brief to verify the export pipeline.",
                article_type: "Blogs",
                word_count: "800",
                primary_keywords: ["AI SEO", "SEO Automation"],
                secondary_keywords: ["content engine", "n8n workflow"],
                semantic_theme: "Future of SEO",
                tone: "Educational",
                page_intent: "Informational",
                request_status: "test",
                target_path: pathId,
                request_id: requestId,
                user_id: user?.id || "test-user-id",
                timestamp: new Date().toISOString()
            };

            // Trigger the workflow
            const triggerResponse = await fetch("/api/proxy-n8n-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!triggerResponse.ok) {
                throw new Error("Failed to trigger workflow");
            }

            toast({
                title: "Diagnostic Started",
                description: `Workflow triggered for ${pathId}. Waiting for results...`,
            });

            // Start polling for results
            let attempts = 0;
            const maxAttempts = 60; // 300 seconds max (5 mins)
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const pollRes = await fetch(`/api/test-callback?request_id=${requestId}`);
                    const pollData = await pollRes.json();

                    if (pollRes.ok && pollData.status === 'completed') {
                        clearInterval(pollInterval);
                        setRunning(null);

                        setResults(prev => ({
                            ...prev,
                            [pathId]: {
                                status: "success",
                                data: pollData.data,
                                score: pollData.data?.overall_alignment_score || pollData.data?.alignment_score || 0,
                                timestamp: new Date().toLocaleTimeString()
                            }
                        }));

                        toast({
                            title: `Diagnostic Success: ${pathId}`,
                            description: "Workflow results received via callback.",
                        });
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setRunning(null);
                        setResults(prev => ({
                            ...prev,
                            [pathId]: { status: "error", error: "Timeout" }
                        }));
                        toast({
                            title: "Diagnostic Timeout",
                            description: "Results took too long to arrive.",
                            variant: "destructive"
                        });
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000);

        } catch (error) {
            console.error("RunTest Error:", error);
            setResults(prev => ({
                ...prev,
                [pathId]: { status: "error", error: "Connection Failed" }
            }));
            setRunning(null);
            toast({
                title: "Diagnostic Failed",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "destructive",
            });
        }
    };

    const runAll = async () => {
        setLoadingAll(true);
        for (const path of TEST_PATHS) {
            await runTest(path.id);
            // Wait a bit between triggers
            await new Promise(r => setTimeout(r, 2000));
        }
        setLoadingAll(false);
    };

    return (
        <div className="min-h-screen bg-background p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold seobrand-title seobrand-title-accent">
                        System Diagnostics: Export Infrastructure
                    </h1>
                    <p className="seobrand-description">
                        Select a specific generation path to validate workflow integrity and AI alignment.
                    </p>
                </div>

                {/* Control Panel */}
                <Card className="bg-card border-border hover-glow overflow-hidden">
                    <CardHeader className="border-b border-border/50 bg-muted/30">
                        <CardTitle className="seobrand-subtitle flex items-center gap-2">
                            <Beaker size={18} />
                            Diagnostics Controller
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-bold text-foreground/70 uppercase tracking-widest pl-1">
                                    Target Path Selection
                                </label>
                                <Select value={selectedPath} onValueChange={setSelectedPath}>
                                    <SelectTrigger className="bg-background border-input h-12">
                                        <SelectValue placeholder="Select Path" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEST_PATHS.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} - {p.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => runTest(selectedPath)}
                                    disabled={!!running || loadingAll}
                                    className="h-12 px-6 bg-brand-blue-crayola hover:bg-brand-prussian-blue transition-colors font-bold"
                                >
                                    {running === selectedPath ? (
                                        <Loader2 className="animate-spin mr-2" />
                                    ) : (
                                        <Play size={16} className="mr-2" />
                                    )}
                                    Run Selected Path
                                </Button>

                                <Button
                                    onClick={runAll}
                                    disabled={!!running || loadingAll}
                                    variant="outline"
                                    className="h-12 px-6 border-brand-blue-crayola text-brand-blue-crayola hover:bg-brand-blue-crayola/10 font-bold"
                                >
                                    {loadingAll ? (
                                        <Loader2 className="animate-spin mr-2" />
                                    ) : (
                                        <Play size={16} className="mr-2" fill="currentColor" />
                                    )}
                                    Run All Paths
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                {Object.keys(results).length > 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <FileSearch size={20} className="text-brand-blue-crayola" />
                            <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Audit Reports</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {TEST_PATHS.map(path => {
                                const res = results[path.id];
                                if (!res) return null;

                                return (
                                    <Card key={path.id} className="bg-muted/20 border-border/50 overflow-hidden">
                                        <div className="px-6 py-4 flex items-center justify-between bg-muted/40 border-b border-border/30">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${res.score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {res.score || 0}%
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-100">{path.name} Report</div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{res.timestamp}</div>
                                                </div>
                                            </div>
                                            {res.status === "success" ? (
                                                <CheckCircle2 className="text-emerald-500" size={20} />
                                            ) : running === path.id ? (
                                                <Loader2 className="animate-spin text-brand-blue-crayola" size={20} />
                                            ) : (
                                                <XCircle className="text-rose-500" size={20} />
                                            )}
                                        </div>
                                        <CardContent className="p-6">
                                            <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-4 rounded-xl max-h-[300px] overflow-y-auto">
                                                {res.error ? (
                                                    <span className="text-rose-500">{res.error}</span>
                                                ) : (
                                                    <pre>{JSON.stringify(res.data, null, 2)}</pre>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
