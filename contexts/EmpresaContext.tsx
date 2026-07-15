"use client";

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";

export type Usuario = {
  id: string;
  nome: string;
  papel: "super_admin" | "admin_empresa" | "agente";
  ativo: boolean;
  empresa_id: string | null;
};

export type Empresa = {
  id: string;
  nome: string;
  telefone: string | null;
};

export type EmpresaContextValue = {
  usuario: Usuario | null;
  empresa: Empresa | null;
  empresaId: string | null;
  usuarioId: string | null;
  carregando: boolean;
  erro: string | null;
  sessaoInvalida: boolean;
  atualizarEmpresa: () => Promise<void>;
};

export const EmpresaContext = createContext<EmpresaContextValue | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sessaoInvalida, setSessaoInvalida] = useState(false);
  const supabaseRef = useRef(createClient());

  const carregarEmpresa = useCallback(async () => {
    const supabase = supabaseRef.current;
    try {
      const {
        data: { user },
        error: erroAuth,
      } = await supabase.auth.getUser();

      if (erroAuth || !user) {
        setUsuario(null);
        setEmpresa(null);
        setErro(null);
        setSessaoInvalida(true);
        setCarregando(false);
        return;
      }

      const { data: usuarioRow, error: erroUsuario } = await supabase
        .from("usuarios")
        .select("id, nome, papel, ativo, empresa_id")
        .eq("id", user.id)
        .maybeSingle();

      if (erroUsuario) {
        setErro(erroUsuario.message);
        setCarregando(false);
        return;
      }

      if (!usuarioRow) {
        setUsuario(null);
        setEmpresa(null);
        setErro("Sua conta não está mais vinculada a nenhuma empresa. Fale com o administrador.");
        setSessaoInvalida(true);
        setCarregando(false);
        return;
      }

      setUsuario(usuarioRow as Usuario);
      setSessaoInvalida(false);

      if (usuarioRow.empresa_id) {
        const { data: empresaRow, error: erroEmpresa } = await supabase
          .from("empresas")
          .select("id, nome, telefone")
          .eq("id", usuarioRow.empresa_id)
          .maybeSingle();

        if (erroEmpresa) {
          setErro(erroEmpresa.message);
        } else if (!empresaRow) {
          setEmpresa(null);
          setErro("A empresa vinculada à sua conta não existe mais.");
          setSessaoInvalida(true);
        } else {
          setEmpresa(empresaRow as Empresa);
          setErro(null);
        }
      } else {
        setEmpresa(null);
        setErro(null);
      }

      setCarregando(false);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar dados da conta.");
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarEmpresa();

    const supabase = supabaseRef.current;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        carregarEmpresa();
      }
    });

    return () => subscription.unsubscribe();
  }, [carregarEmpresa]);

  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === "visible") {
        carregarEmpresa();
      }
    }
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", carregarEmpresa);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", carregarEmpresa);
    };
  }, [carregarEmpresa]);

  useEffect(() => {
    if (!usuario?.id) return;
    const supabase = supabaseRef.current;

    const canalUsuario = supabase
      .channel(`usuario-${usuario.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "usuarios", filter: `id=eq.${usuario.id}` },
        () => carregarEmpresa()
      )
      .subscribe();

    let canalEmpresa: ReturnType<typeof supabase.channel> | null = null;
    if (usuario.empresa_id) {
      canalEmpresa = supabase
        .channel(`empresa-${usuario.empresa_id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "empresas", filter: `id=eq.${usuario.empresa_id}` },
          () => carregarEmpresa()
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(canalUsuario);
      if (canalEmpresa) supabase.removeChannel(canalEmpresa);
    };
  }, [usuario?.id, usuario?.empresa_id, carregarEmpresa]);

  return (
    <EmpresaContext.Provider
      value={{
        usuario,
        empresa,
        empresaId: empresa?.id ?? usuario?.empresa_id ?? null,
        usuarioId: usuario?.id ?? null,
        carregando,
        erro,
        sessaoInvalida,
        atualizarEmpresa: carregarEmpresa,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}