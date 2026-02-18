import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6">
      {/* Invitation Details */}
      <div className="space-y-4 p-4 border border-primary bg-black/50">
        <div className="text-center mb-4">
          <p className="text-sm font-terminal terminal-glow text-primary tracking-wider">
            Invitation Details
          </p>
        </div>

        <div>
          <Label className="text-xs font-terminal text-muted-foreground tracking-wider">Full Name</Label>
          <Input
            value={invitation.full_name}
            disabled
            className="mt-1 bg-black border-primary/50 text-primary font-terminal rounded-none"
          />
        </div>

        <div>
          <Label className="text-xs font-terminal text-muted-foreground tracking-wider">Email Address</Label>
          <Input
            value={invitation.email}
            disabled
            className="mt-1 bg-black border-primary/50 text-primary font-terminal rounded-none"
          />
        </div>

        <div>
          <Label className="text-xs font-terminal text-muted-foreground tracking-wider">Role</Label>
          <div className="mt-1">
            <Badge
              variant={invitation.role === 'admin' ? 'default' : 'secondary'}
              className="capitalize font-terminal bg-primary/20 text-primary border border-primary rounded-none"
            >
              {invitation.role === 'admin' ? (
                <Shield className="h-3 w-3 mr-1" />
              ) : (
                <User className="h-3 w-3 mr-1" />
              )}
              {invitation.role.toUpperCase()}
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
                <FormLabel className="font-terminal text-primary terminal-glow tracking-wider text-sm">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Create a password"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setPassword(e.target.value);
                    }}
                    className="h-12 bg-black border-2 border-primary text-primary font-terminal placeholder:text-muted-foreground focus:ring-primary focus:ring-2 rounded-none"
                  />
                </FormControl>
                <PasswordStrengthIndicator password={password} />
                <FormMessage className="font-terminal text-xs text-secondary" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-terminal text-primary terminal-glow tracking-wider text-sm">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    {...field}
                    className="h-12 bg-black border-2 border-primary text-primary font-terminal placeholder:text-muted-foreground focus:ring-primary focus:ring-2 rounded-none"
                  />
                </FormControl>
                <FormMessage className="font-terminal text-xs text-secondary" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-primary/50 bg-black/30">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-black"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <Label className="text-xs font-terminal text-muted-foreground tracking-wide cursor-pointer">
                    I agree to the terms and conditions
                  </Label>
                </div>
                <FormMessage className="font-terminal text-xs text-secondary" />
              </FormItem>
            )}
          />

          <div className="relative group pt-2">
            <div className="absolute -inset-1 bg-primary/20 blur-xl animate-slow-pulse group-hover:bg-primary/40 transition-all duration-300"></div>
            <Button
              type="submit"
              className="relative w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 hover:scale-105 animate-slow-pulse rounded-none"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}