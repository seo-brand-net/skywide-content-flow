"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Copy,
    Check,
    FileText,
    BarChart3,
    Clock,
    User,
    Tag,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TestResultData {
    id: string;
    request_id: string;
    path_id: string;
    article_title: string;
    status: string;
    score: number;
    audit_data: any;
    content_markdown: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export default function TestResultDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [result, setResult] = useState<TestResultData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"article" | "audit">("article");

    useEffect(() => {
        if (requestId) fetchResult();
    }, [requestId]);

    const fetchResult = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("test_results")
            .select("*")
            .eq("request_id", requestId)
            .single();

        if (error || !data) {
            setResult(null);
        } else {
            setResult(data);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (!result?.content_markdown) return;
        navigator.clipboard.writeText(result.content_markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!result?.content_markdown) return;
        const blob = new Blob([result.content_markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.article_title || "test-result"}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "pending":
            case "running":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "failed":
                return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-400";
        if (score >= 70) return "text-amber-400";
        return "text-rose-400";
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return "bg-emerald-500";
        if (score >= 70) return "bg-amber-500";
        return "bg-rose-500";
    };

    // Parse audit data
    const audit = result?.audit_data
        ? typeof result.audit_data === "string"
            ? (() => {
                try {
                    return JSON.parse(result.audit_data);
                } catch {
                    return null;
                }
            })()
            : result.audit_data
        : null;

    const overallScore = audit?.overallScore ?? result?.score ?? 0;
    const passed = overallScore >= 80;

    const categories = [
        { name: "SEO Optimization", score: audit?.seoOptimization ?? 0, icon: Tag },
        { name: "Human Authenticity", score: audit?.humanAuthenticity ?? 0, icon: User },
        { name: "Readability", score: audit?.readabilityStructure ?? 0, icon: FileText },
        { name: "Engagement", score: audit?.engagementClarity ?? 0, icon: BarChart3 },
        { name: "Trust & Authority", score: audit?.trustAuthority ?? 0, icon: CheckCircle2 },
        { name: "Business Value", score: audit?.conversionValue ?? 0, icon: Download },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-blue-crayola" />
                    <p className="text-sm text-muted-foreground">Loading test result...</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md w-full border-border">
                    <CardContent className="pt-8 text-center space-y-4">
                        <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
                        <h2 className="text-xl font-bold text-foreground">Result Not Found</h2>
                        <p className="text-sm text-muted-foreground">
                            No test result found for ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{requestId}</code>
                        </p>
                        <Button onClick={() => router.push("/dashboard/test-export")} className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tests
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7]">
            {/* Top Bar */}
            <div className="sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/dashboard/test-export")}
                            className="h-8 text-xs text-zinc-400 hover:text-white"
                        >
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                        </Button>
                        <div className="h-4 w-px bg-white/10" />
                        <h1 className="text-sm font-semibold truncate max-w-[400px]">
                            {result.article_title || "Test Result"}
                        </h1>
                        <Badge className={`text-[10px] font-bold uppercase ${getStatusColor(result.status)}`}>
                            {result.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={handleCopy}
                            disabled={!result.content_markdown}
                        >
                            {copied ? (
                                <><Check className="mr-1.5 h-3 w-3" /> Copied</>
                            ) : (
                                <><Copy className="mr-1.5 h-3 w-3" /> Copy Markdown</>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={handleDownload}
                            disabled={!result.content_markdown}
                        >
                            <Download className="mr-1.5 h-3 w-3" /> Download .md
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
                    {/* Main Content Area */}
                    <div className="space-y-8">
                        {/* Tab Switcher - Segmented Control Style */}
                        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
                            <button
                                onClick={() => setActiveTab("article")}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "article"
                                    ? "bg-brand-blue-crayola text-white shadow-lg"
                                    : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                            >
                                <FileText className="h-4 w-4" />
                                Article Preview
                            </button>
                            <button
                                onClick={() => setActiveTab("audit")}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "audit"
                                    ? "bg-brand-blue-crayola text-white shadow-lg"
                                    : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                            >
                                <BarChart3 className="h-4 w-4" />
                                Performance Analysis
                            </button>
                        </div>

                        {/* Article Tab */}
                        {activeTab === "article" && (
                            <div className="fade-in">
                                <Card className="border-white/10 bg-zinc-900/40 overflow-hidden">
                                    <div className="border-b border-white/5 bg-white/[0.02] px-10 py-4">
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Generated Content</p>
                                    </div>
                                    <CardContent className="pt-10 pb-16 px-12">
                                        {result.content_markdown ? (
                                            <article className="prose prose-zinc prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-p:leading-relaxed prose-strong:text-white prose-li:text-zinc-300 prose-a:text-brand-blue-crayola prose-blockquote:border-brand-blue-crayola/50 prose-code:text-brand-blue-crayola prose-pre:bg-[#121214] prose-pre:border prose-pre:border-white/5">
                                                <ReactMarkdown>{result.content_markdown}</ReactMarkdown>
                                            </article>
                                        ) : (
                                            <div className="text-center py-24 space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/5">
                                                    <FileText className="h-8 w-8 text-zinc-600" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-zinc-400 text-sm font-medium">No article content available</p>
                                                    <p className="text-xs text-zinc-600">The content will appear here once the workflow finishes.</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Audit Tab */}
                        {activeTab === "audit" && (
                            <div className="space-y-8 fade-in">
                                {/* Score Dashboard */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="md:col-span-1 border-white/10 bg-zinc-900/40 flex flex-col items-center justify-center py-10">
                                        <div className="relative group">
                                            <div className="absolute -inset-4 bg-brand-blue-crayola/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center ${overallScore >= 80 ? "border-emerald-500/30" : "border-rose-500/30"}`}>
                                                <div className="text-center">
                                                    <span className={`text-4xl font-black ${getScoreColor(overallScore)}`}>
                                                        {overallScore.toFixed(0)}
                                                    </span>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Overall</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <Badge className={`px-3 py-1 text-xs font-bold uppercase transition-all ${passed ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"}`}>
                                                {passed ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
                                                {passed ? "Quality Standard Met" : "Requires Improvement"}
                                            </Badge>
                                        </div>
                                    </Card>

                                    <Card className="md:col-span-2 border-white/10 bg-zinc-900/40 p-8">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Quality Metrics Breakdown</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                            {categories.map((cat, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-zinc-400 font-medium flex items-center gap-2">
                                                            <cat.icon className="h-3 w-3 text-zinc-500" />
                                                            {cat.name}
                                                        </span>
                                                        <span className={`font-bold ${getScoreColor(cat.score)}`}>{cat.score}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${getScoreBg(cat.score)}`}
                                                            style={{ width: `${cat.score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>

                                {/* Analysis Sections */}
                                <div className="grid grid-cols-1 gap-6">
                                    <Card className="border-white/10 bg-zinc-900/40 overflow-hidden">
                                        <div className="border-b border-white/5 bg-white/[0.02] px-8 py-4 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                                            <h3 className="text-sm font-bold">Identified Issues</h3>
                                        </div>
                                        <CardContent className="p-8">
                                            <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                {audit?.issues || "No significant issues identified."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card className="border-white/10 bg-zinc-900/40 overflow-hidden">
                                            <div className="border-b border-white/5 bg-white/[0.02] px-8 py-4 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                <h3 className="text-sm font-bold">Recommended Fixes</h3>
                                            </div>
                                            <CardContent className="p-8">
                                                <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                    {audit?.fixes || "Content meets production standards."}
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-white/10 bg-zinc-900/40 overflow-hidden">
                                            <div className="border-b border-white/5 bg-white/[0.02] px-8 py-4 flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-blue-400" />
                                                <h3 className="text-sm font-bold">Expected Impact</h3>
                                            </div>
                                            <CardContent className="p-8">
                                                <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                    {audit?.impact || "Baseline performance expected."}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar — Metadata */}
                    <div className="space-y-6">
                        <Card className="border-white/10 bg-zinc-900/40 overflow-hidden">
                            <div className="px-6 py-5 space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Metadata Profile</p>
                                    <p className="text-xs text-zinc-600">Administrative details for this run</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                        <Tag className="h-4 w-4 text-zinc-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[9px] uppercase font-bold text-zinc-600">Export Path</p>
                                            <p className="text-xs font-medium text-zinc-200">{result.path_id || "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                        <Clock className="h-4 w-4 text-zinc-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[9px] uppercase font-bold text-zinc-600">Timestamp</p>
                                            <p className="text-xs font-medium text-zinc-200">
                                                {new Date(result.created_at).toLocaleDateString()} at {new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                        <User className="h-4 w-4 text-zinc-500 mt-0.5" />
                                        <div className="space-y-1 w-full">
                                            <p className="text-[9px] uppercase font-bold text-zinc-600">Request Trace</p>
                                            <p className="text-[10px] font-mono text-zinc-500 break-all leading-relaxed">
                                                {result.request_id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="border-white/10 bg-zinc-900/40 p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Word Count</p>
                                    <p className="text-lg font-black text-white">
                                        {result.content_markdown ? result.content_markdown.split(/\s+/).filter(Boolean).length.toLocaleString() : "0"}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                    <FileText className="h-5 w-5 text-zinc-500" />
                                </div>
                            </div>
                        </Card>

                        <div className="p-4 rounded-xl bg-brand-blue-crayola/5 border border-brand-blue-crayola/10">
                            <p className="text-[10px] text-brand-blue-crayola font-bold uppercase tracking-widest mb-2 text-center">Publication Status</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className={`h-2 w-2 rounded-full animate-pulse ${result.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-xs font-semibold text-zinc-300 capitalize">{result.status}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
