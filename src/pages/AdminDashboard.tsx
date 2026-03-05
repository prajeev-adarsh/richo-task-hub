import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfDay, eachDayOfInterval, formatDistanceToNow } from 'date-fns';
import { Users, UserCog, CreditCard, TrendingUp, Star, FileText, Download, AlertTriangle, BarChart3, Activity, Zap, UserPlus, DollarSign, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import Navigation from '@/components/Navigation';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ── Types ──────────────────────────────────────────────
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

interface ActivityItem {
  id: string;
  type: 'signup' | 'task' | 'payment' | 'rating' | 'application';
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

interface RevenueData {
  totalTasks: number;
  totalPaidTasks: number;
  totalRevenue: number;
  upiPayments: number;
}

const CHART_COLORS = [
  'hsl(195, 100%, 45%)', // primary cyan
  'hsl(270, 85%, 60%)',  // accent purple
  'hsl(160, 84%, 39%)',  // success green
  'hsl(45, 93%, 47%)',   // warning yellow
  'hsl(0, 84%, 60%)',    // destructive red
  'hsl(210, 70%, 55%)',  // blue
  'hsl(330, 70%, 55%)',  // pink
  'hsl(120, 50%, 45%)',  // dark green
];

// ── Component ──────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useUser();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalTasks: 0, totalPaidTasks: 0, totalRevenue: 0, upiPayments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  // ── Build activity feed from loaded data ─────────────
  const buildActivityFeed = useCallback(() => {
    const items: ActivityItem[] = [];

    // Recent signups
    users.slice(0, 30).forEach(u => {
      items.push({
        id: `signup-${u.id}`,
        type: 'signup',
        icon: <UserPlus className="h-4 w-4" />,
        title: 'New signup',
        description: `${u.name} joined as ${u.role}`,
        timestamp: u.created_at,
        color: 'text-emerald-500',
      });
    });

    // Recent tasks
    tasks.slice(0, 30).forEach(t => {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        icon: <ClipboardList className="h-4 w-4" />,
        title: 'Task posted',
        description: `"${t.title}" — ₹${t.budget}`,
        timestamp: t.created_at,
        color: 'text-blue-500',
      });
    });

    // Recent payments
    payments.slice(0, 30).forEach(p => {
      items.push({
        id: `payment-${p.id}`,
        type: 'payment',
        icon: <DollarSign className="h-4 w-4" />,
        title: `Payment ${p.payment_status}`,
        description: `₹${p.amount} — ${p.client_email}`,
        timestamp: p.created_at,
        color: p.payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500',
      });
    });

    // Recent ratings
    ratings.slice(0, 20).forEach(r => {
      items.push({
        id: `rating-${r.id}`,
        type: 'rating',
        icon: <Star className="h-4 w-4" />,
        title: `${r.stars}-star review`,
        description: `${r.reviewer_name} → ${r.receiver_name}`,
        timestamp: r.created_at,
        color: 'text-yellow-500',
      });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivityFeed(items.slice(0, 50));
  }, [users, tasks, payments, ratings]);

  useEffect(() => {
    if (!loading) buildActivityFeed();
  }, [loading, buildActivityFeed]);

  // ── Real-time subscriptions for activity feed ────────
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        const u = payload.new as any;
        setActivityFeed(prev => ([{
          id: `signup-${u.id}`,
          type: 'signup' as const,
          icon: <UserPlus className="h-4 w-4" />,
          title: 'New signup',
          description: `${u.name} joined as ${u.role}`,
          timestamp: u.created_at,
          color: 'text-emerald-500',
        }, ...prev].slice(0, 50)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const t = payload.new as any;
        setActivityFeed(prev => ([{
          id: `task-${t.id}`,
          type: 'task' as const,
          icon: <ClipboardList className="h-4 w-4" />,
          title: 'Task posted',
          description: `"${t.title}" — ₹${t.budget}`,
          timestamp: t.created_at,
          color: 'text-blue-500',
        }, ...prev].slice(0, 50)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        const p = payload.new as any;
        setActivityFeed(prev => ([{
          id: `payment-${p.id}`,
          type: 'payment' as const,
          icon: <DollarSign className="h-4 w-4" />,
          title: `Payment ${p.payment_status}`,
          description: `₹${p.amount}`,
          timestamp: p.created_at,
          color: p.payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500',
        }, ...prev].slice(0, 50)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Access check ─────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({ title: 'Access Denied', description: "You don't have permission to access the admin dashboard", variant: 'destructive' });
      window.location.href = '/';
      return;
    }
    if (user && user.role === 'admin') fetchAllData();
  }, [user]);

  // ── Data Fetchers ────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchTasks(), fetchPayments(), fetchRatings(), fetchRevenueData()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      logger.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally { setUsersLoading(false); }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*, client:users!tasks_client_id_fkey(email), doer:users!tasks_doer_id_fkey(email)').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data?.map(t => ({ ...t, client_email: t.client?.email || '', doer_email: t.doer?.email || null })) || []);
    } catch (error) {
      logger.error('Error fetching tasks:', error);
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } finally { setTasksLoading(false); }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const { data, error } = await supabase.from('payments').select('*, task:tasks(title), client:users!fk_payments_client_id(email), doer:users!fk_payments_doer_id(email)').order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data?.map(p => ({ ...p, client_email: p.client?.email || '', doer_email: p.doer?.email || null })) || []);
    } catch (error) {
      logger.error('Error fetching payments:', error);
      toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' });
    } finally { setPaymentsLoading(false); }
  };

  const fetchRatings = async () => {
    setRatingsLoading(true);
    try {
      const { data, error } = await supabase.from('ratings').select('*, task:tasks(title), reviewer:users!ratings_from_user_fkey(name), receiver:users!ratings_to_user_fkey(name)').order('created_at', { ascending: false });
      if (error) throw error;
      setRatings(data?.map(r => ({ ...r, reviewer_name: r.reviewer?.name || '', receiver_name: r.receiver?.name || '' })) || []);
    } catch (error) {
      logger.error('Error fetching ratings:', error);
      toast({ title: 'Error', description: 'Failed to load ratings', variant: 'destructive' });
    } finally { setRatingsLoading(false); }
  };

  const fetchRevenueData = async () => {
    try {
      const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
      const { data: paymentsData, error } = await supabase.from('payments').select('amount, payment_mode, payment_status');
      if (error) throw error;
      const paidPayments = paymentsData?.filter(p => p.payment_status === 'paid') || [];
      const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const upiPayments = paidPayments.filter(p => p.payment_mode === 'upi_manual').length;
      setRevenueData({ totalTasks: totalTasks || 0, totalPaidTasks: paidPayments.length, totalRevenue, upiPayments });
    } catch (error) { logger.error('Error fetching revenue data:', error); }
  };

  // ── Actions ──────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    if (!deletionReason.trim() || deletionReason.trim().length < 10) {
      toast({ title: 'Reason required', description: 'Please provide a deletion reason (at least 10 characters)', variant: 'destructive' });
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_user', { p_user_id: selectedUserId, p_reason: deletionReason.trim() });
      if (error) {
        if (error.message.includes('active tasks')) throw new Error('Cannot delete user with active tasks. Please cancel or complete their tasks first.');
        if (error.message.includes('pending payments')) throw new Error('Cannot delete user with pending payments. Please resolve payments first.');
        if (error.message.includes('admin users')) throw new Error('Cannot delete admin users');
        throw error;
      }
      toast({ title: 'User deactivated', description: `${selectedUserName} has been deactivated successfully.` });
      fetchUsers();
      setShowDeleteModal(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      setDeletionReason('');
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  const openDeleteModal = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setDeletionReason('');
    setShowDeleteModal(true);
  };

  // ── Filter helpers ───────────────────────────────────
  const getFilteredUsers = () => userRoleFilter === 'all' ? users : users.filter(u => u.role === userRoleFilter);
  const getFilteredTasks = () => taskStatusFilter === 'all' ? tasks : tasks.filter(t => t.status === taskStatusFilter);
  const getFilteredPayments = () => {
    let filtered = payments;
    if (paymentStatusFilter !== 'all') filtered = filtered.filter(p => p.payment_status === paymentStatusFilter);
    if (paymentModeFilter !== 'all') filtered = filtered.filter(p => p.payment_mode === paymentModeFilter);
    return filtered;
  };
  const getPaginatedData = (data: any[]) => data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getTotalPages = (len: number) => Math.ceil(len / itemsPerPage);

  // ── Chart data (memoised) ───────────────────────────
  const last30Days = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }), []);

  const taskTrendData = useMemo(() => {
    return last30Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = tasks.filter(t => format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr).length;
      return { date: format(day, 'MMM dd'), tasks: count };
    });
  }, [tasks, last30Days]);

  const revenueTrendData = useMemo(() => {
    return last30Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRevenue = payments
        .filter(p => p.payment_status === 'paid' && format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, p) => sum + p.amount, 0);
      return { date: format(day, 'MMM dd'), revenue: dayRevenue };
    });
  }, [payments, last30Days]);

  const userGrowthData = useMemo(() => {
    let cumulative = users.filter(u => new Date(u.created_at) < startOfDay(last30Days[0])).length;
    return last30Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const newUsers = users.filter(u => format(new Date(u.created_at), 'yyyy-MM-dd') === dayStr).length;
      cumulative += newUsers;
      return { date: format(day, 'MMM dd'), total: cumulative, new: newUsers };
    });
  }, [users, last30Days]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [tasks]);

  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [tasks]);

  const roleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  // ── Render Guards ────────────────────────────────────
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
            <Button onClick={() => (window.location.href = '/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-futuristic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">{users.filter(u => u.role === 'doer').length} doers · {users.filter(u => u.role === 'client').length} clients</p>
            </CardContent>
          </Card>
          <Card className="card-futuristic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueData.totalTasks}</div>
              <p className="text-xs text-muted-foreground">{tasks.filter(t => t.status === 'open').length} open</p>
            </CardContent>
          </Card>
          <Card className="card-futuristic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{revenueData.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{revenueData.totalPaidTasks} paid tasks</p>
            </CardContent>
          </Card>
          <Card className="card-futuristic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ratings.length > 0 ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : '—'}
              </div>
              <p className="text-xs text-muted-foreground">{ratings.length} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6" onValueChange={() => setCurrentPage(1)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="tasks"><FileText className="h-4 w-4 mr-1.5" />Tasks</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
            <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-1.5" />Revenue</TabsTrigger>
            <TabsTrigger value="ratings"><Star className="h-4 w-4 mr-1.5" />Ratings</TabsTrigger>
          </TabsList>

          {/* ── Analytics Tab ─────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Task Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Tasks Created (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={taskTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="tasks" fill="hsl(195, 100%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />User Growth (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="hsl(195, 100%, 45%)" strokeWidth={2} dot={false} name="Total Users" />
                      <Line type="monotone" dataKey="new" stroke="hsl(270, 85%, 60%)" strokeWidth={2} dot={false} name="New Users" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Task Categories</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Task Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {taskStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">User Roles</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {roleDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Users Tab ─────────────────────────────── */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users Management</CardTitle>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Filter by role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="doer">Doer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
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
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Loading users...</TableCell></TableRow>
                      ) : getFilteredUsers().length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">No users found</TableCell></TableRow>
                      ) : (
                        getPaginatedData(getFilteredUsers()).map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
                            <TableCell>{u.upi_id || 'Not set'}</TableCell>
                            <TableCell className="uppercase">{u.language}</TableCell>
                            <TableCell>{format(new Date(u.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Button variant="destructive" size="sm" onClick={() => openDeleteModal(u.id, u.name)} disabled={u.role === 'admin'}>Delete</Button>
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

          {/* ── Tasks Tab ─────────────────────────────── */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks Overview</CardTitle>
                  <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
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
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Loading tasks...</TableCell></TableRow>
                      ) : getFilteredTasks().length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">No tasks found</TableCell></TableRow>
                      ) : (
                        getPaginatedData(getFilteredTasks()).map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium max-w-xs truncate">{t.title}</TableCell>
                            <TableCell className="capitalize">{t.category.replace(/_/g, ' ')}</TableCell>
                            <TableCell>₹{t.budget.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={t.status === 'completed' ? 'default' : t.status === 'in_progress' ? 'secondary' : t.status === 'open' ? 'outline' : 'destructive'}>
                                {t.status.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="truncate max-w-xs">{t.client_email}</TableCell>
                            <TableCell className="truncate max-w-xs">{t.doer_email || 'Unassigned'}</TableCell>
                            <TableCell>{format(new Date(t.created_at), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payments Tab ──────────────────────────── */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payments Overview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Total: <span className="font-medium">₹{getFilteredPayments().reduce((s, p) => s + p.amount, 0).toLocaleString()}</span>
                </p>
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
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Loading payments...</TableCell></TableRow>
                      ) : getFilteredPayments().length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">No payments found</TableCell></TableRow>
                      ) : (
                        getPaginatedData(getFilteredPayments()).map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-sm">{p.task_id.slice(0, 8)}...</TableCell>
                            <TableCell className="font-medium">₹{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="truncate max-w-xs">{p.client_email}</TableCell>
                            <TableCell className="truncate max-w-xs">{p.doer_email || 'N/A'}</TableCell>
                            <TableCell><Badge variant="outline">UPI</Badge></TableCell>
                            <TableCell><Badge variant={p.payment_status === 'paid' ? 'default' : 'secondary'}>{p.payment_status}</Badge></TableCell>
                            <TableCell>{format(new Date(p.created_at), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Revenue Tab ───────────────────────────── */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenueData.totalTasks}</div>
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
                    {revenueData.totalTasks > 0 ? `${((revenueData.totalPaidTasks / revenueData.totalTasks) * 100).toFixed(1)}%` : '0%'} of total
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Task Value</CardTitle>
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{revenueData.totalPaidTasks > 0 ? (revenueData.totalRevenue / revenueData.totalPaidTasks).toFixed(0) : 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Revenue Trend (Last 30 Days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(195, 100%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(195, 100%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(195, 100%, 45%)" fill="url(#revenueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Ratings Tab ───────────────────────────── */}
          <TabsContent value="ratings">
            <Card>
              <CardHeader><CardTitle>Ratings & Reviews</CardTitle></CardHeader>
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
                        <TableRow><TableCell colSpan={6} className="text-center py-8">Loading ratings...</TableCell></TableRow>
                      ) : ratings.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8">No ratings found</TableCell></TableRow>
                      ) : (
                        getPaginatedData(ratings).map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-sm">{r.task_id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < r.stars ? 'fill-warning text-warning' : 'text-muted'}`} />
                                ))}
                                <span className="ml-1 text-sm">({r.stars})</span>
                              </div>
                            </TableCell>
                            <TableCell>{r.reviewer_name}</TableCell>
                            <TableCell>{r.receiver_name}</TableCell>
                            <TableCell className="max-w-xs truncate">{r.review || 'No review provided'}</TableCell>
                            <TableCell>{format(new Date(r.created_at), 'MMM dd, yyyy')}</TableCell>
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
          <p className="text-sm text-muted-foreground">Showing results with current filters</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= getTotalPages(users.length)}>Next</Button>
          </div>
        </div>

        {/* Delete User Modal */}
        <Dialog open={showDeleteModal} onOpenChange={open => { if (!isDeleting) { setShowDeleteModal(open); if (!open) setDeletionReason(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate User</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate {selectedUserName}? Their data will be preserved for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Reason for deactivation <span className="text-destructive">*</span></label>
              <textarea className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background" placeholder="Please provide a reason (minimum 10 characters)..." value={deletionReason} onChange={e => setDeletionReason(e.target.value)} disabled={isDeleting} />
              <p className="text-xs text-muted-foreground mt-1">This reason will be logged for audit purposes.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting || deletionReason.trim().length < 10}>
                {isDeleting ? 'Deactivating...' : 'Deactivate User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
