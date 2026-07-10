import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com privilégio de administrador (service role).
 * NUNCA importar este arquivo em um componente "use client" — ele só
 * pode rodar no servidor (API routes / server components), porque a
 * service role key ignora todo o RLS.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
