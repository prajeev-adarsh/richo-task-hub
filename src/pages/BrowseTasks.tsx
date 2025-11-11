import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Calendar, IndianRupee, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
}

interface TaskApplication {
  task_id: string;
}

const BrowseTasks = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [remoteFilter, setRemoteFilter] = useState<boolean | null>(null);
  const [budgetRange, setBudgetRange] = useState([0, 100000]);
  const [cityFilter, setCityFilter] = useState('');

  // Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .is('doer_id', null)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('task_id')
        .eq('doer_id', user.id);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (categoryFilter && task.category !== categoryFilter) return false;
    if (remoteFilter !== null && task.is_remote !== remoteFilter) return false;
    if (task.budget < budgetRange[0] || task.budget > budgetRange[1]) return false;
    if (cityFilter && !task.location.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    return true;
  });

  const hasApplied = (taskId: string) => {
    return applications.some(app => app.task_id === taskId);
  };

  const handleApply = async () => {
    if (!user || !selectedTask) return;

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

      // Update applications list
      setApplications(prev => [...prev, { task_id: selectedTask.id }]);
      setShowApplyModal(false);
    } catch (error) {
      console.error('Error applying to task:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Search className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Browse Tasks</h1>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="skilled">Skilled</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label>Budget Range (₹{budgetRange[0]} - ₹{budgetRange[1]})</Label>
                <Slider
                  value={budgetRange}
                  onValueChange={setBudgetRange}
                  max={100000}
                  min={0}
                  step={1000}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Search city..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Grid */}
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {task.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {task.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                      <span className="font-medium">₹{task.budget.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>{task.is_remote ? 'Remote' : task.location}</span>
                      {task.is_remote && <Badge variant="outline">Remote</Badge>}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
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
                        {applying === task.id ? 'Applying...' : 'Apply'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedTask.description}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Budget:</span>
                    <span className="font-medium">₹{selectedTask.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span>{selectedTask.is_remote ? 'Remote' : selectedTask.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deadline:</span>
                    <span>{format(new Date(selectedTask.deadline), 'MMM dd, yyyy')}</span>
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