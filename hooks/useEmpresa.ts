"use client";

import { useContext } from "react";
import { EmpresaContext } from "@/contexts/EmpresaContext";

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) {
    throw new Error("useEmpresa precisa ser usado dentro de um <EmpresaProvider> (veja app/layout.tsx)");
  }
  return ctx;
}