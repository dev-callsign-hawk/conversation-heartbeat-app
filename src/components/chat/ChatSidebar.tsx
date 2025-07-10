
import React, { useState } from 'react';
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
  Plus, 
  Settings, 
  LogOut, 
  User,
  Circle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';

const mockUsers = [
  { id: '1', username: 'Alice Johnson', email: 'alice@example.com', status: 'online' as const },
  { id: '2', username: 'Bob Smith', email: 'bob@example.com', status: 'away' as const },
  { id: '3', username: 'Charlie Brown', email: 'charlie@example.com', status: 'online' as const },
  { id: '4', username: 'Diana Prince', email: 'diana@example.com', status: 'offline' as const },
  { id: '5', username: 'Edward Norton', email: 'edward@example.com', status: 'online' as const },
];

export const ChatSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { conversations, setCurrentConversation, currentConversation } = useChat();
  const { collapsed } = useSidebar();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');

  const filteredUsers = mockUsers.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    u.id !== user?.id
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getUserName = (userId: string) => {
    const foundUser = mockUsers.find(u => u.id === userId);
    return foundUser?.username || 'Unknown User';
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  return (
    <Sidebar className={`${collapsed ? 'w-16' : 'w-80'} border-r border-border`}>
      <SidebarHeader className="p-4 border-b border-border">
        {!collapsed && (
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
        {!collapsed && (
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
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
                className="flex-1"
              >
                Chats
              </Button>
              <Button
                variant={activeTab === 'users' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('users')}
                className="flex-1"
              >
                Users
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' ? (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {conversations.map((conversation) => {
                    const otherUserId = conversation.participants.find(id => id !== user?.id);
                    const otherUser = mockUsers.find(u => u.id === otherUserId);
                    
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
                                  {otherUser?.username.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(otherUser?.status || 'offline')}`} />
                            </div>
                            {!collapsed && (
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm truncate">
                                    {otherUser?.username}
                                  </p>
                                  {conversation.lastMessage && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(conversation.lastMessage.timestamp)}
                                    </span>
                                  )}
                                </div>
                                {conversation.lastMessage && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conversation.lastMessage.content}
                                  </p>
                                )}
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="mt-1 text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>All Users</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredUsers.map((otherUser) => (
                    <SidebarMenuItem key={otherUser.id}>
                      <SidebarMenuButton className="w-full p-3 hover:bg-accent rounded-lg transition-colors">
                        <div className="flex items-center space-x-3 w-full">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white">
                                {otherUser.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(otherUser.status)}`} />
                          </div>
                          {!collapsed && (
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {otherUser.username}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {otherUser.status}
                              </p>
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-accent/50">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                  {user?.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" className="flex-1">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="flex-1">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full">
              <User className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="w-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
