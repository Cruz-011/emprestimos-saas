export const MENSAGEM_PADRAO =
  "Olá {nome}! Passando para lembrar do pagamento previsto para {data}.\nValor total: R$ {total}\nSó os juros: R$ {juros}\nChave PIX: {pix}\nQualquer coisa é só chamar 🙂";

export function montarMensagem(
  template: string,
  vars: { nome?: string; valor?: string; data?: string; juros?: string; total?: string; pix?: string }
): string {
  return template
    .replaceAll("{nome}", vars.nome ?? "")
    .replaceAll("{valor}", vars.valor ?? vars.total ?? "")
    .replaceAll("{data}", vars.data ?? "")
    .replaceAll("{juros}", vars.juros ?? "")
    .replaceAll("{total}", vars.total ?? vars.valor ?? "")
    .replaceAll("{pix}", vars.pix ?? "");
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  const somenteDigitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${somenteDigitos}?text=${encodeURIComponent(mensagem)}`;
}