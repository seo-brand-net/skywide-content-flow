"use client";

import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';


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
}

export default function Dashboard() {
    const { user } = useAuth();
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
        tone: ''
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
            // 1. Save to Supabase database FIRST
            const { data: dbData, error: dbError } = await supabase
                .from('content_requests')
                .insert([{
                    user_id: user?.id,
                    article_title: formData.articleTitle,
                    title_audience: formData.titleAudience,
                    seo_keywords: "",
                    article_type: formData.articleType,
                    client_name: formData.clientName,
                    creative_brief: formData.creativeBrief,
                    status: 'pending'
                }])
                .select();

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
                        ...formData,
                        requestId: dbData[0].id,
                        userId: user?.id,
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
                console.log('Attempting to update database with:', {
                    id: dbData[0].id,
                    webhook_sent: webhookSuccess,
                    webhook_response: webhookResponseData,
                    user_id: user?.id,
                });

                const { data: updateData, error: updateError } = await supabase
                    .from('content_requests')
                    .update({
                        webhook_sent: webhookSuccess,
                        webhook_response: webhookResponseData
                    })
                    .eq('id', dbData[0].id)
                    .select();

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
                tone: ''
            });

        } catch (error: any) {
            console.error('Submission error:', error);
            toast({
                title: "Submission Failed",
                description: `Error: ${error.message || "Please try again."}`,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fillRandomData = () => {
        const titles = ["The Future of AI", "Top 10 SEO Strategies", "Sustainable Living Guide", "Crypto Market Trends", "Remote Work Best Practices"];
        const audiences = ["Tech Professionals", "Small Business Owners", "Eco-conscious Consumers", "Investors", "HR Managers"];
        const clients = ["TechCorp", "GreenLife", "CryptoKing", "WorkSmart", "HealthPlus"];
        const types = ["Website", "Blogs"];
        const tones = ["Professional", "Casual", "Authoritative", "Friendly", "Technical"];

        const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        setFormData({
            articleTitle: random(titles),
            titleAudience: random(audiences),
            clientName: random(clients),
            creativeBrief: "Please write a comprehensive article covering the main points of the topic. Include statistics and expert opinions where possible.",
            articleType: random(types),
            wordCount: "1200",
            primaryKeyword: "technology",
            secondaryKeyword: "innovation",
            semanticTheme: "Business & Tech",
            tone: random(tones)
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
                        Hello {user?.email}, submit your content creation requests below.
                    </p>
                </div>

                <Card className="bg-card border-border hover-glow">
                    <CardHeader>
                        <CardTitle className="seobrand-subtitle flex justify-between items-center">
                            Content Submission Form
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={clearTestData}
                                    className="text-xs"
                                >
                                    Clear Data
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={fillRandomData}
                                    className="text-xs"
                                >
                                    Fill Test Data
                                </Button>
                            </div>
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
                                        placeholder="Enter target audience"
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
