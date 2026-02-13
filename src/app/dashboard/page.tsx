"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { withTimeout } from '@/utils/timeout';
import { ABTestModal } from '@/components/ab-test-modal';


interface FormData {
    articleTitle: string;
    titleAudience: string;
    clientName: string;
    creativeBrief: string;
    articleType: string;
    wordCount: string;
    primaryKeyword: string;
    secondaryKeyword: string;
    semanticTheme: string;
    tone: string;
    pageIntent: string;
}

export default function Dashboard() {
    const { user, displayName, supabase } = useAuth();
    const { isAdmin } = useUserRole(user?.id);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        articleTitle: '',
        titleAudience: '',
        clientName: '',
        creativeBrief: '',
        articleType: '',
        wordCount: '',
        primaryKeyword: '',
        secondaryKeyword: '',
        semanticTheme: '',
        tone: '',
        pageIntent: ''
    });
    const [errors, setErrors] = useState<Partial<FormData>>({});

    const validateForm = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.articleTitle.trim()) newErrors.articleTitle = 'Article Title is required';
        if (!formData.titleAudience.trim()) newErrors.titleAudience = 'Title Audience is required';
        if (!formData.clientName.trim()) newErrors.clientName = 'Client Name is required';
        if (!formData.creativeBrief.trim()) newErrors.creativeBrief = 'Creative Brief is required';
        if (!formData.articleType) newErrors.articleType = 'Article Type is required';
        if (!formData.wordCount.trim()) newErrors.wordCount = 'Word Count is required';
        if (!formData.primaryKeyword.trim()) newErrors.primaryKeyword = 'Primary Keyword is required';
        if (!formData.secondaryKeyword.trim()) newErrors.secondaryKeyword = 'Secondary Keyword is required';
        if (!formData.semanticTheme.trim()) newErrors.semanticTheme = 'Semantic Theme is required';
        if (!formData.tone.trim()) newErrors.tone = 'Tone is required';
        if (!formData.pageIntent.trim()) newErrors.pageIntent = 'Page Intent is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Save to Supabase database FIRST with timeout
            const { data: dbData, error: dbError } = await withTimeout(
                supabase
                    .from('content_requests')
                    .insert([{
                        user_id: user?.id,
                        article_title: formData.articleTitle,
                        title_audience: formData.titleAudience,
                        seo_keywords: "",
                        primary_keywords: formData.primaryKeyword ? [formData.primaryKeyword] : [],
                        secondary_keywords: formData.secondaryKeyword ? [formData.secondaryKeyword] : [],
                        semantic_themes: formData.semanticTheme ? [formData.semanticTheme] : [],
                        tone: formData.tone,
                        word_count: parseInt(formData.wordCount) || 0,
                        article_type: formData.articleType,
                        client_name: formData.clientName,
                        creative_brief: formData.creativeBrief,
                        page_intent: formData.pageIntent,
                        status: 'pending'
                    }])
                    .select(),
                30000,
                'Database submission timed out'
            ) as any;

            if (dbError) {
                throw new Error(`Database error: ${dbError.message}`);
            }

            let webhookSuccess = false;
            let webhookResponseData = null;

            // 2. Send to n8n webhook
            try {
                const devResponse = await fetch('/api/proxy-n8n', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
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
                        request_id: dbData[0].id,
                        user_id: user?.id,
                        timestamp: new Date().toISOString(),
                    }),
                });

                if (devResponse.ok) {
                    webhookSuccess = true;
                    webhookResponseData = await devResponse.json();
                } else {
                    console.error('Webhook failed with status:', devResponse.status);
                }
            } catch (devError) {
                console.error('Webhook error:', devError);
            }

            // 3. Update database with webhook status and response
            if (dbData && dbData[0]) {
                const updatePayload: any = {
                    webhook_sent: webhookSuccess,
                };

                // Only update webhook_response if it contains a valid link
                // This prevents "Workflow was started" from overwriting a result that might have come via callback
                const isMeaningfulResponse = (data: any) => {
                    if (!data) return false;
                    const str = typeof data === 'string' ? data : JSON.stringify(data);
                    return (str.includes('drive.google.com') || str.includes('http')) && !str.includes('Workflow was started');
                };

                if (webhookSuccess && webhookResponseData && isMeaningfulResponse(webhookResponseData)) {
                    updatePayload.webhook_response = webhookResponseData;
                    updatePayload.status = 'complete';
                }

                const { data: updateData, error: updateError } = await withTimeout(
                    supabase
                        .from('content_requests')
                        .update(updatePayload)
                        .eq('id', dbData[0].id)
                        .select(),
                    10000,
                    'Status update timed out'
                ) as any;

                if (updateError) {
                    console.error('Error updating webhook status:', updateError);
                    toast({
                        title: "Database Update Error",
                        description: `Failed to update webhook status: ${updateError.message}`,
                        variant: "destructive",
                    });
                }
            }

            toast({
                title: "Success!",
                description: "Content request submitted successfully.",
            });

            // Reset form after successful submission
            setFormData({
                articleTitle: '',
                titleAudience: '',
                clientName: '',
                creativeBrief: '',
                articleType: '',
                wordCount: '',
                primaryKeyword: '',
                secondaryKeyword: '',
                semanticTheme: '',
                tone: '',
                pageIntent: ''
            });
            setIsSubmitting(false);
        } catch (err: any) {
            console.error('Submission error:', err);

            const isTimeout = err.message?.includes('timed out');

            toast({
                title: isTimeout ? "Connection Timeout" : "Submission Failed",
                description: isTimeout
                    ? "The database is taking too long to respond. Please refresh the page and try again."
                    : (err.message || "An unexpected error occurred."),
                variant: "destructive",
            });
            setIsSubmitting(false);
        }
    };

    const fillRandomData = () => {
        const testScenarios = [
            {
                title: "The Future of AI in Content Creation",
                brief: "Explore how generative AI models are reshaping the editorial landscape. Focus on the shift from manual writing to AI-assisted workflows, ethical considerations for accuracy, and how human editors remain the final layer of quality assurance. Avoid alarmist tones; focus on partnership between tech and talent.",
                primary: "AI content creation",
                secondary: "generative AI trends",
                theme: "Technology & Innovation",
                intent: "Informational"
            },
            {
                title: "Top 10 SEO Strategies for 2024",
                brief: "Provide a high-level guide on modern SEO beyond keywords. Cover the importance of E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness), optimizing for zero-click searches, and why mobile-first indexing is no longer optional but a baseline. Ensure all advice is actionable for small to mid-sized businesses.",
                primary: "SEO strategies 2024",
                secondary: "Google E-E-A-T",
                theme: "Digital Marketing",
                intent: "Commercial"
            },
            {
                title: "Sustainable Living: A Practical Guide",
                brief: "A roadmap for individuals looking to reduce their environmental impact without radical lifestyle changes. Include sections on zero-waste kitchen habits, ethical fashion choices, and the long-term benefits of circular economy participation. The tone should be encouraging and non-judgmental, acting as a 'mentor' to the reader.",
                primary: "sustainable living tips",
                secondary: "eco-friendly habits",
                theme: "Lifestyle & Sustainability",
                intent: "Informational"
            },
            {
                title: "Crypto Market Trends: What to Watch",
                brief: "An analysis of the current state of decentralized finance (DeFi) and institutional adoption of blockchain. Discuss the impact of Bitcoin ETFs, the rise of Layer 2 solutions for scalability, and what long-term investors should consider regarding portfolio diversification. Maintain a balanced, expert view without financial advice disclaimers (not needed for this test).",
                primary: "crypto market trends",
                secondary: "blockchain adoption",
                theme: "Finance & Crypto",
                intent: "Commercial"
            },
            {
                title: "Remote Work Best Practices for Hybrid Teams",
                brief: "A comprehensive look at maintaining company culture in a distributed environment. Address asynchronous communication tools, setting boundaries to prevent burnout, and how leadership can foster trust when face-to-face interaction is limited. Focus on practical solutions for HR managers and team leads.",
                primary: "remote work best practices",
                secondary: "hybrid team management",
                theme: "Business & Management",
                intent: "Lead Generation"
            }
        ];

        const title_audiences = ["Tech Professionals", "Small Business Owners", "Eco-conscious Consumers", "Investors", "HR Managers"];
        const clients = ["TechCorp", "GreenLife", "CryptoKing", "WorkSmart", "HealthPlus"];
        const types = ["Website", "Blogs"];
        const tones = ["Professional", "Casual", "Authoritative", "Friendly", "Technical"];

        const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
        const scenario = random(testScenarios);

        setFormData({
            articleTitle: scenario.title,
            titleAudience: random(title_audiences),
            clientName: random(clients),
            creativeBrief: scenario.brief,
            articleType: random(types),
            wordCount: "1200",
            primaryKeyword: scenario.primary,
            secondaryKeyword: scenario.secondary,
            semanticTheme: scenario.theme,
            tone: random(tones),
            pageIntent: scenario.intent
        });
    };

    const clearTestData = async () => {
        if (!user?.id) return;

        if (!confirm('Are you sure you want to delete ALL your content requests? This cannot be undone.')) {
            return;
        }

        const { error } = await supabase
            .from('content_requests')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting data:', error);
            toast({
                title: "Error",
                description: "Failed to delete requests.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: "All your requests have been deleted.",
            });
        }
    };
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold seobrand-title seobrand-title-accent mb-4">
                        Welcome to SKYWIDE Dashboard
                    </h1>
                    <p className="seobrand-description">
                        Hello {displayName || user?.email}, submit your content creation requests below.
                    </p>
                </div>

                <Card className="bg-card border-border hover-glow">
                    <CardHeader>
                        <CardTitle className="seobrand-subtitle flex justify-between items-center">
                            Content Submission Form
                            {isAdmin && (
                                <div className="flex gap-2">

                                    <ABTestModal />
                                </div>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="articleTitle" className="text-foreground">
                                        Article Title *
                                    </Label>
                                    <Input
                                        id="articleTitle"
                                        value={formData.articleTitle}
                                        onChange={(e) => handleInputChange('articleTitle', e.target.value)}
                                        className={`bg-background border-input ${errors.articleTitle ? 'border-destructive' : ''}`}
                                        placeholder="Enter article title"
                                    />
                                    {errors.articleTitle && (
                                        <p className="text-sm text-destructive">{errors.articleTitle}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="titleAudience" className="text-foreground">
                                        Target Audience *
                                    </Label>
                                    <Input
                                        id="titleAudience"
                                        value={formData.titleAudience}
                                        onChange={(e) => handleInputChange('titleAudience', e.target.value)}
                                        className={`bg-background border-input ${errors.titleAudience ? 'border-destructive' : ''}`}
                                        placeholder="Enter target title_audience"
                                    />
                                    {errors.titleAudience && (
                                        <p className="text-sm text-destructive">{errors.titleAudience}</p>
                                    )}
                                </div>



                                <div className="space-y-2">
                                    <Label htmlFor="clientName" className="text-foreground">
                                        Client Name *
                                    </Label>
                                    <Input
                                        id="clientName"
                                        value={formData.clientName}
                                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                                        className={`bg-background border-input ${errors.clientName ? 'border-destructive' : ''}`}
                                        placeholder="Enter client name"
                                    />
                                    {errors.clientName && (
                                        <p className="text-sm text-destructive">{errors.clientName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="articleType" className="text-foreground">
                                        Article Type *
                                    </Label>
                                    <Select
                                        value={formData.articleType}
                                        onValueChange={(value) => handleInputChange('articleType', value)}
                                    >
                                        <SelectTrigger className={`bg-background border-input ${errors.articleType ? 'border-destructive' : ''}`}>
                                            <SelectValue placeholder="Select article type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Website">Website</SelectItem>
                                            <SelectItem value="Blogs">Blogs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.articleType && (
                                        <p className="text-sm text-destructive">{errors.articleType}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="wordCount" className="text-foreground">
                                        Word Count *
                                    </Label>
                                    <Input
                                        id="wordCount"
                                        value={formData.wordCount}
                                        onChange={(e) => handleInputChange('wordCount', e.target.value)}
                                        className={`bg-background border-input ${errors.wordCount ? 'border-destructive' : ''}`}
                                        placeholder="Enter word count"
                                    />
                                    {errors.wordCount && (
                                        <p className="text-sm text-destructive">{errors.wordCount}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="primaryKeyword" className="text-foreground">
                                        Primary Keyword *
                                    </Label>
                                    <Input
                                        id="primaryKeyword"
                                        value={formData.primaryKeyword}
                                        onChange={(e) => handleInputChange('primaryKeyword', e.target.value)}
                                        className={`bg-background border-input ${errors.primaryKeyword ? 'border-destructive' : ''}`}
                                        placeholder="Enter primary keyword"
                                    />
                                    {errors.primaryKeyword && (
                                        <p className="text-sm text-destructive">{errors.primaryKeyword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="secondaryKeyword" className="text-foreground">
                                        Secondary Keyword *
                                    </Label>
                                    <Input
                                        id="secondaryKeyword"
                                        value={formData.secondaryKeyword}
                                        onChange={(e) => handleInputChange('secondaryKeyword', e.target.value)}
                                        className={`bg-background border-input ${errors.secondaryKeyword ? 'border-destructive' : ''}`}
                                        placeholder="Enter secondary keyword"
                                    />
                                    {errors.secondaryKeyword && (
                                        <p className="text-sm text-destructive">{errors.secondaryKeyword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="semanticTheme" className="text-foreground">
                                        Semantic Theme *
                                    </Label>
                                    <Input
                                        id="semanticTheme"
                                        value={formData.semanticTheme}
                                        onChange={(e) => handleInputChange('semanticTheme', e.target.value)}
                                        className={`bg-background border-input ${errors.semanticTheme ? 'border-destructive' : ''}`}
                                        placeholder="Enter semantic theme"
                                    />
                                    {errors.semanticTheme && (
                                        <p className="text-sm text-destructive">{errors.semanticTheme}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tone" className="text-foreground">
                                        Tone *
                                    </Label>
                                    <Input
                                        id="tone"
                                        value={formData.tone}
                                        onChange={(e) => handleInputChange('tone', e.target.value)}
                                        className={`bg-background border-input ${errors.tone ? 'border-destructive' : ''}`}
                                        placeholder="Enter tone"
                                    />
                                    {errors.tone && (
                                        <p className="text-sm text-destructive">{errors.tone}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pageIntent" className="text-foreground">
                                        Page Intent *
                                    </Label>
                                    <Input
                                        id="pageIntent"
                                        value={formData.pageIntent}
                                        onChange={(e) => handleInputChange('pageIntent', e.target.value)}
                                        className={`bg-background border-input ${errors.pageIntent ? 'border-destructive' : ''}`}
                                        placeholder="e.g. Informational, Transactional, Lead Gen"
                                    />
                                    {errors.pageIntent && (
                                        <p className="text-sm text-destructive">{errors.pageIntent}</p>
                                    )}
                                </div>

                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="creativeBrief" className="text-foreground">
                                    Creative Brief *
                                </Label>
                                <Textarea
                                    id="creativeBrief"
                                    value={formData.creativeBrief}
                                    onChange={(e) => handleInputChange('creativeBrief', e.target.value)}
                                    className={`bg-background border-input min-h-[120px] ${errors.creativeBrief ? 'border-destructive' : ''}`}
                                    placeholder="Enter detailed creative brief..."
                                />
                                {errors.creativeBrief && (
                                    <p className="text-sm text-destructive">{errors.creativeBrief}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 hover-glow transition-all duration-300"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Content Request'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

}
