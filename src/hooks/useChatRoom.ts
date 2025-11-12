import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  attachments: string[] | null;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

export interface ChatRoom {
  id: string;
  task_id: string;
  client_id: string;
  doer_id: string;
  created_at: string;
}

export const useChatRoom = (taskId: string) => {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  // Fetch or create chat room
  useEffect(() => {
    const initChatRoom = async () => {
      if (!user) return;

      try {
        // First, check if room exists
        const { data: existingRoom, error: fetchError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('task_id', taskId)
          .single();

        if (existingRoom) {
          setRoom(existingRoom);
        } else if (fetchError?.code === 'PGRST116') {
          // Room doesn't exist, try to create it
          // Need to get task details first
          const { data: task } = await supabase
            .from('tasks')
            .select('client_id, doer_id')
            .eq('id', taskId)
            .single();

          if (task?.doer_id) {
            const { data: newRoom, error: createError } = await supabase
              .from('chat_rooms')
              .insert({
                task_id: taskId,
                client_id: task.client_id,
                doer_id: task.doer_id,
              })
              .select()
              .single();

            if (createError) throw createError;
            setRoom(newRoom);
          }
        } else {
          throw fetchError;
        }
      } catch (error: any) {
        console.error('Error initializing chat room:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat room',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    initChatRoom();
  }, [taskId, user, toast]);

  // Fetch messages
  useEffect(() => {
    if (!room) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, name, photo_url)
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        async (payload) => {
          // Fetch sender details
          const { data: sender } = await supabase
            .from('users')
            .select('id, name, photo_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender,
          } as Message;

          setMessages((prev) => [...prev, newMessage]);

          // Mark as read if not sender
          if (sender?.id !== user?.id && !payload.new.read) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, user, toast]);

  const sendMessage = async (content: string, attachments?: string[]) => {
    if (!room || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        room_id: room.id,
        sender_id: user.id,
        content,
        attachments: attachments || null,
        read: false,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    room,
    messages,
    loading,
    sending,
    sendMessage,
    uploadAttachment,
  };
};
