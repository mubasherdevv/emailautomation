import { Campaign, Contact, EmailLog, EmailTemplate, CampaignEvent } from "@/types";

const INITIAL_CAMPAIGNS: Campaign[] = [];

const INITIAL_CONTACTS: Contact[] = [];

const INITIAL_TEMPLATES: EmailTemplate[] = [];

const INITIAL_EVENTS: CampaignEvent[] = [];

const INITIAL_LOGS: EmailLog[] = [];

// Global Memory Store for persistent state in session / node runtime
declare global {
  var __APP_STORE__: {
    campaigns: Campaign[];
    contacts: Contact[];
    templates: EmailTemplate[];
    events: CampaignEvent[];
    logs: EmailLog[];
  } | undefined;
}

// Always reset store to eliminate seeded dummy data across module reloads
global.__APP_STORE__ = {
  campaigns: [],
  contacts: global.__APP_STORE__?.contacts?.filter(
    (c) => c.email && !["john@example.com", "sarah@cyberdyne.org", "mike@pearsonhardman.com", "test@invalid-domain-404.com"].includes(c.email)
  ) || [],
  templates: [],
  events: [],
  logs: [],
};

export const store = global.__APP_STORE__!;
