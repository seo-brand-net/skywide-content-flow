"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';


const researchSchema = z.object({
    url: z
        .string()
        .min(1, 'URL is required')
        .regex(
            /^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*(\.[a-zA-Z]{2,})(\/.*)?$/,
            'Please enter a valid URL starting with https://'
        ),
});

type ResearchData = z.infer<typeof researchSchema>;

export default function Research() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ResearchData>({
        resolver: zodResolver(researchSchema),
        defaultValues: {
            url: '',
        },
    });

    const onSubmit = async (data: ResearchData) => {
        setIsSubmitting(true);

        try {
            // Use internal proxy to avoid CORS
            const response = await fetch('/api/proxy-research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: data.url }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            toast({
                title: 'Success',
                description: 'Research request has been submitted successfully.',
            });

            form.reset();
        } catch (error) {
            console.error('Error submitting research request:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit research request. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-6">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Website Research</CardTitle>
                        <CardDescription>
                            Submit a website URL for research analysis. Please ensure you enter a complete URL starting with https://.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Website URL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="https://example.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            <p className="text-sm text-muted-foreground">
                                                Enter the complete website URL including https://
                                            </p>
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Research Request'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
