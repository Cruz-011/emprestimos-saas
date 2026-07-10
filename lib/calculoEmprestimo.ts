export type Modalidade = "parcelas_fixas" | "rolagem" | "amortizacao";
export type Periodicidade = "diario" | "semanal" | "mensal";

export type ParcelaCalculada = {
  numero: number;
  valor: number;
  tipo: "parcela" | "somente_juros" | "balao";
  valorJuros: number;
  valorPrincipal: number;
};

export type ResultadoCalculo = {
  parcelas: ParcelaCalculada[];
  totalAPagar: number;
  totalJuros: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export function calcularEmprestimo(
  modalidade: Modalidade,
  valorEmprestado: number,
  taxaPct: number,
  numeroParcelas: number
): ResultadoCalculo | null {
  if (!valorEmprestado || !taxaPct || !numeroParcelas) return null;
  const taxa = taxaPct / 100;
  const parcelas: ParcelaCalculada[] = [];

  if (modalidade === "parcelas_fixas") {
    const valorParcela = round2((valorEmprestado * (1 + taxa * numeroParcelas)) / numeroParcelas);
    const principalPorParcela = round2(valorEmprestado / numeroParcelas);
    for (let i = 1; i <= numeroParcelas; i++) {
      parcelas.push({
        numero: i,
        valor: valorParcela,
        tipo: "parcela",
        valorPrincipal: principalPorParcela,
        valorJuros: round2(valorParcela - principalPorParcela),
      });
    }
  } else if (modalidade === "rolagem") {
    const jurosPeriodo = round2(valorEmprestado * taxa);
    for (let i = 1; i <= numeroParcelas; i++) {
      if (i < numeroParcelas) {
        parcelas.push({ numero: i, valor: jurosPeriodo, tipo: "somente_juros", valorJuros: jurosPeriodo, valorPrincipal: 0 });
      } else {
        const valorBalao = round2(jurosPeriodo + valorEmprestado);
        parcelas.push({ numero: i, valor: valorBalao, tipo: "balao", valorJuros: jurosPeriodo, valorPrincipal: valorEmprestado });
      }
    }
  } else if (modalidade === "amortizacao") {
    const fator = Math.pow(1 + taxa, numeroParcelas);
    const valorParcela = round2((valorEmprestado * (taxa * fator)) / (fator - 1));
    let saldo = valorEmprestado;
    for (let i = 1; i <= numeroParcelas; i++) {
      const juros = round2(saldo * taxa);
      let principal = round2(valorParcela - juros);
      if (i === numeroParcelas) principal = round2(saldo);
      saldo = round2(saldo - principal);
      parcelas.push({ numero: i, valor: round2(juros + principal), tipo: "parcela", valorJuros: juros, valorPrincipal: principal });
    }
  }

  const totalAPagar = round2(parcelas.reduce((s, p) => s + p.valor, 0));
  const totalJuros = round2(totalAPagar - valorEmprestado);
  return { parcelas, totalAPagar, totalJuros };
}

/**
 * Resolve a taxa de juros (% por período) a partir do valor da parcela desejado,
 * pro modelo "parcelas fixas". Usado quando a pessoa quer digitar "quanto fica
 * cada parcela" em vez de "qual a taxa".
 */
export function taxaPorValorDeParcela(valorEmprestado: number, numeroParcelas: number, valorParcela: number): number {
  if (!valorEmprestado || !numeroParcelas) return 0;
  const taxa = (valorParcela * numeroParcelas - valorEmprestado) / (valorEmprestado * numeroParcelas);
  return round4(taxa * 100);
}

export const labelModalidade: Record<Modalidade, string> = {
  parcelas_fixas: "Parcelas fixas",
  rolagem: "Só juros (rolagem)",
  amortizacao: "Com amortização",
};

export const labelPeriodicidade: Record<Periodicidade, string> = {
  diario: "ao dia",
  semanal: "à semana",
  mensal: "ao mês",
};