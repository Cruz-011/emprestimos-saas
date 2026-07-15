export function descreverVencimento(dataVencimento: string): { texto: string; classe: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento + "T00:00:00");
  const diffMs = venc.getTime() - hoje.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return { texto: `Atrasado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`, classe: "text-danger" };
  }
  if (dias === 0) {
    return { texto: "Vence hoje", classe: "text-warning" };
  }
  if (dias === 1) {
    return { texto: "Vence amanhã", classe: "text-warning" };
  }
  return { texto: `Vence em ${dias} dias`, classe: "text-ink-muted" };
}