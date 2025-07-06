import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PostTask from "./pages/PostTask";
import BrowseTasks from "./pages/BrowseTasks";
import MyTasks from "./pages/MyTasks";
import MyGigs from "./pages/MyGigs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/post-task" element={<PostTask />} />
          <Route path="/browse-tasks" element={<BrowseTasks />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/my-gigs" element={<MyGigs />} />
          <Route path="/client-dashboard" element={<Index />} />
          <Route path="/doer-dashboard" element={<Index />} />
          <Route path="/admin-dashboard" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
