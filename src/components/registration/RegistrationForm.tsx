import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Invitation } from '@/types/invitation';
import { Shield, User } from 'lucide-react';

const registrationSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  invitation: Invitation;
  onSubmit: (data: RegistrationFormData) => Promise<void>;
  isLoading: boolean;
}

export function RegistrationForm({ invitation, onSubmit, isLoading }: RegistrationFormProps) {
  const [password, setPassword] = useState('');
  
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const handleSubmit = async (data: RegistrationFormData) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">S</span>
          </div>
        </div>
        <CardTitle className="text-2xl">Complete Registration</CardTitle>
        <p className="text-muted-foreground">
          You've been invited to join SKYWIDE Content Dashboard
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Invitation Details */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
            <Input
              value={invitation.full_name}
              disabled
              className="mt-1 bg-background"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
            <Input
              value={invitation.email}
              disabled
              className="mt-1 bg-background"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Role</Label>
            <div className="mt-1">
              <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                {invitation.role === 'admin' ? (
                  <Shield className="h-3 w-3 mr-1" />
                ) : (
                  <User className="h-3 w-3 mr-1" />
                )}
                {invitation.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setPassword(e.target.value);
                      }}
                    />
                  </FormControl>
                  <PasswordStrengthIndicator password={password} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <Label className="text-sm">
                      I agree to the terms and conditions
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}