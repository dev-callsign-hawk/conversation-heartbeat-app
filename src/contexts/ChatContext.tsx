
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: string | null;
  messages: Message[];
  onlineUsers: string[];
  typingUsers: string[];
  sendMessage: (receiverId: string, content: string) => void;
  setCurrentConversation: (conversationId: string | null) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>(['1', '2', '3']);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Mock data initialization
  useEffect(() => {
    if (user) {
      const mockConversations: Conversation[] = [
        {
          id: 'conv_1',
          participants: [user.id, '1'],
          lastMessage: {
            id: 'msg_1',
            senderId: '1',
            receiverId: user.id,
            content: 'Hey there! How are you doing?',
            timestamp: new Date(Date.now() - 300000),
            read: false
          },
          unreadCount: 1
        },
        {
          id: 'conv_2',
          participants: [user.id, '2'],
          lastMessage: {
            id: 'msg_2',
            senderId: user.id,
            receiverId: '2',
            content: 'Thanks for the help earlier!',
            timestamp: new Date(Date.now() - 600000),
            read: true
          },
          unreadCount: 0
        }
      ];
      
      setConversations(mockConversations);
      
      const mockMessages: Message[] = [
        {
          id: 'msg_1',
          senderId: '1',
          receiverId: user.id,
          content: 'Hey there! How are you doing?',
          timestamp: new Date(Date.now() - 300000),
          read: false
        },
        {
          id: 'msg_3',
          senderId: user.id,
          receiverId: '1',
          content: 'I\'m doing great! Thanks for asking. How about you?',
          timestamp: new Date(Date.now() - 200000),
          read: true
        },
        {
          id: 'msg_4',
          senderId: '1',
          receiverId: user.id,
          content: 'Awesome! I\'m doing well too. Just working on some exciting projects.',
          timestamp: new Date(Date.now() - 100000),
          read: false
        }
      ];
      
      setMessages(mockMessages);
    }
  }, [user]);

  const sendMessage = (receiverId: string, content: string) => {
    if (!user) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      receiverId,
      content,
      timestamp: new Date(),
      read: false
    };

    setMessages(prev => [...prev, newMessage]);

    // Update conversation
    setConversations(prev => 
      prev.map(conv => 
        conv.participants.includes(receiverId) 
          ? { ...conv, lastMessage: newMessage }
          : conv
      )
    );

    // Simulate typing indicator
    setTimeout(() => {
      setTypingUsers(prev => [...prev, receiverId]);
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== receiverId));
        
        // Simulate auto-reply
        const autoReply: Message = {
          id: `msg_${Date.now() + 1}`,
          senderId: receiverId,
          receiverId: user.id,
          content: generateAutoReply(content),
          timestamp: new Date(),
          read: false
        };
        
        setMessages(prev => [...prev, autoReply]);
        setConversations(prev => 
          prev.map(conv => 
            conv.participants.includes(receiverId) 
              ? { ...conv, lastMessage: autoReply, unreadCount: conv.unreadCount + 1 }
              : conv
          )
        );
      }, 2000);
    }, 500);
  };

  const generateAutoReply = (originalMessage: string): string => {
    const replies = [
      "That's interesting! Tell me more.",
      "I completely agree with you!",
      "Thanks for sharing that.",
      "That sounds really cool!",
      "I'm glad to hear that.",
      "Wow, that's amazing!",
      "I see what you mean.",
      "That makes total sense.",
    ];
    
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const startTyping = (conversationId: string) => {
    // In a real app, this would emit a socket event
    console.log(`Started typing in ${conversationId}`);
  };

  const stopTyping = (conversationId: string) => {
    // In a real app, this would emit a socket event
    console.log(`Stopped typing in ${conversationId}`);
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      currentConversation,
      messages,
      onlineUsers,
      typingUsers,
      sendMessage,
      setCurrentConversation,
      startTyping,
      stopTyping
    }}>
      {children}
    </ChatContext.Provider>
  );
};
