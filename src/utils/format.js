export function formatDateBR(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return String(value);
  }
}

export function formatCep(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

export function formatMoney(value) {
  const clean = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  if (Number.isNaN(n) || value === "") return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyToNumber(value) {
  if (!value) return 0;
  const clean = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isNaN(n) ? 0 : n;
}
