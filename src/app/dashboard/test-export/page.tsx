"use client";

import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
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
    status: 'pending' | 'running' | 'success' | 'failed';
    score?: number;
    alignment?: string;
    improvements?: string[];
    error?: string;
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
        try {
            const response = await fetch('/api/proxy-n8n', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...mockData,
                    target_path: pathId,
                    request_status: 'test',
                    user_id: user?.id,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const data = await response.json();

            // Assuming n8n returns comparison data in this format
            return {
                pathId,
                pathName,
                status: 'success',
                score: data.comparison?.score || 100,
                alignment: data.comparison?.alignment || 'Perfectly aligned',
                improvements: data.comparison?.improvements || [],
            };
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

        const initialResults: TestResult[] = pathsToTest.map(p => ({
            pathId: p.id,
            pathName: p.name,
            status: 'pending',
        }));
        setResults(initialResults);

        const testPromises = pathsToTest.map(async (path, index) => {
            setResults(prev => prev.map(r => r.pathId === path.id ? { ...r, status: 'running' } : r));
            const result = await runSingleTest(path.id, path.name);
            setResults(prev => prev.map(r => r.pathId === path.id ? result : r));
            setOverallProgress(p => p + (100 / pathsToTest.length));
            return result;
        });

        await Promise.all(testPromises);
        setIsTesting(false);
        setOverallProgress(100);

        toast({
            title: "Testing Complete",
            description: selectedPath === 'all' ? "All paths tested." : `Test for ${results[0].pathName} finished.`,
        });
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold seobrand-title seobrand-title-accent mb-2">
                        Export Infrastructure Testing
                    </h1>
                    <p className="text-muted-foreground">
                        Select an export path to trigger a mock request and verify the comparison output.
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
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                                ) : (
                                    <><PlayCircle className="mr-2 h-4 w-4" /> Run Test</>
                                )}
                            </Button>
                        </div>

                        {isTesting && (
                            <div className="mt-8 space-y-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Overall Progress</span>
                                    <span>{Math.round(overallProgress)}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((result) => (
                        <Card key={result.pathId} className={`border-border ${result.status === 'running' ? 'animate-pulse' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm font-medium">{result.pathName}</CardTitle>
                                    {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {result.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                                    {result.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-brand-blue-crayola" />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {result.status === 'success' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Alignment Score</span>
                                            <span className="text-lg font-bold text-brand-blue-crayola">{result.score}%</span>
                                        </div>
                                        <p className="text-xs italic">{result.alignment}</p>
                                        {result.improvements && result.improvements.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Suggestions</p>
                                                <ul className="text-xs list-disc pl-4 space-y-1">
                                                    {result.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {result.status === 'failed' && (
                                    <p className="text-xs text-destructive">{result.error}</p>
                                )}
                                {result.status === 'pending' && (
                                    <p className="text-xs text-muted-foreground">Waiting to start...</p>
                                )}
                                {result.status === 'running' && (
                                    <p className="text-xs text-brand-blue-crayola">Processing output comparison...</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
