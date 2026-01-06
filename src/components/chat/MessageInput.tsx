import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Loader2, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Attachment } from '@/hooks/useChatRoom';

interface MessageInputProps {
  onSend: (content: string, attachments?: Attachment[]) => Promise<void>;
  onUpload: (file: File) => Promise<Attachment | null>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, onUpload, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    try {
      await onSend(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    } catch (error) {
      logger.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const attachment = await onUpload(file);
    setUploading(false);

    if (attachment) {
      setAttachments((prev) => [...prev, attachment]);
      toast({
        title: 'File uploaded',
        description: 'Your file has been attached',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = (type: string) => type.startsWith('image/');

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-background p-4">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm max-w-[200px]"
            >
              {isImage(attachment.type) ? (
                <Image className="w-3 h-3 flex-shrink-0" />
              ) : (
                <FileText className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="truncate">{attachment.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="hover:text-destructive flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-32 resize-none"
          disabled={disabled}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size="icon"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
