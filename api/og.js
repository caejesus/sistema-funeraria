// Vercel Function: monta o título e a pré-visualização (WhatsApp, Instagram etc.)
// dos links públicos /convite/<token> e /mensagens/<token>.
// O WhatsApp lê só o HTML inicial da página, então o título precisa vir do servidor.

function escapar(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nomeBonito(nome) {
  return String(nome || "")
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase())
    .replace(/\s(De|Da|Do|Dos|Das|E)(?=\s)/g, (m) => m.toLowerCase());
}

export default async function handler(req, res) {
  const tipo = req.query.tipo === "mensagens" ? "mensagens" : "convite";
  const token = String(req.query.token || "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const base = `${proto}://${host}`;

  let html;
  try {
    html = await fetch(`${base}/index.html`).then((r) => r.text());
  } catch {
    res.status(302).setHeader("Location", "/").end();
    return;
  }

  let falecido = "";
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key && /^[a-zA-Z0-9]{6,40}$/.test(token)) {
      const r = await fetch(
        `${url}/rest/v1/atendimentos?select=falecido&dados->form->>conviteToken=eq.${token}&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const rows = await r.json();
      falecido = nomeBonito(rows?.[0]?.falecido || "");
    }
  } catch {
    // sem nome: usa título genérico
  }

  const titulo =
    tipo === "mensagens"
      ? falecido ? `Mensagens - ${falecido}` : "Mensagens de carinho"
      : falecido ? `Convite - ${falecido}` : "Convite";
  const descricao =
    tipo === "mensagens"
      ? "Mensagens de carinho deixadas para a família. Acesso com código."
      : "Velório e sepultamento: locais, horários e espaço para deixar uma mensagem à família.";
  const imagem = `${base}/logogrupo.png`;
  const pagina = `${base}/${tipo}/${token}`;

  const meta = `
    <meta name="description" content="${escapar(descricao)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Grupo São Francisco" />
    <meta property="og:title" content="${escapar(titulo)}" />
    <meta property="og:description" content="${escapar(descricao)}" />
    <meta property="og:image" content="${escapar(imagem)}" />
    <meta property="og:url" content="${escapar(pagina)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapar(titulo)}" />
    <meta name="twitter:description" content="${escapar(descricao)}" />
    <meta name="twitter:image" content="${escapar(imagem)}" />
    <meta name="robots" content="noindex" />`;

  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapar(titulo)}</title>${meta}`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
  res.status(200).send(html);
}
