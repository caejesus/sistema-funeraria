// CPF: máscara 000.000.000-00 e conferência dos dois dígitos verificadores

export function somenteDigitosCpf(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

export function mascaraCpf(valor) {
  const d = somenteDigitosCpf(valor);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function cpfValido(valor) {
  const d = somenteDigitosCpf(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

// "" = vazio (ok), "incompleto", "invalido" ou "ok"
export function situacaoCpf(valor) {
  const d = somenteDigitosCpf(valor);
  if (!d) return "";
  if (d.length < 11) return "incompleto";
  return cpfValido(d) ? "ok" : "invalido";
}
