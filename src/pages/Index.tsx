import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogIn, ArrowRight } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* SKYWIDE Brand Header */}
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-bold mb-4 animate-fade-in">
              <span className="bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-indigo bg-clip-text text-transparent">
                SKYWIDE
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-foreground font-semibold mb-2 animate-fade-in">
              Content Request Dashboard
            </p>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in">
              Streamline your content creation workflow with our comprehensive request management system
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 animate-scale-in">
            <div className="bg-card border border-border rounded-lg p-6 hover-glow">
              <div className="w-12 h-12 bg-brand-cyan/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <ArrowRight className="w-6 h-6 text-brand-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Submit Requests</h3>
              <p className="text-muted-foreground text-sm">
                Easily submit detailed content creation requests with all necessary information
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 hover-glow">
              <div className="w-12 h-12 bg-brand-blue/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <ArrowRight className="w-6 h-6 text-brand-blue" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
              <p className="text-muted-foreground text-sm">
                Monitor your requests and stay updated on their status in real-time
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 hover-glow">
              <div className="w-12 h-12 bg-brand-indigo/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <ArrowRight className="w-6 h-6 text-brand-indigo" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Collaborate</h3>
              <p className="text-muted-foreground text-sm">
                Work seamlessly with your team on content creation projects
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button 
              size="lg" 
              className="bg-brand-blue-crayola hover:bg-brand-blue-crayola/90 text-white hover-glow text-lg px-8 py-6 transition-colors"
              onClick={() => navigate('/login')}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Access Dashboard
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col items-center gap-3">
              <img 
                src="/lovable-uploads/abefa66b-a1f9-4c62-bc62-d9132351623e.png" 
                alt="SEOBRAND Logo" 
                className="h-12 opacity-90"
              />
              <p className="text-muted-foreground text-sm">
                For SEO Brand Team Member Only • Secure Authentication Required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
