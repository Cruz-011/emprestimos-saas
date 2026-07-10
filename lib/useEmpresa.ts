import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", user.id)
        .single();
      setUsuarioId(user.id);
      setEmpresaId(data?.empresa_id ?? null);
      setCarregando(false);
    });
  }, []);

  return { empresaId, usuarioId, carregando };
}
