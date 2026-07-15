import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function carregarEmpresa() {
      try {
        // Obtém o usuário autenticado
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setCarregando(false);
          return;
        }

        // Busca o vínculo do usuário com a empresa
        const { data: usuario, error: usuarioError } = await supabase
          .from("usuarios")
          .select("empresa_id")
          .eq("id", user.id)
          .single();

        // Usuário não encontrado ou sem empresa
        if (usuarioError || !usuario?.empresa_id) {
          await supabase.auth.signOut();
          window.location.replace("/login");
          return;
        }

        // Verifica se a empresa ainda existe
        const { data: empresa, error: empresaError } = await supabase
          .from("empresas")
          .select("id")
          .eq("id", usuario.empresa_id)
          .single();

        // Empresa foi excluída
        if (empresaError || !empresa) {
          await supabase.auth.signOut();
          window.location.replace("/login");
          return;
        }

        // Tudo OK
        setUsuarioId(user.id);
        setEmpresaId(usuario.empresa_id);
      } catch (err) {
        console.error("Erro ao carregar empresa:", err);
        await supabase.auth.signOut();
        window.location.replace("/login");
      } finally {
        setCarregando(false);
      }
    }

    carregarEmpresa();
  }, []);

  return {
    empresaId,
    usuarioId,
    carregando,
  };
}