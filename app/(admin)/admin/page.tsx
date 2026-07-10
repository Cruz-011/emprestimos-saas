"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, X, Ban, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

type UsuarioEmpresa = { id: string; nome: string; ativo: boolean; papel: string };
type Empresa = { id: string; nome: string; telefone: string | null; created_at: string; usuarios: UsuarioEmpresa[] };

async function chamarApi(caminho: string, opcoes: RequestInit = {}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const resp = await fetch(caminho, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opcoes.headers ?? {}),
    },
  });
  return resp.json();
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [formAberto, setFormAberto] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    const resposta = await chamarApi("/api/admin/empresas");
    setEmpresas(resposta.empresas ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarEmpresa() {
    setSalvando(true);
    setErro("");
    const resposta = await chamarApi("/api/admin/empresas", {
      method: "POST",
      body: JSON.stringify({ nomeEmpresa, nomeAdmin, emailAdmin, senhaAdmin }),
    });
    setSalvando(false);
    if (resposta.error) {
      setErro(resposta.error);
      return;
    }
    setFormAberto(false);
    setNomeEmpresa("");
    setNomeAdmin("");
    setEmailAdmin("");
    setSenhaAdmin("");
    carregar();
  }

  async function alternarAcesso(usuarioId: string, ativoAtual: boolean) {
    await chamarApi("/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ usuarioId, ativo: !ativoAtual }),
    });
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Empresas</h1>
        <button onClick={() => setFormAberto(true)} className="btn-grande bg-primary text-white px-4 py-2 text-sm">
          <Plus size={18} /> Nova empresa
        </button>
      </div>

      {formAberto && (
        <div className="card space-y-2">
          <div className="flex justify-between items-center">
            <p className="font-medium">Cadastrar nova empresa</p>
            <button onClick={() => setFormAberto(false)} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          <input
            placeholder="Nome da empresa"
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-3 text-base"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
          />
          <input
            placeholder="Nome do administrador"
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-3 text-base"
            value={nomeAdmin}
            onChange={(e) => setNomeAdmin(e.target.value)}
          />
          <input
            type="email"
            placeholder="E-mail do administrador"
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-3 text-base"
            value={emailAdmin}
            onChange={(e) => setEmailAdmin(e.target.value)}
          />
          <input
            type="text"
            placeholder="Senha de acesso (mínimo 6 caracteres)"
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-3 text-base"
            value={senhaAdmin}
            onChange={(e) => setSenhaAdmin(e.target.value)}
          />
          <p className="text-xs text-ink-faint">
            O login já fica pronto na hora com esse e-mail e senha — repasse os dois pro administrador da empresa.
          </p>
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <button
            disabled={salvando || !nomeEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin}
            onClick={criarEmpresa}
            className="btn-grande w-full bg-primary text-white text-sm py-3 disabled:opacity-50"
          >
            {salvando ? "Criando..." : "Criar empresa e acesso"}
          </button>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {empresas.map((emp) => (
            <li key={emp.id} className="card space-y-2">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-ink-faint" />
                <p className="font-semibold">{emp.nome}</p>
              </div>
              <ul className="space-y-1">
                {emp.usuarios?.map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-sm pl-6">
                    <span>
                      {u.nome} <span className="text-ink-faint">· {u.papel}</span>
                    </span>
                    <button
                      onClick={() => alternarAcesso(u.id, u.ativo)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        u.ativo ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                      }`}
                    >
                      {u.ativo ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                      {u.ativo ? "Ativo" : "Bloqueado"}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
