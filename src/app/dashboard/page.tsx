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
import { v4 as uuidv4 } from 'uuid';


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
            const runId = uuidv4();

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
                        status: 'pending' // DO NOT set current_run_id yet due to FK constraint
                    }])
                    .select(),
                30000,
                'Database submission timed out'
            ) as any;

            if (dbError) {
                throw new Error(`Database error: ${dbError.message}`);
            }

            const requestId = dbData[0].id;

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
                        request_id: requestId,
                        run_id: runId,
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

    const fillRealTestData = () => {
        setFormData({
            articleTitle: "Anxiety and School Pressure: Managing Stress Without Burning Out",
            titleAudience: "Parents of teens dealing with school burn out",
            clientName: "The Ridge RTC",
            creativeBrief: `Do NOT deviate from this outline. 

Blog Brief: Anxiety and School Pressure: Managing Stress Without Burning Out
Reading Time: ~6 minutes
Target Word Count: ~800 words
Audience
Parents and caregivers of teens and adolescents experiencing academic stress, overwhelm, or anxiety related to school performance — particularly middle and high school students.
Tone
Supportive, validating, educational, clinical yet accessible — reassuring without minimizing stress or over-pathologizing.
Brand Positioning (The Ridge)
Adolescent-focused, evidence-based, trauma-informed, skills-oriented — emphasizing emotional regulation, balance, and resilience rather than perfection or pressure.

SEO Guidelines
Focus Keyword
Teen School Anxiety
Must appear in:
H1 (title)
First paragraph
At least two additional times naturally throughout the article
Primary Keyword
High School Anxiety
Must appear in:
At least one H2 heading
At least two additional times naturally in the body
Long-Tail Keywords
Use each once organically:
How to Deal With Anxiety at School Teenager
How to Help Teenager With School Anxiety

Table of Contents
Introduction
Understanding Teen School Anxiety
High School Anxiety and Academic Pressure
Signs School Stress Is Becoming a Problem
Why Teens Burn Out
How to Deal With Anxiety at School Teenager
How to Help Teenager With School Anxiety
When School Anxiety Needs Professional Support
FAQs
Conclusion
Key Takeaways
Cited Sources

Internal Links:
https://theridgertc.com/what-we-treat/teen-anxiety-treatment/
https://theridgertc.com/what-we-treat/school-refusal-treatment-program/
https://theridgertc.com/how-we-treat/residential-treatment-centers-for-youth/
https://theridgertc.com/contact/
https://paradigmtreatment.com/teen-anxiety-school-refusal/

Content Outline & Writing Instructions
1. Introduction (≈90–110 words)
Purpose: Normalize school-related stress and frame burnout prevention.
Acknowledge the pressure teens face from academics, extracurriculars, testing, and expectations.
Introduce Teen School Anxiety as a common and understandable response to chronic stress.
Emphasize that unmanaged school pressure can lead to burnout, emotional exhaustion, and anxiety.
Use the focus keyword naturally in the first paragraph.

2. Understanding Teen School Anxiety (≈90–100 words)
Purpose: Define school-related anxiety in adolescents.
Explain how school anxiety differs from normal stress or motivation.
Discuss how performance pressure, comparison, and fear of failure contribute to anxiety.
Reinforce that Teen School Anxiety affects emotional, physical, and cognitive functioning.

3. High School Anxiety and Academic Pressure (≈90–100 words)
Purpose: Address developmental and environmental factors.
Use High School Anxiety in the H2 and body copy.
Discuss increased workload, testing, college pressure, and social comparison.
Explain how adolescent brain development makes stress regulation more challenging.
Emphasize that anxiety is not a sign of weakness or lack of effort.

4. Signs School Stress Is Becoming a Problem (≈80–90 words)
Purpose: Help parents recognize red flags.
Emotional signs: irritability, worry, perfectionism, emotional shutdown.
Physical signs: headaches, stomachaches, fatigue, sleep disruption.
Behavioral signs: avoidance, school refusal, declining grades, burnout symptoms.
Emphasize patterns over isolated incidents.

5. Why Teens Burn Out (≈80–90 words)
Purpose: Explain burnout without blame.
Describe chronic stress, lack of recovery time, and constant performance demands.
Discuss internal pressure vs. external expectations.
Reinforce that burnout is a nervous system response, not laziness.

6. How to Deal With Anxiety at School Teenager (≈90–110 words)
Purpose: Offer teen-centered coping strategies.
Introduce How to Deal With Anxiety at School Teenager organically.
Suggest skills such as pacing, grounding techniques, realistic goal-setting, and breaks.
Emphasize learning stress-management skills rather than avoiding school entirely.
Reinforce that support should be collaborative, not punitive.

7. How to Help Teenager With School Anxiety (≈90–110 words)
Purpose: Guide parents toward supportive responses.
Introduce How to Help Teenager With School Anxiety naturally.
Encourage open conversations about pressure and expectations.
Suggest validating emotions while helping teens build coping tools.
Emphasize flexibility, balance, and emotional safety over achievement.

8. When School Anxiety Needs Professional Support (≈80–90 words)
Purpose: Normalize seeking help.
Explain when anxiety interferes with attendance, sleep, mood, or functioning.
Emphasize that early intervention prevents long-term burnout.
Position The Ridge's adolescent-focused, skills-based approach as supportive and developmentally appropriate.

9. FAQs (≈100 words total)
Q1: Is school anxiety normal for teens?
A: Some stress is normal, but persistent anxiety is not something teens should handle alone.
Q2: Can anxiety affect academic performance?
A: Yes — anxiety can impair focus, memory, and motivation.
Q3: Should parents reduce academic expectations?
A: Balance and flexibility often support better long-term outcomes than pressure.
Q4: Can teens learn to manage school stress effectively?
A: Yes — with skills, support, and guidance, teens can build resilience.

10. Conclusion (≈70–80 words)
Reinforce that Teen School Anxiety is common but manageable.
Emphasize that addressing High School Anxiety early helps prevent burnout.
Encourage families to prioritize emotional well-being alongside academic success.
Reinforce that support, skills, and balance make a meaningful difference.

11. Key Takeaways
Teen school anxiety is a common response to chronic academic pressure.
High school anxiety can escalate without support.
Burnout reflects nervous system overload, not lack of effort.
Knowing how to deal with anxiety at school helps teens stay engaged.
Knowing how to help a teenager with school anxiety starts with validation and balance.

12. Cited Sources
Include authoritative sources such as:
CDC – Youth Stress & Mental Health
American Academy of Pediatrics – School Stress in Adolescents
National Institute of Mental Health (NIMH) – Anxiety Disorders in Teens
Child Mind Institute – School Anxiety & Burnout`,
            articleType: "Blogs",
            wordCount: "800",
            primaryKeyword: "Teen School Anxiety",
            secondaryKeyword: "High School Anxiety",
            semanticTheme: "How to Deal With Anxiety at School as a Teenager, How to Help Teenager With School Anxiety",
            tone: "Professional, compassionate",
            pageIntent: "Informational"
        });
    };

    const fillParadigmTestData = () => {
        setFormData({
            articleTitle: "Stress, Chronic Illness & Anxiety: Why Physical Health Matters in Mental Wellness for Teens",
            titleAudience: "Parents and Caregivers",
            clientName: "Paradigm Treatment",
            creativeBrief: `Blog Brief: Stress, Chronic Illness & Anxiety: Why Physical Health Matters in Mental Wellness for Teens
Reading Time: ~6 minutes
Target Word Count: 800 words
Audience
Parents and caregivers of teens and adolescents experiencing stress, anxiety, or chronic health conditions — especially those seeking to understand how physical health impacts emotional well-being.
Tone
Compassionate, educational, reassuring, clinical yet accessible — validating parental concern without fear-based messaging.
Brand Positioning
Trauma-informed, evidence-based, developmental, family-engaged — emphasizing whole-person care and the mind–body connection without blame.

SEO Guidelines
Primary Keyword
Teen Stress and Anxiety
Must appear in:
H1 (title)
First paragraph
At least two additional times naturally throughout the article
Secondary Keyword
Exercise and Adolescent Mental Health
Must appear in:
At least one H2 heading
At least two additional times naturally in the body
Semantic Themes
Use each once organically:
How to Help a Teenager With Stress and Anxiety
Exercise and Mental Health in Adolescents

Internal Links:
https://paradigmtreatment.com/mental-health-treatment-for-teens/
https://paradigmtreatment.com/mental-health-treatment-for-teens/anxiety-treatment-for-teens/
https://paradigmtreatment.com/treatment-approach/residential-treatment-centers-for-youth/
https://paradigmtreatment.com/treatment-approach/young-adult-residential-treatment/
https://paradigmtreatment.com/contact-paradigm-treatment/

Table of Contents
Introduction
Understanding Teen Stress and Anxiety
The Link Between Physical Health and Mental Wellness
Exercise and Adolescent Mental Health
Chronic Illness, Pain, and Anxiety in Teens
How to Help a Teenager With Stress and Anxiety
When Physical and Mental Health Need Integrated Care
FAQs
Conclusion
Key Takeaways
Cited Sources

Content Outline & Writing Instructions
1. Introduction
Purpose: Frame the mind–body connection and normalize parental concern.
Acknowledge how stress and anxiety often coexist with physical health challenges in teens.
Introduce Teen Stress and Anxiety as common but meaningful concerns that deserve a holistic approach.
Emphasize that physical health — including exercise, sleep, and chronic illness management — plays a critical role in emotional regulation and resilience.
Use the focus keyword naturally in the first paragraph.

2. Understanding Teen Stress and Anxiety
Purpose: Define stress and anxiety in adolescence.
Explain how teen stress differs from adult stress due to developmental and neurologic factors.
Describe common stressors (school pressure, social expectations, health issues).
Reinforce that persistent stress can contribute to anxiety symptoms when left unaddressed.

3. The Link Between Physical Health and Mental Wellness
Purpose: Establish the biological connection between body and mind.
Explain how stress hormones, inflammation, sleep disruption, and physical discomfort impact emotional health.
Highlight that physical health challenges can intensify Teen Stress and Anxiety.
Emphasize that mental wellness is not separate from physical well-being.

4. Exercise and Adolescent Mental Health
Purpose: Highlight movement as a protective and supportive factor.
Use Exercise and Adolescent Mental Health in the H2 and body copy.
Explain how regular physical activity supports mood regulation, stress reduction, and nervous system balance.
Introduce Exercise and Mental Health in Adolescents once organically.
Emphasize that exercise does not need to be intense or performance-based to be beneficial.
Reinforce that movement can be adapted for teens with anxiety or physical limitations.

5. Chronic Illness, Pain, and Anxiety in Teens
Purpose: Address the emotional impact of ongoing physical conditions.
Discuss how chronic illness, pain, or medical conditions can heighten anxiety and stress.
Acknowledge feelings of loss of control, isolation, or frustration common in teens managing health conditions.
Emphasize the importance of coordinated medical and mental health support.

6. How to Help a Teenager With Stress and Anxiety
Purpose: Provide practical, compassionate parental guidance.
Introduce How to Help a Teenager With Stress and Anxiety naturally.
Encourage open conversations about physical symptoms, stress, and emotions.
Suggest supporting healthy routines (movement, sleep, nutrition) without pressure.
Reinforce observing patterns rather than isolated behaviors.

7. When Physical and Mental Health Need Integrated Care
Purpose: Normalize professional support and integrated treatment.
Explain when stress and anxiety begin to interfere with daily functioning or physical health management.
Highlight the benefits of integrated care that addresses both physical and mental health needs.
Emphasize early intervention and whole-person treatment.

8. FAQs
Q1: Can physical health issues cause anxiety in teens?
A: Yes — chronic illness, pain, and fatigue can increase stress and anxiety symptoms.
Q2: Does exercise really help teen anxiety?
A: Regular movement supports mood regulation and stress reduction.
Q3: What if my teen can't exercise due to illness?
A: Gentle, adaptive movement and other body-based supports can still help.
Q4: Should mental and physical health be treated together?
A: Yes — integrated care leads to better outcomes for teens.

9. Conclusion
Reinforce that understanding Teen Stress and Anxiety requires looking at the whole person.
Emphasize the role of physical health, movement, and chronic illness management in emotional wellness.
Encourage parents to seek integrated, compassionate support rather than addressing symptoms in isolation.

10. Key Takeaways
Teen stress and anxiety are closely linked to physical health.
Exercise supports adolescent mental health in accessible ways.
Chronic illness can intensify emotional stress in teens.
Knowing how to help a teenager with stress and anxiety starts with whole-person care.
Integrated treatment supports long-term resilience.`,
            articleType: "Blogs",
            wordCount: "800",
            primaryKeyword: "Teen Stress and Anxiety",
            secondaryKeyword: "Exercise and Adolescent Mental Health",
            semanticTheme: "How to Help a Teenager With Stress and Anxiety, Exercise and Mental Health in Adolescents",
            tone: "Compassionate, educational, reassuring, clinical yet accessible. Validates parental concern without fear-based messaging.",
            pageIntent: "Informational"
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
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={fillRealTestData}
                                        className="text-xs"
                                    >
                                        🧪 Ridge RTC
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={fillParadigmTestData}
                                        className="text-xs"
                                    >
                                        🧪 Paradigm
                                    </Button>
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
