import { supabase } from "../lib/supabaseClient";

// Foto do falecido: reduzida no navegador e guardada no Storage do Supabase.
// No banco fica só o endereço (form.fotoUrl) e o caminho (form.fotoPath).

const BUCKET = "fotos-falecidos";
const LARGURA_MAX = 800;
const ALTURA_MAX = 1000;
const LIMITE_BYTES = 180 * 1024;

function carregarImagem(origem) {
  return new Promise((resolve, reject) => {
    const ehArquivo = typeof origem !== "string";
    const url = ehArquivo ? URL.createObjectURL(origem) : origem;
    const img = new Image();
    const liberar = () => { if (ehArquivo) URL.revokeObjectURL(url); };
    img.onload = () => { liberar(); resolve(img); };
    img.onerror = () => { liberar(); reject(new Error("Não foi possível abrir essa imagem.")); };
    img.src = url;
  });
}

function canvasParaBlob(canvas, qualidade) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
}

// Recorta (se vier a área do recorte), reduz para no máximo 800x1000 px e ~180 KB (JPEG).
// "origem" pode ser o arquivo escolhido ou o endereço temporário da imagem.
export async function comprimirFoto(origem, area = null) {
  if (!origem) throw new Error("Escolha uma foto.");
  const img = await carregarImagem(origem);
  const corte = area || { x: 0, y: 0, width: img.width, height: img.height };
  const escala = Math.min(1, LARGURA_MAX / corte.width, ALTURA_MAX / corte.height);
  const largura = Math.max(1, Math.round(corte.width * escala));
  const altura = Math.max(1, Math.round(corte.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, corte.x, corte.y, corte.width, corte.height, 0, 0, largura, altura);

  let qualidade = 0.82;
  let blob = await canvasParaBlob(canvas, qualidade);
  while (blob && blob.size > LIMITE_BYTES && qualidade > 0.45) {
    qualidade -= 0.1;
    blob = await canvasParaBlob(canvas, qualidade);
  }
  if (!blob) throw new Error("Não foi possível preparar a foto.");
  return blob;
}

function nomeArquivo() {
  const aleatorio = (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `${Date.now()}-${aleatorio}.jpg`;
}

// Envia a foto nova e apaga a antiga (se houver). Retorna { fotoUrl, fotoPath }.
export async function enviarFotoFalecido(origem, caminhoAntigo = "", area = null) {
  const blob = await comprimirFoto(origem, area);
  const caminho = nomeArquivo();
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Erro ao enviar a foto.");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  if (caminhoAntigo) await removerFotoFalecido(caminhoAntigo);
  return { fotoUrl: data.publicUrl, fotoPath: caminho };
}

export async function removerFotoFalecido(caminho) {
  if (!caminho) return;
  const { error } = await supabase.storage.from(BUCKET).remove([caminho]);
  if (error) console.error("Erro ao apagar foto antiga:", error);
}

export function iniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p));
  if (!partes.length) return "—";
  const primeira = partes[0][0] || "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
