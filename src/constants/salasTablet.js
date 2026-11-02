// Salas com tablet na porta. "unidade" e "sala" são os mesmos nomes do cadastro
// do atendimento (FUNERAL_UNITS); "caminho" é o final do link do tablet.
export const SALAS_TABLET = [
  { unidade: "Unidade Cachoeirinha", sala: "Sala Orquídea", caminho: "cachoeirinha/orquidea" },
  { unidade: "Unidade Cachoeirinha", sala: "Sala Bromélia", caminho: "cachoeirinha/bromelia" },
  { unidade: "Unidade Cachoeirinha", sala: "Sala Tulipa", caminho: "cachoeirinha/tulipa" },
  { unidade: "Unidade Cachoeirinha", sala: "Sala Lírio", caminho: "cachoeirinha/lirio" },
  { unidade: "Unidade Cidade Nova", sala: "Sala 01", caminho: "cidade-nova/01" },
  { unidade: "Unidade Cidade Nova", sala: "Sala 02", caminho: "cidade-nova/02" },
  // Santo Antônio: links já prontos para quando os tablets chegarem
  { unidade: "Unidade Santo Antônio", sala: "Sala 01", caminho: "santo-antonio/01" },
  { unidade: "Unidade Santo Antônio", sala: "Sala 02", caminho: "santo-antonio/02" },
  { unidade: "Unidade Santo Antônio", sala: "Sala 03", caminho: "santo-antonio/03" },
  { unidade: "Unidade Santo Antônio", sala: "Sala 04", caminho: "santo-antonio/04" },
];

export const NOME_FUNERARIA_UNIDADE = {
  "Unidade Cachoeirinha": "Funerária São Francisco Zona Sul",
  "Unidade Cidade Nova": "Funerária Santa Rita Cidade Nova",
  "Unidade Santo Antônio": "Grupo São Francisco · Santo Antônio",
};

export function acharSalaTablet(caminho) {
  const limpo = String(caminho || "").replace(/^\/+|\/+$/g, "").toLowerCase();
  return SALAS_TABLET.find((s) => s.caminho === limpo) || null;
}

export function linkTablet(sala, chave) {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return `${origem}/sala/${sala.caminho}?k=${chave}`;
}
