"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEmpresa } from "@/hooks/useEmpresa";
import { MENSAGEM_PADRAO, montarMensagem } from "@/lib/mensagemCobranca";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { empresaId } = useEmpresa();
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [chavePix, setChavePix] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();
    supabase
      .from("configuracoes")
      .select("mensagem_cobranca, chave_pix")
      .eq("empresa_id", empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mensagem_cobranca) setMensagem(data.mensagem_cobranca);
        if (data?.chave_pix) setChavePix(data.chave_pix);
        setCarregando(false);
      });
  }, [empresaId]);

  async function salvar() {
    if (!empresaId) return;
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("configuracoes")
      .upsert({ empresa_id: empresaId, mensagem_cobranca: mensagem, chave_pix: chavePix || null });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const preview = montarMensagem(mensagem, {
    nome: "Marcos",
    total: "1.200,00",
    juros: "200,00",
    data: "15/07/2026",
    pix: chavePix || "(cadastre sua chave PIX aqui embaixo)",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-semibold text-ink">Cobrança pelo WhatsApp</h2>
      </div>

      {!carregando && (
        <>
          <div>
            <p className="text-xs text-ink-muted mb-1">Sua chave PIX</p>
            <input
              className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm text-ink-muted mb-1">Mensagem de cobrança</p>
            <p className="text-xs text-ink-faint mb-2">
              Essa é a mensagem que abre pronta no WhatsApp. Use{" "}
              <span className="text-primary font-mono">{"{nome}"}</span>,{" "}
              <span className="text-primary font-mono">{"{total}"}</span> (valor cheio da parcela),{" "}
              <span className="text-primary font-mono">{"{juros}"}</span> (só os juros, caso a pessoa queira pagar
              só isso),{" "}
              <span className="text-primary font-mono">{"{data}"}</span> e{" "}
              <span className="text-primary font-mono">{"{pix}"}</span> — o app troca tudo sozinho.
            </p>
            <textarea
              rows={7}
              className="w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="card">
            <p className="text-xs text-ink-muted mb-1">Prévia (exemplo)</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{preview}</p>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="btn-grande w-full bg-primary text-[#06140F] disabled:opacity-50"
          >
            <Save size={18} /> {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar"}
          </button>

          <button
            onClick={sair}
            className="btn-grande w-full border border-surface-border text-ink-muted text-sm py-3"
          >
            <LogOut size={18} /> Sair da conta
          </button>
        </>
      )}
    </div>
  );
}