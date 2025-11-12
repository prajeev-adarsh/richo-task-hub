import { format } from 'date-fns';
import { CheckCheck, Check, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useChatRoom';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2',
        isOwn && 'flex-row-reverse'
      )}
    >
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src={message.sender?.photo_url || undefined} />
        <AvatarFallback className="text-xs">
          {message.sender?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1">
            {message.sender?.name}
          </span>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2 shadow-sm',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs hover:underline"
                >
                  <Paperclip className="w-3 h-3" />
                  Attachment {idx + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOwn && (
            <>
              {message.read ? (
                <CheckCheck className="w-3 h-3 text-primary" />
              ) : (
                <Check className="w-3 h-3 text-muted-foreground" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
