import { useState } from "react";
import { formatCep } from "../utils/format";

export function useCep(setForm) {
  const [cepStatus, setCepStatus] = useState({
    responsavel: { loading: false, error: "" },
    velorio: { loading: false, error: "" },
  });

  async function buscarCEP(cepFormatado, tipo) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      setCepStatus((prev) => ({ ...prev, [tipo]: { loading: false, error: "" } }));
      return;
    }

    setCepStatus((prev) => ({ ...prev, [tipo]: { loading: true, error: "" } }));

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepStatus((prev) => ({
          ...prev,
          [tipo]: { loading: false, error: "CEP não encontrado." },
        }));
        return;
      }

      if (tipo === "responsavel") {
        setForm((prev) => ({
          ...prev,
          responsavelEndereco: data.logradouro || "",
          responsavelBairro: data.bairro || "",
        }));
      }

      if (tipo === "velorio") {
        setForm((prev) => ({
          ...prev,
          velorioEndereco: data.logradouro || "",
          velorioBairro: data.bairro || "",
        }));
      }

      setCepStatus((prev) => ({ ...prev, [tipo]: { loading: false, error: "" } }));
    } catch {
      setCepStatus((prev) => ({
        ...prev,
        [tipo]: { loading: false, error: "Erro ao consultar o CEP." },
      }));
    }
  }

  function handleCepChange(value, tipo) {
    const formatted = formatCep(value);

    setForm((prev) => ({
      ...prev,
      ...(tipo === "responsavel"
        ? { responsavelCep: formatted }
        : { velorioCep: formatted }),
    }));

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      buscarCEP(formatted, tipo);
    } else {
      setCepStatus((prev) => ({ ...prev, [tipo]: { loading: false, error: "" } }));
    }
  }

  return { cepStatus, handleCepChange };
}
