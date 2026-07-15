"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, Calculator, Settings } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/contratos", label: "Empréstimos", icon: FileText },
  { href: "/calculadora", label: "Calc.", icon: Calculator },
  { href: "/configuracoes", label: "Config.", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-2 safe-top">
        <Image src="/logo.png" alt="Cifra Finance" width={28} height={28} className="rounded-md" />
        <h1 className="text-lg font-display font-bold text-ink">
          Cifra <span className="text-primary">Finance</span>
        </h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border flex justify-around py-2 safe-bottom">
        {nav.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
                ativo ? "text-primary" : "text-ink-muted"
              }`}
            >
              <Icon size={22} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}