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
export const linkConvite = (token) => `${origem()}/convite/${token}`;
export const linkMensagens = (token) => `${origem()}/mensagens/${token}`;

// Texto pronto para mandar à família pelo WhatsApp
export function textoMensagensFamilia({ falecido, token, codigo }) {
  return (
    `Mensagens de carinho deixadas no convite de ${falecido || "seu ente querido"}:\n` +
    `${linkMensagens(token)}\n\n` +
    `Código de acesso: ${codigo}`
  );
}
