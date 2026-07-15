"use client";

import { useEffect, useState } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/lib/useEmpresa";
import { descreverVencimento } from "@/lib/datas";
import { calcularPendenciasContrato, type Modalidade } from "@/lib/calculoEmprestimo";
import { MENSAGEM_PADRAO, montarMensagem, linkWhatsApp } from "@/lib/mensagemCobranca";

type Contrato = {
  id: string;
  valor_emprestado: number;
  taxa_juros: number;
  numero_parcelas: number;
  status: "ativo" | "quitado" | "atrasado" | "cancelado";
  modalidade: Modalidade;
  clientes: { nome: string; telefone: string | null } | null;
  faltaTotal: number;
  faltaJuros: number;
  proximoVencimento: string | null;
};

const nomeModalidadeCurto: Record<Modalidade, string> = {
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
  const { empresaId } = useEmpresa();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [mensagemTemplate, setMensagemTemplate] = useState(MENSAGEM_PADRAO);
  const [chavePix, setChavePix] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function carregar() {
      const [{ data: cts }, { data: cfg }] = await Promise.all([
        supabase
          .from("contratos")
          .select("id, valor_emprestado, taxa_juros, numero_parcelas, status, modalidade, clientes(nome, telefone)")
          .order("created_at", { ascending: false }),
        empresaId
          ? supabase.from("configuracoes").select("mensagem_cobranca, chave_pix").eq("empresa_id", empresaId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cfg?.mensagem_cobranca) setMensagemTemplate(cfg.mensagem_cobranca);
      if (cfg?.chave_pix) setChavePix(cfg.chave_pix);

      if (!cts || cts.length === 0) {
        setContratos([]);
        return;
      }

      const { data: parcelas } = await supabase
        .from("parcelas")
        .select("contrato_id, numero, valor, valor_pago, valor_juros, valor_principal, status, data_vencimento")
        .in("contrato_id", cts.map((c) => c.id));

      const completos: Contrato[] = (cts as any[]).map((c) => {
        const parcelasDoContrato = (parcelas ?? []).filter((p) => p.contrato_id === c.id);
        const pend = calcularPendenciasContrato(
          c.modalidade as Modalidade,
          Number(c.valor_emprestado),
          Number(c.taxa_juros),
          c.numero_parcelas,
          parcelasDoContrato
        );
        const proxima = parcelasDoContrato
          .filter((p) => p.status !== "pago")
          .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];
        return {
          ...c,
          faltaTotal: pend.faltaPagar,
          faltaJuros: pend.jurosPendente,
          proximoVencimento: proxima ? proxima.data_vencimento : null,
        };
      });
      setContratos(completos);
    }

    carregar();
  }, [empresaId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-ink">Empréstimos</h2>
        <a href="/contratos/novo" className="btn-grande bg-primary text-white px-4 py-3">
          <Plus size={20} /> Novo
        </a>
      </div>

      <ul className="space-y-2">
        {contratos.map((c) => {
          const link =
            c.clientes?.telefone &&
            linkWhatsApp(
              c.clientes.telefone,
              montarMensagem(mensagemTemplate, {
                nome: c.clientes.nome,
                total: c.faltaTotal.toLocaleString("pt-BR"),
                juros: c.faltaJuros.toLocaleString("pt-BR"),
                data: c.proximoVencimento
                  ? new Date(c.proximoVencimento + "T00:00:00").toLocaleDateString("pt-BR")
                  : "",
                pix: chavePix,
              })
            );
          return (
            <li key={c.id} className="card space-y-2">
              <a href={`/contratos/${c.id}`} className="flex items-center justify-between block">
                <div>
                  <p className="font-medium text-ink">{c.clientes?.nome ?? "Cliente"}</p>
                  <p className="text-sm text-ink-muted money">R$ {c.valor_emprestado.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-ink-faint">{nomeModalidadeCurto[c.modalidade]}</p>
                  {c.proximoVencimento && c.status !== "quitado" && c.status !== "cancelado" && (
                    <p className={`text-xs mt-1 ${descreverVencimento(c.proximoVencimento).classe}`}>
                      {descreverVencimento(c.proximoVencimento).texto}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCor[c.status]}`}>
                  {c.status}
                </span>
              </a>
              {link && c.status !== "quitado" && c.status !== "cancelado" && (
                <a
                  href={link}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="btn-grande w-full bg-primary text-white text-sm py-2"
                >
                  <MessageCircle size={18} /> Cobrar no WhatsApp
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}