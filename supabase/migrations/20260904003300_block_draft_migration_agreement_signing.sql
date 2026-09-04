-- Batch 44: fail closed at the database boundary while the portability agreement is a legal-review draft.
-- The customer-facing API already blocks signing in code. This migration removes the remaining
-- direct authenticated RPC path so a client cannot bypass the legal gate by calling Supabase RPC.

revoke all on function public.sign_project_migration_agreement(uuid,text,boolean)
from public, anon, authenticated, service_role;

comment on function public.sign_project_migration_agreement(uuid,text,boolean) is
'LANERIQ portability agreement draft signing is disabled pending qualified legal counsel approval. Do not grant execute in Production until the agreement version is formally approved and a server-only signing path is introduced.';
