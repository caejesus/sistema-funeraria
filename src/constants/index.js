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

export const USER_ROLES = [
  { value: "ADM",        label: "Administrador" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ATENDENTE",  label: "Atendente" },
  { value: "MOTORISTA",  label: "Motorista" },
  { value: "TECNICO",    label: "Técnico" },
  { value: "APOIO",      label: "Apoio" },
  { value: "ONIBUS",     label: "Ônibus" },
];

export const FUNCOES_OPERACIONAIS = [
  { value: "atendente", label: "Atendente" },
  { value: "motorista", label: "Motorista" },
  { value: "tecnico",   label: "Técnico" },
  { value: "apoio",     label: "Apoio" },
  { value: "onibus",    label: "Ônibus" },
];

export const DEFAULT_USERS = [
  {
    id: "1",
    name: "Administrador",
    login: "admin",
    password: "10121410",
    role: "ADM",
    funcoes: [],
  },
];

export const DEFAULT_SETTINGS = {
  hospitals: [
    "PLATÃO ARAUJO|Hospital e Pronto-Socorro Dr. Aristóteles Platão Bezerra de Araújo",
    "HOSPITAL DO COLÔNIA|Hospital Geral Geraldo da Rocha",
    "DELPHINA AZIZ|Hospital Delphina Rinaldi Abdel Aziz",
    "JOÃOZINHO|Hospital e Pronto-Socorro da Criança - Zona Leste",
    "HPSC ZONA OESTE|Hospital e Pronto Socorro da Criança - Zona Oeste",
    "HPSC CACHOEIRINHA|Hospital e Pronto-Socorro da Criança da Zona Sul",
    "HOSPITAL FAJARDO|Hospital Infantil Dr. Fajardo",
    "DONA LINDU|Instituto da Mulher Dona Lindu",
    "MATERNIDADE ZONA LESTE|Maternidade Ana Braga",
    "MATERNIDADE CIDADE NOVA|Maternidade Azilda da Silva Marreiro",
    "NAZIRA DAOU|Maternidade Dona Nazira Daou",
    "BALBINA MESTRINHO|Maternidade Balbina Mestrinho",
    "MATERNIDADE JORGE TEIXEIRA|Maternidade Dr. Antenor Barbosa",
    "MOURA TAPAJÓZ|Maternidade Moura Tapajóz",
    "CHAPOT PRÉVOST|Hospital e Maternidade Chapot Prévost",
    "FCECON|FCECON - Fundação Centro de Controle de Oncologia do Estado do Amazonas",
    "HEMOAM|HEMOAM - Fundação Hospitalar de Hematologia e Hemoterapia do Amazonas",
    "MEDICINA TROPICAL|FMT-HVD - Fundação de Medicina Tropical Doutor Heitor Vieira Dourado",
    "ADRIANO JORGE|Fundação Hospital Adriano Jorge",
    "HUGV|HUGV - Hospital Universitário Getúlio Vargas",
    "FRANCISCA MENDES|Hospital Universitário Francisca Mendes",
    "SPA ALVORADA|SPA Alvorada",
    "SPA COROADO|SPA Coroado",
    "SPA ZONA SUL|SPA Zona Sul",
    "SPA GALILEIA|SPA Eliameme Rodrigues Mady",
    "SPA COMPENSA|SPA Joventina Dias",
    "SPA REDENÇÃO|SPA Dr. José Lins",
    "SPA CIDADE NOVA|SPA E Policlínica Dr. Danilo Corrêa",
    "SPA SÃO RAIMUNDO|SPA São Raimundo",
    "UPA TARUMÃ|UPA Campos Sales",
    "UPA NOVO ALEIXO|UPA 24h Dr. José Rodrigues",
    "UPA PURAQUEQUARA|UPA 24h Puraquequara - Marcos Prisco",
    "HOSPITAL MILITAR|Hospital Militar de Área de Manaus",
    "HOSPITAL DA BASE AÉREA|Hospital da Aeronáutica de Manaus - HAMN",
    "HOSPITAL DA PM|Hospital da Polícia Militar",
    "HOSPITAL DE CUSTÓDIA|Hospital de Custódia e Tratamento Psiquiátrico do Amazonas",
    "HOSPITAL ADVENTISTA|Hospital Adventista de Manaus",
    "HOSPITAL SANTA JÚLIA|Hospital Santa Júlia",
    "MATERNIDADE HAPVIDA|Hospital e Maternidade Rio Amazonas - Hapvida",
    "HOSPITAL RIO NEGRO|Hospital Rio Negro - Hapvida",
    "HOSPITAL NILTON LINS|Hospital Nilton Lins - Hapvida",
    "HOSPITAL UNIMED|Hospital Maternidade Unimed - Unidade Cachoeirinha",
    "HOSPITAL PORTUGUÊS|Hospital Beneficente Portuguesa",
    "HOSPITAL CHECK UP|Hospital Check Up",
    "HOSPITAL SANTO ALBERTO|Hospital e Maternidade Santo Alberto",
    "IML|Instituto Médico Legal - IML",
    "SVO - SERVIÇO DE VERIFICAÇÃO DE ÓBITO",
    "VIA PÚBLICA",
    "OUTRO",
  ],
  cemeteries: ["São João Batista", "Nossa Senhora Aparecida"],
  coffinColors: ["MOGNO", "RAJADA"],
  cars: [],
};

export const SETTINGS_FIELDS = ["hospitals", "cemeteries", "coffinColors", "cars"];

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
