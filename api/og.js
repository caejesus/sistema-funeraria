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
  let foto = "";
  const diag = { envUrl: false, envKey: false, origemChave: "", status: null, linhas: null, erro: "" };
  try {
    let url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    let key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
    diag.envUrl = !!url;
    diag.envKey = !!key;
    diag.origemChave = url && key ? "env" : "";

    // Plano B: a URL e a chave pública (anon) já estão no JS do site; lê de lá.
    if (!url || !key) {
      const js = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
      if (js) {
        const codigo = await fetch(`${base}${js}`).then((r) => r.text());
        url = url || codigo.match(/https:\/\/[a-z0-9]{10,}\.supabase\.co/)?.[0] || "";
        key = key ||
          codigo.match(/sb_publishable_[A-Za-z0-9_-]{10,}/)?.[0] ||
          codigo.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0] || "";
        if (url && key) diag.origemChave = "bundle";
      }
    }

    if (url && key && /^[a-zA-Z0-9]{6,40}$/.test(token)) {
      // Função pública convite_publico (só os campos do convite)
      const r = await fetch(`${url}/rest/v1/rpc/convite_publico`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
      });
      diag.status = r.status;
      const dadosConvite = await r.json();
      if (r.ok) {
        diag.linhas = dadosConvite ? 1 : 0;
        const d = dadosConvite?.dados || {};
        falecido = nomeBonito(d.falecido || d.form?.falecido || "");
        const fotoUrl = d.form?.fotoUrl || "";
        if (/^https:\/\/[^"'<>\s]+$/.test(fotoUrl)) foto = fotoUrl;
      } else {
        diag.erro = String(dadosConvite?.message || dadosConvite?.hint || "resposta inesperada").slice(0, 200);
      }
    }
  } catch (e) {
    diag.erro = String(e?.message || e).slice(0, 200);
  }

  // Diagnóstico: /api/og?tipo=convite&token=XXXX&debug=1 (não mostra chaves)
  if (req.query.debug) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(JSON.stringify({ ...diag, tokenValido: /^[a-zA-Z0-9]{6,40}$/.test(token), nomeEncontrado: !!falecido, fotoEncontrada: !!foto }, null, 2));
    return;
  }

  const titulo =
    tipo === "mensagens"
      ? falecido ? `Mensagens - ${falecido}` : "Mensagens de carinho"
      : falecido ? `Convite - ${falecido}` : "Convite";
  const descricao =
    tipo === "mensagens"
      ? "Mensagens de carinho deixadas para a família. Acesso com código."
      : "Velório e sepultamento: locais, horários e espaço para deixar uma mensagem à família.";
  // Prévia do WhatsApp: foto do falecido; sem foto, a logo do grupo
  const imagem = foto || `${base}/logogrupo.png`;
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
  res.setHeader("Cache-Control", "public, s-maxage=30, must-revalidate");
  res.status(200).send(html);
}
