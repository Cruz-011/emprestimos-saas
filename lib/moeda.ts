// Utilitários pra campo de dinheiro com máscara "vai digitando, o R$ se forma sozinho"
// (mesmo comportamento de app de banco: os 2 últimos dígitos são sempre os centavos)

export function digitosParaValor(digitos: string): number {
  const n = parseInt(digitos || "0", 10);
  return n / 100;
}

export function valorParaTexto(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function valorParaDigitos(valor: number): string {
  if (!valor) return "";
  return Math.round(valor * 100).toString();
}