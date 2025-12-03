import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail } from 'lucide-react';
import { InvitationFormData } from '@/types/invitation';

interface InvitationFormProps {
  onSubmit: (formData: InvitationFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function InvitationForm({ onSubmit, isSubmitting }: InvitationFormProps) {
  const [formData, setFormData] = useState<InvitationFormData>({
    fullName: '',
    email: '',
    role: 'user'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    // Reset form after successful submission
    setFormData({
      fullName: '',
      email: '',
      role: 'user'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">Send New Invitation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
              Full Name *
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <Label className="block text-sm font-medium text-foreground mb-2">
            Role *
          </Label>
          <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
            <SelectTrigger className="w-full px-4 py-3 bg-input border-border text-foreground">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="user" className="text-popover-foreground hover:bg-accent">User</SelectItem>
              <SelectItem value="admin" className="text-popover-foreground hover:bg-accent">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-start">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-cyan hover:bg-brand-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium transition-colors duration-200 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}