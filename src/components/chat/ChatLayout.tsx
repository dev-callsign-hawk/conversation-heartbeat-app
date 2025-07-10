
import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';

export const ChatLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ChatSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="mr-2" />
          </header>
          <ChatArea />
        </div>
      </div>
    </SidebarProvider>
  );
};
