export const STORAGE_KEYS = {
  users: "sf_users_v3",
  settings: "sf_settings_v3",
  session: "sf_session_v3",
  attendances: "sf_attendances_v1",
  activeTab: "sf_active_tab_v1",
};

export const OPERATION_STAGES = [
  { key: "atendimento", label: "Atendimento" },
  { key: "remocao", label: "Remoção" },
  { key: "procedimentoClinico", label: "Procedimento Clínico" },
  { key: "ornamentacao", label: "Ornamentação" },
  { key: "entrega", label: "Entrega" },
  { key: "velorio", label: "Velório" },
  { key: "sepultamento", label: "Sepultamento" },
];

export const TRANSPORT_STAGE_KEYS = ["remocao", "entrega", "sepultamento"];

export const DEFAULT_USERS = [
  {
    id: "1",
    name: "Administrador",
    login: "admin",
    password: "10121410",
    role: "ADM",
  },
];

export const DEFAULT_SETTINGS = {
  hospitals: [
    "Hospital 28 de Agosto",
    "Hospital João Lúcio",
    "SPA Zona Norte",
    "UPA Zona Norte",
    "UPA Zona Sul",
    "UPA Zona Leste",
    "UPA Zona Oeste",
    "HUGV",
    "HPS 28 de Agosto",
    "HPSC",
    "Hospital Adriano Jorge",
    "Hospital Nilton Lins",
    "Maternidade Ana Braga",
    "FMT",
    "HEMOAM",
    "Hospital Francisca Mendes",
  ],
  cemeteries: ["São João Batista", "Nossa Senhora Aparecida"],
  coffinColors: ["MOGNO", "RAJADA"],
  technicians: [],
  attendants: [],
  drivers: [],
  cars: [],
  supports: [],
  embarques: [],
};

export const SETTINGS_FIELDS = [
  "hospitals",
  "cemeteries",
  "coffinColors",
  "technicians",
  "attendants",
  "drivers",
  "cars",
  "supports",
  "embarques",
];

export const FUNERAL_UNITS = {
  "Unidade Cachoeirinha": [
    "Sala Orquídea",
    "Sala Bromélia",
    "Sala Tulipa",
    "Sala Lírio",
    "Área externa",
  ],
  "Unidade Santo Antônio": ["Sala 01", "Sala 02", "Sala 03", "Sala 04"],
  "Unidade Cidade Nova": ["Sala 01", "Sala 02"],
};

const SERVICE_DEFINITIONS = [
  { name: "URNA",                               type: "valor_only" },
  { name: "CARRO P/ REMOÇÃO",                   type: "valor_only" },
  { name: "CARRO P/ CORTEJO",                   type: "valor_only" },
  { name: "PARAMENTAÇÃO",                        type: "checkbox_only" },
  { name: "HIGIENIZAÇÃO DO CORPO",               type: "checkbox_only" },
  { name: "VÉU",                                 type: "checkbox_only" },
  { name: "ORNAMENTAÇÃO COM FLORES P/ URNA",     type: "valor_only" },
  { name: "SALA DE VELÓRIO",                     type: "valor_only" },
  { name: "TANATOPRAXIA (CONSERVAÇÃO DO CORPO)", type: "valor_only" },
  { name: "LENÇO DE MÃO",                        type: "checkbox_only" },
  { name: "ÔNIBUS",                              type: "quantidade_valor" },
  { name: "COROA DE FLORES",                     type: "quantidade_valor" },
  { name: "TAXA DE SEPULTAMENTO MUNICIPAL",      type: "valor_only" },
  { name: "DOCUMENTAÇÃO",                        type: "checkbox_only" },
  { name: "CERIMONIAL FÚNEBRE",                  type: "valor_only" },
  { name: "ARRANJO DE FLORES",                   type: "quantidade_valor" },
  { name: "BUQUÊ DE FLORES",                     type: "quantidade_valor" },
  { name: "LIVRO DE PRESENÇA",                   type: "checkbox_only" },
  { name: "TRANSLADO AÉREO",                     type: "valor_only" },
  { name: "TRANSLADO TERRESTRE",                 type: "valor_only" },
  { name: "TRANSLADO FLUVIAL",                   type: "valor_only" },
  { name: "KIT CAFÉ (SÓCIO)",                    type: "checkbox_only" },
  { name: "ROUPA",                               type: "valor_only" },
  { name: "ZINCO",                               type: "valor_only" },
  { name: "INVOL",                               type: "valor_only" },
  { name: "CAIXA DE VIAGEM",                     type: "valor_only" },
  { name: "CREMAÇÃO",                            type: "valor_only" },
  { name: "OUTRAS DESPESAS",                     type: "valor_only" },
];

export const SERVICE_NAMES = SERVICE_DEFINITIONS.map((d) => d.name);

export const OS_STATUS = [
  { key: "aguardando_remocao", label: "Aguardando remoção" },
  { key: "equipe_deslocando",  label: "Equipe deslocando" },
  { key: "aguardando_local",   label: "Aguardando no local" },
  { key: "em_remocao",         label: "Em remoção" },
  { key: "finalizada",         label: "Finalizada" },
  { key: "cancelada",          label: "Cancelada" },
];

export const OS_PRIORIDADE = [
  { value: "normal",  label: "Normal" },
  { value: "urgente", label: "Urgente" },
];

export const SERVICE_TYPE_OPTIONS = [
  { value: "particular",           label: "PARTICULAR" },
  { value: "socio_especial",       label: "SÓCIO ESPECIAL" },
  { value: "socio_luxo",           label: "SÓCIO LUXO" },
  { value: "socio_premium",        label: "SÓCIO PREMIUM" },
  { value: "seguradora", label: "SEGURADORA" },
  { value: "orgao_publico", label: "ÓRGÃO PÚBLICO" },
  { value: "prefeitura_conveniada", label: "PREFEITURA CONVENIADA" },
  { value: "pm", label: "POLÍCIA MILITAR (DPS AM)" },
  { value: "tokyo", label: "TOKYO MARINE (ASSEGURADORA)" },
  { value: "casai", label: "CASAI (DSEI MANAUS)" },
  { value: "autazes", label: "PREFEITURA DE AUTAZES" },
];

export const initialServices = SERVICE_DEFINITIONS.map(({ name, type }) => ({
  name,
  type,
  checked: false,
  qty: "",
  value: "",
  note: "",
}));
