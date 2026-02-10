import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Calendar, IndianRupee, Filter, Search, X, ChevronDown, ChevronUp, Clock, Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useSavedTasks } from '@/hooks/useSavedTasks';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Navigation from '@/components/Navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  is_remote: boolean;
  budget: number;
  deadline: string;
  proof_required: boolean;
  client_id: string;
  created_at: string;
}

interface TaskApplication {
  task_id: string;
}

const CATEGORIES = [
  // Primary AI Categories
  { value: 'ai', label: 'AI Workflows & Automation' },
  { value: 'skilled', label: 'Vibe Coding' },
  { value: 'student', label: 'Prompt Engineering' },
  { value: 'custom', label: 'AI Video Editing' },
  // Secondary Categories
  { value: 'web_design', label: 'Web Design' },
  { value: 'general', label: 'General Freelancing' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'budget_high', label: 'Highest Budget' },
  { value: 'budget_low', label: 'Lowest Budget' },
  { value: 'deadline', label: 'Earliest Deadline' },
];

const BrowseTasks = () => {
  const navigate = useNavigate();
  const { user, role, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { toggleSaveTask, isTaskSaved, savedTaskIds } = useSavedTasks();
  const [applying, setApplying] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [remoteFilter, setRemoteFilter] = useState<boolean | null>(null);
  const [budgetRange, setBudgetRange] = useState([0, 100000]);
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isDoer = role === 'doer';

  // Fetch tasks with React Query
  const { data: tasks = [], isLoading: isTasksLoading, isError: isTasksError, error: tasksError } = useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .is('doer_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user?.id, // Only fetch when user is logged in
    retry: 1,
  });

  // Fetch applications with React Query
  const { data: applications = [] } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('task_applications')
        .select('task_id')
        .eq('doer_id', user.id);
      
      if (error) throw error;
      return data as TaskApplication[];
    },
    enabled: !!user?.id,
  });

  const loading = isTasksLoading || isUserLoading;

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setRemoteFilter(null);
    setBudgetRange([0, 100000]);
    setLocationFilter('');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || categoryFilter || remoteFilter !== null || 
    budgetRange[0] > 0 || budgetRange[1] < 100000 || locationFilter;

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(task => {
      // Text search in title and description
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) && 
            !task.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Category filter
      if (categoryFilter && task.category !== categoryFilter) return false;
      
      // Remote filter
      if (remoteFilter !== null && task.is_remote !== remoteFilter) return false;
      
      // Budget range
      if (task.budget < budgetRange[0] || task.budget > budgetRange[1]) return false;
      
      // Location filter
      if (locationFilter && !task.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'budget_high':
          return b.budget - a.budget;
        case 'budget_low':
          return a.budget - b.budget;
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, categoryFilter, remoteFilter, budgetRange, locationFilter, sortBy]);

  const hasApplied = (taskId: string) => {
    return applications.some(app => app.task_id === taskId);
  };

  const handleApply = async () => {
    if (!user?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to apply for tasks",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedTask) return;

    setApplying(selectedTask.id);
    try {
      const { error } = await supabase
        .from('task_applications')
        .insert({
          task_id: selectedTask.id,
          doer_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Your application has been sent to the client",
      });

      // Invalidate applications query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['applications', user.id] });
      setShowApplyModal(false);
    } catch (error) {
      logger.error('Error applying to task:', error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  const openApplyModal = (task: Task) => {
    setSelectedTask(task);
    setShowApplyModal(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM dd, yyyy');
  };

  const getDaysRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) return 'No deadline';

    const days = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isTasksError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to load tasks</h3>
              <p className="text-muted-foreground mb-4">
                {(tasksError as Error)?.message || 'Something went wrong. Please try again.'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Browse Tasks</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''} found
            </span>
            {isDoer && savedTaskIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/saved-tasks')}
              >
                <Bookmark className="h-4 w-4 fill-primary text-primary" />
                {savedTaskIds.size} Saved
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">Active</Badge>
                    )}
                  </CardTitle>
                  {filtersOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="City or area..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-2">
                    <Label>Budget: ₹{budgetRange[0].toLocaleString()} - ₹{budgetRange[1].toLocaleString()}</Label>
                    <Slider
                      value={budgetRange}
                      onValueChange={setBudgetRange}
                      max={100000}
                      min={0}
                      step={1000}
                      className="w-full"
                    />
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remote Toggle & Clear */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Work Type</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={remoteFilter === true}
                          onCheckedChange={(checked) => setRemoteFilter(checked ? true : null)}
                        />
                        <span className="text-sm">Remote only</span>
                      </div>
                    </div>
                    
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                        <X className="h-4 w-4 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tasks Grid */}
        {filteredAndSortedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTasks.map((task) => {
              const daysText = getDaysRemaining(task.deadline);
              const isUrgent = daysText === 'Due today' || daysText === 'Overdue' || daysText === '1 day left';
              
              return (
                <Card key={task.id} className="hover:shadow-lg transition-shadow group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        {isDoer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveTask(task.id);
                            }}
                          >
                            <Bookmark className={`h-4 w-4 ${isTaskSaved(task.id) ? 'fill-primary text-primary' : ''}`} />
                          </Button>
                        )}
                        <Badge variant="secondary" className="capitalize">
                          {CATEGORIES.find(c => c.value === task.category)?.label || task.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {task.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">₹{task.budget.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>{task.is_remote ? 'Remote' : task.location}</span>
                        {task.is_remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span>{formatDate(task.deadline)}</span>
                        <Badge 
                          variant={isUrgent ? "destructive" : "outline"} 
                          className="text-xs ml-auto"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {daysText}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/task/${task.id}`)}
                      >
                        View Details
                      </Button>
                      
                      {hasApplied(task.id) ? (
                        <Button variant="secondary" size="sm" className="flex-1" disabled>
                          Applied
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openApplyModal(task)}
                          disabled={applying === task.id}
                        >
                          {applying === task.id ? 'Applying...' : 'Apply Now'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Apply Confirmation Modal */}
        <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to apply for this task?
              </DialogDescription>
            </DialogHeader>
            
            {selectedTask && (
              <div className="py-4">
                <h4 className="font-medium mb-2">{selectedTask.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {selectedTask.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-medium text-green-600">₹{selectedTask.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{selectedTask.is_remote ? 'Remote' : selectedTask.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span>{formatDate(selectedTask.deadline)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplyModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={applying !== null}>
                {applying ? 'Submitting...' : 'Confirm Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BrowseTasks;
