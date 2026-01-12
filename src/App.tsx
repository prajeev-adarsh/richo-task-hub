import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from '@/components/LanguageContext';
import { UserProvider } from '@/components/UserContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PostTask = lazy(() => import("./pages/PostTask"));
const BrowseTasks = lazy(() => import("./pages/BrowseTasks"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const MyGigs = lazy(() => import("./pages/MyGigs"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const SavedTasks = lazy(() => import("./pages/SavedTasks"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const DoerDashboard = lazy(() => import("./pages/DoerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Payments = lazy(() => import("./pages/Payments"));
const Profile = lazy(() => import("./pages/Profile"));
const DoerProfile = lazy(() => import("./pages/DoerProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Onboarding components
const ClientOnboarding = lazy(() => import("./components/onboarding/ClientOnboarding"));
const ExpertOnboarding = lazy(() => import("./components/onboarding/ExpertOnboarding"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-white font-bold text-2xl">R</span>
      </div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <LanguageProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/client" element={<Auth />} />
                <Route path="/auth/expert" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/onboarding/client" element={
                  <ProtectedRoute>
                    <ClientOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/expert" element={
                  <ProtectedRoute allowedRoles={['doer']}>
                    <ExpertOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/task/:id" element={<TaskDetails />} />
                <Route path="/chat/:taskId" element={
                  <ProtectedRoute>
                    <ChatRoom />
                  </ProtectedRoute>
                } />
                <Route path="/post-task" element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <PostTask />
                  </ProtectedRoute>
                } />
                <Route path="/browse-tasks" element={<BrowseTasks />} />
                <Route path="/my-tasks" element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <MyTasks />
                  </ProtectedRoute>
                } />
                <Route path="/my-gigs" element={
                  <ProtectedRoute allowedRoles={['doer']}>
                    <MyGigs />
                  </ProtectedRoute>
                } />
                <Route path="/saved-tasks" element={
                  <ProtectedRoute allowedRoles={['doer']}>
                    <SavedTasks />
                  </ProtectedRoute>
                } />
                <Route path="/my-applications" element={
                  <ProtectedRoute allowedRoles={['doer']}>
                    <MyApplications />
                  </ProtectedRoute>
                } />
                <Route path="/client-dashboard" element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/doer-dashboard" element={
                  <ProtectedRoute allowedRoles={['doer']}>
                    <DoerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin-dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/earnings" element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                } />
                <Route path="/payments" element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/doer/:id" element={
                  <ProtectedRoute>
                    <DoerProfile />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
