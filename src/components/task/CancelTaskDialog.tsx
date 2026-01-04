import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CancelTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    doer_id: string | null;
  } | null;
  onSuccess: () => void;
}

const CancelTaskDialog = ({ open, onOpenChange, task, onSuccess }: CancelTaskDialogProps) => {
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!task) return;

    setCancelling(true);
    try {
      // Update task status to cancelled
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', task.id);

      if (taskError) throw taskError;

      // If there's an assigned doer, send them a notification
      if (task.doer_id) {
        const { error: notifyError } = await supabase.rpc('create_notification', {
          p_user_id: task.doer_id,
          p_type: 'task_assigned', // Using existing type for task-related notifications
          p_title: 'Task Cancelled',
          p_message: `The task "${task.title}" has been cancelled by the client.${reason ? ` Reason: ${reason}` : ''}`,
          p_payload: { task_id: task.id, reason: reason || null, cancelled: true }
        });

        if (notifyError) {
          logger.error('Error sending cancellation notification:', notifyError);
        }
      }

      toast({
        title: "Task cancelled",
        description: task.doer_id ? "The assigned doer has been notified" : "Task has been cancelled",
      });

      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      logger.error('Error cancelling task:', error);
      toast({
        title: "Error",
        description: "Failed to cancel task",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Task
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel "{task?.title}"? This action cannot be undone.
            {task?.doer_id && " The assigned doer will be notified of the cancellation."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Please provide a reason for cancelling this task..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={cancelling}
            className="min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            Keep Task
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Task'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelTaskDialog;
