import { createClient } from '@supabase/supabase-js';
import { triggerRunUpdate, triggerStageUpdate } from '@/lib/pusher/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const n8nApiKey = process.env.N8N_API_KEY!;
const n8nBaseUrl = process.env.N8N_BASE_URL!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface N8nNode {
    name: string;
    type: string;
    position: [number, number];
}

interface N8nExecution {
    id: string;
    finished: boolean;
    mode: string;
    status: string;
    data: {
        resultData: {
            runData: {
                [nodeName: string]: Array<{
                    startTime: number;
                    executionTime: number;
                    data: {
                        main: Array<Array<{ json: any }>>;
                    };
                }>;
            };
        };
    };
    workflowData: {
        nodes: N8nNode[];
    };
}

// Map of node names to stage order (based on your workflow)
const STAGE_MAP: { [key: string]: { order: number; name: string } } = {
    'Webhook1': { order: 1, name: 'Webhook Received' },
    'Create folder1': { order: 2, name: 'Google Drive Folder Created' },
    'OpenAI Draft (GPT-4O)1': { order: 3, name: 'OpenAI Draft Generated' },
    'Claude Draft (Claude Opus 3)1': { order: 4, name: 'Claude Draft Generated' },
    'Data Check & Research Gaps1': { order: 5, name: 'Data Check & Research Gaps' },
    'OpenAI Keyword Check + Semantic Gap1': { order: 6, name: 'OpenAI Keyword Analysis' },
    'Claude Keyword Check + Semantic Gap1': { order: 7, name: 'Claude Keyword Analysis' },
    'Claude Apply Recommendations1': { order: 8, name: 'Recommendations Applied' },
    'OpenAI EEAT Injection1': { order: 9, name: 'OpenAI EEAT Enhancement' },
    'Claude EEAT Injection1': { order: 10, name: 'Claude EEAT Enhancement' },
    'Merge6': { order: 11, name: 'EEAT Versions Merged' },
    'OpenAI SEO Optimization1': { order: 12, name: 'SEO Optimization' },
    'OpenAI NLP & PR Optimization': { order: 13, name: 'OpenAI NLP Optimization' },
    'Claude NLP & PR Optimization': { order: 14, name: 'Claude NLP Optimization' },
    'Claude Final SEO Snippet Optimization': { order: 15, name: 'Final SEO Snippet' },
    'OpenAI Humanised Readability Rewrite': { order: 16, name: 'Humanized Readability' },
    'Document Export Sanitization': { order: 17, name: 'Document Sanitization' },
    '1st Scoring Agent2': { order: 18, name: 'Quality Scoring' },
    'Google Drive Notification1': { order: 19, name: 'Final Document Created' },
};

async function fetchN8nExecution(executionId: string): Promise<N8nExecution | null> {
    try {
        const response = await fetch(`${n8nBaseUrl}/api/v1/executions/${executionId}`, {
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch n8n execution:', response.statusText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching n8n execution:', error);
        return null;
    }
}

async function processExecution(execution: N8nExecution, runId: string) {
    const { data, finished, status } = execution;

    if (!data?.resultData?.runData) {
        return;
    }

    const runData = data.resultData.runData;
    const completedNodes = Object.keys(runData);

    // Update each stage based on completed nodes
    for (const nodeName of completedNodes) {
        const stageInfo = STAGE_MAP[nodeName];
        if (!stageInfo) continue; // Skip nodes we're not tracking

        const nodeData = runData[nodeName][0]; // First execution
        if (!nodeData) continue;

        // Extract output
        const output = nodeData.data?.main?.[0]?.[0]?.json;
        const outputText = JSON.stringify(output, null, 2);

        // Calculate duration
        const durationMs = nodeData.executionTime || 0;

        // Check if stage already exists in database
        const { data: existingStage } = await supabase
            .from('content_run_stages')
            .select('id')
            .eq('run_id', runId)
            .eq('stage_name', stageInfo.name)
            .single();

        const stageData: any = {
            run_id: runId,
            stage_name: stageInfo.name,
            stage_order: stageInfo.order,
            status: 'completed',
            output_text: outputText,
            started_at: new Date(nodeData.startTime).toISOString(),
            completed_at: new Date(nodeData.startTime + durationMs).toISOString(),
            duration_ms: durationMs,
        };

        if (!existingStage) {
            // Insert new stage
            await supabase.from('content_run_stages').insert(stageData);
        } else {
            // Update existing stage
            await supabase
                .from('content_run_stages')
                .update(stageData)
                .eq('id', existingStage.id);
        }

        // Trigger Pusher update for this stage
        await triggerStageUpdate(runId, {
            ...stageData,
            id: existingStage?.id || 'new',
        });
    }

    // Update run record
    const completedStagesCount = completedNodes.filter(n => STAGE_MAP[n]).length;
    const currentNode = completedNodes[completedNodes.length - 1];
    const currentStage = STAGE_MAP[currentNode]?.name || 'Processing';

    const runUpdate: any = {
        completed_stages: completedStagesCount,
        current_stage: currentStage,
    };

    if (finished) {
        runUpdate.status = status === 'success' ? 'completed' : 'failed';
        runUpdate.completed_at = new Date().toISOString();
    }

    await supabase
        .from('content_runs')
        .update(runUpdate)
        .eq('id', runId);

    // Trigger Pusher update for run
    await triggerRunUpdate(runId, runUpdate);

    // Update content request status if completed
    if (finished) {
        await supabase
            .from('content_requests')
            .update({ status: status === 'success' ? 'completed' : 'failed' })
            .eq('current_run_id', runId);
    }
}

export async function pollN8nExecution(executionId: string, runId: string) {
    const maxAttempts = 360; // Poll for up to 30 minutes (5s intervals)
    let attempts = 0;

    const pollInterval = setInterval(async () => {
        attempts++;

        // Check if run was manually stopped
        const { data: run } = await supabase
            .from('content_runs')
            .select('status')
            .eq('id', runId)
            .single();

        if (run?.status === 'stopped' || run?.status === 'cancelled') {
            clearInterval(pollInterval);
            return;
        }

        // Fetch execution from n8n
        const execution = await fetchN8nExecution(executionId);

        if (!execution) {
            if (attempts > 5) {
                // After 5 failed attempts, mark as failed
                clearInterval(pollInterval);
                await supabase
                    .from('content_runs')
                    .update({ status: 'failed' })
                    .eq('id', runId);

                await triggerRunUpdate(runId, { status: 'failed' });
            }
            return;
        }

        // Process the execution
        await processExecution(execution, runId);

        // Stop polling if execution is finished or max attempts reached
        if (execution.finished || attempts >= maxAttempts) {
            clearInterval(pollInterval);
        }
    }, 5000); // Poll every 5 seconds
}
