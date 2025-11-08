import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['student', 'skilled', 'ai', 'custom']),
  location: z.string().min(1, 'Location is required'),
  is_remote: z.boolean().default(false),
  budget: z.number().min(1, 'Budget must be greater than 0'),
  deadline: z.date(),
  proof_required: z.boolean().default(false),
  pay_online: z.boolean().default(false),
});

type TaskFormData = z.infer<typeof taskSchema>;

const PostTask = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      is_remote: false,
      budget: 0,
      proof_required: false,
      pay_online: false,
    },
  });

  const initializeRazorpayPayment = (taskId: string, amount: number) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo';
    
    const options = {
      key: razorpayKey,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      name: 'Task Payment',
      description: 'Payment for posted task',
      handler: async (response: any) => {
        try {
          // Verify payment and update database
          const { error } = await supabase.functions.invoke('verify-payment', {
            body: {
              razorpay_payment_id: response.razorpay_payment_id,
              task_id: taskId,
              client_id: user?.id,
              amount: amount
            }
          });

          if (error) throw error;

          toast({
            title: "🎉 Payment Successful!",
            description: "Your task has been posted and payment completed",
          });

          navigate('/my-tasks');
        } catch (error) {
          console.error('Payment verification failed:', error);
          toast({
            title: "Payment Error",
            description: "Payment verification failed. Please contact support.",
            variant: "destructive",
          });
        }
      },
      prefill: {
        email: user?.email,
        name: user?.name,
      },
      theme: {
        color: '#3B82F6',
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to post a task",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: taskData, error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        is_remote: data.is_remote,
        budget: data.budget,
        deadline: data.deadline.toISOString(),
        proof_required: data.proof_required,
        client_id: user.id,
        payment_status: data.pay_online ? 'paid' : 'unpaid',
      }).select().single();

      if (error) throw error;

      if (data.pay_online) {
        // Initiate Razorpay payment
        initializeRazorpayPayment(taskData.id, data.budget);
      } else {
        toast({
          title: "🎉 Task Posted Successfully",
          description: "Your task has been posted and is now visible to doers",
        });
        navigate('/my-tasks');
      }
    } catch (error) {
      console.error('Error posting task:', error);
      toast({
        title: "Error",
        description: "Failed to post task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Post a New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your task in detail..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="skilled">Skilled</SelectItem>
                          <SelectItem value="ai">AI</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City/Town/Area" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_remote"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Remote Work Allowed</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Can this task be done remotely?
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Enter budget amount"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP 'at' p")
                              ) : (
                                <span>Pick deadline date & time</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proof_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Proof Required?
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Require the doer to provide proof of completion
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pay_online"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Pay Now Online via Razorpay
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Pay the task amount upfront using Razorpay gateway
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  {form.watch('pay_online') ? 'Post Task & Pay Now' : 'Post Task'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostTask;