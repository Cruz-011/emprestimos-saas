"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/hooks/useEmpresa";

export default function NovoClientePage() {
  const router = useRouter();
  const { empresaId, usuarioId, carregando } = useEmpresa();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [cnh, setCnh] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const inputClasse =
    "w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) {
      setErro("Não foi possível identificar sua empresa. Saia e entre de novo na conta e tente outra vez.");
      return;
    }
    setSalvando(true);
    setErro("");

    const supabase = createClient();
    const { error } = await supabase.from("clientes").insert({
      empresa_id: empresaId,
      nome,
      cpf: cpf || null,
      rg: rg || null,
      cnh: cnh || null,
      telefone: telefone || null,
      endereco: endereco || null,
      created_by: usuarioId,
    });

    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    router.push("/clientes");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-semibold text-ink">Novo cliente</h2>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        <input
          required
          placeholder="Nome completo"
          className={inputClasse}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="Telefone (com DDD)"
          inputMode="tel"
          className={inputClasse}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <input
          placeholder="Endereço (opcional)"
          className={inputClasse}
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />

        <div>
          <p className="text-xs text-ink-muted mb-1">Documentos (preencha o que tiver — nenhum é obrigatório)</p>
          <div className="space-y-2">
            <input
              placeholder="CPF"
              inputMode="numeric"
              className={inputClasse}
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
            <input
              placeholder="RG"
              className={inputClasse}
              value={rg}
              onChange={(e) => setRg(e.target.value)}
            />
            <input
              placeholder="CNH"
              className={inputClasse}
              value={cnh}
              onChange={(e) => setCnh(e.target.value)}
            />
          </div>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={salvando || carregando}
          className="btn-grande w-full bg-primary text-[#06140F] disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
      </form>
    </div>
  );
}