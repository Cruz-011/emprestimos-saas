"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { calcularReputacao, type Reputacao } from "@/lib/reputacaoCliente";
import { calcularPendenciasContrato, componentesDaParcela, pendenciaParcela, type Modalidade } from "@/lib/calculoEmprestimo";
import { MENSAGEM_PADRAO, montarMensagem, linkWhatsApp } from "@/lib/mensagemCobranca";
import { useEmpresa } from "@/lib/useEmpresa";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  cnh: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
};

type ContratoDetalhado = {
  id: string;
  valor_emprestado: number;
  status: string;
  valorPago: number;
  totalAPagar: number;
  faltaPagar: number;
  principalPendente: number;
  jurosPendente: number;
  totalJuros: number;
  proximoVencimento: string | null;
  telefone: string | null;
};

const corReputacao: Record<Reputacao["cor"], string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface-hover text-ink-faint",
};

export default function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { empresaId } = useEmpresa();

  const [aba, setAba] = useState<"dados" | "emprestimos">("dados");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<ContratoDetalhado[]>([]);
  const [reputacao, setReputacao] = useState<Reputacao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [mensagemTemplate, setMensagemTemplate] = useState(MENSAGEM_PADRAO);
  const [chavePix, setChavePix] = useState("");
  const [proximaCobranca, setProximaCobranca] = useState<{ total: number; juros: number; data: string } | null>(null);

  async function carregar() {
    const supabase = createClient();
    const { data: c } = await supabase
      .from("clientes")
      .select("id, nome, cpf, rg, cnh, telefone, endereco, observacoes")
      .eq("id", id)
      .single();
    setCliente(c);

    const { data: cts } = await supabase
      .from("contratos")
      .select("id, valor_emprestado, taxa_juros, numero_parcelas, modalidade, status")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false });

    if (cts && cts.length > 0) {
      const { data: todasParcelas } = await supabase
        .from("parcelas")
        .select("contrato_id, numero, valor, valor_pago, valor_juros, valor_principal, status, data_vencimento, data_pagamento")
        .in("contrato_id", cts.map((c) => c.id));

      const detalhados: ContratoDetalhado[] = cts.map((ct) => {
        const parcelasDoContrato = (todasParcelas ?? []).filter((p) => p.contrato_id === ct.id);
        const pend = calcularPendenciasContrato(
          ct.modalidade as Modalidade,
          Number(ct.valor_emprestado),
          Number(ct.taxa_juros),
          ct.numero_parcelas,
          parcelasDoContrato
        );
        const proxima = parcelasDoContrato
          .filter((p) => p.status !== "pago")
          .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];
        return {
          id: ct.id,
          valor_emprestado: Number(ct.valor_emprestado),
          status: ct.status,
          valorPago: pend.totalPago,
          totalAPagar: pend.totalAPagar,
          faltaPagar: pend.faltaPagar,
          principalPendente: pend.principalPendente,
          jurosPendente: pend.jurosPendente,
          totalJuros: pend.totalJuros,
          proximoVencimento: proxima ? proxima.data_vencimento : null,
          telefone: c?.telefone ?? null,
        };
      });
      setContratos(detalhados);
      setReputacao(calcularReputacao(todasParcelas ?? []));

      const pendentes = (todasParcelas ?? [])
        .filter((p) => p.status !== "pago")
        .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
      const proxima = pendentes[0];
      if (proxima) {
        const ct = cts.find((c) => c.id === proxima.contrato_id)!;
        const { valorJuros, valorPrincipal } = componentesDaParcela(
          ct.modalidade as Modalidade,
          Number(ct.valor_emprestado),
          Number(ct.taxa_juros),
          ct.numero_parcelas,
          proxima
        );
        const pend = pendenciaParcela(valorJuros, valorPrincipal, proxima.valor_pago ?? 0);
        setProximaCobranca({
          total: Number(proxima.valor) - Number(proxima.valor_pago ?? 0),
          juros: pend.jurosPendente,
          data: proxima.data_vencimento,
        });
      } else {
        setProximaCobranca(null);
      }
    } else {
      setContratos([]);
      setReputacao({ tag: "Sem histórico ainda", cor: "muted" });
      setProximaCobranca(null);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();
    supabase
      .from("configuracoes")
      .select("mensagem_cobranca, chave_pix")
      .eq("empresa_id", empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mensagem_cobranca) setMensagemTemplate(data.mensagem_cobranca);
        if (data?.chave_pix) setChavePix(data.chave_pix);
      });
  }, [empresaId]);

  async function salvar() {
    if (!cliente) return;
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("clientes")
      .update({
        nome: cliente.nome,
        cpf: cliente.cpf,
        rg: cliente.rg,
        cnh: cliente.cnh,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        observacoes: cliente.observacoes,
      })
      .eq("id", id);
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function excluirCliente() {
    const mensagem =
      contratos.length > 0
        ? `Esse cliente tem ${contratos.length} empréstimo(s) cadastrado(s). Excluir o cliente vai apagar TODO o histórico de empréstimos, parcelas e pagamentos dele também, e isso não pode ser desfeito. Quer mesmo excluir?`
        : "Tem certeza que quer excluir esse cliente? Isso não pode ser desfeito.";
    const confirmado = window.confirm(mensagem);
    if (!confirmado) return;

    const supabase = createClient();
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      alert("Não foi possível excluir: " + error.message);
      console.error(error);
      return;
    }
    router.push("/clientes");
  }

  if (!cliente) return <p className="text-sm text-ink-muted">Carregando...</p>;

  const linkWhatsAppGeral =
    cliente.telefone &&
    linkWhatsApp(
      cliente.telefone,
      montarMensagem(mensagemTemplate, {
        nome: cliente.nome,
        total: proximaCobranca ? proximaCobranca.total.toLocaleString("pt-BR") : "",
        juros: proximaCobranca ? proximaCobranca.juros.toLocaleString("pt-BR") : "",
        data: proximaCobranca ? new Date(proximaCobranca.data + "T00:00:00").toLocaleDateString("pt-BR") : "",
        pix: chavePix,
      })
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-semibold text-ink">{cliente.nome}</h2>
      </div>

      {reputacao && (
        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${corReputacao[reputacao.cor]}`}>
          {reputacao.tag}
        </span>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setAba("dados")}
          className={`flex-1 text-sm py-2 rounded-lg border ${
            aba === "dados" ? "bg-primary text-[#06140F] border-primary font-medium" : "border-surface-border text-ink-muted"
          }`}
        >
          Dados
        </button>
        <button
          onClick={() => setAba("emprestimos")}
          className={`flex-1 text-sm py-2 rounded-lg border ${
            aba === "emprestimos" ? "bg-primary text-[#06140F] border-primary font-medium" : "border-surface-border text-ink-muted"
          }`}
        >
          Empréstimos ({contratos.length})
        </button>
      </div>

      {aba === "dados" ? (
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="Nome completo"
            value={cliente.nome}
            onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="CPF"
            value={cliente.cpf ?? ""}
            onChange={(e) => setCliente({ ...cliente, cpf: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="RG"
            value={cliente.rg ?? ""}
            onChange={(e) => setCliente({ ...cliente, rg: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="CNH"
            value={cliente.cnh ?? ""}
            onChange={(e) => setCliente({ ...cliente, cnh: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="Telefone (com DDD)"
            value={cliente.telefone ?? ""}
            onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="Endereço"
            value={cliente.endereco ?? ""}
            onChange={(e) => setCliente({ ...cliente, endereco: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
            placeholder="Observações"
            rows={3}
            value={cliente.observacoes ?? ""}
            onChange={(e) => setCliente({ ...cliente, observacoes: e.target.value })}
          />

          {linkWhatsAppGeral && (
            <a
              href={linkWhatsAppGeral}
              target="_blank"
              className="btn-grande w-full border border-surface-border text-ink text-sm py-3"
            >
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
          )}

          <button
            onClick={salvar}
            disabled={salvando}
            className="btn-grande w-full bg-primary text-[#06140F] disabled:opacity-50"
          >
            <Save size={18} /> {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar alterações"}
          </button>

          <button
            onClick={excluirCliente}
            className="btn-grande w-full border border-danger/40 text-danger text-sm py-3"
          >
            <Trash2 size={18} /> Excluir cliente
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {contratos.length === 0 && <p className="text-sm text-ink-muted">Nenhum empréstimo ainda.</p>}
          {contratos.map((c) => {
            const linkContrato =
              c.telefone &&
              linkWhatsApp(
                c.telefone,
                montarMensagem(mensagemTemplate, {
                  nome: cliente.nome,
                  total: c.faltaPagar.toLocaleString("pt-BR"),
                  juros: c.jurosPendente.toLocaleString("pt-BR"),
                  data: c.proximoVencimento
                    ? new Date(c.proximoVencimento + "T00:00:00").toLocaleDateString("pt-BR")
                    : "",
                  pix: chavePix,
                })
              );
            return (
              <li key={c.id} className="card space-y-2">
                <a href={`/contratos/${c.id}`} className="block space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink money">R$ {c.valor_emprestado.toLocaleString("pt-BR")} emprestado</p>
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-surface-hover text-ink-muted">
                      {c.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-surface-border">
                    <div>
                      <p className="text-xs text-ink-faint">Juros total</p>
                      <p className="money text-ink">R$ {c.totalJuros.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-faint">Já pagou</p>
                      <p className="money text-primary">R$ {c.valorPago.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-faint">Falta (seu dinheiro)</p>
                      <p className="money text-ink">R$ {c.principalPendente.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-faint">Falta (juros)</p>
                      <p className="money text-primary">R$ {c.jurosPendente.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </a>
                {linkContrato && c.status !== "quitado" && c.status !== "cancelado" && (
                  <a
                    href={linkContrato}
                    target="_blank"
                    className="btn-grande w-full bg-primary text-white text-sm py-2"
                  >
                    <MessageCircle size={18} /> Cobrar no WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}