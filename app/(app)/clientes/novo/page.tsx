"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { uploadDocumento } from "@/lib/uploadDocumento";
import { useEmpresa } from "@/lib/useEmpresa";

export default function NovoClientePage() {
  const router = useRouter();
  const { empresaId, usuarioId, carregando } = useEmpresa();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) return;
    setSalvando(true);
    setErro("");

    let foto_url: string | null = null;
    if (foto) {
      foto_url = await uploadDocumento("fotos-clientes", empresaId, foto);
    }

    const supabase = createClient();
    const { error } = await supabase.from("clientes").insert({
      empresa_id: empresaId,
      nome,
      cpf: cpf || null,
      telefone: telefone || null,
      endereco: endereco || null,
      foto_url,
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
        <h2 className="text-base font-semibold">Novo cliente</h2>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        <label className="card flex items-center justify-center gap-2 py-6 border-2 border-dashed border-surface-border cursor-pointer text-ink-muted">
          <Camera size={22} />
          {foto ? foto.name : "Adicionar foto (opcional)"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <input
          required
          placeholder="Nome completo"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="CPF"
          inputMode="numeric"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
        <input
          placeholder="Telefone (com DDD)"
          inputMode="tel"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <input
          placeholder="Endereço (opcional)"
          className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={salvando || carregando}
          className="btn-grande w-full bg-primary text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
      </form>
    </div>
  );
}
