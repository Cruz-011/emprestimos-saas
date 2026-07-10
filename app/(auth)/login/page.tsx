"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    const { data: perfil } = await supabase.from("usuarios").select("papel, ativo").eq("id", data.user.id).single();
    if (perfil && !perfil.ativo) {
      setErro("Seu acesso está bloqueado. Fale com o administrador.");
      await supabase.auth.signOut();
      return;
    }

    router.push(perfil?.papel === "super_admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <form onSubmit={entrar} className="card w-full max-w-sm space-y-4 border-t-2 border-t-primary">
        <div className="text-center space-y-1">
          <Image src="/logo.png" alt="Cifra Finance" width={56} height={56} className="mx-auto rounded-xl mb-2" />
          <h1 className="text-2xl font-display font-bold text-ink">
            Cifra <span className="text-primary">Finance</span>
          </h1>
          <p className="text-xs text-ink-faint font-mono uppercase tracking-widest">Gestão de empréstimos</p>
        </div>
        <input
          type="email"
          required
          placeholder="Seu e-mail"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Sua senha"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" className="btn-grande w-full bg-primary text-[#06140F] font-display">
          Entrar
        </button>
      </form>
    </div>
  );
}