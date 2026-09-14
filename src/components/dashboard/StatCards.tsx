import React from "react";
import { Send, Play, Users, CheckCircle2 } from "lucide-react";

interface StatCardsProps {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContacts: number;
  totalSent: number;
}

export function StatCards({
  totalCampaigns = 0,
  activeCampaigns = 0,
  totalContacts = 0,
  totalSent = 0,
}: StatCardsProps) {
  const cards = [
    {
      title: "Total Campaigns",
      value: totalCampaigns.toLocaleString(),
      change: "All created workflows",
      icon: Send,
      color: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns.toLocaleString(),
      change: activeCampaigns > 0 ? "Dispatching batches" : "Idle",
      icon: Play,
      color: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
    },
    {
      title: "Total Contacts",
      value: totalContacts.toLocaleString(),
      change: "Validated in database",
      icon: Users,
      color: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40",
    },
    {
      title: "Total Emails Sent",
      value: totalSent.toLocaleString(),
      change: "Via Resend Provider",
      icon: CheckCircle2,
      color: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#666666] dark:text-neutral-400">{card.title}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg} transition-colors`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                {card.value}
              </span>
              <p className="mt-1 text-[11px] text-[#666666] dark:text-neutral-400">{card.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
