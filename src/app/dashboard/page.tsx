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
            articleTitle: "Wisconsin PE Ethics Requirements: What Counts & Where to Find Approved Courses",
            titleAudience: "Professional Engineers",
            clientName: "Align PEO",
            creativeBrief: `Blog Title: Wisconsin PE Ethics Requirements: What Counts & Where to Find Approved Courses Reading Time: ~6 minutes Target Word Count: ~1,000 words

Audience Licensed Professional Engineers in Wisconsin approaching their renewal deadline who need to understand the ethics PDH requirement — what qualifies, how many hours are needed, and where to find approved courses quickly.
Tone Clear, no-nonsense, and helpful. These are busy professionals who want answers fast. Authoritative without being bureaucratic. Slightly more practical/transactional than editorial.
Brand Positioning PDH Pro as the go-to source for DSPS-compliant ethics courses — convenient, state-specific, and designed to meet Wisconsin's requirements without wasted time.

SEO Guidelines
Primary Keyword: ethics for wisconsin professional engineers Must appear in: H1 (title), first paragraph, at least two additional times naturally throughout
Secondary Keyword: wisconsin pe ethics renewal requirement Must appear in: at least one H2 heading, at least two additional times naturally in the body
Semantic Themes (use each once organically):
professional engineer ethics course
pe continuing education ethics
Internal Links (verify URLs before publishing)
Wisconsin PE Ethics Courses — https://pdh-pro.com/courses/ethics/
Wisconsin PE Continuing Education — https://pdh-pro.com/pe-continuing-education/wisconsin/
Full Course Catalog — https://pdh-pro.com/courses/
How PDH Pro Works — https://pdh-pro.com/how-it-works/

Table of Contents
Introduction
Wisconsin PE Ethics: The Basics
Understanding the Wisconsin PE Ethics Renewal Requirement
What Topics Count as Ethics for Wisconsin Professional Engineers?
What Does NOT Count Toward the Ethics Requirement?
Where to Find Approved Ethics Courses
How to Document Ethics PDH Hours
Ethics and the Broader Renewal Picture
FAQs
Conclusion
Key Takeaways
Cited Sources

Content Outline & Writing Instructions
1. Introduction Purpose: Establish relevance immediately.
Open by noting that for ethics for wisconsin professional engineers, the requirement is small in credit hours but non-negotiable for renewal.
State that many engineers are unclear on exactly what topics qualify — and risk submitting courses that don't meet DSPS standards.
Use primary keyword naturally in the first paragraph.
Preview: this article breaks down what counts, what doesn't, and where to find approved courses fast.
2. Wisconsin PE Ethics: The Basics Purpose: Establish the rule clearly.
Wisconsin requires 2 PDH hours in professional or business ethics as part of the 30-hour renewal requirement.
Renewal cycle is biennial (every two years), with renewal deadlines tied to the license expiration date.
The ethics component is a minimum — additional ethics hours may be taken but only 2 are mandated.
3. Understanding the Wisconsin PE Ethics Renewal Requirement (H2 — use secondary keyword) Purpose: Expand on what DSPS actually specifies.
Clarify that the wisconsin pe ethics renewal requirement is governed by Wisconsin Administrative Code Ch. A-E 240.
Ethics PDH must cover professional or business ethics — not general soft skills or compliance.
DSPS does not maintain a pre-approved course list; the engineer is responsible for ensuring course content qualifies.
Re-use secondary keyword: engineers who misunderstand the wisconsin pe ethics renewal requirement risk rejected hours during an audit.
4. What Topics Count as Ethics for Wisconsin Professional Engineers? (use semantic themes) Purpose: Define qualifying content clearly.
Topics that qualify: NSPE Code of Ethics, engineering judgment and duty to the public, conflicts of interest, client confidentiality, professional responsibility in design, whistleblowing obligations.
A professional engineer ethics course that addresses one or more of these areas will generally satisfy DSPS requirements.
Pe continuing education ethics content from NSPE, state boards, or accredited providers like PDH Pro typically qualifies.
Re-use primary keyword: the clearest way to satisfy the ethics for wisconsin professional engineers requirement is through a course explicitly designed around professional codes of conduct.
5. What Does NOT Count Toward the Ethics Requirement? Purpose: Prevent common mistakes.
General compliance training (e.g., workplace harassment, OSHA) does not qualify as engineering ethics.
Business ethics courses not specific to professional engineering practice are typically insufficient.
Self-study without structured content or a certificate of completion may not meet documentation requirements.
6. Where to Find Approved Ethics Courses Purpose: Direct readers toward a solution — including PDH Pro.
PDH Pro offers Wisconsin-compliant ethics courses designed specifically for Professional Engineers.
Courses are available online, self-paced, and include a certificate of completion for your records.
Link to PDH Pro's ethics course page.
Also mention NSPE (nspe.org) as a secondary resource for ethics content.
7. How to Document Ethics PDH Hours Purpose: Remove ambiguity around recordkeeping.
DSPS does not require upfront submission of PDH records but may audit at any time.
Retain documentation for a minimum of four years: course certificate, provider name, topic, date completed, hours.
PDH Pro certificates include all required information for audit compliance.
8. Ethics and the Broader Renewal Picture Purpose: Zoom out and frame the full 30-hour requirement.
The 2 ethics hours sit within a 30-PDH biennial requirement.
Remaining 28 hours may come from a wide range of technical and professional development topics.
Link to the Wisconsin PE continuing education overview page on PDH Pro.
9. FAQs Q1: How many ethics hours are required for Wisconsin PE renewal? A: Wisconsin requires 2 PDH hours in professional or business ethics as part of the 30-hour biennial renewal requirement.
Q2: What counts as a professional engineer ethics course in Wisconsin? A: Courses covering the NSPE Code of Ethics, professional responsibility, conflicts of interest, or duties to the public generally qualify. DSPS does not pre-approve courses; the engineer is responsible for content verification.
Q3: Does Wisconsin require ethics PE continuing education from a specific provider? A: No — Wisconsin does not maintain a pre-approved provider list. Courses must simply meet the content standards outlined in A-E 240.
Q4: Can I take more than 2 hours of ethics and count them all? A: Additional ethics hours may be taken but only 2 are required. Extra hours count toward your general 30-PDH total.
10. Conclusion
Reiterate the core message: ethics for wisconsin professional engineers is a 2-hour, every-renewal requirement that's easy to satisfy when you know what qualifies.
Encourage engineers not to treat it as an afterthought — completing it through a structured, purpose-built course protects your license and simplifies documentation.
Close with a clear path to PDH Pro's ethics courses.
11. Key Takeaways
Wisconsin PEs must complete 2 PDH hours of professional or business ethics per renewal cycle.
The wisconsin pe ethics renewal requirement is governed by Administrative Code Ch. A-E 240.
Qualifying content must address professional engineering ethics specifically — not general compliance training.
DSPS does not pre-approve courses; engineers are responsible for content compliance.
Retaining certificates for at least four years protects against audit risk.
12. Cited Sources
Wisconsin DSPS — Professional Engineer Continuing Education Requirements — https://dsps.wi.gov/Pages/Professions/ProfessionalEngineer/Default.aspx
Wisconsin Administrative Code Ch. A-E 240 — https://docs.legis.wisconsin.gov/code/admin_code/a-e/240
NSPE — Code of Ethics for Engineers — https://www.nspe.org/resources/ethics/code-ethics
NCEES — PE Licensing Resources — https://ncees.org/engineering/pe/`,
            articleType: "Blogs",
            wordCount: "1000",
            primaryKeyword: "ethics for wisconsin professional engineers",
            secondaryKeyword: "wisconsin pe ethics renewal requirement",
            semanticTheme: "professional engineer ethics course, pe continuing education ethics",
            tone: "Professional",
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
