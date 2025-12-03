import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = [
    { test: (pwd: string) => pwd.length >= 8, text: 'At least 8 characters' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: 'One uppercase letter' },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: 'One lowercase letter' },
    { test: (pwd: string) => /\d/.test(pwd), text: 'One number' },
  ];

  return (
    <div className="space-y-2 mt-2">
      <p className="text-sm text-muted-foreground">Password requirements:</p>
      <div className="space-y-1">
        {requirements.map((req, index) => {
          const isValid = req.test(password);
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {isValid ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-red-500" />
              )}
              <span className={isValid ? 'text-green-500' : 'text-muted-foreground'}>
                {req.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}