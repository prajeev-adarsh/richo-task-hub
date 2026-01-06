import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface Attachment {
  url: string;
  name: string;
  type: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  attachments: Attachment[] | null;
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
        logger.error('Error initializing chat room:', error);
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
        logger.error('Error fetching messages:', error);
        return;
      }

      // Transform database records to Message type
      const transformedMessages: Message[] = (data || []).map((msg) => ({
        ...msg,
        attachments: msg.attachments as unknown as Attachment[] | null,
      }));

      setMessages(transformedMessages);
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
          // Fetch sender details using RPC function (only safe fields)
          const { data: senderData } = await supabase
            .rpc('get_public_profile', { _user_id: payload.new.sender_id });

          const sender = senderData?.[0] || null;

          const newMessage: Message = {
            id: payload.new.id,
            room_id: payload.new.room_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            attachments: payload.new.attachments as Attachment[] | null,
            read: payload.new.read,
            created_at: payload.new.created_at,
            sender: sender ? {
              id: sender.id,
              name: sender.name,
              photo_url: sender.photo_url
            } : undefined,
          };

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

  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!room || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        room_id: room.id,
        sender_id: user.id,
        content,
        attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : null,
        read: false,
      });

      if (error) throw error;
    } catch (error: any) {
      logger.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const uploadAttachment = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!user || !room) return null;

    try {
      const fileExt = file.name.split('.').pop();
      // Use room.id as folder to match RLS policy: {room_id}/{filename}
      const fileName = `${room.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Use signed URL for private bucket (1 hour expiry)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(data.path, 3600);

      if (signedError) throw signedError;

      return {
        url: signedData.signedUrl,
        name: file.name,
        type: file.type,
      };
    } catch (error: any) {
      logger.error('Error uploading attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    }
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(path, 3600);
    
    if (error) return null;
    return data.signedUrl;
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
