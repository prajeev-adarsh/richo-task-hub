import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, CheckCircle, FileText, UserPlus, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimelineEvent {
  id: string;
  type: 'created' | 'application' | 'assigned' | 'proof' | 'completed' | 'payment';
  timestamp: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface TaskTimelineProps {
  taskId: string;
  taskCreatedAt: string;
  taskStatus: string;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({ taskId, taskCreatedAt, taskStatus }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineEvents();
  }, [taskId]);

  const fetchTimelineEvents = async () => {
    try {
      const timeline: TimelineEvent[] = [];

      // Task created
      timeline.push({
        id: 'created',
        type: 'created',
        timestamp: taskCreatedAt,
        description: 'Task created',
        icon: <Calendar className="h-4 w-4" />,
        color: 'text-blue-600'
      });

      // Fetch applications
      const { data: applications } = await supabase
        .from('task_applications')
        .select('id, applied_at, status')
        .eq('task_id', taskId)
        .order('applied_at', { ascending: true });

      if (applications && applications.length > 0) {
        timeline.push({
          id: 'applications',
          type: 'application',
          timestamp: applications[0].applied_at,
          description: `${applications.length} application${applications.length > 1 ? 's' : ''} received`,
          icon: <UserPlus className="h-4 w-4" />,
          color: 'text-purple-600'
        });
      }

      // Fetch task assignment
      const { data: taskData } = await supabase
        .from('tasks')
        .select('doer_id, status, created_at')
        .eq('id', taskId)
        .single();

      if (taskData?.doer_id) {
        timeline.push({
          id: 'assigned',
          type: 'assigned',
          timestamp: taskCreatedAt, // Approximate - would need updated_at to be more accurate
          description: 'Task assigned to doer',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-600'
        });
      }

      // Fetch proof submissions
      const { data: proofs } = await supabase
        .from('proof_submissions')
        .select('id, submitted_at, status')
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (proofs && proofs.length > 0) {
        timeline.push({
          id: 'proof',
          type: 'proof',
          timestamp: proofs[0].submitted_at,
          description: `Proof ${proofs[0].status}`,
          icon: <FileText className="h-4 w-4" />,
          color: proofs[0].status === 'accepted' ? 'text-green-600' : 'text-orange-600'
        });
      }

      // Check if completed
      if (taskStatus === 'completed') {
        timeline.push({
          id: 'completed',
          type: 'completed',
          timestamp: new Date().toISOString(), // Would need actual completion timestamp
          description: 'Task completed',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-600'
        });
      }

      // Fetch payment
      const { data: payments } = await supabase
        .from('payments')
        .select('id, created_at, payment_status')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (payments && payments.length > 0) {
        timeline.push({
          id: 'payment',
          type: 'payment',
          timestamp: payments[0].created_at,
          description: `Payment ${payments[0].payment_status}`,
          icon: <DollarSign className="h-4 w-4" />,
          color: 'text-green-600'
        });
      }

      // Sort by timestamp
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setEvents(timeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-sm">Loading timeline...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          {events.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-3 pl-8">
              {/* Timeline dot */}
              <div className={`absolute left-0 rounded-full p-1.5 bg-background border-2 ${event.color} border-current`}>
                {event.icon}
              </div>

              <div className="flex-1 pt-1">
                <p className="text-sm font-medium">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskTimeline;
