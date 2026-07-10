"use client";

import { useState, useEffect } from "react";
import { digitosParaValor, valorParaTexto, valorParaDigitos } from "@/lib/moeda";

type Props = {
  valor: number;
  onChange: (valor: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function CampoMoeda({ valor, onChange, placeholder = "R$ 0,00", className = "", autoFocus }: Props) {
  const [digitos, setDigitos] = useState(valorParaDigitos(valor));

  useEffect(() => {
    const valorAtual = digitosParaValor(digitos);
    if (Math.round(valorAtual * 100) !== Math.round(valor * 100)) {
      setDigitos(valorParaDigitos(valor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = e.target.value.replace(/\D/g, "").slice(0, 12);
    setDigitos(somenteDigitos);
    onChange(digitosParaValor(somenteDigitos));
  }

  const texto = digitos ? `R$ ${valorParaTexto(digitosParaValor(digitos))}` : "";

  return (
    <input
      inputMode="numeric"
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={className}
      value={texto}
      onChange={handleChange}
    />
  );
}