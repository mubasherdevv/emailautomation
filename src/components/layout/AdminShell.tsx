"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AdminShellProps {
  title: string;
  subtitle?: string;
  isRealtimeConnected?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({
  title,
  subtitle,
  isRealtimeConnected = true,
  onRefresh,
  actions,
  children,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          isRealtimeConnected={isRealtimeConnected}
          onRefresh={onRefresh}
          onOpenMobile={() => setMobileOpen(true)}
          actions={actions}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
