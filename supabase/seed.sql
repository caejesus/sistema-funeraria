-- ============================================================================
-- Seed: listas de hospitais/locais de óbito e cemitérios
-- Fonte: DEFAULT_SETTINGS em src/constants/index.js
-- Formato dos hospitais: "NOME|Nome no Maps" (itens sem "|" usam o próprio
-- nome, ex.: SVO, VIA PÚBLICA, OUTRO).
-- Rodar DEPOIS de schema.sql. Idempotente (sobrescreve a lista se já existir).
-- ============================================================================

insert into public.app_settings (key, items) values
  ('hospitals', '[
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
    "OUTRO"
  ]'::jsonb),
  ('cemeteries', '[
    "São João Batista",
    "Nossa Senhora Aparecida"
  ]'::jsonb)
on conflict (key) do update set items = excluded.items;
