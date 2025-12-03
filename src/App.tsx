import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MyRequests from "./pages/MyRequests";
import InviteUsers from "./pages/InviteUsers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Features from "./pages/Features";
import Research from "./pages/Research";
import AIRewriter from "./pages/AIRewriter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-requests" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyRequests />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invite-users" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <InviteUsers />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/features" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Features />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/research" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Research />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai-rewriter" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <AIRewriter />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
