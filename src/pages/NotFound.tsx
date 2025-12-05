import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, FileQuestion, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    // Redirect to dashboard if user is authenticated, otherwise to homepage
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Large icon with gradient background */}
            <div className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/20 via-brand-blue/20 to-brand-indigo/20 rounded-full blur-xl"></div>
              <div className="relative w-full h-full bg-card border border-border rounded-full flex items-center justify-center shadow-lg">
                <FileQuestion className="w-16 h-16 md:w-20 md:h-20 text-primary" />
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-brand-cyan/30 rounded-full blur-sm"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-brand-indigo/30 rounded-full blur-sm"></div>
          </div>
        </div>

        {/* 404 Number */}
        <div className="mb-6">
          <h1 className="text-8xl md:text-9xl font-bold mb-4">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-indigo bg-clip-text text-transparent">
              404
            </span>
          </h1>
        </div>

        {/* Friendly Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Oops… we couldn't find that page.
        </h2>

        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for may have been moved, deleted, or the link was incorrect. 
          Don't worry, let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={handleGoHome}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover-glow text-lg px-8 py-6 transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            Go Back Home
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-border hover:bg-accent hover:text-accent-foreground text-lg px-8 py-6 transition-all"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* Additional Help Text */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support or try navigating from the main menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
