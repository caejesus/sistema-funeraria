// ─── Unidades de atendimento ──────────────────────────────────────────────────
// cor: cor da unidade · texto: cor do texto sobre ela · fundo: versão clara para selos

export const UNIDADES_ATENDIMENTO = [
  { value: "sf_zona_sul",      label: "FUNERÁRIA SÃO FRANCISCO ZONA SUL",   cor: "#0fa3b1", texto: "#ffffff", fundo: "rgba(15,163,177,0.14)",  textoFundo: "#0b7480" },
  { value: "sf_zona_oeste",    label: "FUNERÁRIA SÃO FRANCISCO ZONA OESTE", cor: "#eab308", texto: "#1f2937", fundo: "rgba(234,179,8,0.18)",   textoFundo: "#854d0e" },
  { value: "sf_autazes",       label: "FUNERÁRIA SÃO FRANCISCO AUTAZES",    cor: "#a78bfa", texto: "#1f2937", fundo: "rgba(167,139,250,0.2)",  textoFundo: "#6d28d9" },
  { value: "sr_cidade_nova",   label: "FUNERÁRIA SANTA RITA CIDADE NOVA",   cor: "#16a34a", texto: "#ffffff", fundo: "rgba(22,163,74,0.14)",   textoFundo: "#15803d" },
  { value: "sr_itacoatiara",   label: "FUNERÁRIA SANTA RITA ITACOATIARA",   cor: "#dc2626", texto: "#ffffff", fundo: "rgba(220,38,38,0.12)",   textoFundo: "#b91c1c" },
];

export function getUnidadeAtendimento(value) {
  return UNIDADES_ATENDIMENTO.find((u) => u.value === value) || null;
}
