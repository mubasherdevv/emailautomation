"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  ListOrdered,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Navigation,
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Campaigns", href: "/campaigns", icon: Send },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Email Logs", href: "/logs", icon: ListOrdered },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen flex flex-col justify-between border-r border-[#E5E5E5] bg-white transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div>
          <div className="flex h-16 items-center justify-between px-5 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Navigation className="h-5 w-5 rotate-45" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm tracking-tight text-[#111111] flex items-center gap-1.5">
                    OutreachPilot <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded-sm">PRO</span>
                  </span>
                  <span className="text-[11px] text-[#666666] truncate">Campaign Automation</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5] transition"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#6D28D9] text-white shadow-xs font-semibold"
                      : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[#666666]"}`} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Engine Banner & User Profile */}
        <div className="p-3 border-t border-[#F5F5F5] space-y-2">
          {!collapsed && (
            <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100 text-[11px] text-[#666666]">
              <div className="flex items-center gap-1.5 font-medium text-[#111111] mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>n8n Engine Active</span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Workflows controlled via Supabase & Webhooks
              </p>
            </div>
          )}

          {/* User Profile */}
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F5F5F5] transition">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                AD
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-medium text-[#111111] truncate">Admin Console</div>
                  <div className="text-[11px] text-[#666666] truncate">admin@company.com</div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-[#666666] hover:text-red-600 p-1.5 rounded-md hover:bg-white transition"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
