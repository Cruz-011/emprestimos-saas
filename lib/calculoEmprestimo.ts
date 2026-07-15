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

export type ParcelaConta = {
  numero: number;
  valor: number;
  valor_pago: number;
  valor_juros: number | null;
  valor_principal: number | null;
};

export type Pendencias = {
  totalJuros: number;
  totalAPagar: number;
  totalPago: number;
  faltaPagar: number;
  principalPendente: number;
  jurosPendente: number;
};

/**
 * Calcula quanto falta de um contrato, sempre abatendo primeiro o JUROS
 * e só depois o dinheiro emprestado (principal). Ou seja: se a pessoa
 * pagou só uma parte, esse valor é tratado como juros pago antes de
 * reduzir o que ela deve do valor emprestado.
 */
export function calcularPendenciasContrato(
  modalidade: Modalidade,
  valorEmprestado: number,
  taxaPct: number,
  numeroParcelas: number,
  parcelas: ParcelaConta[]
): Pendencias {
  const calc = calcularEmprestimo(modalidade, valorEmprestado, taxaPct, numeroParcelas);

  let totalAPagar = 0;
  let totalPago = 0;
  let principalPendente = 0;
  let jurosPendente = 0;

  parcelas.forEach((p) => {
    totalAPagar += Number(p.valor);
    totalPago += Number(p.valor_pago ?? 0);

    let vJuros = p.valor_juros != null ? Number(p.valor_juros) : null;
    let vPrincipal = p.valor_principal != null ? Number(p.valor_principal) : null;

    if (vJuros == null || vPrincipal == null) {
      const componente = calc?.parcelas.find((cp) => cp.numero === p.numero);
      vJuros = componente?.valorJuros ?? 0;
      vPrincipal = componente?.valorPrincipal ?? 0;
    }

    const valorPago = Number(p.valor_pago ?? 0);
    const pagoJuros = Math.min(valorPago, vJuros);
    const pagoPrincipal = Math.max(0, valorPago - vJuros);

    jurosPendente += Math.max(0, vJuros - pagoJuros);
    principalPendente += Math.max(0, vPrincipal - pagoPrincipal);
  });

  return {
    totalJuros: calc?.totalJuros ?? 0,
    totalAPagar,
    totalPago,
    faltaPagar: totalAPagar - totalPago,
    principalPendente,
    jurosPendente,
  };
}
/**
 * Pega juros/principal de UMA parcela específica (usado pra montar a
 * mensagem de cobrança, que fala sobre uma parcela por vez).
 */
export function componentesDaParcela(
  modalidade: Modalidade,
  valorEmprestado: number,
  taxaPct: number,
  numeroParcelas: number,
  parcela: { numero: number; valor_juros?: number | null; valor_principal?: number | null }
): { valorJuros: number; valorPrincipal: number } {
  if (parcela.valor_juros != null && parcela.valor_principal != null) {
    return { valorJuros: Number(parcela.valor_juros), valorPrincipal: Number(parcela.valor_principal) };
  }
  const calc = calcularEmprestimo(modalidade, valorEmprestado, taxaPct, numeroParcelas);
  const componente = calc?.parcelas.find((cp) => cp.numero === parcela.numero);
  return { valorJuros: componente?.valorJuros ?? 0, valorPrincipal: componente?.valorPrincipal ?? 0 };
}

/** Aplica a regra "juros primeiro" numa parcela só, dado o quanto já foi pago dela. */
export function pendenciaParcela(valorJuros: number, valorPrincipal: number, valorPago: number) {
  const pago = Number(valorPago ?? 0);
  const pagoJuros = Math.min(pago, valorJuros);
  const pagoPrincipal = Math.max(0, pago - valorJuros);
  return {
    jurosPendente: Math.max(0, valorJuros - pagoJuros),
    principalPendente: Math.max(0, valorPrincipal - pagoPrincipal),
  };
}
/** Complemento de pendenciaParcela: quanto do que já foi RECEBIDO é juros e quanto é principal. */
export function recebidoParcela(valorJuros: number, valorPago: number) {
  const pago = Number(valorPago ?? 0);
  const jurosRecebido = Math.min(pago, valorJuros);
  const principalRecebido = Math.max(0, pago - valorJuros);
  return { jurosRecebido, principalRecebido };
}