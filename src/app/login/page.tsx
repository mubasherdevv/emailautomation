"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, Navigation } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("emailautomation@redvision.com");
  const [password, setPassword] = useState("redvision123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      toast("Authentication Successful", "Welcome back to the campaign dashboard", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      setError(msg);
      toast("Authentication Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F5F5F5] p-4 transition-colors duration-200">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-xl transition-colors duration-200">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md mb-4">
            <Navigation className="h-6 w-6 rotate-45" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
            OutreachPilot Admin
          </h1>
          <p className="mt-1 text-xs text-[#666666]">
            Secure cold email orchestration &amp; live monitoring console
          </p>
        </div>

        {/* Demo Credentials Alert */}
        <div className="mt-6 rounded-lg bg-indigo-50/70 border border-indigo-100 p-3 text-[11px] text-[#666666]">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-700 mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin Authentication Initialized</span>
          </div>
          <div className="font-mono text-neutral-800 space-y-0.5">
            <div>Email: <span className="font-semibold">emailautomation@redvision.com</span></div>
            <div>Pass: <span className="font-semibold">redvision123</span></div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full rounded-lg border border-[#E5E5E5] bg-white pl-9 pr-3.5 py-2 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#6D28D9] focus:outline-hidden focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[#E5E5E5] bg-white pl-9 pr-3.5 py-2 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#6D28D9] focus:outline-hidden focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#6D28D9] py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#5b21b6] transition disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter Admin Console</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#666666]">
          Protected by Supabase Auth &amp; Server-Side Middleware
        </p>
      </div>
    </div>
  );
}
