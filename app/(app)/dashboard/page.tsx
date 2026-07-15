"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Wallet, MessageCircle, Plus, UserPlus, Calculator, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/hooks/useEmpresa";
import {
  calcularPendenciasContrato,
  componentesDaParcela,
  pendenciaParcela,
  recebidoParcela,
  type Modalidade,
} from "@/lib/calculoEmprestimo";
import { MENSAGEM_PADRAO, montarMensagem, linkWhatsApp } from "@/lib/mensagemCobranca";

type Resumo = {
  principalPendente: number;
  jurosPendente: number;
  contratosAtrasados: number;
  principalRecebido: number;
  jurosRecebido: number;
};

type ItemLista = {
  contratoId: string;
  nome: string;
  telefone: string | null;
  total: number;
  juros: number;
  data: string;
};

const hoje = new Date().toISOString().slice(0, 10);
const DIAS_PROXIMOS = 7;
const emDias = new Date();
emDias.setDate(emDias.getDate() + DIAS_PROXIMOS);
const limiteProximos = emDias.toISOString().slice(0, 10);

function Card({ icon: Icon, label, value, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "text-primary",
    danger: "text-danger",
    warning: "text-warning",
  };
  return (
    <div className="card flex items-center gap-3">
      <Icon className={tones[tone]} size={28} />
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-xl font-bold money text-ink">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { empresaId } = useEmpresa();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [atrasados, setAtrasados] = useState<ItemLista[]>([]);
  const [proximos, setProximos] = useState<ItemLista[]>([]);
  const [mensagemTemplate, setMensagemTemplate] = useState(MENSAGEM_PADRAO);
  const [chavePix, setChavePix] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function carregar() {
      const [{ data: contratos }, { data: parcelas }, { data: cfg }] = await Promise.all([
        supabase
          .from("contratos")
          .select("id, valor_emprestado, taxa_juros, numero_parcelas, modalidade, status, clientes(nome, telefone)"),
        supabase
          .from("parcelas")
          .select("id, contrato_id, numero, valor, valor_pago, valor_juros, valor_principal, status, data_vencimento"),
        empresaId
          ? supabase.from("configuracoes").select("mensagem_cobranca, chave_pix").eq("empresa_id", empresaId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cfg?.mensagem_cobranca) setMensagemTemplate(cfg.mensagem_cobranca);
      if (cfg?.chave_pix) setChavePix(cfg.chave_pix);

      const contratoPorId = new Map((contratos ?? []).map((c) => [c.id, c]));
      const parcelasPorContrato = new Map<string, any[]>();
      (parcelas ?? []).forEach((p) => {
        const lista = parcelasPorContrato.get(p.contrato_id) ?? [];
        lista.push(p);
        parcelasPorContrato.set(p.contrato_id, lista);
      });

      let principalPendente = 0;
      let jurosPendente = 0;
      let principalRecebido = 0;
      let jurosRecebido = 0;

      (contratos ?? [])
        .filter((c) => c.status !== "cancelado")
        .forEach((c) => {
          const parcelasContrato = parcelasPorContrato.get(c.id) ?? [];
          const pend = calcularPendenciasContrato(
            c.modalidade as Modalidade,
            Number(c.valor_emprestado),
            Number(c.taxa_juros),
            c.numero_parcelas,
            parcelasContrato
          );
          principalPendente += pend.principalPendente;
          jurosPendente += pend.jurosPendente;

          parcelasContrato.forEach((p) => {
            const { valorJuros } = componentesDaParcela(
              c.modalidade as Modalidade,
              Number(c.valor_emprestado),
              Number(c.taxa_juros),
              c.numero_parcelas,
              p
            );
            const recebido = recebidoParcela(valorJuros, p.valor_pago ?? 0);
            principalRecebido += recebido.principalRecebido;
            jurosRecebido += recebido.jurosRecebido;
          });
        });

      const contratosAtrasados = (contratos ?? []).filter((c) => c.status === "atrasado").length;
      setResumo({ principalPendente, jurosPendente, contratosAtrasados, principalRecebido, jurosRecebido });

      const listaAtrasados: ItemLista[] = [];
      const listaProximos: ItemLista[] = [];

      (parcelas ?? [])
        .filter((p) => p.status !== "pago")
        .forEach((p) => {
          const c = contratoPorId.get(p.contrato_id) as any;
          if (!c || c.status === "cancelado") return;

          const { valorJuros, valorPrincipal } = componentesDaParcela(
            c.modalidade as Modalidade,
            Number(c.valor_emprestado),
            Number(c.taxa_juros),
            c.numero_parcelas,
            p
          );
          const pendParcela = pendenciaParcela(valorJuros, valorPrincipal, p.valor_pago ?? 0);
          const total = Number(p.valor) - Number(p.valor_pago ?? 0);

          const item: ItemLista = {
            contratoId: p.contrato_id,
            nome: c.clientes?.nome ?? "Cliente",
            telefone: c.clientes?.telefone ?? null,
            total,
            juros: pendParcela.jurosPendente,
            data: p.data_vencimento,
          };
          if (p.data_vencimento < hoje) {
            listaAtrasados.push(item);
          } else if (p.data_vencimento <= limiteProximos) {
            listaProximos.push(item);
          }
        });

      listaProximos.sort((a, b) => a.data.localeCompare(b.data));
      setAtrasados(listaAtrasados);
      setProximos(listaProximos);
    }

    carregar();
  }, [empresaId]);

  if (!resumo) return <p className="text-sm text-ink-muted">Carregando...</p>;

  const totalAReceber = resumo.principalPendente + resumo.jurosPendente;

  function botaoCobrar(item: ItemLista, label: string) {
    if (!item.telefone) return null;
    const link = linkWhatsApp(
      item.telefone,
      montarMensagem(mensagemTemplate, {
        nome: item.nome,
        total: item.total.toLocaleString("pt-BR"),
        juros: item.juros.toLocaleString("pt-BR"),
        data: new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR"),
        pix: chavePix,
      })
    );
    return (
      <a href={link} target="_blank" className="btn-grande bg-primary text-[#06140F] text-sm py-2 px-4">
        <MessageCircle size={18} /> {label}
      </a>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <a href="/contratos/novo" className="btn-grande flex-col bg-primary text-[#06140F] text-xs py-3 gap-1">
          <Plus size={20} /> Novo empréstimo
        </a>
        <a href="/clientes/novo" className="btn-grande flex-col border border-surface-border text-ink text-xs py-3 gap-1">
          <UserPlus size={20} /> Novo cliente
        </a>
        <a href="/calculadora" className="btn-grande flex-col border border-surface-border text-ink text-xs py-3 gap-1">
          <Calculator size={20} /> Calcular
        </a>
      </div>

      <div className="card space-y-2">
        <p className="text-sm text-ink-muted">Total a receber</p>
        <p className="text-2xl font-bold money text-ink">R$ {totalAReceber.toLocaleString("pt-BR")}</p>
        <div className="flex gap-4 pt-1 border-t border-surface-border">
          <div>
            <p className="text-xs text-ink-faint">Dinheiro próprio</p>
            <p className="text-sm font-semibold money text-ink">R$ {resumo.principalPendente.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Juros</p>
            <p className="text-sm font-semibold money text-primary">R$ {resumo.jurosPendente.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>

      <div className="card space-y-2">
        <p className="text-sm text-ink-muted">Já recebido</p>
        <p className="text-2xl font-bold money text-primary">
          R$ {(resumo.principalRecebido + resumo.jurosRecebido).toLocaleString("pt-BR")}
        </p>
        <div className="flex gap-4 pt-1 border-t border-surface-border">
          <div>
            <p className="text-xs text-ink-faint">Seu dinheiro de volta</p>
            <p className="text-sm font-semibold money text-ink">R$ {resumo.principalRecebido.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Juros</p>
            <p className="text-sm font-semibold money text-primary">R$ {resumo.jurosRecebido.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card icon={Wallet} label="Dinheiro na rua" value={`R$ ${resumo.principalPendente.toLocaleString("pt-BR")}`} />
        <Card icon={AlertTriangle} label="Contratos atrasados" value={resumo.contratosAtrasados} tone="danger" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-ink">Atrasados de hoje</h2>
          {atrasados.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-danger-soft text-danger font-medium">{atrasados.length}</span>
          )}
        </div>
        {atrasados.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum atraso hoje 🎉</p>
        ) : (
          <ul className="space-y-2">
            {atrasados.map((c, i) => (
              <li key={`${c.contratoId}-${i}`} className="card flex items-center justify-between">
                <a href={`/contratos/${c.contratoId}`}>
                  <p className="font-medium text-ink">{c.nome}</p>
                  <p className="text-sm text-danger money">R$ {c.total.toLocaleString("pt-BR")}</p>
                </a>
                {botaoCobrar(c, "Cobrar")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-ink flex items-center gap-1">
            <CalendarClock size={18} className="text-ink-muted" /> Próximos pagamentos
          </h2>
          {proximos.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-ink-muted font-medium">{proximos.length}</span>
          )}
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-ink-muted">Nada previsto pros próximos {DIAS_PROXIMOS} dias.</p>
        ) : (
          <ul className="space-y-2">
            {proximos.map((c, i) => (
              <li key={`${c.contratoId}-${i}`} className="card flex items-center justify-between">
                <a href={`/contratos/${c.contratoId}`}>
                  <p className="font-medium text-ink">{c.nome}</p>
                  <p className="text-sm text-ink-muted">
                    <span className="money text-ink">R$ {c.total.toLocaleString("pt-BR")}</span> ·{" "}
                    {new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </a>
                {botaoCobrar(c, "Cobrar antecipado")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}