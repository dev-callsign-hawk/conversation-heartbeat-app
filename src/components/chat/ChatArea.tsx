import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { EmojiPicker } from './EmojiPicker';

export const ChatArea: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentConversation, 
    messages, 
    conversations, 
    sendMessage, 
    startTyping,
    stopTyping
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current conversation details
  const currentConv = conversations.find(conv => conv.id === currentConversation);
  const otherParticipant = currentConv?.conversation_participants.find(p => p.user_id !== user?.id);
  const otherUser = otherParticipant?.profiles;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto focus input when conversation changes
  useEffect(() => {
    if (currentConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (currentConversation) {
      stopTyping(currentConversation);
    }

    await sendMessage(currentConversation, messageContent);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && currentConversation) {
      setIsTyping(true);
      startTyping(currentConversation);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (currentConversation) {
        stopTyping(currentConversation);
      }
    }, 1000);
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPosition = inputRef.current?.selectionStart || newMessage.length;
    const textBefore = newMessage.substring(0, cursorPosition);
    const textAfter = newMessage.substring(cursorPosition);
    const newText = textBefore + emoji + textAfter;
    
    setNewMessage(newText);
    
    // Focus back to input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition = cursorPosition + emoji.length;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatMessageWithEmojis = (content: string) => {
    // Simple emoji rendering - in a real app you might want a more sophisticated solution
    return content;
  };

  if (!currentConversation || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-50/50">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 chat-gradient rounded-2xl flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">
              Welcome to Lovable Chat
            </h3>
            <p className="text-gray-500 mt-2 max-w-md">
              Select a conversation from the sidebar or go to Friends tab to start a new conversation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {otherUser.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(otherUser.status)}`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{otherUser.username}</h2>
            <p className="text-sm text-muted-foreground capitalize">
              {otherUser.status}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" title="Voice Call">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Video Call">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="More Options">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50/20 to-blue-50/20">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">
                  No messages yet
                </p>
                <p className="text-gray-400 text-sm">
                  Start the conversation with {otherUser.username}!
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div className={`flex items-end space-x-2 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {showAvatar && !isOwn && (
                      <Avatar className="w-8 h-8 mb-1">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-xs">
                          {message.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!showAvatar && !isOwn && <div className="w-8" />}
                    
                    <div
                      className={`px-4 py-2 rounded-2xl relative group max-w-full ${
                        isOwn
                          ? 'message-gradient text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {formatMessageWithEmojis(message.content)}
                      </p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isOwn ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {formatTime(message.created_at)}
                        </span>
                        {isOwn && (
                          <div className="flex space-x-1">
                            <CheckCheck className="w-3 h-3 fill-current" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" type="button" title="Attach File">
            <Paperclip className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder={`Message ${otherUser.username}...`}
              className="pr-12 rounded-full bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              maxLength={1000}
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
          </div>
          <Button 
            type="submit" 
            size="sm" 
            className="chat-gradient hover:opacity-90 transition-opacity rounded-full w-10 h-10 p-0"
            disabled={!newMessage.trim()}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
