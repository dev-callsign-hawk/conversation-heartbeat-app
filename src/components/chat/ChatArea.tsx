
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  Circle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';

const mockUsers = [
  { id: '1', username: 'Alice Johnson', email: 'alice@example.com', status: 'online' as const },
  { id: '2', username: 'Bob Smith', email: 'bob@example.com', status: 'away' as const },
  { id: '3', username: 'Charlie Brown', email: 'charlie@example.com', status: 'online' as const },
];

export const ChatArea: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentConversation, 
    messages, 
    conversations, 
    sendMessage, 
    typingUsers,
    startTyping,
    stopTyping
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current conversation details
  const currentConv = conversations.find(conv => conv.id === currentConversation);
  const otherUserId = currentConv?.participants.find(id => id !== user?.id);
  const otherUser = mockUsers.find(u => u.id === otherUserId);

  // Filter messages for current conversation
  const conversationMessages = messages.filter(msg => {
    if (!currentConv) return false;
    return currentConv.participants.includes(msg.senderId) && 
           currentConv.participants.includes(msg.receiverId);
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId) return;

    sendMessage(otherUserId, newMessage.trim());
    setNewMessage('');
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (currentConversation) {
      stopTyping(currentConversation);
    }
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

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  if (!currentConversation || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-50/50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 chat-gradient rounded-2xl flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">
              Welcome to Lovable Chat
            </h3>
            <p className="text-gray-500 mt-2">
              Select a conversation to start chatting
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
                {otherUser.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(otherUser.status)}`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{otherUser.username}</h2>
            <p className="text-sm text-muted-foreground capitalize">
              {otherUser.status}
              {typingUsers.includes(otherUserId!) && (
                <span className="text-blue-600 animate-pulse-soft"> • typing...</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/20 to-blue-50/20">
        {conversationMessages.map((message) => {
          const isOwn = message.senderId === user?.id;
          const sender = mockUsers.find(u => u.id === message.senderId);
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {!isOwn && (
                  <Avatar className="w-8 h-8 mb-1">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-xs">
                      {sender?.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl relative group ${
                    isOwn
                      ? 'message-gradient text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className={`flex items-center justify-end mt-1 space-x-1 ${
                    isOwn ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    <span className="text-xs">
                      {formatTime(message.timestamp)}
                    </span>
                    {isOwn && (
                      <div className="flex space-x-1">
                        <Circle className="w-2 h-2 fill-current" />
                        {message.read && <Circle className="w-2 h-2 fill-current" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing Indicator */}
        {typingUsers.includes(otherUserId!) && (
          <div className="flex justify-start">
            <div className="flex items-end space-x-2 max-w-[70%]">
              <Avatar className="w-8 h-8 mb-1">
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-xs">
                  {otherUser.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-gray-200 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-subtle"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-subtle" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-subtle" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" type="button">
            <Paperclip className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="pr-10 rounded-full bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
            <Button variant="ghost" size="sm" type="button" className="absolute right-1 top-1/2 transform -translate-y-1/2">
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            type="submit" 
            size="sm" 
            className="chat-gradient hover:opacity-90 transition-opacity rounded-full w-10 h-10 p-0"
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
