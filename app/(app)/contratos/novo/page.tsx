"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/hooks/useEmpresa";
import { CampoMoeda } from "@/components/CampoMoeda";
import {
  calcularEmprestimo,
  taxaPorValorDeParcela,
  labelModalidade,
  labelPeriodicidade,
  type Modalidade,
  type Periodicidade,
} from "@/lib/calculoEmprestimo";

type Cliente = { id: string; nome: string };
type DefinirPor = "taxa" | "valor_parcela";

export default function NovoContratoPage() {
  const router = useRouter();
  const { empresaId, usuarioId, carregando } = useEmpresa();

  const [buscaCliente, setBuscaCliente] = useState("");
  const [opcoes, setOpcoes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [modalidade, setModalidade] = useState<Modalidade>("parcelas_fixas");
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [definirPor, setDefinirPor] = useState<DefinirPor>("taxa");

  const [valor, setValor] = useState(0);
  const [taxa, setTaxa] = useState("");
  const [valorParcelaDesejado, setValorParcelaDesejado] = useState(0);
  const [parcelas, setParcelas] = useState("");
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState("");
  const [jaEmAndamento, setJaEmAndamento] = useState(false);
  const [valorJaRecebido, setValorJaRecebido] = useState(0);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (clienteSelecionado || !buscaCliente.trim()) {
      setOpcoes([]);
      return;
    }
    const supabase = createClient();
    const t = setTimeout(async () => {
      const { data } = await supabase.from("clientes").select("id, nome").ilike("nome", `%${buscaCliente}%`).limit(6);
      setOpcoes(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [buscaCliente, clienteSelecionado]);

  // "definir por valor de parcela" só faz sentido no modelo de parcelas fixas
  useEffect(() => {
    if (modalidade !== "parcelas_fixas" && definirPor === "valor_parcela") {
      setDefinirPor("taxa");
    }
  }, [modalidade, definirPor]);

  const parcelasNum = parseInt(parcelas) || 0;
  const taxaDigitada = parseFloat(taxa.replace(",", ".")) || 0;
  const taxaEfetiva =
    definirPor === "valor_parcela" ? taxaPorValorDeParcela(valor, parcelasNum, valorParcelaDesejado) : taxaDigitada;

  const resultado = calcularEmprestimo(modalidade, valor, taxaEfetiva, parcelasNum);
  const labelPeriodo = labelPeriodicidade[periodicidade];

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId || !clienteSelecionado) return;
    setSalvando(true);
    setErro("");

    const supabase = createClient();
    let error;
    if (jaEmAndamento) {
      ({ error } = await supabase.rpc("importar_contrato_existente", {
        p_empresa_id: empresaId,
        p_cliente_id: clienteSelecionado.id,
        p_valor_emprestado: valor,
        p_taxa_juros: taxaEfetiva,
        p_numero_parcelas: parcelasNum,
        p_data_primeiro_vencimento: dataPrimeiroVencimento,
        p_valor_ja_recebido: valorJaRecebido,
        p_usuario_id: usuarioId,
        p_modalidade: modalidade,
        p_periodicidade: periodicidade,
      }));
    } else {
      ({ error } = await supabase.from("contratos").insert({
        empresa_id: empresaId,
        cliente_id: clienteSelecionado.id,
        valor_emprestado: valor,
        taxa_juros: taxaEfetiva,
        numero_parcelas: parcelasNum,
        data_primeiro_vencimento: dataPrimeiroVencimento,
        modalidade,
        periodicidade,
        created_by: usuarioId,
      }));
    }

    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    router.push("/contratos");
  }

  const inputClasse =
    "w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-semibold text-ink">Novo empréstimo</h2>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        {/* Cliente */}
        {clienteSelecionado ? (
          <div className="card flex items-center justify-between">
            <span className="flex items-center gap-2 text-ink">
              <Check size={18} className="text-primary" /> {clienteSelecionado.nome}
            </span>
            <button
              type="button"
              className="text-sm text-ink-muted underline"
              onClick={() => {
                setClienteSelecionado(null);
                setBuscaCliente("");
              }}
            >
              trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="card flex items-center gap-2 py-2">
              <Search size={18} className="text-ink-faint" />
              <input
                required
                className="flex-1 outline-none bg-transparent text-base text-ink placeholder:text-ink-faint"
                placeholder="Buscar cliente pelo nome"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
            </div>
            {opcoes.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full card p-1 space-y-1">
                {opcoes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-hover text-ink"
                      onClick={() => setClienteSelecionado(c)}
                    >
                      {c.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ink-faint mt-1">
              Não achou? <a href="/clientes/novo" className="underline">Cadastrar cliente novo</a>
            </p>
          </div>
        )}

        {/* Forma do empréstimo */}
        <div>
          <p className="text-xs text-ink-muted mb-1">Forma do empréstimo</p>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(labelModalidade) as Modalidade[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setModalidade(m)}
                className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                  modalidade === m ? "bg-primary-soft border-primary text-ink" : "border-surface-border text-ink-muted"
                }`}
              >
                <p className="text-sm font-medium">{labelModalidade[m]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Periodicidade */}
        <div>
          <p className="text-xs text-ink-muted mb-1">Cobrança</p>
          <div className="flex gap-2">
            {(Object.keys(labelPeriodicidade) as Periodicidade[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPeriodicidade(p)}
                className={`flex-1 text-sm py-2 rounded-lg border ${
                  periodicidade === p
                    ? "bg-primary text-[#06140F] border-primary font-medium"
                    : "border-surface-border text-ink-muted"
                }`}
              >
                {labelPeriodicidade[p]}
              </button>
            ))}
          </div>
        </div>

        <CampoMoeda valor={valor} onChange={setValor} placeholder="Valor emprestado (R$)" className={inputClasse} />

        {/* Definir por taxa ou por valor da parcela (só no modelo de parcelas fixas) */}
        {modalidade === "parcelas_fixas" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDefinirPor("taxa")}
              className={`flex-1 text-xs py-2 rounded-lg border ${
                definirPor === "taxa" ? "bg-primary text-[#06140F] border-primary font-medium" : "border-surface-border text-ink-muted"
              }`}
            >
              Definir por taxa
            </button>
            <button
              type="button"
              onClick={() => setDefinirPor("valor_parcela")}
              className={`flex-1 text-xs py-2 rounded-lg border ${
                definirPor === "valor_parcela"
                  ? "bg-primary text-[#06140F] border-primary font-medium"
                  : "border-surface-border text-ink-muted"
              }`}
            >
              Definir por valor da parcela
            </button>
          </div>
        )}

        {definirPor === "taxa" ? (
          <input
            required
            inputMode="decimal"
            placeholder={`Taxa de juros ${labelPeriodo} (%)`}
            className={inputClasse}
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
          />
        ) : (
          <CampoMoeda
            valor={valorParcelaDesejado}
            onChange={setValorParcelaDesejado}
            placeholder="Valor de cada parcela (R$)"
            className={inputClasse}
          />
        )}

        <input
          required
          inputMode="numeric"
          placeholder="Número de parcelas / períodos"
          className={inputClasse}
          value={parcelas}
          onChange={(e) => setParcelas(e.target.value)}
        />
        <div>
          <label className="text-xs text-ink-muted">Primeiro vencimento</label>
          <input required type="date" className={inputClasse} value={dataPrimeiroVencimento} onChange={(e) => setDataPrimeiroVencimento(e.target.value)} />
        </div>

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
            {definirPor === "valor_parcela" && (
              <p className="text-xs text-ink-faint">Taxa equivalente: {taxaEfetiva.toFixed(2)}% {labelPeriodo}</p>
            )}
            <p className="text-sm pt-1 border-t border-surface-border text-ink">
              Valor total do empréstimo: <span className="font-bold money">R$ {resultado.totalAPagar.toLocaleString("pt-BR")}</span>
            </p>
          </div>
        )}

        <label className="card flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 accent-primary"
            checked={jaEmAndamento}
            onChange={(e) => setJaEmAndamento(e.target.checked)}
          />
          <span className="text-sm text-ink">Esse empréstimo já está em andamento (cliente já pagou alguma coisa)</span>
        </label>

        {jaEmAndamento && (
          <div className="space-y-1">
            <CampoMoeda
              valor={valorJaRecebido}
              onChange={setValorJaRecebido}
              placeholder="Quanto o cliente já pagou até hoje (R$)"
              className={inputClasse}
            />
            <p className="text-xs text-ink-faint">
              Esse valor não entra no caixa de hoje — ele só marca as parcelas mais antigas como pagas.
            </p>
          </div>
        )}

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={salvando || carregando || !clienteSelecionado}
          className="btn-grande w-full bg-primary text-[#06140F] disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Criar empréstimo"}
        </button>
      </form>
    </div>
  );
}