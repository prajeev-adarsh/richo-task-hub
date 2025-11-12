import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useUser } from '@/components/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export default function ChatRoom() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [taskTitle, setTaskTitle] = useState('');

  const {
    room,
    messages,
    loading,
    sending,
    sendMessage,
    uploadAttachment,
  } = useChatRoom(taskId!);

  // Fetch task title
  useEffect(() => {
    const fetchTaskTitle = async () => {
      if (!taskId) return;
      const { data } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();

      if (data) setTaskTitle(data.title);
    };

    fetchTaskTitle();
  }, [taskId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">
          Chat room not available. Task must be assigned first.
        </p>
        <Button onClick={() => navigate(`/task/${taskId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Task
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-6">
        <Card className="flex flex-col h-[calc(100vh-8rem)]">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/task/${taskId}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{taskTitle}</h2>
                <p className="text-sm text-muted-foreground">Task Chat</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  💬
                </div>
                <h3 className="font-semibold mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start the conversation with your {user?.role === 'client' ? 'doer' : 'client'}
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === user?.id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          <MessageInput
            onSend={sendMessage}
            onUpload={uploadAttachment}
            disabled={sending}
          />
        </Card>
      </div>
    </div>
  );
}
