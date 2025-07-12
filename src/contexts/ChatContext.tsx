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

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender_profile: Profile;
  receiver_profile: Profile;
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: string | null;
  messages: Message[];
  friends: Profile[];
  friendRequests: FriendRequest[];
  pendingRequests: FriendRequest[];
  typingUsers: string[];
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  startConversation: (userId: string) => Promise<string | null>;
  sendFriendRequest: (userId: string) => Promise<void>;
  sendFriendRequestByInvite: (inviteCode: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  generateInviteCode: () => Promise<string | null>;
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
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Update user status to online when they login
  useEffect(() => {
    if (user) {
      updateUserStatus('online');
      fetchFriends();
      fetchFriendRequests();
    }

    // Set user to offline when they leave/close the app
    const handleBeforeUnload = () => {
      if (user) {
        updateUserStatus('offline');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (user) {
        updateUserStatus('offline');
      }
    };
  }, [user]);

  const updateUserStatus = async (status: 'online' | 'offline' | 'away') => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_user_status', {
        user_status: status
      });

      if (error) {
        console.error('Error updating user status:', error);
      }
    } catch (err) {
      console.error('Error in updateUserStatus:', err);
    }
  };

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

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_friends');

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      const typedFriends: Profile[] = (data || []).map(item => ({
        id: item.id,
        username: item.username,
        email: item.email,
        avatar_url: item.avatar_url,
        status: (item.status as 'online' | 'offline' | 'away') || 'offline',
        last_seen: item.last_seen,
      }));

      setFriends(typedFriends);
    } catch (err) {
      console.error('Error in fetchFriends:', err);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender_profile:profiles!friend_requests_sender_id_fkey(*),
          receiver_profile:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`);

      if (error) {
        console.error('Error fetching friend requests:', error);
        return;
      }

      const typedRequests: FriendRequest[] = (data || []).map(req => ({
        id: req.id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status as 'pending' | 'accepted' | 'rejected',
        created_at: req.created_at,
        sender_profile: {
          id: req.sender_profile.id,
          username: req.sender_profile.username,
          email: req.sender_profile.email,
          avatar_url: req.sender_profile.avatar_url,
          status: (req.sender_profile.status as 'online' | 'offline' | 'away') || 'offline',
          last_seen: req.sender_profile.last_seen,
        },
        receiver_profile: {
          id: req.receiver_profile.id,
          username: req.receiver_profile.username,
          email: req.receiver_profile.email,
          avatar_url: req.receiver_profile.avatar_url,
          status: (req.receiver_profile.status as 'online' | 'offline' | 'away') || 'offline',
          last_seen: req.receiver_profile.last_seen,
        }
      }));

      const received = typedRequests.filter(req => req.receiver_id === user?.id && req.status === 'pending');
      const sent = typedRequests.filter(req => req.sender_id === user?.id && req.status === 'pending');

      setFriendRequests(received);
      setPendingRequests(sent);
    } catch (err) {
      console.error('Error in fetchFriendRequests:', err);
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
        toast({
          title: "Error loading conversations",
          description: "Please refresh the page or try again later.",
          variant: "destructive",
        });
        return;
      }

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

      console.log('Fetched conversations:', typedConversations);
      setConversations(typedConversations);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
      toast({
        title: "Network error",
        description: "Could not load conversations. Please check your connection.",
        variant: "destructive",
      });
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
        toast({
          title: "Error loading messages",
          description: "Could not load conversation messages.",
          variant: "destructive",
        });
        return;
      }

      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type || 'text',
        created_at: msg.created_at,
        profiles: msg.profiles || { username: 'Unknown', avatar_url: null }
      }));

      console.log('Fetched messages for conversation:', conversationId, typedMessages);
      setMessages(typedMessages);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
      toast({
        title: "Network error",
        description: "Could not load messages. Please check your connection.",
        variant: "destructive",
      });
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
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          
          // If message is for current conversation, refresh messages
          if (newMessage.conversation_id === currentConversation) {
            fetchMessages(currentConversation);
          }
          
          // Always refresh conversations to update last message preview
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants'
        },
        (payload) => {
          console.log('New conversation participant:', payload);
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        (payload) => {
          console.log('Friend request changed:', payload);
          fetchFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        (payload) => {
          console.log('Friendship changed:', payload);
          fetchFriends();
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
          fetchFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

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

  const startConversation = async (friendId: string): Promise<string | null> => {
    if (!user) return null;
    
    console.log('Starting conversation with friend:', friendId);

    try {
      setIsLoading(true);
      
      // First, get or create the conversation
      const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: friendId
      });

      if (error) {
        console.error('Error starting conversation:', error);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      if (conversationId) {
        console.log('Conversation created/found:', conversationId);
        
        // Refresh conversations to get the latest data
        await fetchConversations();
        
        // Wait a short moment for the state to update, then set current conversation
        setTimeout(() => {
          setCurrentConversation(conversationId);
        }, 100);
        
        toast({
          title: "Conversation started!",
          description: "You can now start chatting.",
        });
        
        return conversationId;
      }
      
      return null;
    } catch (err) {
      console.error('Error in startConversation:', err);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: userId
        });

      if (error) {
        console.error('Error sending friend request:', error);
        toast({
          title: "Error",
          description: "Failed to send friend request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully.",
      });

      fetchFriendRequests();
    } catch (err) {
      console.error('Error in sendFriendRequest:', err);
    }
  };

  const sendFriendRequestByInvite = async (inviteCode: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('send_friend_request_by_invite', {
        invite_code: inviteCode
      });

      if (error) {
        console.error('Error sending friend request by invite:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to send friend request.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully.",
      });

      fetchFriendRequests();
    } catch (err) {
      console.error('Error in sendFriendRequestByInvite:', err);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) {
        console.error('Error accepting friend request:', error);
        toast({
          title: "Error",
          description: "Failed to accept friend request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Friend request accepted!",
        description: "You are now friends and can start chatting.",
      });

      fetchFriends();
      fetchFriendRequests();
    } catch (err) {
      console.error('Error in acceptFriendRequest:', err);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting friend request:', error);
        toast({
          title: "Error",
          description: "Failed to reject friend request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Friend request rejected",
        description: "The friend request has been rejected.",
      });

      fetchFriendRequests();
    } catch (err) {
      console.error('Error in rejectFriendRequest:', err);
    }
  };

  const generateInviteCode = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const inviteCode = Math.random().toString(36).substring(2, 15);
      
      const { error } = await supabase
        .from('profiles')
        .update({ invite_code: inviteCode })
        .eq('id', user.id);

      if (error) {
        console.error('Error generating invite code:', error);
        toast({
          title: "Error",
          description: "Failed to generate invite code. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      return inviteCode;
    } catch (err) {
      console.error('Error in generateInviteCode:', err);
      toast({
        title: "Error",
        description: "Failed to generate invite code. Please try again.",
        variant: "destructive",
      });
      return null;
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
      friends,
      friendRequests,
      pendingRequests,
      typingUsers,
      sendMessage,
      setCurrentConversation,
      startConversation,
      sendFriendRequest,
      sendFriendRequestByInvite,
      acceptFriendRequest,
      rejectFriendRequest,
      generateInviteCode,
      startTyping,
      stopTyping,
      isLoading
    }}>
      {children}
    </ChatContext.Provider>
  );
};
