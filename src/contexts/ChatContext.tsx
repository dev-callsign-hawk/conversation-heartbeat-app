
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  type: string;
  name?: string;
  created_at: string;
  updated_at: string;
  conversation_participants: {
    user_id: string;
    profiles: {
      id: string;
      username: string;
      email: string;
      avatar_url?: string;
      status: string;
    };
  }[];
  messages: Message[];
}

interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: string | null;
  messages: Message[];
  users: Profile[];
  typingUsers: string[];
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  startConversation: (userId: string) => Promise<void>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  isLoading: boolean;
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch all users
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Fetch conversations when user logs in
  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscription();
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Map the data to ensure proper typing
      const typedUsers: Profile[] = (data || []).map(item => ({
        id: item.id,
        username: item.username,
        email: item.email,
        avatar_url: item.avatar_url,
        status: (item.status as 'online' | 'offline' | 'away') || 'offline',
        last_seen: item.last_seen,
      }));

      setUsers(typedUsers);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants(
            user_id,
            profiles(id, username, email, avatar_url, status)
          ),
          messages(
            id,
            content,
            created_at,
            sender_id,
            conversation_id,
            message_type,
            profiles(username, avatar_url)
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Map the data to ensure proper typing
      const typedConversations: Conversation[] = (data || []).map(conv => ({
        id: conv.id,
        type: conv.type,
        name: conv.name,
        created_at: conv.created_at || new Date().toISOString(),
        updated_at: conv.updated_at || new Date().toISOString(),
        conversation_participants: conv.conversation_participants || [],
        messages: (conv.messages || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 1)
          .map((msg: any) => ({
            id: msg.id,
            conversation_id: msg.conversation_id || conv.id,
            sender_id: msg.sender_id,
            content: msg.content,
            message_type: msg.message_type || 'text',
            created_at: msg.created_at,
            profiles: msg.profiles || { username: 'Unknown', avatar_url: null }
          }))
      }));

      setConversations(typedConversations);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Map the data to ensure proper typing
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type || 'text',
        created_at: msg.created_at,
        profiles: msg.profiles || { username: 'Unknown', avatar_url: null }
      }));

      setMessages(typedMessages);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const newChannel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message:', payload);
          if (payload.new.conversation_id === currentConversation) {
            fetchMessages(currentConversation);
          }
          fetchConversations(); // Update conversation list with new message
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile updated:', payload);
          fetchUsers(); // Update user statuses
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators'
        },
        (payload) => {
          console.log('Typing indicator changed:', payload);
          // Handle typing indicators
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (err) {
      console.error('Error in sendMessage:', err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: otherUserId
      });

      if (error) {
        console.error('Error starting conversation:', error);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setCurrentConversation(data);
        await fetchConversations(); // Refresh conversations
        toast({
          title: "Conversation started",
          description: "You can now start chatting!",
        });
      }
    } catch (err) {
      console.error('Error in startConversation:', err);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startTyping = async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: true,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error in startTyping:', err);
    }
  };

  const stopTyping = async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: false,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error in stopTyping:', err);
    }
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      currentConversation,
      messages,
      users,
      typingUsers,
      sendMessage,
      setCurrentConversation,
      startConversation,
      startTyping,
      stopTyping,
      isLoading
    }}>
      {children}
    </ChatContext.Provider>
  );
};
