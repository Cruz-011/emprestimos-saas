import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabaseAdmin";

async function quemEstaChamando(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await supabase.auth.getUser(token);
  return data.user;
}

// PATCH: ativa/bloqueia um usuário (ex.: bloquear o acesso de uma empresa)
export async function PATCH(req: NextRequest) {
  const usuario = await quemEstaChamando(req);
  if (!usuario) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: chamador } = await admin.from("usuarios").select("papel").eq("id", usuario.id).single();
  if (chamador?.papel !== "super_admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { usuarioId, ativo } = await req.json();
  if (!usuarioId || typeof ativo !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { error } = await admin.from("usuarios").update({ ativo }).eq("id", usuarioId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
