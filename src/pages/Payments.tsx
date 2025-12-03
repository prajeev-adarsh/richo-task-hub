import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/UserContext';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Search, Filter, Download, CreditCard, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

const Payments = () => {
  const { isAuthenticated, isLoading, user } = useUser();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    thisMonth: 0,
    pending: 0,
  });

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      // Fetch payments based on user role
      let query = supabase
        .from('payments')
        .select(`
          *,
          task:tasks(title, category)
        `)
        .order('created_at', { ascending: false });

      if (user.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user.role === 'doer') {
        query = query.eq('doer_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPayments(data || []);

      // Calculate stats
      const total = data?.filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0) || 0;
      
      const thisMonth = data?.filter(p => {
        const date = new Date(p.created_at);
        const now = new Date();
        return p.payment_status === 'paid' && 
               date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear();
      }).reduce((sum, p) => sum + p.amount, 0) || 0;

      const pending = data?.filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

      setStats({ totalPaid: total, thisMonth, pending });
    } catch (error) {
      logger.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div>Please log in to view payments</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment History</h1>
          <p className="text-muted-foreground">Track your payments and transaction history</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search transactions..." className="pl-10" />
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.thisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.pending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{payments.filter(p => p.payment_status === 'pending').length} transaction(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your payment history and transaction details</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <div key={payment.id}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
                      <div className="flex-1">
                        <h3 className="font-medium">{payment.task?.title || 'Task'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_mode === 'upi_manual' ? 'UPI' : 'Razorpay'}
                          {payment.razorpay_payment_id && ` • ${payment.razorpay_payment_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(payment.payment_status)}>
                          {payment.payment_status}
                        </Badge>
                        <div className="text-right">
                          <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    {index < payments.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Payments;