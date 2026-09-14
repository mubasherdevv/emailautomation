-- ==============================================================================
-- PRODUCTION BULK EMAIL ADMIN DASHBOARD SCHEMA
-- Compatible with Supabase PostgreSQL & Supabase Realtime
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, running, paused, stopped, completed, failed
    send_limit INTEGER DEFAULT 100,
    batch_size INTEGER DEFAULT 5,
    delay_seconds INTEGER DEFAULT 2,
    subject TEXT,
    from_name TEXT,
    from_email TEXT,
    sheet_id TEXT,
    sheet_name TEXT DEFAULT 'Sheet1',
    template_id UUID,
    primary_recipient_field TEXT DEFAULT 'email', -- 'email' or 'personal_email'
    
    -- Atomic Counters
    total_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    sending_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CONTACTS TABLE (Deduplication on normalized email)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    personal_email TEXT,
    address TEXT,
    contact TEXT,
    website TEXT,
    status TEXT DEFAULT 'pending', -- pending, sending, sent, failed, skipped, unsubscribed
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup on normalized email
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts (email);

-- 3. CAMPAIGN_CONTACTS TABLE (Pivot table with status & message tracking)
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sending, sent, failed, skipped
    provider_message_id TEXT,
    error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_campaign_contact UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON public.campaign_contacts (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts (status);

-- 4. EMAIL_LOGS TABLE (Detailed audit log for each email delivery attempt)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL, -- sending, sent, failed, skipped, delivered, bounced, complained
    provider_message_id TEXT,
    error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON public.email_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);

-- 5. EMAIL_TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    variables JSONB DEFAULT '["firstName", "lastName", "email", "website", "address", "contact"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SUPPRESSION_LIST TABLE
CREATE TABLE IF NOT EXISTS public.suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    reason TEXT, -- unsubscribe, bounce, spam_complaint, manual
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppression_email ON public.suppression_list (email);

-- 7. CAMPAIGN_EVENTS TABLE (Powering live activity stream)
CREATE TABLE IF NOT EXISTS public.campaign_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, 
    -- campaign_started, leads_loaded, batch_started, email_sending, email_sent, email_failed, batch_completed, campaign_paused, campaign_resumed, campaign_stopped, campaign_completed
    email TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_created ON public.campaign_events (campaign_id, created_at DESC);

-- ==============================================================================
-- AUTOMATIC DATABASE COUNTERS & TRIGGER FUNCTIONS
-- ==============================================================================

-- Function to recalculate campaign atomic counters accurately
CREATE OR REPLACE FUNCTION public.sync_campaign_counters()
RETURNS TRIGGER AS $$
DECLARE
    target_campaign_id UUID;
    v_total INT;
    v_sent INT;
    v_sending INT;
    v_pending INT;
    v_failed INT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_campaign_id := OLD.campaign_id;
    ELSE
        target_campaign_id := NEW.campaign_id;
    END IF;

    -- Aggregate counts directly from campaign_contacts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'sent'),
        COUNT(*) FILTER (WHERE status = 'sending'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO
        v_total, v_sent, v_sending, v_pending, v_failed
    FROM public.campaign_contacts
    WHERE campaign_id = target_campaign_id;

    -- Update the parent campaign row atomically
    UPDATE public.campaigns
    SET 
        total_count = COALESCE(v_total, 0),
        sent_count = COALESCE(v_sent, 0),
        sending_count = COALESCE(v_sending, 0),
        pending_count = COALESCE(v_pending, 0),
        failed_count = COALESCE(v_failed, 0),
        status = CASE 
            -- If all sent or failed (and pending is 0 and total > 0), mark completed if currently running
            WHEN status = 'running' AND COALESCE(v_pending, 0) = 0 AND COALESCE(v_sending, 0) = 0 AND COALESCE(v_total, 0) > 0 THEN 'completed'
            ELSE status
        END,
        completed_at = CASE
            WHEN status = 'running' AND COALESCE(v_pending, 0) = 0 AND COALESCE(v_sending, 0) = 0 AND COALESCE(v_total, 0) > 0 THEN now()
            ELSE completed_at
        END,
        updated_at = now()
    WHERE id = target_campaign_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to campaign_contacts
DROP TRIGGER IF EXISTS trg_sync_campaign_counters ON public.campaign_contacts;
CREATE TRIGGER trg_sync_campaign_counters
AFTER INSERT OR UPDATE OR DELETE ON public.campaign_contacts
FOR EACH ROW
EXECUTE FUNCTION public.sync_campaign_counters();

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_contacts';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_events';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Set full replica identity so realtime payload includes entire old and new records
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.email_logs REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_events REPLICA IDENTITY FULL;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin users full access
CREATE POLICY "Admins full access campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access contacts" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access campaign_contacts" ON public.campaign_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access email_logs" ON public.email_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access email_templates" ON public.email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access suppression_list" ON public.suppression_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins full access campaign_events" ON public.campaign_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service_role key to bypass all checks for n8n automation
CREATE POLICY "Service role full access campaigns" ON public.campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access contacts" ON public.contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access campaign_contacts" ON public.campaign_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access email_logs" ON public.email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access email_templates" ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access suppression_list" ON public.suppression_list FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access campaign_events" ON public.campaign_events FOR ALL TO service_role USING (true) WITH CHECK (true);
