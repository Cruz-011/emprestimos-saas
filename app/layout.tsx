import type { Metadata, Viewport } from "next";
import { Manrope, Inter, JetBrains_Mono } from "next/font/google";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cifra Finance",
  description: "Gestão simples de empréstimos pessoais legais",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cifra Finance",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C0F",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${inter.variable} ${mono.variable}`}
    >
      <body>
        <EmpresaProvider>{children}</EmpresaProvider>
      </body>
    </html>
  );
}