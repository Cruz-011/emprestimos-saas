"use client";

import { useEffect } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("papel")
        .eq("id", user.id)
        .single();
      if (perfil?.papel !== "super_admin") router.push("/dashboard");
    });
  }, [router]);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-canvas border-b border-primary/30 px-4 py-3 flex items-center justify-between safe-top">
        <span className="flex items-center gap-2 font-display font-bold text-ink">
          <ShieldCheck size={20} className="text-primary" /> Cifra{" "}
          <span className="text-ink-muted font-mono text-sm tracking-widest uppercase">
            Admin
          </span>
        </span>
        <button
          onClick={sair}
          aria-label="Sair"
          className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <LogOut size={18} /> Sair
        </button>
      </header>
      <main className="p-4 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
