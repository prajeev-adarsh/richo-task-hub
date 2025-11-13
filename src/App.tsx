import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from '@/components/LanguageContext';
import { UserProvider } from '@/components/UserContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Index from "./pages/Index";
import TaskDetails from "./pages/TaskDetails";
import ChatRoom from "./pages/ChatRoom";
import Auth from "./pages/Auth";
import PostTask from "./pages/PostTask";
import BrowseTasks from "./pages/BrowseTasks";
import MyTasks from "./pages/MyTasks";
import MyGigs from "./pages/MyGigs";
import ClientDashboard from "./pages/ClientDashboard";
import DoerDashboard from "./pages/DoerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <LanguageProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
