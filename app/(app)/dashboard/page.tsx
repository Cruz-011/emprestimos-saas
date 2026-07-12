"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Wallet,
  MessageCircle,
  Plus,
  UserPlus,
  Calculator,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/lib/useEmpresa";
import { calcularEmprestimo, type Modalidade } from "@/lib/calculoEmprestimo";

type Resumo = {
  principalPendente: number;
  jurosPendente: number;
  contratosAtrasados: number;
};

type AtrasoHoje = {
  contratoId: string;
  nome: string;
  telefone: string | null;
  valor: number;
};

const hoje = new Date().toISOString().slice(0, 10);

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
  const [atrasados, setAtrasados] = useState<AtrasoHoje[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function carregar() {
      const [{ data: contratos }, { data: parcelas }] = await Promise.all([
        supabase
          .from("contratos")
          .select(
            "id, valor_emprestado, taxa_juros, numero_parcelas, modalidade, status, clientes(nome, telefone)",
          ),
        supabase
          .from("parcelas")
          .select(
            "id, contrato_id, numero, valor, valor_pago, valor_juros, valor_principal, status, data_vencimento",
          ),
      ]);

      const contratoPorId = new Map((contratos ?? []).map((c) => [c.id, c]));
      const calculoPorContrato = new Map<
        string,
        ReturnType<typeof calcularEmprestimo>
      >();

      let principalPendente = 0;
      let jurosPendente = 0;
      const atrasadasPorContrato = new Map<string, number>();

      (parcelas ?? [])
        .filter((p) => p.status !== "pago")
        .forEach((p) => {
          const contrato = contratoPorId.get(p.contrato_id) as any;
          if (!contrato || contrato.status === "cancelado") return;

          let valorJuros = p.valor_juros;
          let valorPrincipal = p.valor_principal;

          if (valorJuros == null || valorPrincipal == null) {
            if (!calculoPorContrato.has(p.contrato_id)) {
              calculoPorContrato.set(
                p.contrato_id,
                calcularEmprestimo(
                  contrato.modalidade as Modalidade,
                  Number(contrato.valor_emprestado),
                  Number(contrato.taxa_juros),
                  contrato.numero_parcelas,
                ),
              );
            }
            const calc = calculoPorContrato.get(p.contrato_id);
            const componente = calc?.parcelas.find(
              (cp) => cp.numero === p.numero,
            );
            valorJuros = componente?.valorJuros ?? 0;
            valorPrincipal = componente?.valorPrincipal ?? 0;
          }

          const fracaoPendente =
            p.valor > 0
              ? (Number(p.valor) - Number(p.valor_pago ?? 0)) / Number(p.valor)
              : 0;
          principalPendente += Number(valorPrincipal) * fracaoPendente;
          jurosPendente += Number(valorJuros) * fracaoPendente;

          if (p.data_vencimento < hoje) {
            const restante = Number(p.valor) - Number(p.valor_pago ?? 0);
            atrasadasPorContrato.set(
              p.contrato_id,
              (atrasadasPorContrato.get(p.contrato_id) ?? 0) + restante,
            );
          }
        });

      const contratosAtrasados = (contratos ?? []).filter(
        (c) => c.status === "atrasado",
      ).length;
      setResumo({ principalPendente, jurosPendente, contratosAtrasados });

      const lista: AtrasoHoje[] = [];
      atrasadasPorContrato.forEach((valor, contratoId) => {
        const c = contratoPorId.get(contratoId) as any;
        if (c)
          lista.push({
            contratoId,
            nome: c.clientes?.nome ?? "Cliente",
            telefone: c.clientes?.telefone ?? null,
            valor,
          });
      });
      setAtrasados(lista);
    }

    carregar();
  }, [empresaId]);

  if (!resumo) return <p className="text-sm text-ink-muted">Carregando...</p>;

  const totalAReceber = resumo.principalPendente + resumo.jurosPendente;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <a
          href="/contratos/novo"
          className="btn-grande flex-col bg-primary text-[#06140F] text-xs py-3 gap-1"
        >
          <Plus size={20} /> Novo empréstimo
        </a>
        <a
          href="/clientes/novo"
          className="btn-grande flex-col border border-surface-border text-ink text-xs py-3 gap-1"
        >
          <UserPlus size={20} /> Novo cliente
        </a>
        <a
          href="/calculadora"
          className="btn-grande flex-col border border-surface-border text-ink text-xs py-3 gap-1"
        >
          <Calculator size={20} /> Calcular
        </a>
      </div>

      <div className="card space-y-2">
        <p className="text-sm text-ink-muted">Total a receber</p>
        <p className="text-2xl font-bold money text-ink">
          R$ {totalAReceber.toLocaleString("pt-BR")}
        </p>
        <div className="flex gap-4 pt-1 border-t border-surface-border">
          <div>
            <p className="text-xs text-ink-faint">Dinheiro próprio</p>
            <p className="text-sm font-semibold money text-ink">
              R$ {resumo.principalPendente.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Juros</p>
            <p className="text-sm font-semibold money text-primary">
              R$ {resumo.jurosPendente.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card
          icon={Wallet}
          label="Dinheiro na rua"
          value={`R$ ${resumo.principalPendente.toLocaleString("pt-BR")}`}
        />
        <Card
          icon={AlertTriangle}
          label="Contratos atrasados"
          value={resumo.contratosAtrasados}
          tone="danger"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-ink">
            Atrasados de hoje
          </h2>
          {atrasados.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-danger-soft text-danger font-medium">
              {atrasados.length}
            </span>
          )}
        </div>
        {atrasados.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum atraso hoje 🎉</p>
        ) : (
          <ul className="space-y-2">
            {atrasados.map((c) => (
              <li
                key={c.contratoId}
                className="card flex items-center justify-between"
              >
                <a href={`/contratos/${c.contratoId}`}>
                  <p className="font-medium text-ink">{c.nome}</p>
                  <p className="text-sm text-danger money">
                    R$ {c.valor.toLocaleString("pt-BR")}
                  </p>
                </a>

                {c.telefone && (
                  <a
                    href={`https://wa.me/${c.telefone}`}
                    target="_blank"
                    className="btn-grande bg-primary text-[#06140F] text-sm py-2 px-4"
                  >
                    <MessageCircle size={18} /> Cobrar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
