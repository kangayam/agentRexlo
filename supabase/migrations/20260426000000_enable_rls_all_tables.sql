-- Enable Row-Level Security on all public tables.
--
-- This app uses Prisma (direct PostgreSQL connection) for all data access.
-- The Supabase JS client is used only for Auth operations.
-- Enabling RLS with no policies blocks all direct Supabase REST API access
-- to these tables while leaving Prisma queries completely unaffected.

ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_gstins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ims_invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tally_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
