import React, { useState, useEffect } from 'react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Search, 
  Settings, 
  LogOut, 
  Users,
  Bell,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { SettingsDialog } from './SettingsDialog';

export const ChatSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    conversations, 
    setCurrentConversation, 
    currentConversation, 
    friends, 
    friendRequests,
    pendingRequests,
    startConversation,
    acceptFriendRequest,
    rejectFriendRequest,
    isLoading 
  } = useChat();
  const { state } = useSidebar();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'requests'>('chats');
  const [showSettings, setShowSettings] = useState(false);
  const [startingConversation, setStartingConversation] = useState<string | null>(null);

  const isCollapsed = state === 'collapsed';

  // Switch to chats tab when a conversation is started
  useEffect(() => {
    if (currentConversation && activeTab !== 'chats') {
      setActiveTab('chats');
    }
  }, [currentConversation]);

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.conversation_participants.find(p => p.user_id !== user?.id);
    return otherUser?.profiles.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  };

  const handleFriendClick = async (friendId: string) => {
    setStartingConversation(friendId);
    await startConversation(friendId);
    setStartingConversation(null);
    // The useEffect above will automatically switch to chats tab
  };

  return (
    <>
      <Sidebar className={`${isCollapsed ? 'w-16' : 'w-80'} border-r border-border`}>
        <SidebarHeader className="p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 chat-gradient rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lovable Chat
                </h1>
                <p className="text-xs text-muted-foreground">
                  Welcome, {user?.username}
                </p>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="flex flex-col h-full">
          {!isCollapsed && (
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex mt-3 space-x-1">
                <Button
                  variant={activeTab === 'chats' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('chats')}
                  className="flex-1 text-xs sm:text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chats
                </Button>
                <Button
                  variant={activeTab === 'friends' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('friends')}
                  className="flex-1 text-xs sm:text-sm"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Friends
                </Button>
                <Button
                  variant={activeTab === 'requests' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('requests')}
                  className="flex-1 relative text-xs sm:text-sm"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Requests
                  {friendRequests.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-500">
                      {friendRequests.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' ? (
              <SidebarGroup>
                {!isCollapsed && <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {isLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Loading conversations...
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No conversations yet. Start by selecting a friend!
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => {
                        const otherParticipant = conversation.conversation_participants.find(p => p.user_id !== user?.id);
                        const otherUser = otherParticipant?.profiles;
                        const latestMessage = conversation.messages[0];
                        
                        if (!otherUser) return null;

                        return (
                          <SidebarMenuItem key={conversation.id}>
                            <SidebarMenuButton
                              onClick={() => setCurrentConversation(conversation.id)}
                              className={`w-full p-3 hover:bg-accent rounded-lg transition-colors ${
                                currentConversation === conversation.id ? 'bg-accent' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3 w-full">
                                <div className="relative">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                      {otherUser.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(otherUser.status)}`} />
                                </div>
                                {!isCollapsed && (
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium text-sm truncate">
                                        {otherUser.username}
                                      </p>
                                      {latestMessage && (
                                        <span className="text-xs text-muted-foreground">
                                          {formatTime(latestMessage.created_at)}
                                        </span>
                                      )}
                                    </div>
                                    {latestMessage && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {latestMessage.content}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : activeTab === 'friends' ? (
              <SidebarGroup>
                {!isCollapsed && <SidebarGroupLabel>Your Friends</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredFriends.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No friends yet. Send friend requests to start chatting!
                      </div>
                    ) : (
                      filteredFriends.map((friend) => (
                        <SidebarMenuItem key={friend.id}>
                          <SidebarMenuButton 
                            onClick={() => handleFriendClick(friend.id)}
                            className="w-full p-3 hover:bg-accent rounded-lg transition-colors cursor-pointer"
                            disabled={startingConversation === friend.id}
                          >
                            <div className="flex items-center space-x-3 w-full">
                              <div className="relative">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white">
                                    {friend.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(friend.status)}`} />
                              </div>
                              {!isCollapsed && (
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm truncate">
                                      {friend.username}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {friend.status}
                                    </p>
                                  </div>
                                  {startingConversation === friend.id && (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  )}
                                </div>
                              )}
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <SidebarGroup>
                {!isCollapsed && <SidebarGroupLabel>Friend Requests</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {friendRequests.length === 0 && pendingRequests.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No friend requests
                      </div>
                    ) : (
                      <>
                        {friendRequests.map((request) => (
                          <SidebarMenuItem key={request.id}>
                            <div className="p-3 border-b border-border last:border-b-0">
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs">
                                    {request.sender_profile.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {request.sender_profile.username}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Wants to be friends
                                    </p>
                                  </div>
                                )}
                              </div>
                              {!isCollapsed && (
                                <div className="flex space-x-2 mt-2">
                                  <Button 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => acceptFriendRequest(request.id)}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => rejectFriendRequest(request.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </SidebarMenuItem>
                        ))}
                        {pendingRequests.map((request) => (
                          <SidebarMenuItem key={request.id}>
                            <div className="p-3 border-b border-border last:border-b-0">
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs">
                                    {request.receiver_profile.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {request.receiver_profile.username}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Request sent
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </SidebarMenuItem>
                        ))}
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </div>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-accent/50">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                    {user?.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user?.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.status || 'Online'}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1" 
                  title="Settings"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={logout} className="flex-1" title="Logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full" 
                title="Settings"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="w-full" title="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
};
