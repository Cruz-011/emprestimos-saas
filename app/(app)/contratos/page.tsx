"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Contrato = {
  id: string;
  valor_emprestado: number;
  status: "ativo" | "quitado" | "atrasado" | "cancelado";
  modalidade: "parcelas_fixas" | "rolagem" | "amortizacao";
  clientes: { nome: string } | null;
};

const nomeModalidadeCurto: Record<Contrato["modalidade"], string> = {
  parcelas_fixas: "Parcelas fixas",
  rolagem: "Rolagem",
  amortizacao: "Amortização",
};

const statusCor: Record<string, string> = {
  ativo: "bg-primary/10 text-primary",
  quitado: "bg-surface-hover text-ink-muted",
  atrasado: "bg-danger-soft text-danger",
  cancelado: "bg-surface-hover text-ink-faint",
};

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("contratos")
      .select("id, valor_emprestado, status, modalidade, clientes(nome)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setContratos((data as any) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Empréstimos</h2>
        <a href="/contratos/novo" className="btn-grande bg-primary text-white px-4 py-3">
          <Plus size={20} /> Novo
        </a>
      </div>

      <ul className="space-y-2">
        {contratos.map((c) => (
          <li key={c.id}>
            <a href={`/contratos/${c.id}`} className="card flex items-center justify-between block">
              <div>
                <p className="font-medium">{c.clientes?.nome ?? "Cliente"}</p>
                <p className="text-sm text-ink-muted money">
                  R$ {c.valor_emprestado.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-ink-faint">{nomeModalidadeCurto[c.modalidade]}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCor[c.status]}`}>
                {c.status}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
