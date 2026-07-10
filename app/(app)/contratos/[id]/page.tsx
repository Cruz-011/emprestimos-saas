"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/lib/useEmpresa";
import { CampoMoeda } from "@/components/CampoMoeda";

type Parcela = {
  id: string;
  numero: number;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  status: "a_vencer" | "pago" | "atrasado" | "parcial";
  tipo: "parcela" | "somente_juros" | "balao";
};

type Contrato = {
  id: string;
  valor_emprestado: number;
  taxa_juros: number;
  numero_parcelas: number;
  modalidade: "parcelas_fixas" | "rolagem" | "amortizacao";
  periodicidade: "diario" | "semanal" | "mensal";
  status: string;
  clientes: { nome: string; telefone: string | null } | null;
};

const nomeModalidade: Record<Contrato["modalidade"], string> = {
  parcelas_fixas: "Parcelas fixas",
  rolagem: "Só juros (rolagem)",
  amortizacao: "Com amortização",
};

const nomePeriodicidade: Record<Contrato["periodicidade"], string> = {
  diario: "ao dia",
  semanal: "à semana",
  mensal: "ao mês",
};

const nomeTipoParcela: Record<Parcela["tipo"], (n: number) => string> = {
  parcela: (n) => `Parcela ${n}`,
  somente_juros: (n) => `Juros ${n}`,
  balao: () => "Quitação (juros + valor emprestado)",
};

const hoje = new Date().toISOString().slice(0, 10);

function statusEfetivo(p: Parcela): Parcela["status"] {
  if (p.status === "pago") return "pago";
  if (p.status === "parcial") return "parcial";
  return p.data_vencimento < hoje ? "atrasado" : "a_vencer";
}

const estilos: Record<Parcela["status"], { cor: string; icone: any; label: string }> = {
  pago: { cor: "text-primary bg-primary/10", icone: CheckCircle2, label: "Pago" },
  parcial: { cor: "text-warning bg-warning/10", icone: Clock, label: "Parcial" },
  atrasado: { cor: "text-danger bg-danger/10", icone: AlertTriangle, label: "Atrasado" },
  a_vencer: { cor: "text-ink-muted bg-surface-hover", icone: Clock, label: "A vencer" },
};

export default function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { usuarioId } = useEmpresa();

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [parcelaAberta, setParcelaAberta] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState(0);
  const [forma, setForma] = useState("Pix");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const supabase = createClient();
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("contratos").select("id, valor_emprestado, taxa_juros, numero_parcelas, modalidade, periodicidade, status, clientes(nome, telefone)").eq("id", id).single(),
      supabase.from("parcelas").select("id, numero, valor, valor_pago, data_vencimento, status, tipo").eq("contrato_id", id).order("numero"),
    ]);
    setContrato(c as any);
    setParcelas(p ?? []);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  function abrirRegistro(p: Parcela) {
    setParcelaAberta(p.id);
    const restante = Math.max(0, p.valor - (p.valor_pago ?? 0));
    setValorPagamento(restante);
  }

  async function confirmarPagamento(p: Parcela) {
    setSalvando(true);
    const supabase = createClient();
    await supabase.rpc("registrar_pagamento_parcela", {
      p_parcela_id: p.id,
      p_valor: valorPagamento,
      p_forma_pagamento: forma,
      p_usuario_id: usuarioId,
    });
    setSalvando(false);
    setParcelaAberta(null);
    carregar();
  }

  if (!contrato) return <p className="text-sm text-ink-muted">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-semibold text-ink">{contrato.clientes?.nome ?? "Contrato"}</h2>
      </div>

      <div className="card space-y-1">
        <p className="text-sm text-ink-muted">Valor emprestado</p>
        <p className="text-xl font-bold money text-ink">R$ {contrato.valor_emprestado.toLocaleString("pt-BR")}</p>
        <p className="text-sm text-ink-muted">
          {nomeModalidade[contrato.modalidade]} · {contrato.numero_parcelas}x · {contrato.taxa_juros}% {nomePeriodicidade[contrato.periodicidade]} · status {contrato.status}
        </p>
        {contrato.clientes?.telefone && (
          <a
            href={`https://wa.me/${contrato.clientes.telefone}`}
            target="_blank"
            className="btn-grande bg-primary text-white text-sm py-2 mt-2 inline-flex"
          >
            <MessageCircle size={18} /> Falar no WhatsApp
          </a>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-ink">Parcelas</h3>
        <ul className="space-y-2">
          {parcelas.map((p) => {
            const s = statusEfetivo(p);
            const { cor, icone: Icone, label } = estilos[s];
            const aberta = parcelaAberta === p.id;
            const podeRegistrar = s !== "pago";
            return (
              <li key={p.id} className="card">
                <button
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => (podeRegistrar ? (aberta ? setParcelaAberta(null) : abrirRegistro(p)) : undefined)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-full ${cor}`}>
                      <Icone size={18} />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{nomeTipoParcela[p.tipo](p.numero)}</p>
                      <p className="text-xs text-ink-muted">
                        Vence {new Date(p.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold money text-ink">R$ {p.valor.toLocaleString("pt-BR")}</p>
                    <p className={`text-xs font-medium ${cor.split(" ")[0]}`}>{label}</p>
                  </div>
                </button>

                {aberta && (
                  <div className="mt-3 pt-3 border-t border-surface-border space-y-2">
                    <CampoMoeda
                      valor={valorPagamento}
                      onChange={setValorPagamento}
                      placeholder="Valor recebido"
                      className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-base text-ink placeholder:text-ink-faint"
                    />
                    <div className="flex gap-2">
                      {["Pix", "Dinheiro", "Transferência"].map((f) => (
                        <button
                          type="button"
                          key={f}
                          onClick={() => setForma(f)}
                          className={`flex-1 text-sm py-2 rounded-lg border ${
                            forma === f
                              ? "bg-primary text-white border-primary"
                              : "border-surface-border text-ink-muted"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={salvando}
                      onClick={() => confirmarPagamento(p)}
                      className="btn-grande w-full bg-primary text-white text-sm py-3 disabled:opacity-50"
                    >
                      {salvando ? "Registrando..." : "Confirmar pagamento"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}