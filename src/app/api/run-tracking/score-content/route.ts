import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, stage_name } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'content is required' },
                { status: 400 }
            );
        }

        // Call Claude API for scoring and suggestions
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `You are a content quality expert. Score this content on a scale of 0-100 and provide 2-3 specific, actionable improvement suggestions.

Stage: ${stage_name || 'Unknown'}

Content to evaluate:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Respond in this exact JSON format:
{
  "score": 85,
  "suggestions": [
    "First specific improvement",
    "Second specific improvement",
    "Third specific improvement"
  ]
}

Only return the JSON, no other text.`
            }]
        });

        // Parse Claude's response
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';

        try {
            const parsed = JSON.parse(responseText);
            return NextResponse.json({
                score: parsed.score || 0,
                suggestions: parsed.suggestions || []
            });
        } catch (parseError) {
            // If Claude didn't return valid JSON, extract manually
            const score = extractScore(responseText);
            const suggestions = extractSuggestions(responseText);

            return NextResponse.json({ score, suggestions });
        }

    } catch (error: any) {
        console.error('Error calling Claude API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to score content' },
            { status: 500 }
        );
    }
}

function extractScore(text: string): number {
    const scoreMatch = text.match(/(\d+)\/100|score[:\s]+(\d+)/i);
    if (scoreMatch) {
        return parseInt(scoreMatch[1] || scoreMatch[2]);
    }
    return 75; // Default fallback score
}

function extractSuggestions(text: string): string[] {
    // Extract numbered lists or bullet points
    const lines = text.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
        if (line.match(/^[\d\-\*•]\s/) && line.length > 10) {
            suggestions.push(line.replace(/^[\d\-\*•]\s+/, '').trim());
        }
    }

    return suggestions.slice(0, 3);
}
