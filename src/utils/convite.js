// Links públicos de cada atendimento e códigos do convite

function origem() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function gerarTokenConvite() {
  const base = (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "");
  return base.slice(0, 12);
}

// Código de acesso às mensagens: 6 números
export function gerarCodigoMensagens() {
  const arr = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(arr);
  else arr[0] = Math.floor(Math.random() * 0xffffffff);
  return String(arr[0] % 1000000).padStart(6, "0");
}

export const linkAcompanhamento = (recordId) => `${origem()}/acompanhamento/${recordId}`;
// O final do link (?1, ou um código da foto) faz o WhatsApp buscar a prévia nova
// em vez de reaproveitar a prévia antiga guardada. Quando a foto muda, o link muda junto.
function versaoFoto(fotoPath) {
  const numero = String(fotoPath || "").match(/^(\d+)-/)?.[1];
  return numero ? `f${Number(numero).toString(36)}` : "1";
}
export const linkConvite = (token, fotoPath = "") => `${origem()}/convite/${token}?${versaoFoto(fotoPath)}`;
export const linkMensagens = (token) => `${origem()}/mensagens/${token}?1`;

// Texto pronto para mandar à família pelo WhatsApp
export function textoMensagensFamilia({ falecido, token, codigo }) {
  return (
    `Mensagens de carinho deixadas no convite de ${falecido || "seu ente querido"}:\n` +
    `${linkMensagens(token)}\n\n` +
    `Código de acesso: ${codigo}`
  );
}
