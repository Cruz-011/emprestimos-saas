export type ParcelaHistorico = {
  status: "a_vencer" | "pago" | "atrasado" | "parcial";
  data_vencimento: string;
  data_pagamento: string | null;
};

export type Reputacao = {
  tag: string;
  cor: "primary" | "warning" | "danger" | "muted";
};

/**
 * Classifica o cliente com base no histórico de parcelas de todos os
 * empréstimos dele. É só informativo — não bloqueia nada.
 */
export function calcularReputacao(parcelas: ParcelaHistorico[]): Reputacao {
  const relevantes = parcelas.filter((p) => p.status !== "a_vencer");
  if (relevantes.length === 0) {
    return { tag: "Sem histórico ainda", cor: "muted" };
  }

  const pagas = relevantes.filter((p) => p.status === "pago");
  const parciais = relevantes.filter((p) => p.status === "parcial");
  const atrasadasNaoPagas = relevantes.filter((p) => p.status === "atrasado");

  const pagasComAtraso = pagas.filter((p) => p.data_pagamento && p.data_pagamento > p.data_vencimento);
  const pagasAdiantadas = pagas.filter((p) => p.data_pagamento && p.data_pagamento < p.data_vencimento);

  const taxaParcial = parciais.length / relevantes.length;
  const taxaAtrasoNaoPago = atrasadasNaoPagas.length / relevantes.length;
  const taxaPagaComAtraso = pagas.length > 0 ? pagasComAtraso.length / pagas.length : 0;
  const taxaPagaAdiantada = pagas.length > 0 ? pagasAdiantadas.length / pagas.length : 0;

  if (taxaParcial > 0.2 || taxaAtrasoNaoPago > 0.2) {
    return { tag: "Não é bom pagador", cor: "danger" };
  }
  if (taxaPagaComAtraso > 0.25 || atrasadasNaoPagas.length > 0) {
    return { tag: "Atrasa, mas paga", cor: "warning" };
  }
  if (taxaPagaAdiantada > 0.5) {
    return { tag: "Paga adiantado", cor: "primary" };
  }
  return { tag: "Bom pagador", cor: "primary" };
}