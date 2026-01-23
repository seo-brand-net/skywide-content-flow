'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { subscribeToRun } from '@/lib/pusher/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, StopCircle, CheckCircle, Clock, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface RunStage {
    id: string;
    stage_name: string;
    stage_order: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    output_text?: string;
    output_metadata?: {
        score?: number;
        suggestions?: string[];
    };
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
}

interface ContentRun {
    id: string;
    status: string;
    current_stage: string;
    completed_stages: number;
    total_stages: number;
    started_at: string;
    content_requests: {
        article_title: string;
        client_name: string;
    };
}

export default function RunVisualizationPage() {
    const params = useParams();
    const router = useRouter();
    const run_id = params.run_id as string;

    const [run, setRun] = useState<ContentRun | null>(null);
    const [stages, setStages] = useState<RunStage[]>([]);
    const [selectedStage, setSelectedStage] = useState<RunStage | null>(null);
    const [loading, setLoading] = useState(true);
    const [controlLoading, setControlLoading] = useState(false);

    useEffect(() => {
        fetchRunData();

        // Subscribe to Pusher for real-time updates
        const unsubscribe = subscribeToRun(run_id, {
            onUpdate: (data) => {
                // Update run data in real-time
                setRun(prev => prev ? { ...prev, ...data } : prev);
            },
            onStageUpdate: (stageData) => {
                // Update or add stage in real-time
                setStages(prev => {
                    const existingIndex = prev.findIndex(s => s.stage_name === stageData.stage_name);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...stageData };
                        return updated;
                    } else {
                        return [...prev, stageData].sort((a, b) => a.stage_order - b.stage_order);
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [run_id]);

    const fetchRunData = async () => {
        try {
            const response = await fetch(`/api/run-tracking/${run_id}`);
            const data = await response.json();

            if (response.ok) {
                setRun(data.run);
                setStages(data.stages || []);

                // Auto-select first running or failed stage if none selected
                if (!selectedStage && data.stages?.length) {
                    const activeStage = data.stages.find((s: RunStage) =>
                        s.status === 'running' || s.status === 'failed'
                    );
                    setSelectedStage(activeStage || data.stages[0]);
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching run data:', error);
            setLoading(false);
        }
    };

    const handleControl = async (action: 'pause' | 'resume' | 'stop') => {
        setControlLoading(true);
        try {
            const response = await fetch('/api/run-tracking/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ run_id, action })
            });

            if (response.ok) {
                await fetchRunData();
            }
        } catch (error) {
            console.error('Error controlling run:', error);
        } finally {
            setControlLoading(false);
        }
    };

    const getStageIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'running':
                return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-gray-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'running':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'paused':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'stopped':
            case 'failed':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return '-';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
                <div className="text-center">
                    <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-zinc-400">Loading run visualization...</p>
                </div>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
                <div className="text-center">
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-zinc-400 mb-4">Run not found</p>
                    <Button onClick={() => router.push('/my-requests')} variant="outline">
                        Back to Requests
                    </Button>
                </div>
            </div>
        );
    }

    const progressPercent = (run.completed_stages / run.total_stages) * 100;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/my-requests')}
                        className="mb-4 text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Requests
                    </Button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                {run.content_requests.article_title}
                            </h1>
                            <p className="text-zinc-400 mb-2">
                                Client: <span className="text-white font-semibold">{run.content_requests.client_name}</span>
                            </p>
                            <p className="text-sm text-zinc-500">
                                Progress: {run.completed_stages}/{run.total_stages} stages completed
                            </p>
                        </div>

                        {/* Status Badge */}
                        <Badge className={`${getStatusColor(run.status)} text-sm px-4 py-2 border`}>
                            {run.status.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Control Buttons */}
                    <div className="mt-4 flex gap-2">
                        {run.status === 'running' && (
                            <Button
                                onClick={() => handleControl('pause')}
                                variant="outline"
                                disabled={controlLoading}
                                className="border-zinc-700 hover:bg-zinc-800"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        )}
                        {run.status === 'paused' && (
                            <Button
                                onClick={() => handleControl('resume')}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={controlLoading}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}
                        {['running', 'paused'].includes(run.status) && (
                            <Button
                                onClick={() => handleControl('stop')}
                                variant="destructive"
                                disabled={controlLoading}
                            >
                                <StopCircle className="w-4 h-4 mr-2" />
                                Stop
                            </Button>
                        )}
                    </div>
                </div>

                {/* Workflow Stages */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stage List */}
                    <div className="lg:col-span-1 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-3 sticky top-0 bg-zinc-950 py-2">Pipeline Stages</h2>
                        {stages.map((stage) => (
                            <Card
                                key={stage.id}
                                className={`cursor-pointer transition-all border-zinc-800 bg-zinc-900 hover:bg-zinc-800 ${selectedStage?.id === stage.id ? 'border-blue-500 bg-zinc-800' : ''
                                    }`}
                                onClick={() => setSelectedStage(stage)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {getStageIcon(stage.status)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{stage.stage_name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    Stage {stage.stage_order} • {formatDuration(stage.duration_ms)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Stage Details */}
                    <div className="lg:col-span-2">
                        {selectedStage ? (
                            <Card className="border-zinc-800 bg-zinc-900">
                                <CardHeader className="border-b border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl">{selectedStage.stage_name}</CardTitle>
                                        <Badge className={getStatusColor(selectedStage.status)}>
                                            {selectedStage.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {/* Output Score */}
                                    {selectedStage.output_metadata?.score !== undefined && (
                                        <div>
                                            <h3 className="font-semibold mb-3 text-zinc-300">Quality Score</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="text-4xl font-bold text-blue-500">
                                                    {selectedStage.output_metadata.score}/100
                                                </div>
                                                <div className="flex-1 bg-zinc-800 rounded-full h-4">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-600 to-blue-500 h-4 rounded-full transition-all"
                                                        style={{ width: `${selectedStage.output_metadata.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Improvement Suggestions */}
                                    {selectedStage.output_metadata?.suggestions && selectedStage.output_metadata.suggestions.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold mb-3 text-zinc-300">AI Suggestions</h3>
                                            <ul className="space-y-2">
                                                {selectedStage.output_metadata.suggestions.map((suggestion, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 bg-zinc-800 p-3 rounded-lg">
                                                        <span className="text-blue-500 font-bold">{i + 1}.</span>
                                                        <span>{suggestion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Output Content */}
                                    {selectedStage.output_text && (
                                        <div>
                                            <h3 className="font-semibold mb-3 text-zinc-300">Content Output</h3>
                                            <div className="bg-zinc-950 p-4 rounded-lg max-h-96 overflow-y-auto border border-zinc-800">
                                                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
                                                    {selectedStage.output_text}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {selectedStage.error_message && (
                                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                                            <h3 className="font-semibold mb-2 text-red-400">Error</h3>
                                            <p className="text-sm text-red-300">{selectedStage.error_message}</p>
                                        </div>
                                    )}

                                    {/* Timing Info */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                                        {selectedStage.started_at && (
                                            <div>
                                                <p className="text-xs text-zinc-500 mb-1">Started</p>
                                                <p className="text-sm text-zinc-300">
                                                    {new Date(selectedStage.started_at).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                        {selectedStage.completed_at && (
                                            <div>
                                                <p className="text-xs text-zinc-500 mb-1">Completed</p>
                                                <p className="text-sm text-zinc-300">
                                                    {new Date(selectedStage.completed_at).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-zinc-800 bg-zinc-900">
                                <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                                    <div className="text-center">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                                        <p className="text-zinc-500">Select a stage to view details</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
