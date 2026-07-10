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

export async function GET(req: NextRequest) {
  const usuario = await quemEstaChamando(req);
  if (!usuario) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: chamador } = await admin.from("usuarios").select("papel").eq("id", usuario.id).single();
  if (chamador?.papel !== "super_admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: empresas } = await admin
    .from("empresas")
    .select("id, nome, telefone, created_at, usuarios(id, nome, ativo, papel)")
    .order("created_at", { ascending: false });

  return NextResponse.json({ empresas: empresas ?? [] });
}

export async function POST(req: NextRequest) {
  const usuario = await quemEstaChamando(req);
  if (!usuario) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: chamador } = await admin.from("usuarios").select("papel").eq("id", usuario.id).single();
  if (chamador?.papel !== "super_admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { nomeEmpresa, nomeAdmin, emailAdmin, senhaAdmin } = await req.json();
  if (!nomeEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
  }
  if (senhaAdmin.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres" }, { status: 400 });
  }

  const { data: empresa, error: erroEmpresa } = await admin
    .from("empresas")
    .insert({ nome: nomeEmpresa })
    .select()
    .single();
  if (erroEmpresa) return NextResponse.json({ error: erroEmpresa.message }, { status: 400 });

  // cria o login do admin da empresa já com e-mail e senha definidos (sem convite/confirmação por e-mail)
  const { data: novoAuthUser, error: erroAuth } = await admin.auth.admin.createUser({
    email: emailAdmin,
    password: senhaAdmin,
    email_confirm: true,
  });
  if (erroAuth || !novoAuthUser.user) {
    return NextResponse.json({ error: erroAuth?.message ?? "Erro ao criar usuário" }, { status: 400 });
  }

  const { error: erroUsuario } = await admin.from("usuarios").insert({
    id: novoAuthUser.user.id,
    empresa_id: empresa.id,
    nome: nomeAdmin,
    papel: "admin_empresa",
    ativo: true,
  });
  if (erroUsuario) return NextResponse.json({ error: erroUsuario.message }, { status: 400 });

  return NextResponse.json({ empresa });
}
