"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
};

export default function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      let query = supabase.from("clientes").select("id, nome, telefone, cpf").order("nome");
      if (busca.trim()) {
        query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`);
      }
      const { data } = await query;
      if (ativo) {
        setClientes(data ?? []);
        setCarregando(false);
      }
    }

    const debounce = setTimeout(carregar, 250);
    return () => {
      ativo = false;
      clearTimeout(debounce);
    };
  }, [busca]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 card py-2">
          <Search size={18} className="text-ink-faint" />
          <input
            className="flex-1 outline-none bg-transparent text-base"
            placeholder="Buscar por nome, CPF ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <a href="/clientes/novo" className="btn-grande bg-primary text-white px-4 py-3">
          <Plus size={20} />
        </a>
      </div>

      {carregando ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum cliente encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <a href={`/clientes/${c.id}`} className="card flex items-center justify-between block">
                <div>
                  <p className="font-medium">{c.nome}</p>
                  <p className="text-sm text-ink-muted">{c.cpf ?? "sem CPF cadastrado"}</p>
                </div>
                {c.telefone && (
                  <span className="flex items-center gap-1 text-primary text-sm">
                    <Phone size={16} /> {c.telefone}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
