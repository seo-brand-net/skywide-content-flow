import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const featureSchema = z.object({
  title: z.string().min(1, 'Feature title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['Low', 'Medium', 'High']),
  category: z.enum(['Bug Report', 'Feature Request', 'Improvement']),
});

type FeatureData = z.infer<typeof featureSchema>;

export default function Features() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeatureData>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'Medium',
      category: 'Feature Request',
    },
  });

  const onSubmit = async (data: FeatureData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a feature request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('features')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your feature request has been submitted successfully.',
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting feature request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feature request. Please try again.',
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
            <CardTitle>Submit Feature Request</CardTitle>
            <CardDescription>
              Help us improve by submitting feature requests, bug reports, or suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feature Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a clear title for your request"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bug Report">Bug Report</SelectItem>
                          <SelectItem value="Feature Request">Feature Request</SelectItem>
                          <SelectItem value="Improvement">Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feature Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed description of your request..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}