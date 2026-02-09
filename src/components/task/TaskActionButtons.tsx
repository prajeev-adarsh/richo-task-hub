import React from 'react';
import { Users, FileText, CheckCircle, Upload, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TaskActionButtonsProps {
  taskStatus: string;
  userRole: 'client' | 'doer' | 'admin' | null;
  isTaskOwner: boolean;
  isAssignedDoer: boolean;
  hasApplied: boolean;
  applicationStatus?: string;
  applying?: boolean;
  onViewApplicants?: () => void;
  onSubmitProof?: () => void;
  onViewProof?: () => void;
  onMarkComplete?: () => void;
  onApply?: () => void;
  onOpenChat?: () => void;
  applicantCount?: number;
  hasProof?: boolean;
}

const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  taskStatus,
  userRole,
  isTaskOwner,
  isAssignedDoer,
  hasApplied,
  applicationStatus,
  applying = false,
  onViewApplicants,
  onSubmitProof,
  onViewProof,
  onMarkComplete,
  onApply,
  onOpenChat,
  applicantCount = 0,
  hasProof = false
}) => {
  // Client view
  if (userRole === 'client' && isTaskOwner) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {/* View applicants - available when task is open */}
          {taskStatus === 'open' && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onViewApplicants}
            >
              <Users className="h-4 w-4 mr-2" />
              View Applicants
              {applicantCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                  {applicantCount}
                </span>
              )}
            </Button>
          )}

          {/* View proof - available when task is in progress and proof exists */}
          {taskStatus === 'in_progress' && hasProof && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onViewProof}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Submitted Proof
            </Button>
          )}

          {/* Mark complete - available when task is in progress */}
          {taskStatus === 'in_progress' && (
            <Button
              className="w-full justify-start"
              onClick={onMarkComplete}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}

          {/* Chat with doer */}
          {(taskStatus === 'in_progress' || taskStatus === 'assigned') && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onOpenChat}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat with Doer
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Doer view
  if (userRole === 'doer') {
    // If assigned to task
    if (isAssignedDoer && taskStatus === 'in_progress') {
      return (
        <Card>
          <CardContent className="p-4 space-y-2">
            {/* Submit proof */}
            {!hasProof && (
              <Button
                className="w-full justify-start"
                onClick={onSubmitProof}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Proof
              </Button>
            )}

            {hasProof && (
              <Button
                variant="secondary"
                className="w-full justify-start"
                disabled
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Proof Submitted
              </Button>
            )}

            {/* Chat with client */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onOpenChat}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat with Client
            </Button>
          </CardContent>
        </Card>
      );
    }

    // If can apply
    if (taskStatus === 'open' && !hasApplied) {
      return (
        <Card>
          <CardContent className="p-4">
            <Button
              className="w-full"
              size="lg"
              onClick={onApply}
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply for this Task'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // If already applied
    if (hasApplied) {
      return (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-2">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium">Application Submitted</p>
              <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize">{applicationStatus}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Admin view (can see everything)
  if (userRole === 'admin') {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={onViewApplicants}>
            <Users className="h-4 w-4 mr-2" />
            View Applicants ({applicantCount})
          </Button>
          {hasProof && (
            <Button variant="outline" className="w-full justify-start" onClick={onViewProof}>
              <FileText className="h-4 w-4 mr-2" />
              View Proof
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default TaskActionButtons;
