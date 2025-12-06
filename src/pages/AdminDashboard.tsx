import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, UserCog, CreditCard, TrendingUp, Star, FileText, Filter, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  upi_id: string | null;
  language: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
  client_email: string;
  doer_email: string | null;
}

interface Payment {
  id: string;
  task_id: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  created_at: string;
  client_email: string;
  doer_email: string | null;
}

interface Rating {
  id: string;
  task_id: string;
  stars: number;
  review: string | null;
  created_at: string;
  reviewer_name: string;
  receiver_name: string;
}

interface RevenueData {
  totalTasks: number;
  totalPaidTasks: number;
  totalRevenue: number;
  upiPayments: number;
}

const AdminDashboard = () => {
  const { user } = useUser();
  const { toast } = useToast();
  
  // State for different tabs
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalTasks: 0,
    totalPaidTasks: 0,
    totalRevenue: 0,
    upiPayments: 0,
  });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  
  // Filter states
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard",
        variant: "destructive",
      });
      window.location.href = '/';
      return;
    }
    
    if (user && user.role === 'admin') {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchTasks(),
      fetchPayments(),
      fetchRatings(),
      fetchRevenueData(),
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:users!tasks_client_id_fkey(email),
          doer:users!tasks_doer_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedTasks = data?.map(task => ({
        ...task,
        client_email: task.client?.email || '',
        doer_email: task.doer?.email || null,
      })) || [];
      
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          task:tasks(title),
          client:users!fk_payments_client_id(email),
          doer:users!fk_payments_doer_id(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedPayments = data?.map(payment => ({
        ...payment,
        client_email: payment.client?.email || '',
        doer_email: payment.doer?.email || null,
      })) || [];
      
      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchRatings = async () => {
    setRatingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          task:tasks(title),
          reviewer:users!ratings_from_user_fkey(name),
          receiver:users!ratings_to_user_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedRatings = data?.map(rating => ({
        ...rating,
        reviewer_name: rating.reviewer?.name || '',
        receiver_name: rating.receiver?.name || '',
      })) || [];
      
      setRatings(formattedRatings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast({
        title: "Error",
        description: "Failed to load ratings",
        variant: "destructive",
      });
    } finally {
      setRatingsLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    try {
      // Get total tasks
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Get paid tasks and payments data
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('amount, payment_mode, payment_status');

      if (error) throw error;

      const paidPayments = paymentsData?.filter(p => p.payment_status === 'paid') || [];
      const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const upiPayments = paidPayments.filter(p => p.payment_mode === 'upi_manual').length;

      setRevenueData({
        totalTasks: totalTasks || 0,
        totalPaidTasks: paidPayments.length,
        totalRevenue,
        upiPayments,
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUserId);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: `${selectedUserName} has been deleted successfully`,
      });

      fetchUsers();
      setShowDeleteModal(false);
      setSelectedUserId(null);
      setSelectedUserName('');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openDeleteModal = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setShowDeleteModal(true);
  };

  // Filter functions
  const getFilteredUsers = () => {
    let filtered = users;
    if (userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }
    return filtered;
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (taskStatusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === taskStatusFilter);
    }
    return filtered;
  };

  const getFilteredPayments = () => {
    let filtered = payments;
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_status === paymentStatusFilter);
    }
    if (paymentModeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_mode === paymentModeFilter);
    }
    return filtered;
  };

  // Pagination helper
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / itemsPerPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page</p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, tasks, and track revenue</p>
          </div>
          <Button variant="outline" onClick={fetchAllData}>
            <Download className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <FileText className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="revenue">
              <TrendingUp className="h-4 w-4 mr-2" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="ratings">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="doer">Doer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>UPI ID</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : getFilteredUsers().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(getFilteredUsers()).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.upi_id || 'Not set'}</TableCell>
                            <TableCell className="uppercase">{user.language}</TableCell>
                            <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteModal(user.id, user.name)}
                                disabled={user.role === 'admin'}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks Overview</CardTitle>
                  <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Doer</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasksLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading tasks...
                          </TableCell>
                        </TableRow>
                      ) : getFilteredTasks().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No tasks found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(getFilteredTasks()).map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium max-w-xs truncate">{task.title}</TableCell>
                            <TableCell className="capitalize">{task.category}</TableCell>
                            <TableCell>₹{task.budget.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                task.status === 'completed' ? 'default' :
                                task.status === 'in_progress' ? 'secondary' :
                                task.status === 'open' ? 'outline' : 'destructive'
                              }>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="truncate max-w-xs">{task.client_email}</TableCell>
                            <TableCell className="truncate max-w-xs">{task.doer_email || 'Unassigned'}</TableCell>
                            <TableCell>{format(new Date(task.created_at), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payments Overview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="upi_manual">UPI Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Total Amount: <span className="font-medium">₹{getFilteredPayments().reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                  </p>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Doer</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading payments...
                          </TableCell>
                        </TableRow>
                      ) : getFilteredPayments().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No payments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(getFilteredPayments()).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">{payment.task_id.slice(0, 8)}...</TableCell>
                            <TableCell className="font-medium">₹{payment.amount.toLocaleString()}</TableCell>
                            <TableCell className="truncate max-w-xs">{payment.client_email}</TableCell>
                            <TableCell className="truncate max-w-xs">{payment.doer_email || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">UPI</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {payment.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenueData.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Tasks</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenueData.totalPaidTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {revenueData.totalTasks > 0 ? `${((revenueData.totalPaidTasks / revenueData.totalTasks) * 100).toFixed(1)}% of total` : '0% of total'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{revenueData.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">From paid tasks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">UPI Payments:</span>
                      <span className="text-sm font-medium">{revenueData.upiPayments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Payment Mode Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>UPI Manual</span>
                          <Badge variant="outline">{revenueData.upiPayments} payments</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Revenue Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Average Task Value</span>
                          <span className="font-medium">
                            ₹{revenueData.totalPaidTasks > 0 ? (revenueData.totalRevenue / revenueData.totalPaidTasks).toFixed(0) : 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Payment Success Rate</span>
                          <span className="font-medium">
                            {revenueData.totalTasks > 0 ? ((revenueData.totalPaidTasks / revenueData.totalTasks) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Stars</TableHead>
                        <TableHead>Reviewer</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Review</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratingsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading ratings...
                          </TableCell>
                        </TableRow>
                      ) : ratings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No ratings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(ratings).map((rating) => (
                          <TableRow key={rating.id}>
                            <TableCell className="font-mono text-sm">{rating.task_id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < rating.stars 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-1 text-sm">({rating.stars})</span>
                              </div>
                            </TableCell>
                            <TableCell>{rating.reviewer_name}</TableCell>
                            <TableCell>{rating.receiver_name}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {rating.review || 'No review provided'}
                            </TableCell>
                            <TableCell>{format(new Date(rating.created_at), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing results with current filters
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= getTotalPages(users.length)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Delete User Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUserName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;