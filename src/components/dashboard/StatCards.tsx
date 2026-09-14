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
      color: "text-neutral-900",
      iconBg: "bg-neutral-100",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns.toLocaleString(),
      change: activeCampaigns > 0 ? "Dispatching batches" : "Idle",
      icon: Play,
      color: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Total Contacts",
      value: totalContacts.toLocaleString(),
      change: "Validated in database",
      icon: Users,
      color: "text-neutral-900",
      iconBg: "bg-purple-50 text-[#6D28D9]",
    },
    {
      title: "Total Emails Sent",
      value: totalSent.toLocaleString(),
      change: "Via Resend Provider",
      icon: CheckCircle2,
      color: "text-[#6D28D9]",
      iconBg: "bg-purple-50 text-[#6D28D9]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xs hover:border-neutral-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#666666]">{card.title}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                {card.value}
              </span>
              <p className="mt-1 text-[11px] text-[#666666]">{card.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
