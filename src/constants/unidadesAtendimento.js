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

// ─── Contatos das unidades (exibidos no convite online) ───────────────────────
// whatsapp: só números com DDD. Unidade sem WhatsApp não mostra os botões de serviços.
export const CONTATOS_UNIDADES = {
  sf_zona_sul: {
    nome: "Funerária São Francisco – Zona Sul",
    endereco: "Avenida Carvalho Leal, 1000 – Cachoeirinha, Manaus – AM, 69065-000",
    telefones: ["(92) 3633-8095", "(92) 3234-4499", "(92) 3308-3966"],
    whatsapp: "92995038470",
  },
  sf_zona_oeste: {
    nome: "Funerária São Francisco – Zona Oeste",
    endereco: "Rua José Tadros, 1093 – Santo Antônio, Manaus – AM, 69029-510",
    telefones: [],
    whatsapp: "92991124704",
  },
  sf_autazes: {
    nome: "Funerária São Francisco – Autazes",
    endereco: "Rua Ângelo Portugal, 904 – Aparecida, Autazes – AM",
    telefones: ["(92) 3234-4499"],
    whatsapp: "92995038470", // mesmo atendimento da Zona Sul
  },
  sr_cidade_nova: {
    nome: "Funerária Santa Rita – Cidade Nova",
    endereco: "Rua Professor Félix Valois, 15 – Cidade Nova, Manaus – AM, 69095-010",
    telefones: ["(92) 3308-3404"],
    whatsapp: "92981396563",
  },
  sr_itacoatiara: {
    nome: "Funerária Santa Rita – Itacoatiara",
    endereco: "Av. Sete de Setembro, 887 – Centro, Itacoatiara – AM",
    telefones: ["(92) 3308-3404"],
    whatsapp: "92981396563", // mesmo atendimento da Santa Rita Cidade Nova
  },
};

// Serviços oferecidos no convite (abrem o WhatsApp da unidade que atendeu)
export const SERVICOS_CONVITE = [
  { id: "planos", titulo: "Planos de assistência", assunto: "os planos de assistência familiar", icone: "fa-solid fa-shield-heart" },
  { id: "coroa", titulo: "Coroa de flores", assunto: "coroa de flores", icone: "fa-solid fa-spa" },
  { id: "cerimonial", titulo: "Cerimonial", assunto: "o serviço de cerimonial", icone: "fa-solid fa-music" },
];

// Instagram do grupo (deixe vazio para não exibir)
export const INSTAGRAM_GRUPO = "https://www.instagram.com/gruposao_francisco";

// Relação de quem deixa mensagem no convite
export const RELACOES_CONVITE = ["Familiar", "Amigo(a)", "Colega de trabalho", "Vizinho(a)", "Comunidade / igreja", "Outro"];

// Endereço para o Google Maps dos cemitérios (quando a lista não tem "Nome|Endereço")
export const CEMITERIOS_MAPS = {
  "Nossa Senhora Aparecida": "Cemitério Nossa Senhora Aparecida, Tarumã, Manaus - AM",
  "São João Batista": "Cemitério São João Batista, Adrianópolis, Manaus - AM",
  "Santa Helena": "Cemitério Santa Helena, São Raimundo, Manaus - AM",
  "São Francisco": "Cemitério São Francisco, Morro da Liberdade, Manaus - AM",
  "Santo Alberto": "Cemitério Santo Alberto, Colônia Antônio Aleixo, Manaus - AM",
  "Memorial São Francisco": "Cemitério Memorial São Francisco, Manaus - AM",
};
