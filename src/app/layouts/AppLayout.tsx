import { useState } from 'react';
import { Outlet } from 'react-router';

import { AIAssistantBubble } from '@/shared/components/assistant/AIAssistantBubble';
import { Header } from '@/shared/components/navigation/Header';
import { MobileNav } from '@/shared/components/navigation/MobileNav';
import { Sidebar } from '@/shared/components/navigation/Sidebar';
import { cn } from '@/shared/utils/cn';

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div
        className={cn(
          'min-h-screen pb-32 transition-[padding] duration-slow ease-[var(--ease-premium)] xl:pb-0',
          isSidebarCollapsed ? 'xl:pl-[5.25rem]' : 'xl:pl-64'
        )}
      >
        <Header />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <AIAssistantBubble />
    </div>
  );
}
