"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { CampoMoeda } from "@/components/CampoMoeda";
import {
  calcularEmprestimo,
  labelModalidade,
  labelPeriodicidade,
  type Modalidade,
  type Periodicidade,
} from "@/lib/calculoEmprestimo";

export default function CalculadoraPage() {
  const [modalidade, setModalidade] = useState<Modalidade>("parcelas_fixas");
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [valor, setValor] = useState(0);
  const [taxa, setTaxa] = useState("");
  const [parcelas, setParcelas] = useState("");

  const taxaNum = parseFloat(taxa.replace(",", ".")) || 0;
  const parcelasNum = parseInt(parcelas) || 0;
  const resultado = calcularEmprestimo(modalidade, valor, taxaNum, parcelasNum);
  const labelPeriodo = labelPeriodicidade[periodicidade];

  function textoWhatsApp() {
    if (!resultado) return "";
    let linhas = [`Simulação de empréstimo — R$ ${valor.toLocaleString("pt-BR")}`, ""];
    if (modalidade === "rolagem") {
      const juros = resultado.parcelas[0]?.valor ?? 0;
      linhas.push(`${parcelasNum - 1}x de R$ ${juros.toLocaleString("pt-BR")} (só juros)`);
      linhas.push(`última parcela: R$ ${resultado.parcelas.at(-1)?.valor.toLocaleString("pt-BR")} (juros + valor emprestado)`);
    } else {
      linhas.push(`${parcelasNum}x de R$ ${resultado.parcelas[0]?.valor.toLocaleString("pt-BR")}`);
    }
    linhas.push("");
    linhas.push(`Total a pagar: R$ ${resultado.totalAPagar.toLocaleString("pt-BR")}`);
    return linhas.join("\n");
  }

  function compartilhar() {
    const texto = encodeURIComponent(textoWhatsApp());
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-ink">Calculadora</h2>
      <p className="text-sm text-ink-muted">
        Simula um empréstimo sem precisar cadastrar cliente nem criar nada — só pra ver como fica e mandar pro
        interessado.
      </p>

      <div>
        <p className="text-xs text-ink-muted mb-1">Forma do empréstimo</p>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(labelModalidade) as Modalidade[]).map((m) => (
            <button
              key={m}
              onClick={() => setModalidade(m)}
              className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                modalidade === m ? "bg-primary-soft border-primary text-ink" : "border-surface-border text-ink-muted"
              }`}
            >
              {labelModalidade[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-ink-muted mb-1">Cobrança</p>
        <div className="flex gap-2">
          {(Object.keys(labelPeriodicidade) as Periodicidade[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodicidade(p)}
              className={`flex-1 text-sm py-2 rounded-lg border ${
                periodicidade === p ? "bg-primary text-[#06140F] border-primary font-medium" : "border-surface-border text-ink-muted"
              }`}
            >
              {labelPeriodicidade[p]}
            </button>
          ))}
        </div>
      </div>

      <CampoMoeda
        valor={valor}
        onChange={setValor}
        placeholder="Valor emprestado (R$)"
        className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
      />
      <input
        inputMode="decimal"
        placeholder={`Taxa de juros ${labelPeriodo} (%)`}
        className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
        value={taxa}
        onChange={(e) => setTaxa(e.target.value)}
      />
      <input
        inputMode="numeric"
        placeholder="Número de parcelas / períodos"
        className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
        value={parcelas}
        onChange={(e) => setParcelas(e.target.value)}
      />

      {resultado && (
        <div className="card bg-primary-soft border-primary/20 space-y-1">
          {modalidade === "rolagem" ? (
            <>
              <p className="text-sm text-ink-muted">
                {parcelasNum - 1}x só juros:{" "}
                <span className="font-bold text-primary money">R$ {resultado.parcelas[0]?.valor.toLocaleString("pt-BR")}</span>
              </p>
              <p className="text-sm text-ink-muted">
                Última (juros + valor emprestado):{" "}
                <span className="font-bold text-primary money">
                  R$ {resultado.parcelas.at(-1)?.valor.toLocaleString("pt-BR")}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {parcelasNum}x de{" "}
              <span className="font-bold text-primary money">R$ {resultado.parcelas[0]?.valor.toLocaleString("pt-BR")}</span>
            </p>
          )}
          <p className="text-sm pt-1 border-t border-surface-border text-ink">
            Total a pagar: <span className="font-bold money">R$ {resultado.totalAPagar.toLocaleString("pt-BR")}</span>
          </p>
          <p className="text-xs text-ink-faint">
            Juros total: R$ {resultado.totalJuros.toLocaleString("pt-BR")}
          </p>
        </div>
      )}

      {resultado && (
        <button onClick={compartilhar} className="btn-grande w-full bg-primary text-[#06140F]">
          <Share2 size={18} /> Mandar pelo WhatsApp
        </button>
      )}
    </div>
  );
}